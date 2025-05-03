const net = require("net");
const { getNetDetails } = require("./utils/getNetDetails");
const { CLIENT_DIR } = require("../constants");

// const UPSTREAM_PROXIES = { 3000: { host: "127.0.0.1", port: 3002 } };

function readOnce(socket) {
	return new Promise((resolve) => socket.once("data", resolve));
}

async function handleSocksRequest(clientSocket, remoteAddress) {
	const UPSTREAM_PROXIES = CLIENT_DIR.clients;
	clientSocket.once("data", (data) => {
		// SOCKS5 handshake: VER, NMETHODS, METHODS
		if (data[0] !== 0x05) {
			console.error("Wrong SOCKS version:", data[0]);
			clientSocket.end();
			return;
		}

		// Send: VER, METHOD (0x00 = no authentication)
		clientSocket.write(Buffer.from([0x05, 0x00]));

		clientSocket.once("data", (request) => {
			if (request[0] !== 0x05) {
				console.error("Invalid SOCKS5 request");
				clientSocket.end();
				return;
			}

			const cmd = request[1];
			const atyp = request[3];

			if (cmd !== 0x01) {
				// only CONNECT supported
				clientSocket.write(
					Buffer.from([0x05, 0x07, 0x00, 0x01, 0, 0, 0, 0, 0, 0])
				);
				clientSocket.end();
				return;
			}

			let { addr, port } = getNetDetails(atyp, request);

			console.log(`CONNECT to ${addr}:${port}`);

			if (!UPSTREAM_PROXIES[remoteAddress]) {
				const remoteSocket = net.connect(port, addr, () => {
					// success reply
					const reply = Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]);
					clientSocket.write(reply);

					remoteSocket.pipe(clientSocket);
					clientSocket.pipe(remoteSocket);
				});

				remoteSocket.on("error", (err) => {
					console.error("Remote socket error:", err.message);
					clientSocket.end();
				});
			} else {
				chainToNextProxy(clientSocket, addr, port, atyp, remoteAddress);
			}
		});
	});

	clientSocket.on("error", (err) => {
		console.error("Client socket error:", err);
	});
}

async function chainToNextProxy(client, addr, port, atyp, remoteAddress) {
	const UPSTREAM_PROXIES = CLIENT_DIR.clients;
	const proxy = UPSTREAM_PROXIES[remoteAddress];
	const upstream = net.connect(proxy.networkPort, proxy.ip, async () => {
		try {
			// Perform SOCKS5 handshake
			upstream.write(Buffer.from([0x05, 0x01, 0x00]));
			const authResp = await readOnce(upstream);
			if (authResp[1] !== 0x00) throw new Error("Auth failed");

			// Build destination (either next proxy or final address)
			let targetAddr, targetPort, targetAtyp;
			targetAddr = addr;
			targetPort = port;
			targetAtyp = atyp;

			let connectBuf;
			if (targetAtyp === 0x01) {
				// IPv4
				const ipBuf = Buffer.from(targetAddr.split(".").map(Number));
				connectBuf = Buffer.concat([
					Buffer.from([0x05, 0x01, 0x00, 0x01]),
					ipBuf,
					Buffer.from([(targetPort >> 8) & 0xff, targetPort & 0xff]),
				]);
			} else if (targetAtyp === 0x03) {
				// Domain
				const domainBuf = Buffer.from(targetAddr);
				connectBuf = Buffer.concat([
					Buffer.from([0x05, 0x01, 0x00, 0x03, domainBuf.length]),
					domainBuf,
					Buffer.from([(targetPort >> 8) & 0xff, targetPort & 0xff]),
				]);
			} else if (targetAtyp === 0x04) {
				// IPv6
				const ipBuf = Buffer.from(
					targetAddr.split(":").reduce((acc, block) => {
						if (block === "") {
							// Handle ::
							const missing =
								8 - targetAddr.split(":").filter((b) => b !== "").length;
							return acc.concat(new Array(missing).fill(0, 0, missing * 2));
						}
						const val = parseInt(block, 16);
						return acc.concat([(val >> 8) & 0xff, val & 0xff]);
					}, [])
				);
				connectBuf = Buffer.concat([
					Buffer.from([0x05, 0x01, 0x00, 0x04]),
					ipBuf,
					Buffer.from([(targetPort >> 8) & 0xff, targetPort & 0xff]),
				]);
			} else {
				throw new Error("Unknown ATYP");
			}
			upstream.write(connectBuf);

			const connectResp = await readOnce(upstream);
			if (connectResp[1] !== 0x00) throw new Error("CONNECT failed");

			// Final proxy: success, begin piping
			const successReply = Buffer.from([
				0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0,
			]);
			client.write(successReply);
			client.pipe(upstream).pipe(client);
		} catch (err) {
			console.error(`Proxy ${serverPort} error:`, err.message);
			client.end();
			upstream.end();
		}

		upstream.on("error", () => client.end());
	});
}

function createSocks5Server() {
	return net.createServer((clientSocket) => {
		console.log("New connection from", clientSocket.remoteAddress);
		// wait(3, clientSocket, port);
		const remoteAddress = clientSocket.remoteAddress;
		handleSocksRequest(clientSocket, remoteAddress);
	});
}

async function wait(seconds, clientSocket) {
	await new Promise((res, rej) =>
		setTimeout(() => {
			console.log("Wait over");
			res(true);
		}, seconds * 1000)
	);

	handleSocksRequest(clientSocket);
}

module.exports = { createSocks5Server };

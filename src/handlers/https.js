const net = require("net");
const { getNetDetails } = require("./utils/getNetDetails");
const { CLIENT_DIR, IP } = require("../constants");
const { trimAddress } = require("../utils/address");
const {
	updateClientOutboundUsage,
	updateClientInboundUsage,
} = require("../utils/clients");

// const UPSTREAM_PROXIES = { 3000: { host: "127.0.0.1", port: 3002 } };
const AUTH_PASSWORD = "password";

function readOnce(socket) {
	return new Promise((resolve) => socket.once("data", resolve));
}

async function handleSocksRequest(clientSocket, remoteAddress) {
	clientSocket.once("data", (data) => {
		// SOCKS5 handshake: VER, NMETHODS, METHODS
		if (data[0] !== 0x05) {
			console.error("Wrong SOCKS version:", data[0]);
			clientSocket.end();
			return;
		}

		const methods = data.slice(2, 2 + data[1]);
		if (!methods.includes(0x02)) {
			// No username/password method offered
			clientSocket.write(Buffer.from([0x05, 0xff])); // no acceptable methods
			clientSocket.end();
			return;
		}

		// Send: VER, METHOD (0x02 = auth, 0x00 = no authentication)
		clientSocket.write(Buffer.from([0x05, 0x02]));

		// Wait for auth packet
		clientSocket.once("data", (authData) => {
			const ver = authData[0];
			const ulen = authData[1];
			const uname = authData.slice(2, 2 + ulen).toString();
			const plen = authData[2 + ulen];
			const passwd = authData.slice(3 + ulen, 3 + ulen + plen).toString();

			// Just verifying if there is solana address and matches its length
			if (
				uname.length >= 32 &&
				uname.length <= 44 &&
				passwd === AUTH_PASSWORD
			) {
				// Success
				clientSocket.write(Buffer.from([0x01, 0x00]));
				handlePostAuthRequest(clientSocket, remoteAddress, uname, passwd); // call your next function
			} else {
				// Fail
				clientSocket.write(Buffer.from([0x01, 0x01]));
				clientSocket.end();
			}
		});
	});

	clientSocket.on("error", (err) => {
		console.error("Client socket error:", err);
	});
}

async function handlePostAuthRequest(
	clientSocket,
	remoteAddress,
	uname,
	passwd
) {
	const UPSTREAM_PROXIES = CLIENT_DIR.clients;
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

		if (
			!UPSTREAM_PROXIES[remoteAddress] ||
			UPSTREAM_PROXIES[remoteAddress].ip === IP
		) {
			const remoteSocket = net.connect(port, addr, () => {
				// success reply
				const reply = Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]);
				clientSocket.write(reply);

				remoteSocket.on("data", (data) => {
					updateClientInboundUsage(remoteAddress, data.length);
					clientSocket.write(data);
				});

				clientSocket.on("data", (data) => {
					updateClientOutboundUsage(remoteAddress, data.length);
					remoteSocket.write(data);
				});
			});

			remoteSocket.on("error", (err) => {
				console.error("Remote socket error:", err.message);
				clientSocket.end();
			});
		} else {
			chainToNextProxy(
				clientSocket,
				addr,
				port,
				atyp,
				remoteAddress,
				uname,
				passwd
			);
		}
	});
}

async function chainToNextProxy(
	client,
	addr,
	port,
	atyp,
	remoteAddress,
	uname,
	pass
) {
	const UPSTREAM_PROXIES = CLIENT_DIR.clients;
	const proxy = UPSTREAM_PROXIES[remoteAddress];
	const upstreamProxyIp = trimAddress(proxy.ip);
	const upstream = net.connect(proxy.networkPort, upstreamProxyIp, async () => {
		try {
			// Perform SOCKS5 handshake
			upstream.write(Buffer.from([0x05, 0x01, 0x02]));
			const authResp = await readOnce(upstream);
			if (authResp[1] !== 0x02)
				throw new Error("Upstream doesn't accept USERPASS");

			const unameBuf = Buffer.from(uname);
			const passwdBuf = Buffer.from(pass);
			upstream.write(
				Buffer.concat([
					Buffer.from([0x01, unameBuf.length]),
					unameBuf,
					Buffer.from([passwdBuf.length]),
					passwdBuf,
				])
			);

			const authStatus = await readOnce(upstream);
			if (authStatus[1] !== 0x00) throw new Error("Upstream auth failed");

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
			console.error(`Proxy error:`, err.message);
			client.end();
			upstream.end();
		}

		upstream.on("error", (err) => {
			console.log(err.message);
			client.end();
		});
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

module.exports = { createSocks5Server };

const { IS_BOOT_NODE } = require("../../constants");
const {
	addOrUpdateClientTarget,
	getClientWithSolAddress,
} = require("../../utils/clients");
const { verifyMessage } = require("../../utils/crypto");
const router = require("express").Router();
const axios = require("axios");
const { getBootNodes } = require("../../utils/network");

router.post("/join", async (req, res) => {
	try {
		const ip = req.body.ip;
		const networkPort = req.body.networkPort;
		if (!networkPort || !ip)
			return res.status(400).send("Port or Ip missing for target node.");

		const sol_address = req.body.sol_address;
		const signature = req.body.signature;
		if (!sol_address || !signature)
			return res.status(400).send("Client Sol address/signature is missing.");

		// Verify Message
		const isSignatureValid = verifyMessage(sol_address, signature);
		if (!isSignatureValid)
			return res.status(404).send({ message: "Signature is invalid!" });

		let clientIp = req.socket.remoteAddress;
		if (clientIp.startsWith("::ffff:")) {
			clientIp = clientIp.slice(7);
		}
		const targetNode = {
			ip,
			networkPort,
			sol_address,
		};
		if (!IS_BOOT_NODE) {
			const last_paid = fetchAndClientLastPaid(req.body);
			targetNode.last_paid = last_paid;
		}
		addOrUpdateClientTarget(clientIp, targetNode);
		res.send({ message: "OK" });
	} catch (error) {
		console.log(error);
	}
});

router.get("/client/:sol_address", async (req, res) => {
	try {
		const sol_address = req.body.sol_address;
		if (!sol_address)
			return res.status(400).send("Client Sol address/signature is missing.");

		const client = getClientWithSolAddress(sol_address);
		if (!client) return res.status(404).send({ message: "No client found" });

		res.send(client);
	} catch (error) {
		console.log(error);
	}
});

async function fetchAndClientLastPaid(sol_address) {
	const bootNodes = getBootNodes();
	const bootNode = bootNodes[0];

	let ip = bootNode.ip;
	let parsedIp =
		ip.startsWith("http://") || ip.startsWith("https://") ? ip : `http://${ip}`;
	const response = await axios.get(
		`${parsedIp}:${bootNode.apiPort}/client/${sol_address}`,
		{ sol_address }
	);
	if (response.status === 404) return undefined;
	return response.data.last_paid;
}

module.exports = router;

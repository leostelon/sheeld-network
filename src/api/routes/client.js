const { addOrUpdateClientTarget } = require("../../utils/clients");
const { verifyMessage } = require("../../utils/crypto");
const router = require("express").Router();

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
		addOrUpdateClientTarget(clientIp, targetNode);
		res.send({ message: "OK" });
	} catch (error) {
		console.log(error);
	}
});

module.exports = router;

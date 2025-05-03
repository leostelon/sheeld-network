const { addOrUpdateClientTarget } = require("../../utils/clients");
const router = require("express").Router();

router.post("/join", async (req, res) => {
	try {
		const ip = req.body.ip;
		const networkPort = req.body.networkPort;
		if (!networkPort || !ip)
			return res.status(400).send("Port or Ip missing for target node.");

		let clientIp = req.socket.remoteAddress;
		if (clientIp.startsWith("::ffff:")) {
			clientIp = clientIp.slice(7);
		}
		const targetNode = {
			ip,
			networkPort,
		};
		addOrUpdateClientTarget(clientIp, targetNode);
		res.send({ message: "OK" });
	} catch (error) {
		console.log(error);
	}
});

module.exports = router;

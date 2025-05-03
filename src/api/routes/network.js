const { IP } = require("../../constants");
const { getNodes, saveNode } = require("../../utils/network");

const router = require("express").Router();

router.post("/join", async (req, res) => {
	try {
		const port = req.body.port;
		if (!port) return res.status(400).send("Send port number");

		let IPv6Address = req.socket.remoteAddress;
		if (IPv6Address.startsWith("::ffff:")) {
			IPv6Address = IPv6Address.slice(7);
		}
		console.log(IPv6Address);
		const newNode = {
			ip: `${req.protocol}://${IPv6Address}`,
			networkPort: port,
			apiPort: port + 1,
			joinedAt: Date.now(),
		};
		saveNode(newNode);
		const nodes = getNodes();
		res.send({ nodes });
	} catch (error) {
		console.log(error);
	}
});

router.get("/nearest-support-node", async (req, res) => {
	try {
		const nodes = getNodes();
		const node = nodes.find((n) => n.ip !== IP);
		// const node = nodes.find((n) => {
		// 	return n.ip === IP && n.networkPort !== 3002;
		// });
		res.send(node);
	} catch (error) {
		console.log(error);
	}
});

router.get("/all-nodes", async (req, res) => {
	try {
		const nodes = getNodes();
		res.send(nodes);
	} catch (error) {
		console.log(error);
	}
});

module.exports = router;

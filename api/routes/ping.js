const router = require("express").Router();

router.get("/", (req, res) => {
	try {
		res.status(200).send({ message: "pong" });
	} catch (error) {
		console.log(error);
	}
});

module.exports = router;

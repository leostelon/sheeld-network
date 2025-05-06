const router = require("express").Router();
const network = require("./network");
const client = require("./client");
const ping = require("./ping");
const webhook = require("./webhook");
const { IS_BOOT_NODE } = require("../../constants");

router.use("/ping", ping);
router.use("/network", network);
router.use("/client", client);
if (IS_BOOT_NODE) {
	router.use("/webhook", webhook);
}

module.exports = router;

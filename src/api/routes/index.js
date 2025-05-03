const router = require("express").Router();
const network = require("./network");
const client = require("./client");
const ping = require("./ping");

router.use("/ping", ping);
router.use("/network", network);
router.use("/client", client);

module.exports = router;

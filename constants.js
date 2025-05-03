const NETWORK = process.env.NETWORK;
const IS_BOOT_NODE = process.env.IS_BOOT_NODE;
const IP = process.env.IP;
const PORT = process.env.PORT;

let CLIENT_DIR = { clients: {} };

module.exports = { NETWORK, IS_BOOT_NODE, IP, PORT, CLIENT_DIR };

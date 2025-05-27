const NETWORK = process.env.NETWORK;
const IS_BOOT_NODE = process.env.IS_BOOT_NODE;
const IP = process.env.IP;
let PORT = process.argv[2];
PORT = parseInt(PORT);
// const PORT = process.env.PORT;
const DEFAULT_DEPOSIT_ADDRESS = "cs71CHU88LLHmHcWqL8pkDxtwLqQDvBFvzTnU6R3Hz4";
const SECRET = process.env.SECRET;
const BOOT_PEERS = process.env.BOOT_PEERS?.split(";") ?? [];
let CLIENT_DIR = { clients: {} };

module.exports = {
    NETWORK,
    IS_BOOT_NODE,
    IP,
    PORT,
    CLIENT_DIR,
    DEFAULT_DEPOSIT_ADDRESS,
    SECRET,
    BOOT_PEERS,
};

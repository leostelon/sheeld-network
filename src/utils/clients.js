let { CLIENT_DIR } = require("../constants");

let writeData, readData;

// Add or update a key
function addOrUpdateClientTarget(key, targetNode) {
    let data = getClients();

    // Add or update the key
    data[key] = { ...data[key], ...targetNode };
    if (!data[key]["usage"]) {
        data[key]["usage"] = {
            sent: 0,
            received: 0,
        };
    }
    writeData(`clients.${key}`, data[key]);
}

function getClients() {
    const clients = readData("clients");
    return clients;
}

function getClient(remoteAddress) {
    return CLIENT_DIR.clients[remoteAddress.replaceAll(".", "-")];
}

function getClientWithSolAddress(solAddress) {
    const clients = getClients();
    const ip = Object.keys(clients).find(
        (ip) => clients[ip].sol_address === solAddress
    );
    if (!ip) return;
    clients[ip].client_ip = ip;
    return clients[ip];
}

async function syncClientsDirectory() {
    console.log("/// SYNCING CLIENTS STARTED ///");
    const { writeData: wd, readData: rd } = await import("../libp2p/db.mjs");
    writeData = wd;
    readData = rd;
    CLIENT_DIR.clients = getClients();
    console.log("/// SYNCING CLIENTS ENDED ///");
}

function updateClientInboundUsage(clientIp, usage) {
    const client = CLIENT_DIR.clients[clientIp];
    client.usage.received += usage;
    writeData(
        `clients.${clientIp.replaceAll(".", "-")}.usage.received`,
        client.usage.received
    );
}

function updateClientOutboundUsage(clientIp, usage) {
    const client = CLIENT_DIR.clients[clientIp];
    client.usage.sent += usage;
    writeData(
        `clients.${clientIp.replaceAll(".", "-")}.usage.sent`,
        client.usage.sent
    );
}

function updateClientLastPaid(clientIp, last_paid) {
    throw new Error("Client payment not implemented!");
}

module.exports = {
    addOrUpdateClientTarget,
    syncClientsDirectory,
    updateClientInboundUsage,
    updateClientOutboundUsage,
    getClientWithSolAddress,
    updateClientLastPaid,
    getClient
};

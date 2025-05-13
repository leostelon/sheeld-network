const fs = require("fs");
const path = require("path");
let { CLIENT_DIR } = require("../constants");
const { getGun, gunPutObject, getAsyncNode, putAsyncNode } = require("../gun");
const CLIENTS_FILE = path.join("db/clients.json");

// Add or update a key
function addOrUpdateClientTarget(key, targetNode) {
	let data = {};

	// Read and parse existing file
	if (fs.existsSync(CLIENTS_FILE)) {
		const existingData = fs.readFileSync(CLIENTS_FILE);
		if (existingData.length !== 0) data = JSON.parse(existingData);
	}

	// Add or update the key
	data[key] = { ...data[key], ...targetNode };
	if (!data[key]["usage"]) {
		data[key]["usage"] = {
			sent: 0,
			received: 0,
		};
	}
	const gun = getGun();
	const node = gun.get("clients");
	gunPutObject(node, data);
	updateClientDirectory(data);

	// Save updated data back to file
	fs.writeFileSync(CLIENTS_FILE, JSON.stringify(data, null, 2));
}

// Get the value for a key
function getClientTarget(key) {
	if (!fs.existsSync(CLIENTS_FILE)) {
		console.error("Data file not found.");
		return null;
	}

	const data = JSON.parse(fs.readFileSync(CLIENTS_FILE, "utf-8"));
	return data[key] || null;
}

async function getClients() {
	const gun = getGun();
	const node = gun.get("clients");
	const clients = await getAsyncNode(node);
	if (!clients) return {};
	return clients;
}

async function getClientWithSolAddress(solAddress) {
	const clients = await getClients();
	const ip = Object.keys(clients).find(
		(ip) => clients[ip].sol_address === solAddress
	);
	if (!ip) return;
	clients[ip].client_ip = ip;
	return clients[ip];
}

async function syncClientsDirectory() {
	console.log("/// SYNCING CLIENTS STARTED ///");
	CLIENT_DIR.clients = await getClients();
	console.log("/// SYNCING CLIENTS ENDED ///");
}

function updateClientDirectory(data) {
	CLIENT_DIR.clients = data;
}

function updateClientInboundUsage(clientIp, usage) {
	const gun = getGun();
	const client = CLIENT_DIR.clients[clientIp];
	client.usage.received += usage;
	gun
		.get("clients")
		.get(clientIp)
		.get("usage")
		.get("received")
		.put(client.usage.received);
	updateClient(clientIp, "usage", client.usage);
}

function updateClientOutboundUsage(clientIp, usage) {
	const gun = getGun();
	const client = CLIENT_DIR.clients[clientIp];
	client.usage.sent += usage;
	gun
		.get("clients")
		.get(clientIp)
		.get("usage")
		.get("sent")
		.put(client.usage.sent);
	updateClient(clientIp, "usage", client.usage);
}

async function updateClientLastPaid(clientIp, last_paid) {
	const gun = getGun();
	const node = gun.get("clients").get(clientIp).get("last_paid");
	await putAsyncNode(node, last_paid);
	updateClient(clientIp, "last_paid", last_paid);
}

function updateClient(clientIp, key, value) {
	CLIENT_DIR.clients[clientIp][key] = value;
	fs.writeFile(
		CLIENTS_FILE,
		JSON.stringify(CLIENT_DIR.clients, null, 2),
		(err) => {
			if (err) throw err;
		}
	);
}

module.exports = {
	addOrUpdateClientTarget,
	getClientTarget,
	syncClientsDirectory,
	updateClientInboundUsage,
	updateClientOutboundUsage,
	getClientWithSolAddress,
	updateClientLastPaid,
};

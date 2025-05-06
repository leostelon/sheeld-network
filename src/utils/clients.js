const fs = require("fs");
const path = require("path");
let { CLIENT_DIR } = require("../constants");
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

function getClients() {
	if (!fs.existsSync(CLIENTS_FILE)) return {};
	const data = fs.readFileSync(CLIENTS_FILE);
	if (data.length === 0) return {};
	return JSON.parse(data);
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

function syncClientsDirectory() {
	console.log("/// SYNCING CLIENTS STARTED ///");
	CLIENT_DIR.clients = getClients();
	console.log("/// SYNCING CLIENTS ENDED ///");
}

function updateClientDirectory(data) {
	CLIENT_DIR.clients = data;
}

function updateClientInboundUsage(clientIp, usage) {
	const client = CLIENT_DIR.clients[clientIp];
	client.usage.received += usage;
	updateClient(clientIp, "usage", client.usage);
}

function updateClientOutboundUsage(clientIp, usage) {
	const client = CLIENT_DIR.clients[clientIp];
	client.usage.sent += usage;
	updateClient(clientIp, "usage", client.usage);
}

function updateClientLastPaid(clientIp, last_paid) {
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

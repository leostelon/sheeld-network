const fs = require("fs");
const path = require("path");
let { CLIENT_DIR } = require("../constants");
const CLIENTS_FILE = path.join("db/clients.json");

// Add or update a key
function addOrUpdateClientTarget(key, value) {
	let data = {};

	// Read and parse existing file
	if (fs.existsSync(CLIENTS_FILE)) {
		console.log(`Entry for '${key}' saved.`);
		const existingData = fs.readFileSync(CLIENTS_FILE);
		if (existingData.length !== 0) data = JSON.parse(existingData);
	}

	// Add or update the key
	data[key] = value;
	console.log(data);
	updateClientDirectory(data);

	// Save updated data back to file
	fs.writeFileSync(CLIENTS_FILE, JSON.stringify(data, null, 2));
	console.log(`Entry for '${key}' saved.`);
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

function syncClientsDirectory() {
	console.log("/// SYNCING CLIENTS STARTED ///");
	CLIENT_DIR.clients = getClients();
	console.log("/// SYNCING CLIENTS ENDED ///");
}

function updateClientDirectory(data) {
	CLIENT_DIR.clients = data;
}

module.exports = {
	addOrUpdateClientTarget,
	getClientTarget,
	syncClientsDirectory,
};

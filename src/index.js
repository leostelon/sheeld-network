require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const app = express();
const { createSocks5Server } = require("./handlers");
const { startAPIServer } = require("./api");
const { connectToNetwork } = require("./utils/network");
const { syncClientsDirectory } = require("./utils/clients");

app.use(express.json());
const port = getPort();

// Handlers
const socks5Server = createSocks5Server();

async function initializeServer() {
	// Create DB path
	createDirectory();

	// API Server
	startAPIServer(port);

	// SYNC
	syncClientsDirectory();
	await connectToNetwork(port);

	socks5Server.listen(port, "0.0.0.0", () => {
		console.log("Node network running on port " + port);
	});
}

initializeServer();

function getPort() {
	var args = process.argv.slice(2);
	if (!(args.length >= 1)) {
		throw new Error("No port specified");
	}
	return parseInt(args[0]);
}

function createDirectory() {
	const dirPath = path.join("db");

	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
		console.log("Directory created:", dirPath);
	} else {
		console.log("Directory already exists:", dirPath);
	}
}

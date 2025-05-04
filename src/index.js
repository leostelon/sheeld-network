require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const app = express();
const { createSocks5Server } = require("./handlers");
const { startAPIServer } = require("./api");
const { connectToNetwork } = require("./utils/network");
const { syncClientsDirectory } = require("./utils/clients");
const { PORT } = require("./constants");

app.use(express.json());

// Handlers
const socks5Server = createSocks5Server();

async function initializeServer() {
	// Create DB path
	createDirectory();

	// API Server
	// Start API port +1 on network port
	const port = parseInt(PORT) + 1;
	startAPIServer(port);

	// SYNC
	syncClientsDirectory();
	await connectToNetwork(PORT);

	socks5Server.listen(PORT, "0.0.0.0", () => {
		console.log("Node network running on port " + PORT);
	});
}

initializeServer();

function createDirectory() {
	const dirPath = path.join("db");

	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
		console.log("Directory created:", dirPath);
	} else {
		console.log("Directory already exists:", dirPath);
	}
}

// curl -x socks5h://ELG3nKpAibgiRNDRZbVxugmjjBhN6w5bHywfsigQ7qsB:password@127.0.0.1:3000 http://httpforever.com

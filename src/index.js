require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const { createSocks5Server } = require("./handlers");
const { routes } = require("./api");
const { connectToNetwork } = require("./utils/network");
const { syncClientsDirectory } = require("./utils/clients");
const { PORT } = require("./constants");
const { initializeWebsocket } = require("./websocket");

app.use(express.json());
// Create an HTTP server to handle requests and proxy them
// CORS
app.use(function (req, res, next) {
	// var allowedDomains = process.env.ALLOWED_DOMAINS.split(" ");
	// var origin = req.headers.origin;
	// if (allowedDomains.indexOf(origin) > -1) {
	//     res.setHeader("Access-Control-Allow-Origin", origin);
	// }
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.header(
		"Access-Control-Allow-Methods",
		" GET, POST, PATCH, PUT, DELETE, OPTIONS"
	);
	res.header(
		"Access-Control-Allow-Headers",
		"Origin, X-Requested-With, Content-Type, Accept, Authorization"
	);
	next();
});

// Handlers
const socks5Server = createSocks5Server();

// Routes
app.use(routes);

async function initializeServer() {
	// Create DB path
	createDirectory();

	// API Server
	// Start API port +1 on network port
	const parsedPort = parseInt(PORT);
	const networkPort = parsedPort + 1;
	http.listen(networkPort, () => {
		console.log("API Server running on port " + networkPort);
	});

	// SYNC
	syncClientsDirectory();
	await connectToNetwork(parsedPort);
	initializeWebsocket(http);

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

require("dotenv").config();
const express = require("express");
const app = express();
const { startAPIServer } = require("./api");

app.use(express.json());
const port = getPort();

async function initializeServer() {
	// API Server
	startAPIServer(port);
}

initializeServer();

function getPort() {
	var args = process.argv.slice(2);
	if (!(args.length >= 1)) {
		throw new Error("No port specified");
	}
	return parseInt(args[0]);
}

const fs = require("fs");
const axios = require("axios");
const { NETWORK, SECRET } = require("../constants");

let writeData, readData;

function getNodes() {
	const nodesObj = readData("nodes");
	return Object.keys(nodesObj).map((key) => [key, nodesObj[key]]);
}

function getBootNodes() {
	if (!fs.existsSync(BOOT_NODES_FILE)) return [];
	const data = fs.readFileSync(BOOT_NODES_FILE);
	const bootNodes = JSON.parse(data)[NETWORK];
	return bootNodes;
}

async function connectToNetwork() {
	console.log("::::: SYNC STARTED :::::");
	const { writeData: wd, readData: rd } = await import("../libp2p/db.mjs");
	writeData = wd;
	readData = rd;
	console.log("::::: SYNC COMPLETED :::::");
}

async function fetchNodesFromBootNode(bootNodes, port) {
	let ip = bootNodes.ip;
	let parsedIp =
		ip.startsWith("http://") || ip.startsWith("https://") ? ip : `http://${ip}`;
	const response = await axios.post(
		`${parsedIp}:${bootNodes.apiPort}/network/join`,
		{ port, secret: SECRET }
	);
	const data = response.data;
	if (!data.nodes || data.nodes.length === 0)
		throw new Error("No nodes returned from boot nodes.");
	return data.nodes;
}

module.exports = { connectToNetwork, getNodes, getBootNodes };

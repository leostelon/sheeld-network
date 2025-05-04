const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { NETWORK, IP, PORT } = require("../constants");
const { trimAddress } = require("./address");
const { getCountryNameWithIp } = require("./geo");
const NODES_FILE = path.join("db/nodes.json");
const BOOT_NODES_FILE = path.join("bootnodes.json");

function saveNode(node) {
	const nodes = getNodes();
	const isAnExistingNode = nodeExist(nodes, node);
	if (isAnExistingNode) return;
	nodes.push(node);
	fs.writeFileSync(NODES_FILE, JSON.stringify(nodes, null, 2));
}

function saveNodes(nodes) {
	fs.writeFileSync(NODES_FILE, JSON.stringify(nodes, null, 2));
}

function getNodes() {
	if (!fs.existsSync(NODES_FILE)) return [];
	const data = fs.readFileSync(NODES_FILE);
	if (data.length === 0) return [];
	return JSON.parse(data);
}

function getBootNodes() {
	if (!fs.existsSync(BOOT_NODES_FILE)) return [];
	const data = fs.readFileSync(BOOT_NODES_FILE);
	const bootNodes = JSON.parse(data)[NETWORK];
	return bootNodes;
}

async function connectToNetwork(port) {
	console.log("::::: SYNC STARTED :::::");
	const bootNodes = getBootNodes();
	const isABootNode = process.env.IS_BOOT_NODE === "true";

	// If its a boot node, then just sync the DB
	if (isABootNode) {
		const location = getCountryNameWithIp(IP);
		const currentNode = {
			ip: IP,
			networkPort: port,
			apiPort: port + 1,
			joinedAt: Date.now(),
			location,
		};
		saveNode(currentNode);
	} else {
		const nodes = await fetchNodesFromBootNode(bootNodes[0], port);
		saveNodes(nodes);
	}
	console.log("::::: SYNC COMPLETED :::::");
}

async function fetchNodesFromBootNode(bootNodes, port) {
	let ip = bootNodes.ip;
	let parsedIp =
		ip.startsWith("http://") || ip.startsWith("https://") ? ip : `http://${ip}`;
	const response = await axios.post(
		`${parsedIp}:${bootNodes.apiPort}/network/join`,
		{ port }
	);
	const data = response.data;
	if (!data.nodes || data.nodes.length === 0)
		throw new Error("No nodes returned from boot nodes.");
	return data.nodes;
}

function nodeExist(nodeList, node) {
	return nodeList.find(
		(bootNode) =>
			trimAddress(bootNode.ip) === trimAddress(node.ip) &&
			bootNode.networkPort === node.networkPort
	);
}

module.exports = { connectToNetwork, saveNode, getNodes };

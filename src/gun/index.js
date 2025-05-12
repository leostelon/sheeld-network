const Gun = require("gun");
const { getBootNodes } = require("../utils/network");
const { IS_BOOT_NODE } = require("../constants");
require("gun/lib/open");

let gun;

function initializeGun(httpServer) {
	const bootNodes = getBootNodes();
	let peers = [];
	if (IS_BOOT_NODE) {
		peers = bootNodes.map((n) => `${n.ip}:${n.apiPort}/gun`);
	}
	gun = Gun({
		web: httpServer,
		peers,
	});
}

function getGun() {
	return gun;
}

function gunGetObject(gunNode) {
	return new Promise((resolve) => {
		gunNode.once(async (data) => {
			if (!data || typeof data !== "object") return resolve(data);

			const result = {};
			const keys = Object.keys(data).filter(
				(k) => k !== "_" && typeof data[k] === "object"
			);

			// Fetch all subnodes recursively
			await Promise.all(
				keys.map(async (key) => {
					const subnode = await gunGetObject(gunNode.get(key));
					result[key] = subnode;
				})
			);

			// Add primitives at top level
			for (const key in data) {
				if (key !== "_" && typeof data[key] !== "object") {
					result[key] = data[key];
				}
			}

			resolve(result);
		});
	});
}

function gunPutObject(gunNode, obj) {
	for (const key in obj) {
		const value = obj[key];

		if (typeof value === "object" && value !== null && !Array.isArray(value)) {
			// Recurse for nested object
			const childNode = gunNode.get(key);
			gunPutObject(childNode, value);
		} else {
			// Directly put primitive value
			gunNode.get(key).put(value);
		}
	}
}

module.exports = { initializeGun, getGun, gunGetObject, gunPutObject };

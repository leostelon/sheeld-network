import { Low, JSONFile } from "lowdb";
import { PORT } from "../constants.js";
import { getPubSubService } from "./index.mjs";
import { DB_UPDATE } from "./event_types.mjs";
import { formatPublishData } from "./util.mjs";

let DB_SYNCED = false;
// Use JSON file for storage
const file = `db/lowdb-${PORT}.json`;
const adapter = new JSONFile(file);
let dbInitialized = false;
export const db = new Low(adapter);

export async function writeData(key, data) {
    const pubsub = getPubSubService();

    const keyPath = key.split(".");
    keyPath.reduce(function (a, b, ind) {
        if (!a[b]) {
            a[b] = {};
        }
        if (keyPath.length - 1 === ind) {
            a[b] = data;
        }
        return a[b];
    }, db.data);
    await db.write();
    pubsub.publish(DB_UPDATE, formatPublishData({ key, data }), {
        allowPublishToZeroTopicPeers: true,
    });
}

export async function handleDbUpdate(key, data) {
    const keyPath = key.split(".");
    keyPath.reduce(function (a, b, ind) {
        if (!a[b]) {
            a[b] = {};
        }
        if (keyPath.length - 1 === ind) {
            a[b] = data;
        }
        return a[b];
    }, db.data);
    await db.write();
}

export function readData(key) {
    if (!dbInitialized) return;
    return db.data[key];
}

export async function initializeDB() {
    await db.read();
    db.data = { nodes: {}, clients: {} };
    await db.write();
    dbInitialized = true;
}

export async function saveNode(id, node) {
    const nodes = readData("nodes");
    nodes[id] = node;
    await db.write();
}

export async function updateNodeStatus(peerId, status) {
    const node = readData(["nodes"][peerId]);
    node.status = status;
    await db.write();
}

export async function syncDB(data) {
    if (DB_SYNCED) return;
    db.data = data;
    DB_SYNCED = true;
    await db.write();
}

export function updateDbSyncStatus(status) {
    DB_SYNCED = status;
}

export function getDBSyncStatus() {
    return DB_SYNCED;
} 
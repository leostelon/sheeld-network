import { createLibp2p } from "libp2p";
import { webSockets } from "@libp2p/websockets";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { bootstrap } from "@libp2p/bootstrap";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { identify, identifyPush } from "@libp2p/identify";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";
import { BOOT_PEERS, IP, PORT } from "../constants.js";
import {
    db,
    getDBSyncStatus,
    handleDbUpdate,
    initializeDB,
    saveNode,
    syncDB,
    updateDbSyncStatus,
    updateNodeStatus,
    writeData,
} from "./db.mjs";
import { getCountryNameWithIp } from "../utils/geo.js";
import { formatPublishData, wait } from "./util.mjs";
import { DB_UPDATE, PEER_CONNECTION, PEER_STATUS } from "./event_types.mjs";

// Known peers addresses
const bootstrapMultiaddrs = BOOT_PEERS;
let LIBP2P_INITIALIZED = false;

const node = await createLibp2p({
    // libp2p nodes are started by default, pass false to override this
    start: false,
    addresses: {
        listen: [`/ip4/127.0.0.1/tcp/${PORT + 2}/ws`],
    },
    transports: [webSockets()],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    peerDiscovery:
        BOOT_PEERS.length === 0
            ? []
            : [
                  bootstrap({
                      list: bootstrapMultiaddrs, // provide array of multiaddrs
                  }),
              ],
    services: {
        pubsub: gossipsub(),
        identify: identify(),
        identifyPush: identifyPush(),
    },
});

export async function initializeLibp2p() {
    // start libp2p
    await initializeDB();
    await node.start();
    const listenAddresses = node.getMultiaddrs();
    console.log(
        "libp2p is listening on the following addresses: ",
        listenAddresses
    );

    // Push node to node list if it is the only node in the network
    if (BOOT_PEERS.length === 0) {
        db.data.nodes[node.peerId] = getCurrentNodeDetails();
        updateDbSyncStatus(true);
        LIBP2P_INITIALIZED = true;
        await db.write();
    }

    // TOPIC SUBSCRIPTIONS
    node.services.pubsub.subscribe(node.peerId.toString()); // Listen for unique events.
    node.services.pubsub.subscribe(PEER_CONNECTION);
    node.services.pubsub.subscribe(PEER_STATUS);
    node.services.pubsub.subscribe(DB_UPDATE);

    node.addEventListener("peer:discovery", (evt) => {
        console.log("Discovered %s", evt.detail.id.toString()); // Log discovered peer
    });

    node.addEventListener("peer:connect", async (evt) => {
        const peerId = evt.detail.toString();
        console.log("Connected to", peerId); // Log connected peer

        await wait(3);
        // Step 1: Publish entire DB to connected peer
        await node.services.pubsub.publish(peerId, formatPublishData(db.data));

        // Step 2: Publish current node
        const timer = setInterval(async () => {
            const dbSyncStatus = getDBSyncStatus();
            if(dbSyncStatus) {
                const currentNode = getCurrentNodeDetails();
                writeData(`nodes.${node.peerId.toString()}`, currentNode);
                LIBP2P_INITIALIZED = true;
                timer.close();
            }
        }, 500);
    });

    node.addEventListener("peer:disconnect", (evt) => {
        const peerId = evt.detail.toString();
        console.log("Disconnected from %s", peerId); // Log disconnected peer
        publishNodeStatus(peerId, "disconnect");
    });

    node.services.pubsub.addEventListener("message", async (evt) => {
        const s = uint8ArrayToString(evt.detail.data);
        const topic = evt.detail.topic;
        console.log("enter here", topic);

        if (node.peerId.toString() === topic) {
            const newData = JSON.parse(s);
            await syncDB(newData);
        } else if (PEER_CONNECTION === topic) {
            const node = JSON.parse(s);
            await saveNode(node.peerId, node);
        } else if (PEER_STATUS === topic) {
            const nodeDetails = JSON.parse(s);
            await updateNodeStatus(nodeDetails.peerId, nodeDetails.status);
        } else if (DB_UPDATE === topic) {
            const { key, data } = JSON.parse(s);
            await handleDbUpdate(key, data);
        }
    });

    await waitUntilLibp2pInitialized();
}

function publishNodeStatus(peerId, status) {
    writeData(`nodes.${peerId}.status`, status);
}

function getCurrentNodeDetails() {
    const location = getCountryNameWithIp(IP);
    const currentNodeDetails = {
        peerId: node.peerId,
        ip: IP,
        networkPort: PORT,
        apiPort: PORT + 1,
        joinedAt: Date.now(),
        location,
        status: "connect",
    };
    return currentNodeDetails;
}

export function getPubSubService() {
    return node.services.pubsub;
}

function waitUntilLibp2pInitialized() {
    return new Promise((res) => {
        const timer = setInterval(async () => {
            if (LIBP2P_INITIALIZED) {
                timer.close();
                res(true);
            }
        }, 500);
    });
}

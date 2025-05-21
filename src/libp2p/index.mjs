import { createLibp2p } from "libp2p";
import { webSockets } from "@libp2p/websockets";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { bootstrap } from "@libp2p/bootstrap";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { identify, identifyPush } from "@libp2p/identify";
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { PORT } from "../constants.js";

// Known peers addresses
const bootstrapMultiaddrs = [
    "/ip4/127.0.0.1/tcp/3000/ws/p2p/12D3KooWSFW5XScF2SkXTdkK4vbMANmB5LxtE5oLTHwAk5aJXyb1",
];

const node = await createLibp2p({
    // libp2p nodes are started by default, pass false to override this
    start: false,
    addresses: {
        listen: [`/ip4/127.0.0.1/tcp/${PORT}/ws`],
    },
    transports: [webSockets()],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    peerDiscovery: [
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

// start libp2p
await node.start();
console.log("libp2p has started");

const listenAddresses = node.getMultiaddrs();
console.log(
    "libp2p is listening on the following addresses: ",
    listenAddresses
);

node.addEventListener("peer:discovery", (evt) => {
    console.log("Discovered %s", evt.detail.id.toString()); // Log discovered peer
});

node.addEventListener("peer:connect", (evt) => {
    console.log("Connected to %s", evt.detail.toString()); // Log connected peer
});

node.addEventListener("peer:disconnect", (evt) => {
    console.log("Disconnected from %s", evt.detail.toString()); // Log connected peer
});

node.services.pubsub.addEventListener("message", (evt) => {
    console.log(
        `node2 received: ${uint8ArrayToString(evt.detail.data)} on topic ${
            evt.detail.topic
        }`
    );
});
node.services.pubsub.subscribe("fruit");

if (PORT === "3002") {
    setInterval(() => {
        console.log("publishing new message");
        node.services.pubsub.publish(
            "fruit",
            new TextEncoder().encode("banana")
        );
    }, 3000);
}

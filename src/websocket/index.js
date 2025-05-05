const socketIo = require("socket.io");

function initializeWebsocket(httpServer) {
	const io = socketIo(httpServer);

	io.on("connection", (socket) => {
		console.log("Socket connected:", socket.id);

		// Ping-pong every second
		setInterval(() => {
			const start = Date.now();
			socket.emit("ping");

			socket.once("pong", () => {
				const latency = Date.now() - start;
				console.log(`Latency: ${latency}ms`);
				socket.emit("latency", latency);
			});
		}, 1000);
	});
}

module.exports = { initializeWebsocket };

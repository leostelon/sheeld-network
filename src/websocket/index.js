const socketIo = require("socket.io");

function initializeWebsocket(httpServer) {
	const io = socketIo(httpServer);

	io.on("connection", (socket) => {
		console.log("Socket connected:", socket.id);

		let lastPingTime = null;

		// Add the pong listener only once
		socket.on("pong", () => {
			if (lastPingTime !== null) {
				const latency = Date.now() - lastPingTime;
				socket.emit("latency", latency);
			}
		});

		// Emit ping every second
		const interval = setInterval(() => {
			lastPingTime = Date.now();
			socket.emit("ping");
		}, 1000);

		// Clean up when socket disconnects
		socket.on("disconnect", () => {
			clearInterval(interval);
			console.log("Socket disconnected:", socket.id);
		});
	});
}

module.exports = { initializeWebsocket };

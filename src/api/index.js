const express = require("express");
const app = express();
const http = require("http").createServer(app);
const routes = require("./routes");

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

// Routes
app.use(routes);

// Start the server on default port 3001
function startAPIServer(defaultPort) {
	const port = defaultPort + 1;
	http.listen(port, () => {
		console.log("API Server running on port " + port);
	});
}

module.exports = { startAPIServer };

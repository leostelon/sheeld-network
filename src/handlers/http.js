const router = require("express").Router();
const httpProxy = require("http-proxy");

// Create a proxy server
const proxy = httpProxy.createProxyServer({
	secure: false, // This will allow self-signed certificates
	changeOrigin: true, // This will change the origin of the host header to the target URL
});

// Create an HTTP server to handle requests and proxy them
// CORS
router.use(function (req, res, next) {
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

router.use(/(.*)/, (req, res) => {
	// Prevent loop: Check if request already went through proxy
	if (req.headers["x-proxy-hop"]) {
		res.writeHead(500);
		const message = "Proxy loop detected!";
		console.log(message);
		return res.end(message);
	}

	// Add a marker header
	req.headers["x-proxy-hop"] = "1";

	// The target server to which requests will be proxied
	const target = req.url.startsWith("http")
		? req.url
		: `http://${req.headers.host}${req.url}`;

	// Log the request URL
	console.log(`Proxying request to: ${target}`);

	// Handle CORS preflight requests
	if (req.method === "OPTIONS") {
		res.writeHead(204, {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
			"Access-Control-Allow-Credentials": "true",
			"Content-Length": "0",
		});
		res.end();
		return;
	}

	// Add CORS headers to the response
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader(
		"Access-Control-Allow-Methods",
		"GET, POST, PUT, DELETE, OPTIONS"
	);
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
	res.setHeader("Access-Control-Allow-Credentials", "true");

	// Proxy the request to the target server
	proxy.web(req, res, { target });
});

// Handle errors
proxy.on("error", (err, req, res) => {
	console.error("Proxy error:", err);

	// Respond with a 500 status code if there is an error
	res.writeHead(500, {
		"Content-Type": "text/plain",
	});
	res.end("Something went wrong. And we are reporting a custom error message.");
});

module.exports = { handleHTTPCalls: router };

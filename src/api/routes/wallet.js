const router = require("express").Router();
const { Connection, PublicKey, clusterApiUrl } = require("@solana/web3.js");
const { getClientWithSolAddress } = require("../../utils/clients");

const connection = new Connection(clusterApiUrl("devnet"));

router.post("/balance", async (req, res) => {
	try {
		if (!req.body.address)
			return res.status(400).send({ message: "Please send address." });
		const publicKey = new PublicKey(req.body.address);
		const lamports = await connection.getBalance(publicKey);
		const sol = lamports / 1e9;
		const client = getClientWithSolAddress(req.body.address);
		if (!client)
			return res.status(404).send({ message: "No client found with provided wallet address" });
        console.log({ planExpired: isPaidPlanExpired(client.last_paid) });
		res
			.status(200)
			.send({ balance: sol, planExpired: isPaidPlanExpired(client.last_paid) });
	} catch (error) {
		console.log(error);
	}
});

function isPaidPlanExpired(lastPaid) {
	if (!lastPaid) return true;
	const A = lastPaid * 1000; // timestamp in milliseconds

	// Later, check if more than 30 days have passed
	const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000; // milliseconds in 30 days
	return Date.now() > A + THIRTY_DAYS_MS; // true if more than 30 days passed
}

module.exports = router;

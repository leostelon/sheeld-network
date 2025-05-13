const { DEFAULT_DEPOSIT_ADDRESS } = require("../../constants");
const {
	getClientWithSolAddress,
	updateClientLastPaid,
} = require("../../utils/clients");

const router = require("express").Router();
const DEPOSIT_LAMPORTS = 1000000;

router.post("/", async (req, res) => {
	try {
		const transfers = req.body[0];
		const nativeTransfers = transfers.nativeTransfers;
		const walletTransfer = nativeTransfers.find(
			(n) => n.toUserAccount === DEFAULT_DEPOSIT_ADDRESS
		);
		if (!walletTransfer) return res.status(200).send();

		const client = await getClientWithSolAddress(walletTransfer.fromUserAccount);
		if (!client) return res
			.status(200)
			.send({ message: "Client not found with." });

		if (walletTransfer.amount < DEPOSIT_LAMPORTS) return res.status(200).send({ message: "Sent less than DEPOSIT_LAMPORTS." });
		await updateClientLastPaid(client.client_ip, transfers.timestamp);
		return res.status(200).send({ message: "Updated successfully" });
	} catch (error) {
		console.log(error);
	}
});

module.exports = router;

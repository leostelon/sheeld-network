const nacl = require("tweetnacl");
const { default: bs58 } = require("bs58");
const { PublicKey } = require("@solana/web3.js");

function verifyMessage(publicKeyBase58, signatureBase58) {
	const message = new TextEncoder().encode("From Wallet");

	const signature = bs58.decode(signatureBase58);

	const pubKey = new PublicKey(publicKeyBase58);
	const pubKeyBytes = pubKey.toBytes();

	const isValid = nacl.sign.detached.verify(message, signature, pubKeyBytes);

	return isValid;
}

module.exports = { verifyMessage };

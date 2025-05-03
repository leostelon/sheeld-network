function trimAddress(address) {
	return address
		.replace("http://", "")
		.replace("https://", "")
		.replace(":", "");
}

module.exports = { trimAddress };

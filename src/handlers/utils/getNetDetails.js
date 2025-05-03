function getNetDetails(atyp, request) {
	let addr,
		port,
		offset = 4;
	if (atyp === 0x01) {
		// IPv4
		addr = request.slice(offset, offset + 4).join(".");
		offset += 4;
	} else if (atyp === 0x03) {
		// domain name
		const len = request[offset];
		offset += 1;
		addr = request.slice(offset, offset + len).toString();
		offset += len;
	} else if (atyp === 0x04) {
		// IPv6
		const addrBuffer = request.slice(offset, offset + 16);
		addr = Array.from(addrBuffer)
			.map((b, i, arr) => (i % 2 === 0 ? arr.slice(i, i + 2) : null))
			.filter(Boolean)
			.map((pair) => pair.map((x) => x.toString(16).padStart(2, "0")).join(""))
			.join(":");
		offset += 16;
	}
	port = request.readUInt16BE(offset);
	return { addr, port };
}

module.exports = { getNetDetails };

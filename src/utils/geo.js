const geoip = require("geoip-lite");
const iso3166 = require("iso-3166-1");

function getCountryNameWithIp(ip) {
	const geo = geoip.lookup(ip);

	if (geo) {
		const countryCode = geo.country; // e.g., "US"
		const country = iso3166.whereAlpha2(countryCode); // gets full info

		return country ? country.country : countryCode;
	} else {
		return "Unknown Country";
	}
}

module.exports = { getCountryNameWithIp };

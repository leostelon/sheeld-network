const textEncoder = new TextEncoder();

export function formatPublishData(dataObject) {
	return textEncoder.encode(JSON.stringify(dataObject));
}

export function wait(seconds) {
	return new Promise((res) => {
		setTimeout(() => {
			res(true);
		}, 1000 * seconds);
	});
}

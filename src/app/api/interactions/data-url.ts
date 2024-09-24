export async function urlToDataUrl(url: string) {
	return fetch(url)
		.then(async (res) => ({
			contentType: res.headers.get("content-type"),
			buffer: await res.arrayBuffer(),
		}))
		.then(
			({ contentType, buffer }) =>
				"data:" +
				contentType +
				";base64," +
				Buffer.from(buffer).toString("base64")
		);
}

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const url = new URL(req.url);

	if (url.searchParams.get("pass") !== process.env.PASSWORD) {
		return NextResponse.json(
			{ success: false },
			{
				status: 403,
			}
		);
	}
	const ids = [
		"1289942708307099791",
		"1194071353503006811",
		"1289941917030682646",
		"1219404921934315613",
		"1289941201134292992",
	];
	for (const idd of ids) {
		await fetch(
			`https://discord.com/api/v9/channels/892924500117708810/directory-entry/${idd}`,
			{
				headers: {
					authorization: process.env.ANOTHER_BOT_TOKEN!,
				},
				body: null,
				method: "DELETE",
			}
		);

		await fetch(
			`https://discord.com/api/v9/channels/892924500117708810/directory-entry/${idd}`,
			{
				headers: {
					authorization: process.env.ANOTHER_BOT_TOKEN!,
					"content-type": "application/json",
				},
				referrer:
					"https://discord.com/channels/892924467523747893/892924468102565958",
				body: '{"description":"auto autobump","primary_category_id":1}',
				method: "POST",
			}
		);
	}

	return NextResponse.json({ success: true }, { status: 200 });
}

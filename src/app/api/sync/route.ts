import {
	ApplicationCommandOptionType,
	RESTPutAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const FETCH_URL = `https://discord.com/api/v10/applications/${process.env.DISCORD_APP_ID}/guilds/${process.env.SERVER_ID}/commands`;
const COMMANDS: RESTPutAPIApplicationCommandsJSONBody = [
	{
		name: "selfrole",
		description: "Set or update your selfrole. Staff and booster only feature.",
		options: [
			{
				name: "name",
				description: "Role name",
				type: ApplicationCommandOptionType.String,
				required: false,
			},
			{
				name: "color",
				description: "Color in hex format #123abc",
				type: ApplicationCommandOptionType.String,
				required: false,
			},
			{
				name: "icon",
				description: "Your role icon",
				type: ApplicationCommandOptionType.Attachment,
				required: false,
			},
		],
	},
];

export async function POST(req: NextRequest) {
	const headersList = headers();
	const auth = headersList.get("Authorization");
	if (auth !== process.env.BOT_SYNC_API_KEY) {
		return NextResponse.json(
			{
				error: "Unauthorized",
			},
			{ status: 401 }
		);
	}

	await fetch(FETCH_URL, {
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
		},
		method: "PUT",
		body: JSON.stringify(COMMANDS),
	});

	return NextResponse.json(
		{ success: true },
		{
			status: 200,
		}
	);
}

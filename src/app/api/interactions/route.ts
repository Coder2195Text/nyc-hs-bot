import { NextResponse } from "next/server";
import { verifyInteractionRequest } from "./verify";
import {
	APIApplicationCommandInteractionDataStringOption,
	APIGuild,
	APIInteractionGuildMember,
	APIInteractionResponse,
	APIRole,
	ApplicationCommandOptionType,
	GuildFeature,
	InteractionResponseType,
	InteractionType,
	MessageFlags,
	RESTPatchAPIGuildRoleJSONBody,
	RESTPostAPIGuildRoleJSONBody,
} from "discord-api-types/v10";
import Redis from "ioredis";
import { urlToDataUrl } from "./data-url";

const db = new Redis(process.env.DATABASE_URL!);

const config: RequestInit = {
	headers: {
		Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
		"Content-Type": "application/json",
	},
};

const allowed = [
	"1285416068608954480",
	"1284265719084617850",
	"1284265510602543197",
	"1284249499396473006",
	"1282176190983180404",
	"1282897993464414310",
];

export async function POST(request: Request): Promise<NextResponse<any>> {
	const unknown = new NextResponse("Unknown command", { status: 400 });
	const verifyResult = await verifyInteractionRequest(
		request,
		process.env.DISCORD_APP_KEY!
	);

	if (!verifyResult.isValid || !verifyResult.interaction) {
		return new NextResponse("Invalid request", { status: 401 });
	}

	const { interaction } = verifyResult;

	if (interaction.type === InteractionType.Ping) {
		// The `PING` message is used during the initial webhook handshake, and is
		// required to configure the webhook in the developer portal.
		return NextResponse.json({ type: InteractionResponseType.Pong });
	}

	const id = interaction.member?.user?.id || interaction.user?.id;

	const data = {} as
		| RESTPostAPIGuildRoleJSONBody
		| RESTPatchAPIGuildRoleJSONBody;

	let server = fetch(
		`https://discord.com/api/v10/guilds/${process.env.SERVER_ID}`,
		config
	).then((res) => res.json() as Promise<APIGuild>);

	for (const option of interaction.data.options || []) {
		if (
			option.name == "name" &&
			option.type == ApplicationCommandOptionType.String
		)
			data.name = option.value;
		else if (
			option.name == "color" &&
			option.type == ApplicationCommandOptionType.String
		) {
			if (!/^#([A-Fa-f0-9]{6})$/g.test(option.value)) {
				return NextResponse.json({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						embeds: [
							{
								color: 0xff0000,
								title: "Bad Color format!",
								description:
									"Do #123abc color format, through a color picker. ",
							},
						],
					},
				} as APIInteractionResponse);
			}
			data.color = Number("0x" + option.value.replace("#", ""));
		} else if (
			option.type == ApplicationCommandOptionType.Attachment &&
			(await server).features.includes(GuildFeature.RoleIcons)
		) {
			const attachment = Object.values(
				interaction.data.resolved?.attachments!
			)[0];
			console.log(attachment);
			if (
				!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
					attachment.content_type || ""
				)
			) {
				return NextResponse.json({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						embeds: [
							{
								color: 0xff0000,
								title: "Blud thought bro could use non image for images 🤯",
								description:
									"Use a jpeg, png or gif for the role icon. Your data type is: " +
									attachment.content_type,
							},
						],
					},
				} as APIInteractionResponse);
			}

			if (attachment.size > 100000) {
				return NextResponse.json({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						embeds: [
							{
								color: 0xff0000,
								title: "Your icon is too fucking big!",
								description:
									"You do NOT need to upload the whole Van Gogh up here, the image will be resized down to like 64x64. Make your image size smaller.",
							},
						],
					},
				} as APIInteractionResponse);
			}

			let image = await urlToDataUrl(attachment.url);
			data.icon = image;
		}
	}

	if (interaction.guild_id !== process.env.SERVER_ID || !id) {
		return new NextResponse("Invalid request", { status: 401 });
	}

	let user = interaction.member;

	if (!allowed.some((role) => user?.roles.includes(role))) {
		return NextResponse.json({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: {
				embeds: [
					{
						color: 0xff0000,
						title: "Yo yo ik ur ego may be high but your rank isn't!",
						description:
							"You must be staff or booster to execute this command.",
					},
				],
			},
		} as APIInteractionResponse);
	}

	// console.log(JSON.stringify(interaction.data.options));

	let dbRole = await db.get(id);
	let resolvedServer = await server;
	if (dbRole && !resolvedServer.roles.some((role) => role.id == dbRole))
		dbRole = null;

	const result: APIRole = await fetch(
		`https://discord.com/api/v10/guilds/${process.env.SERVER_ID}/roles${
			dbRole ? `/${dbRole}` : ""
		}`,
		{
			...config,
			method: dbRole ? "PATCH" : "POST",
			body: JSON.stringify(data),
		}
	).then((res) => res.json());

	console.log(interaction.data.resolved?.attachments);

	let setDb;

	if (!dbRole) setDb = db.set(id, result.id);
	await Promise.all([
		setDb,
		fetch(
			`https://discord.com/api/v10/guilds/${process.env.SERVER_ID}/members/${id}/roles/${result.id}`,
			{
				...config,
				method: "PUT",
			}
		),
	]);

	return NextResponse.json({
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
			embeds: [
				{
					color: 0x00dd00,
					title: "Role Update Complete!",
					description:
						"Enjoy your new role! make sure to get rid of any existing color and icon roles from the roles channel.",
				},
			],
		},
	} as APIInteractionResponse);
}

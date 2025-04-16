import Command from "@/bot/command"
import { and, eq, isNull } from "drizzle-orm"
import { ChannelType, InteractionContextType, MessageFlags, PermissionFlagsBits } from "discord.js"

export default new Command()
	.build((builder) => builder
		.setName('ticket')
		.setContexts(InteractionContextType.Guild)
		.setDescription('Ticket commands')
		.addSubcommand((command) => command
			.setName('add')
			.setDescription('Add a user to the current ticket')
			.addUserOption((option) => option
				.setName('user')
				.setDescription('User to add')
				.setRequired(true)
			)
		)
		.addSubcommand((command) => command
			.setName('remove')
			.setDescription('Remove a user to the current ticket')
			.addUserOption((option) => option
				.setName('user')
				.setDescription('User to remove')
				.setRequired(true)
			)
		)
	)
	.listen(async(ctx) => {
		if (!ctx.interaction.guild || ctx.interaction.channel?.type !== ChannelType.GuildText) return

		switch (ctx.interaction.options.getSubcommand()) {
			case "add": {
				const user = ctx.interaction.options.getUser('user', true),
					ticket = await ctx.database.select({
						id: ctx.database.schema.tickets.id,
						users: ctx.database.schema.tickets.users
					})
						.from(ctx.database.schema.tickets)
						.where(and(
							eq(ctx.database.schema.tickets.discordId, ctx.interaction.user.id),
							eq(ctx.database.schema.tickets.channelId, ctx.interaction.channelId),
							isNull(ctx.database.schema.tickets.closed)
						))
						.then((r) => r[0])

				if (!ticket) return ctx.interaction.reply({
					content: '`⚒️` You are not in a ticket.',
					flags: [
						MessageFlags.Ephemeral
					]
				})

				if (ctx.interaction.channel.permissionsFor(user.id)?.has(PermissionFlagsBits.ViewChannel)) return ctx.interaction.reply({
					content: '`⚒️` User already in the ticket.',
					flags: [
						MessageFlags.Ephemeral
					]
				})

				await ctx.interaction.deferReply()

				return ctx.database.transaction(async (tx) => {
					await tx.update(ctx.database.schema.tickets)
						.set({
							users: ticket.users.concat([user.id])
						})
						.where(eq(ctx.database.schema.tickets.id, ticket.id))

					if (ctx.interaction.channel?.type === ChannelType.GuildText) {
						await ctx.interaction.channel.permissionOverwrites.create(user.id, {
							ViewChannel: true
						})
					}

					return ctx.interaction.editReply(`\`⚒️\` <@${user.id}> added to the ticket.`)
				})
			}

			case "remove": {
				const user = ctx.interaction.options.getUser('user', true),
					ticket = await ctx.database.select({
						id: ctx.database.schema.tickets.id,
						users: ctx.database.schema.tickets.users
					})
						.from(ctx.database.schema.tickets)
						.where(and(
							eq(ctx.database.schema.tickets.discordId, ctx.interaction.user.id),
							eq(ctx.database.schema.tickets.channelId, ctx.interaction.channelId),
							isNull(ctx.database.schema.tickets.closed)
						))
						.then((r) => r[0])

				if (!ticket) return ctx.interaction.reply({
					content: '`⚒️` You are not in a ticket.',
					flags: [
						MessageFlags.Ephemeral
					]
				})

				if (!ticket.users.includes(user.id)) return ctx.interaction.reply({
					content: '`⚒️` User cannot be removed from the ticket.',
					flags: [
						MessageFlags.Ephemeral
					]
				})

				await ctx.interaction.deferReply()

				return ctx.database.transaction(async (tx) => {
					await tx.update(ctx.database.schema.tickets)
						.set({
							users: ticket.users.filter((u) => u !== user.id)
						})
						.where(eq(ctx.database.schema.tickets.id, ticket.id))

					if (ctx.interaction.channel?.type === ChannelType.GuildText) {
						await ctx.interaction.channel.permissionOverwrites.delete(user.id)
					}

					return ctx.interaction.editReply(`\`⚒️\` <@${user.id}> removed from the ticket.`)
				})
			}
		}
	})
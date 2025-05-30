import Command from "@/bot/command"
import { InteractionContextType, MessageFlags, PermissionFlagsBits } from "discord.js"
import { eq, ilike } from "drizzle-orm"
import addFaqModal from "@/bot/modals/faq/add"
import updateFaqModal from "@/bot/modals/faq/update"

export default new Command()
	.build((builder) => builder
		.setName('faq-admin')
		.setContexts(InteractionContextType.Guild)
		.setDescription('Add, Remove or Update faqs')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand((subcommand) => subcommand
			.setName('add')
			.setDescription('Add a new FAQ')
		)
		.addSubcommand((subcommand) => subcommand
			.setName('remove')
			.setDescription('Remove a FAQ')
			.addIntegerOption((option) => option
				.setName('faq')
				.setDescription('The faq you want to remove')
				.setRequired(true)
				.setAutocomplete(true)
			)
		)
		.addSubcommand((subcommand) => subcommand
			.setName('update')
			.setDescription('Update a FAQ')
			.addIntegerOption((option) => option
				.setName('faq')
				.setDescription('The faq you want to update')
				.setRequired(true)
				.setAutocomplete(true)
			)
		)
	)
	.listen(async(ctx) => {
		switch (ctx.interaction.options.getSubcommand()) {
			case "add": {
				return ctx.interaction.showModal(await addFaqModal(ctx.interaction, [], []))
			}

			case "remove": {
				const faq = ctx.interaction.options.getInteger('faq', true)

				const data = await ctx.database.select({
					id: ctx.database.schema.faqs.id,
				}).from(ctx.database.schema.faqs)
					.where(eq(ctx.database.schema.faqs.id, faq))
					.limit(1)
					.then((r) => r[0])

				if (!data) return ctx.interaction.reply({
					content: '`🔍` FAQ not found.',
					flags: [
						MessageFlags.Ephemeral
					]
				})

				await ctx.database.delete(ctx.database.schema.faqs)
					.where(eq(ctx.database.schema.faqs.id, faq))

				return ctx.interaction.reply({
					content: '`✅` FAQ removed.',
					flags: [
						MessageFlags.Ephemeral
					]
				})
			}

			case "update": {
				const faq = ctx.interaction.options.getInteger('faq', true)

				const data = await ctx.database.select({
					id: ctx.database.schema.faqs.id
				}).from(ctx.database.schema.faqs)
					.where(eq(ctx.database.schema.faqs.id, faq))
					.limit(1)
					.then((r) => r[0])

				if (!data) return ctx.interaction.reply({
					content: '`🔍` FAQ not found.',
					flags: [
						MessageFlags.Ephemeral
					]
				})

				return ctx.interaction.showModal(await updateFaqModal(ctx.interaction, [data.id], [data.id]))
			}
		}
	})
	.listenAutocomplete(async(ctx) => {
		const search = ctx.interaction.options.getFocused(false)

		const faqs = await ctx.database.select({
			id: ctx.database.schema.faqs.id,
			title: ctx.database.schema.faqs.title,
		}).from(ctx.database.schema.faqs)
			.where(ilike(ctx.database.schema.faqs.title, `%${search}%`))
			.limit(25)

		return ctx.interaction.respond(faqs.map((faq) => ({
			name: faq.title[0] === '`' && faq.title[3] === '`' ? faq.title.slice(4) : faq.title,
			value: faq.id
		})))
	})
import { SlashCommandBuilder, CommandInteraction } from 'discord.js'
import User from '../db/models/user'

export default {
	data: new SlashCommandBuilder()
		.setName('settings')
		.setDescription("Set your settings.")
        .addStringOption(option => option
            .setName('country')
            .setDescription("Set what country you live in.")
            // .autocomplete()
        )
        .addStringOption(option => option
            .setName('visibility')
            .setDescription("Automatically allow maps to be generated using you everywhere.")
            .addChoices(
                { name: 'allow all guilds', value: 'true' },
                { name: 'manually decide which guilds', value: 'false' },
            )
        )
	,
	async execute(interaction: CommandInteraction): Promise<void> {
        const user = await User.create({ discordID: interaction.user.id })
        console.log(user)
        interaction.reply('sdfs')
	}
}

import { Events, StringSelectMenuInteraction } from "discord.js"
import { InternalServerError } from "../../errors";
import { infoEmbed } from "../../utils/embeds";
import { User } from "../../db/models";

export default {
	name: Events.InteractionCreate,
	once: false,
    logDescription: "Message to show after selecting a subdivision.",
    execute: async (interaction: StringSelectMenuInteraction) => {
        if (!interaction.isStringSelectMenu()) return;

        const { type }: CustomID<{}> = JSON.parse(interaction.customId)

        if (type !== 'location-subdivision') return

        const subdivisionCode = interaction.values[0]

        User.upsert({ discordID: interaction.user.id, subdivisionCode })
        .catch(err => { throw new InternalServerError('Could not save your subdivision.') })

        interaction.update({
            embeds: [infoEmbed('Selected a country and subdivision!')],
            components: []
        })
    }
}
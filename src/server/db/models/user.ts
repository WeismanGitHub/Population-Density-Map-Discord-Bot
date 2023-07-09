import { BadRequestError, InternalServerError } from "../../errors";
import GuildCountries from "./guild-countries";
import GuildCountry from "./guild-country";
import sequelize from "../sequelize";
import {
    DataTypes,
    InferAttributes,
    InferCreationAttributes,
    Model
} from 'sequelize'

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
    declare discordID: string
    declare countryCode: string
    declare subdivisionCode?: string | null
    declare addLocationOnJoin?: boolean
    declare role?: 'regular' | 'admin'
    declare guildIDs?: string[]
    declare addLocationToGuild: (guildID: string) => Promise<void>
    declare removeLocationFromGuild: (guildID: string) => Promise<void>
}

User.init({
    discordID: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
    },
    countryCode: {
        // Maybe make this an enum of all country codes in the future?
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: null,
    },
    subdivisionCode: {
        // Maybe make this an enum of all subdivision codes in the future?
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
    },
    addLocationOnJoin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    role: {
        type: DataTypes.ENUM('regular', 'admin'),
        defaultValue: 'regular'
    },
    guildIDs: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '[]',
        get: function () {
            // @ts-ignore
            return JSON.parse(this.getDataValue('guildIDs'))
        },
        set: function(guildIDs: string[]) {
            // @ts-ignore
            this.setDataValue('guildIDs', JSON.stringify(guildIDs))
            return this.save()
        }
    }
}, {
    sequelize: sequelize,
    modelName: 'User',
    timestamps: false
});

User.prototype.addLocationToGuild = async function(guildID) {
    const guildIDs = this.guildIDs

    if (!guildIDs) {
        throw new InternalServerError('Could not get your servers.')
    }

    if (guildIDs.includes(guildID)) {
        throw new BadRequestError('You have already added your location to this server.')
    }

    const guildCountries = new GuildCountries(guildID)
    const guildCountry = this.subdivisionCode ? new GuildCountry(guildID, this.countryCode) : null

    if (guildCountry) await guildCountry.sync()

    await sequelize.transaction(async (transaction) => {
        await guildCountries.increaseCountry(this.countryCode, transaction)
        await this.update({ guildIDs: [...guildIDs, guildID] }, { transaction })

        if (guildCountry && this.subdivisionCode) {
            await guildCountry.increaseSubdivision(this.subdivisionCode, transaction)
        }
    }).catch(err => {
        throw new InternalServerError('Could not save location to database.')
    })
}

User.prototype.removeLocationFromGuild = async function(guildID: string) {
    if (this.guildIDs && this.guildIDs.includes(guildID)) {
        throw new BadRequestError('You have already added your location to this server.')
    }

    const guildCountries = new GuildCountries(guildID)
    
    await sequelize.transaction(async (transaction) => {
        await guildCountries.decreaseCountry(this.countryCode, transaction)
        // @ts-ignore
        await this.update({ guildIDs: [...this.guildIDs, guildID] }, { transaction })

        if (this.subdivisionCode) {
            const guildCountry = new GuildCountry(guildID, this.countryCode)
            await guildCountry.sync()
            
            await guildCountry.decreaseSubdivision(this.subdivisionCode, transaction)
        }
    }).catch(err => {
        console.log(err)
        throw new InternalServerError('Could not save location to database.')
    })
}

User.sync()

export default User
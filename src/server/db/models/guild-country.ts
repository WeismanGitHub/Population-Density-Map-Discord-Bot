import { InternalServerError } from "../../errors";
import sequelize from "../sequelize";
import {
    DataTypes,
    InferAttributes,
    InferCreationAttributes,
    Model,
    Transaction
} from 'sequelize'

class GuildSubdivisions extends Model<InferAttributes<GuildSubdivisions>, InferCreationAttributes<GuildSubdivisions>> {
    declare subdivisionCode: string
    declare count: number
}

class GuildCountry {
    declare private model: typeof GuildSubdivisions

    constructor(guildID: string, countryCode: string) {
        this.model = GuildSubdivisions.init({
            subdivisionCode: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false
            },
            count: {
                type: DataTypes.NUMBER,
                allowNull: false,
            },
        }, {
            sequelize: sequelize,
            modelName: `${guildID}-${countryCode}`,
            timestamps: false
        });
    }

    public sync() {
        return this.model.sync()
    }

    public getSubdivisions() {
        return this.model.findAll()
    }

    public async increaseSubdivisionCount(subdivisionCode: string, transaction: Transaction) {
        const subdivision = await this.model.findOne({ where: { subdivisionCode: subdivisionCode } })

        if (!subdivision) {
            return this.model.create({ subdivisionCode, count: 1 }, { transaction })
        }

        return subdivision.update({ count: subdivision.count + 1 }, { transaction })
    }

    public async decreaseSubdivisionCount(subdivisionCode: string, transaction: Transaction) {
        const subdivision = await this.model.findOne({ where: { subdivisionCode } })

        if (!subdivision) throw new InternalServerError('Cannot decrease subdivision count.')
        
        if (subdivision.count <= 0) throw new InternalServerError('Cannot decrease further.')

        return subdivision.update({ count: subdivision.count - 1 }, { transaction })
    }
}

export default GuildCountry
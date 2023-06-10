import { DataTypes, Model } from 'sequelize'
import sequelize from "../sequelize";

class User extends Model {
    declare discordID: string
}

User.init({
    discordID: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
    },
    countryCode: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
    },
}, {
    sequelize: sequelize,
    modelName: 'User',
    timestamps: false
});

User.sync()

export default User
const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class User extends Model {
  /** Returns a plain object safe to send to clients (no password hash). */
  toPublic() {
    const { passwordHash, ...rest } = this.toJSON();
    return rest;
  }
}

User.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    role: {
      type: DataTypes.ENUM("CANDIDATE", "EMPLOYER", "ADMIN"),
      allowNull: false,
      defaultValue: "CANDIDATE",
    },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    timestamps: true,
  }
);

module.exports = User;

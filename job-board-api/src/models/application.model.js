const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class Application extends Model {}

Application.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    coverNote: { type: DataTypes.TEXT, allowNull: true },
    resumeUrl: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.ENUM("PENDING", "REVIEWED", "ACCEPTED", "REJECTED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    jobId: { type: DataTypes.UUID, allowNull: false },
    candidateId: { type: DataTypes.UUID, allowNull: false },
  },
  {
    sequelize,
    modelName: "Application",
    tableName: "applications",
    timestamps: true,
  }
);

module.exports = Application;

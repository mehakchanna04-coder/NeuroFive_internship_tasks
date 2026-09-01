const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class Job extends Model {}

Job.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    company: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    location: { type: DataTypes.STRING, allowNull: false },
    type: {
      type: DataTypes.ENUM("FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "REMOTE"),
      allowNull: false,
      defaultValue: "FULL_TIME",
    },
    salaryMin: { type: DataTypes.INTEGER, allowNull: true },
    salaryMax: { type: DataTypes.INTEGER, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    employerId: { type: DataTypes.UUID, allowNull: false },
  },
  {
    sequelize,
    modelName: "Job",
    tableName: "jobs",
    timestamps: true,
  }
);

module.exports = Job;

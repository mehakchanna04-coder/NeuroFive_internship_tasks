"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("jobs", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      title: { type: Sequelize.STRING, allowNull: false },
      company: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      location: { type: Sequelize.STRING, allowNull: false },
      type: {
        type: Sequelize.ENUM("FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "REMOTE"),
        allowNull: false,
        defaultValue: "FULL_TIME",
      },
      salaryMin: { type: Sequelize.INTEGER, allowNull: true },
      salaryMax: { type: Sequelize.INTEGER, allowNull: true },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      employerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("now") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("now") },
    });

    await queryInterface.addIndex("jobs", ["employerId"]);
    await queryInterface.addIndex("jobs", ["location"]);
    await queryInterface.addIndex("jobs", ["type"]);
    await queryInterface.addIndex("jobs", ["isActive"]);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("jobs");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jobs_type";');
  },
};

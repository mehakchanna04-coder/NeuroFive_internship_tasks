"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("applications", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      coverNote: { type: Sequelize.TEXT, allowNull: true },
      resumeUrl: { type: Sequelize.STRING, allowNull: true },
      status: {
        type: Sequelize.ENUM("PENDING", "REVIEWED", "ACCEPTED", "REJECTED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      jobId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "jobs", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      candidateId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("now") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("now") },
    });

    await queryInterface.addIndex("applications", ["jobId"]);
    await queryInterface.addIndex("applications", ["candidateId"]);
    await queryInterface.addIndex("applications", ["jobId", "candidateId"], {
      unique: true,
      name: "applications_job_candidate_unique",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("applications");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_applications_status";');
  },
};

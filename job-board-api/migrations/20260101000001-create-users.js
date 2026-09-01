"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("users", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      passwordHash: { type: Sequelize.STRING, allowNull: false },
      role: {
        type: Sequelize.ENUM("CANDIDATE", "EMPLOYER", "ADMIN"),
        allowNull: false,
        defaultValue: "CANDIDATE",
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("now") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("now") },
    });

    await queryInterface.addIndex("users", ["email"], { unique: true, name: "users_email_unique" });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("users");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";');
  },
};

'use strict';

module.exports = {
    up: function(queryInterface, Sequelize) {
        return queryInterface.createTable('users', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
            },
            username: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            password: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            remembertoken: {
                type: Sequelize.STRING,
            },
            createat: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.fn('now'),
                allowNull: false,
            },
            emailverifiedat: {
                type: Sequelize.DATE,
            },
            usernamechange: {
                type: Sequelize.STRING,
            },
            birthday: {
                type: Sequelize.DATE,
            },
            sex: {
                type: Sequelize.STRING,
            },
            country: {
                type: Sequelize.STRING,
            },
            f_delete: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
        });
    },

    down: function(queryInterface, Sequelize) {
        return queryInterface.dropTable('users');
    },
};
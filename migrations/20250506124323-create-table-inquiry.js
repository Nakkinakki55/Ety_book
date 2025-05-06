'use strict';

module.exports = {
    up: function(queryInterface, Sequelize) {
        return queryInterface.createTable('table_inquiry', {
            id: {
                type: Sequelize.BIGINT,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
            },
            registertimestamp: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.fn('now'),
                allowNull: false,
            },
            name: {
                type: Sequelize.STRING,
            },
            email: {
                type: Sequelize.STRING,
            },
            subject: {
                type: Sequelize.STRING,
            },
            inquiry: {
                type: Sequelize.TEXT,
            },
            f_delete: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
        });
    },

    down: function(queryInterface, Sequelize) {
        return queryInterface.dropTable('table_inquiry');
    },
};
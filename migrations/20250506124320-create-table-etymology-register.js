'use strict';

module.exports = {
    up: function(queryInterface, Sequelize) {
        return queryInterface.createTable('table_etymology_register', {
            id: {
                type: Sequelize.BIGINT,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
            },
            userid: {
                type: Sequelize.STRING,
            },
            registertimestamp: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.fn('now'),
                allowNull: false,
            },
            etymology: {
                type: Sequelize.STRING,
            },
            etymology_mean: {
                type: Sequelize.STRING,
            },
            etymology_relatedword01: {
                type: Sequelize.STRING,
            },
            etymology_relatedword02: {
                type: Sequelize.STRING,
            },
            etymology_relatedword03: {
                type: Sequelize.STRING,
            },
            etymology_relatedword04: {
                type: Sequelize.STRING,
            },
            etymology_relatedword05: {
                type: Sequelize.STRING,
            },
            etymology_relatedword06: {
                type: Sequelize.STRING,
            },
            etymology_relatedword07: {
                type: Sequelize.STRING,
            },
            etymology_relatedword08: {
                type: Sequelize.STRING,
            },
            etymology_relatedword09: {
                type: Sequelize.STRING,
            },
            etymology_relatedword10: {
                type: Sequelize.STRING,
            },
            etymology_relatedword11: {
                type: Sequelize.STRING,
            },
            etymology_relatedword12: {
                type: Sequelize.STRING,
            },
            etymology_memo: {
                type: Sequelize.TEXT,
            },
            f_delete: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
        });
    },

    down: function(queryInterface, Sequelize) {
        return queryInterface.dropTable('table_etymology_register');
    },
};
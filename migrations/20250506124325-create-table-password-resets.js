'use strict';

module.exports = {
    up: function(queryInterface, Sequelize) {
        return queryInterface.createTable('table_password_resets', {
            email: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            password_token: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            password_tokensentat: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.fn('now'),
            },
        });
    },

    down: function(queryInterface, Sequelize) {
        return queryInterface.dropTable('table_password_resets');
    },
};
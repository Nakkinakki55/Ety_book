'use strict';

module.exports = {
    up: async(queryInterface, Sequelize) => {
        return queryInterface.createTable('table_word_register', {
            id: {
                type: Sequelize.BIGINT,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
            },
            userid: {
                type: Sequelize.STRING(255),
            },
            registertimestamp: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.fn('NOW'),
                allowNull: false,
            },
            mainword: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            mean01: Sequelize.STRING(255),
            mean02: Sequelize.STRING(255),
            mean03: Sequelize.STRING(255),
            mean04: Sequelize.STRING(255),
            mean05: Sequelize.STRING(255),
            mean06: Sequelize.STRING(255),
            mean07: Sequelize.STRING(255),
            mean08: Sequelize.STRING(255),
            mean09: Sequelize.STRING(255),
            etymology01: Sequelize.STRING(255),
            etymology_mean01: Sequelize.STRING(255),
            etymology02: Sequelize.STRING(255),
            etymology_mean02: Sequelize.STRING(255),
            etymology03: Sequelize.STRING(255),
            etymology_mean03: Sequelize.STRING(255),
            relatedword01: Sequelize.STRING(255),
            relatedword02: Sequelize.STRING(255),
            relatedword03: Sequelize.STRING(255),
            relatedword04: Sequelize.STRING(255),
            relatedword05: Sequelize.STRING(255),
            relatedword06: Sequelize.STRING(255),
            relatedword07: Sequelize.STRING(255),
            relatedword08: Sequelize.STRING(255),
            relatedword09: Sequelize.STRING(255),
            relatedword10: Sequelize.STRING(255),
            relatedword11: Sequelize.STRING(255),
            relatedword12: Sequelize.STRING(255),
            examplesentence01: Sequelize.TEXT,
            examplesentence_jpn_01: Sequelize.TEXT,
            examplesentence_source_01: Sequelize.TEXT,
            examplesentence_url_01: Sequelize.TEXT,
            examplesentence02: Sequelize.TEXT,
            examplesentence_jpn_02: Sequelize.TEXT,
            examplesentence_source_02: Sequelize.TEXT,
            examplesentence_url_02: Sequelize.TEXT,
            examplesentence03: Sequelize.TEXT,
            examplesentence_jpn_03: Sequelize.TEXT,
            examplesentence_source_03: Sequelize.TEXT,
            examplesentence_url_03: Sequelize.TEXT,
            examplesentence04: Sequelize.TEXT,
            examplesentence_jpn_04: Sequelize.TEXT,
            examplesentence_source_04: Sequelize.TEXT,
            examplesentence_url_04: Sequelize.TEXT,
            wordregistermemo: Sequelize.TEXT,
            f_delete: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
        });
    },

    down: async(queryInterface, Sequelize) => {
        return queryInterface.dropTable('table_word_register');
    },
};
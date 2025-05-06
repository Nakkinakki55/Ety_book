'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TableWordRegisterPrt2 extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  TableWordRegisterPrt2.init({
    userid: DataTypes.STRING,
    registertimestamp: DataTypes.DATE,
    mainword: DataTypes.STRING,
    mean01: DataTypes.STRING,
    mean02: DataTypes.STRING,
    mean03: DataTypes.STRING,
    mean04: DataTypes.STRING,
    mean05: DataTypes.STRING,
    mean06: DataTypes.STRING,
    mean07: DataTypes.STRING,
    mean08: DataTypes.STRING,
    mean09: DataTypes.STRING,
    etymology01: DataTypes.STRING,
    etymology_mean01: DataTypes.STRING,
    etymology02: DataTypes.STRING,
    etymology_mean02: DataTypes.STRING,
    etymology03: DataTypes.STRING,
    etymology_mean03: DataTypes.STRING,
    relatedword01: DataTypes.STRING,
    relatedword02: DataTypes.STRING,
    relatedword03: DataTypes.STRING,
    relatedword04: DataTypes.STRING,
    relatedword05: DataTypes.STRING,
    relatedword06: DataTypes.STRING,
    relatedword07: DataTypes.STRING,
    relatedword08: DataTypes.STRING,
    relatedword09: DataTypes.STRING,
    relatedword10: DataTypes.STRING,
    relatedword11: DataTypes.STRING,
    relatedword12: DataTypes.STRING,
    examplesentence01: DataTypes.TEXT,
    examplesentence_jpn_01: DataTypes.TEXT,
    examplesentence_source_01: DataTypes.TEXT,
    examplesentence_url_01: DataTypes.TEXT,
    examplesentence02: DataTypes.TEXT,
    examplesentence_jpn_02: DataTypes.TEXT,
    examplesentence_source_02: DataTypes.TEXT,
    examplesentence_url_02: DataTypes.TEXT,
    examplesentence03: DataTypes.TEXT,
    examplesentence_jpn_03: DataTypes.TEXT,
    examplesentence_source_03: DataTypes.TEXT,
    examplesentence_url_03: DataTypes.TEXT,
    examplesentence04: DataTypes.TEXT,
    examplesentence_jpn_04: DataTypes.TEXT,
    examplesentence_source_04: DataTypes.TEXT,
    examplesentence_url_04: DataTypes.TEXT,
    wordregistermemo: DataTypes.TEXT,
    f_delete: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'TableWordRegisterPrt2',
  });
  return TableWordRegisterPrt2;
};
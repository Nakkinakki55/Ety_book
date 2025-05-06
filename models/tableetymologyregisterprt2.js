'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TableEtymologyRegisterPrt2 extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  TableEtymologyRegisterPrt2.init({
    userid: DataTypes.STRING,
    etymology: DataTypes.STRING,
    etymology_mean: DataTypes.STRING,
    etymology_relatedword01: DataTypes.STRING,
    etymology_relatedword02: DataTypes.STRING,
    etymology_relatedword03: DataTypes.STRING,
    etymology_relatedword04: DataTypes.STRING,
    etymology_relatedword05: DataTypes.STRING,
    etymology_relatedword06: DataTypes.STRING,
    etymology_relatedword07: DataTypes.STRING,
    etymology_relatedword08: DataTypes.STRING,
    etymology_relatedword09: DataTypes.STRING,
    etymology_relatedword10: DataTypes.STRING,
    etymology_relatedword11: DataTypes.STRING,
    etymology_relatedword12: DataTypes.STRING,
    etymology_memo: DataTypes.TEXT,
    f_delete: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'TableEtymologyRegisterPrt2',
  });
  return TableEtymologyRegisterPrt2;
};
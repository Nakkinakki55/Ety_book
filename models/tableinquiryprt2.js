'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TableInquiryPrt2 extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  TableInquiryPrt2.init({
    registertimestamp: DataTypes.DATE,
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    subject: DataTypes.STRING,
    inquiry: DataTypes.TEXT,
    f_delete: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'TableInquiryPrt2',
  });
  return TableInquiryPrt2;
};
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TablePasswordResetsPrt2 extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  TablePasswordResetsPrt2.init({
    email: DataTypes.STRING,
    password_token: DataTypes.STRING,
    password_tokensentat: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'TablePasswordResetsPrt2',
  });
  return TablePasswordResetsPrt2;
};
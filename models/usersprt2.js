'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UsersPrt2 extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  UsersPrt2.init({
    username: DataTypes.STRING,
    password: DataTypes.STRING,
    remembertoken: DataTypes.STRING,
    createat: DataTypes.DATE,
    emailverifiedat: DataTypes.DATE,
    usernamechange: DataTypes.STRING,
    birthday: DataTypes.DATE,
    sex: DataTypes.STRING,
    country: DataTypes.STRING,
    f_delete: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'UsersPrt2',
  });
  return UsersPrt2;
};
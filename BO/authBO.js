// bo/authBO.js
const authDAO = require("../DAO/authDAO");
require("dotenv").config();

exports.loginUser = async (email, password, isRememberMe) => {
    return await authDAO.loginUser(email, password, isRememberMe);
};

exports.registerUser = async (email, id_role) => {
    return await authDAO.registerUser(email, id_role);
};

exports.logOutUser = async (token) => {
    return await authDAO.logOutUser(token);
};

exports.verifyToken = async (token) => {
    return await authDAO.verifyToken(token);
};

exports.forgotPassword = async (email) => {
    return await authDAO.forgotPassword(email);
};

exports.changePassword = async (token, password) => {
    return await authDAO.changePassword(token, password);
};
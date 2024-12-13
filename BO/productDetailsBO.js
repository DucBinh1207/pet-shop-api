const productDAO = require("../DAO//productsDetailDAO");
require("dotenv").config();

exports.getSuppliesDetail = async (productId) => {
    return await productDAO.getSuppliesDetail(productId);
};

exports.getFoodDetail = async (foodId) => {
    return await productDAO.getFoodDetail(foodId);
};

exports.getPetDetail = async (petId) => {
    return await productDAO.getPetDetail(petId);
};
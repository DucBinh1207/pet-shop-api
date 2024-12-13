const productDAO = require("../DAO/productDAO");
require("dotenv").config();

exports.getPet = async (category, breeds, sortBy,
    minPrice, maxPrice, page, limit) => {
    return await productDAO.getPet(category, breeds, sortBy,
        minPrice, maxPrice, page, limit);
};

exports.getFood = async (ingredient, weightQuery, sortBy,
    minPrice, maxPrice, pet_type, page, limit) => {
    return await productDAO.getFood(ingredient, weightQuery, sortBy,
        minPrice, maxPrice, pet_type, page, limit);
};

exports.getSupplies = async (category, sortBy, color, size, type,
    minPrice, maxPrice, page, limit) => {
    return await productDAO.getSupplies(category, sortBy, color, size, type,
        minPrice, maxPrice, page, limit);
};

exports.searchProduct = async (name) => {
    return await productDAO.searchProduct(name);
};

exports.getBestSeller = async (amount) => {
    return await productDAO.getBestSeller(amount);
};

exports.searchProductMobile = async (name) => {
    return await productDAO.searchProductMobile(name);
};
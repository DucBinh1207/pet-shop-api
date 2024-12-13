const cartItemsDAO = require("../DAO/cartItemsDAO");
require("dotenv").config();

exports.addToCart = async (product_variant_id, category,
    quantity, userId) => {
    return await cartItemsDAO.addToCart(product_variant_id, category,
        quantity, userId);
};

exports.getCartItems = async (userId) => {
    return await cartItemsDAO.getCartItems(userId);
};

exports.getCartItemsMobile = async (userId) => {
    return await cartItemsDAO.getCartItemsMobile(userId);
};

exports.updateCart = async (userId, cartItems) => {
    return await cartItemsDAO.updateCart(userId, cartItems);
};

exports.deleteCartItems = async (userId, id_item) => {
    return await cartItemsDAO.deleteCartItems(userId, id_item);
};

exports.verifyCart = async (userId) => {
    return await cartItemsDAO.verifyCart(userId);
};

exports.verifyCart2 = async (userId, selectedIds) => {
    return await cartItemsDAO.verifyCart2(userId, selectedIds);
};
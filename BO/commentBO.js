const commentDAO = require("../DAO/commentDAO");
require("dotenv").config();

exports.addComment = async (id_product, rating, content, userId) => {
    return await commentDAO.addComment(id_product, rating, content, userId);
};

exports.getComment = async (productId) => {
    return await commentDAO.getComment(productId);
};

exports.deleteComment = async (commentId, userId) => {
    return await commentDAO.deleteComment(commentId, userId);
};
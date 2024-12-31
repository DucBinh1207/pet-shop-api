const commentDAO = require("../DAO/commentDAO");
require("dotenv").config();

exports.addComment = async (id_product, star, content, userId) => {
    return await commentDAO.addComment(id_product, star, content, userId);
};

exports.getComment = async (productId, page, limit) => {
    return await commentDAO.getComment(productId, page, limit);
};

exports.deleteComment = async (commentId, userId) => {
    return await commentDAO.deleteComment(commentId, userId);
};

exports.getTopComment = async () => {
    return await commentDAO.getTopComment();
};

exports.getCommentMobile = async (productId) => {
    return await commentDAO.getCommentMobile(productId);
};
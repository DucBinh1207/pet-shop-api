const express = require("express");
const router = express.Router();
const { client } = require("../db");
const { v4: uuidv4 } = require('uuid');

const EnrichedComment = require('../BEAN/EnrichedComment');

exports.addComment = async (id_product, rating, content, userId) => {
    try {
        await client.connect();
        const db = client.db("PBL6");
        const commentsCollection = db.collection("comments");
        const productsCollection = db.collection("products");

        // Thêm nhận xét mới
        const newComment = {
            _id: uuidv4(),
            userId,
            id_product,
            star: Number(rating),
            content,
            status: 2,
            time: new Date(),
        };

        const result = await commentsCollection.insertOne(newComment);

        if (result.insertedId) {
            // Lấy tất cả các đánh giá hợp lệ
            const validComments = await commentsCollection
                .find({ id_product, status: { $in: [1, 2] } })
                .toArray();

            // Tính trung bình với xử lý số học chính xác
            const totalStars = validComments.reduce((sum, comment) => {
                const starValue = Number(comment.star);
                return sum + (isNaN(starValue) ? 0 : starValue);
            }, 0);

            const averageStar = validComments.length > 0
                ? Number((totalStars / validComments.length).toFixed(1))
                : 0;

            // Cập nhật điểm đánh giá trung bình của sản phẩm
            const updateResult = await productsCollection.updateOne(
                { _id: id_product },
                { $set: { rating: averageStar } }
            );

            if (updateResult.modifiedCount > 0) {
                return {
                    status: 201,
                };
            } else {
                return {
                    status: 200,
                };
            }
        } else {
            return {
                status: 400,
            };
        }
    } catch (err) {
        console.error("Error adding comment:", err);
        return {
            status: 500,
            message: "Internal server error" 
        };
    } finally {
        await client.close();
    }
};

exports.getComment = async (productId) => {
    try {
        await client.connect();
        const db = client.db("PBL6");
        const commentsCollection = db.collection("comments");
        const usersCollection = db.collection("users");

        // Lấy tất cả các comments có id_product tương ứng từ database
        const comments = await commentsCollection.find({ id_product: productId }).toArray();

        if (comments.length === 0) {
            return {
                status: 404,
                message: "No comments found for this product."
            };
        }

        // Lấy thông tin user tương ứng cho mỗi comment
        const enrichedComments = await Promise.all(comments.map(async (comment) => {
            const user = await usersCollection.findOne({ _id: comment.userId });
            return new EnrichedComment(comment, user);
        }));

        // Trả về danh sách comment đã được làm giàu dữ liệu user
        return {
            status: 200,
            enrichedComments
        };
    } catch (err) {
        console.error("Error fetching comments:", err);
        return {
            status: 500,
            message: "Internal server error"
        };
    } finally {
        await client.close();
    }
};

exports.deleteComment = async (commentId, userId) => {
    try {
        await client.connect();
        const db = client.db("PBL6");
        const commentsCollection = db.collection("comments");
        // Tìm comment theo `commentId`
        const comment = await commentsCollection.findOne({ _id: commentId });

        // Kiểm tra comment có tồn tại không
        if (!comment) {
            return {
                status: 404,
                message: "Comment not found"
            };
        }

        // Kiểm tra `userId` của comment có khớp với `userId` của người gửi yêu cầu không
        if (comment.userId.toString() !== userId) {
            return {
                status: 400,
                message: "You are not authorized to delete this comment"
            };
        }

        // Xóa comment
        await commentsCollection.deleteOne({ _id: commentId });

        return {
            status: 200,
        };

    } catch (error) {
        console.error("Error deleting comment:", error);
        return {
            status: 500,
            message: "Internal server error",
            error: error
        };
    }
};

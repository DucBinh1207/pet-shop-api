const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getClient } = require("../db");
const EnrichedComment = require('../BEAN/EnrichedComment');

exports.addComment = async (id_product, rating, content, userId) => {
    try {
        const client = getClient();
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
    }
};

exports.getComment = async (productId, page = 1, limit = 10) => {
    try {
        const client = getClient();
        const db = client.db("PBL6");
        const commentsCollection = db.collection("comments");
        const usersCollection = db.collection("users");

        page = parseInt(page, 10);
        limit = parseInt(limit, 10);

        // Tính toán offset
        const skip = (page - 1) * limit;

        // Lấy các comments có id_product tương ứng từ database với phân trang
        const comments = await commentsCollection
            .find({ id_product: productId })
            .skip(skip) // Bỏ qua các bình luận trước đó
            .limit(limit) // Giới hạn số lượng bình luận trả về
            .toArray();

        // Kiểm tra nếu không có bình luận
        if (comments.length === 0) {
            return {
                status: 200,
                currentPage: page,
                limit
            };
        }

        // Lấy thông tin user tương ứng cho mỗi comment
        const enrichedComments = await Promise.all(comments.map(async (comment) => {
            const user = await usersCollection.findOne({ _id: comment.userId });
            return new EnrichedComment(comment, user);
        }));

        // Đếm tổng số comments để trả thêm thông tin về tổng số trang
        const totalComments = await commentsCollection.countDocuments({ id_product: productId });
        const totalPages = Math.ceil(totalComments / limit);

        // Trả về danh sách comment đã được làm giàu dữ liệu user và thông tin phân trang
        return {
            status: 200,
            enrichedComments,
            currentPage: page,
            totalPages,
            limit
        };
    } catch (err) {
        console.error("Error fetching comments:", err);
        return {
            status: 500,
            message: "Internal server error"
        };
    }
};

exports.deleteComment = async (commentId, userId) => {
    try {
        const client = getClient();
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

exports.getTopComment = async () => {
    try {
        const client = getClient();
        const db = client.db("PBL6");
        const commentsCollection = db.collection("comments");
        const usersCollection = db.collection("users");

        // Lấy tối đa 5 comments có số đánh giá cao nhất
        const topComments = await commentsCollection
            .find({}) // Không lọc theo sản phẩm
            .sort({ star: -1 }) // Sắp xếp theo rating giảm dần
            .limit(5) // Giới hạn chỉ lấy 5 bình luận
            .toArray();

        // Kiểm tra nếu không có bình luận
        if (topComments.length === 0) {
            return {
                status: 200,
                message: "No comments found",
                enrichedComments: [],
            };
        }

        // Lấy thông tin user tương ứng cho mỗi comment
        const enrichedComments = await Promise.all(topComments.map(async (comment) => {
            const user = await usersCollection.findOne({ _id: comment.userId });
            return new EnrichedComment(comment, user);
        }));

        // Trả về danh sách comment đã được làm giàu dữ liệu user
        return {
            status: 200,
            enrichedComments,
        };
    } catch (err) {
        console.error("Error fetching top comments:", err);
        return {
            status: 500,
            message: "Internal server error",
        };
    }
};

exports.getCommentMobile = async (productId, page = 1, limit = 10) => {
    try {
        const client = getClient();
        const db = client.db("PBL6");
        const commentsCollection = db.collection("comments");
        const usersCollection = db.collection("users");

        // Lấy các comments có id_product tương ứng từ database với phân trang
        const comments = await commentsCollection
            .find({ id_product: productId })
            .toArray();

        // Kiểm tra nếu không có bình luận
        if (comments.length === 0) {
            return {
                status: 200,
            };
        }

        // Lấy thông tin user tương ứng cho mỗi comment
        const enrichedComments = await Promise.all(comments.map(async (comment) => {
            const user = await usersCollection.findOne({ _id: comment.userId });
            return new EnrichedComment(comment, user);
        }));

        // Trả về danh sách comment đã được làm giàu dữ liệu user và thông tin phân trang
        return {
            status: 200,
            enrichedComments,

        };
    } catch (err) {
        console.error("Error fetching comments:", err);
        return {
            status: 500,
            message: "Internal server error"
        };
    }
};

const commentBO = require("../BO/commentBO");

exports.addComment = async (req, res) => {
    const { id_product, rating, content } = req.body;
    const userId = req.user.userId;
    try {
        const result = await commentBO.addComment(id_product, rating, content, userId);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json();
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}

exports.getComment = async (req, res) => {
    const productId = req.params.id_product;
    try {
        const result = await commentBO.getComment(productId);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json(result.enrichedComments);
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}

exports.deleteComment = async (req, res) => {
    const {id} = req.body;
    const userId = req.user.userId;
    try {
        const result = await commentBO.deleteComment(id, userId);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json();
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}
// controllers/cartItemsController.js
const cartItemsBO = require("../BO/cartItemsBO");

exports.addToCart = async (req, res) => {
    const { product_variant_id, category, quantity } = req.body;
    const userId = req.user.userId;  // Lấy id_user từ token sau khi xác thực
    console.log(req.body);
    try {
        const result = await cartItemsBO.addToCart(product_variant_id, category,
            quantity, userId);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
                const a = result.message;
                console.log({a});
            } else {
                res.status(result.status).json();
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getCartItems = async (req, res) => {
    const userId = req.user.userId;
    try {
        const result = await cartItemsBO.getCartItems(userId);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json(result.completeCartItems);
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getCartItemsMobile = async (req, res) => {
    const userId = req.user.userId;
    try {
        const result = await cartItemsBO.getCartItemsMobile(userId);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json(result.completeCartItems);
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.updateCart = async (req, res) => {
    const userId = req.user.userId; // Lấy id_user từ token
    const cartItems = req.body; // Nhận danh sách cart items cần cập nhật
    try {
        const result = await cartItemsBO.updateCart(userId, cartItems);

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
};

exports.deleteCartItems = async (req, res) => {
    const userId = req.user.userId; // Lấy id_user từ token
    const { id_item } = req.body; // Nhận id của item cần xóa từ body request
    try {
        const result = await cartItemsBO.deleteCartItems(userId, id_item);

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

exports.verifyCart = async (req, res) => {
    const userId = req.user.userId; // Lấy id_user từ token
    try {
        const result = await cartItemsBO.verifyCart(userId);

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

exports.verifyCart2 = async (req, res) => {
    const userId = req.user.userId; // Lấy id_user từ token
    const { selectedIds } = req.body;
    console.log({selectedIds});
    try {
        const result = await cartItemsBO.verifyCart2(userId, selectedIds);

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
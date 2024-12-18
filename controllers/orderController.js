const orderBO = require("../BO/orderBO");

exports.getOrder = async (req, res) => {
    const id_user = req.user.userId; // Lấy id_user từ token
    try {
        const result = await orderBO.getOrder(id_user);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json(result.customOrders);
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}

exports.getOrderDetail = async (req, res) => {
    const id_order = req.query.id_order; // Lấy id_order từ query parameters
    try {
        const result = await orderBO.getOrderDetail(id_order);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json(result.orderInfo);
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}

exports.createOrder = async (req, res) => {
    const id_user = req.user.userId;
    const {
        name,
        telephone_number,
        email,
        total_price,
        shipping_price,
        subtotal_price,
        province,
        district,
        ward,
        street,
        voucher_code,
        payment_method,
        note
    } = req.body;
    try {
        const result = await orderBO.createOrder(
            id_user,
            name,
            telephone_number,
            email,
            total_price,
            shipping_price,
            subtotal_price,
            province,
            district,
            ward,
            street,
            voucher_code,
            payment_method,
            note);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json({
                    id_order: result.id_order,
                    amount: result.amount});
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}

exports.getOrderItems = async (req, res) => {
    const id_order = req.query.id_order;
    try {
        const result = await orderBO.getOrderItems(id_order);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json(result.completeOrderItems);
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}

exports.webGetOrder = async (req, res) => {
    const id_order = req.query.id_order; // Lấy id_order từ query parameters
    try {
        const result = await orderBO.webGetOrder(id_order);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json({order: result.order});
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}

exports.buyNow = async (req, res) => {
    const userId = req.user.userId;
    const {
        product_variant_id,
        category,
        quantity
    } = req.body;
    try {
        const result = await orderBO.buyNow(userId, product_variant_id, category, quantity);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json({quantity: result.quantityToReturn});
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}

exports.getOrderMobile = async (req, res) => {
    const id_user = req.user.userId; // Lấy id_user từ token
    try {
        const result = await orderBO.getOrderMobile(id_user);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json(result.customOrders);
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}
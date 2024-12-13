const productBO = require("../BO/productDetailsBO");

exports.getSuppliesDetail = async (req, res) => {
    try {
        const productId = req.params.id;
        const result = await productBO.getSuppliesDetail(productId);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json(result.response);
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}

exports.getFoodDetail = async (req, res) => {
    try {
        const foodId = req.params.id; // Lấy ID từ tham số URL
        const result = await productBO.getFoodDetail(foodId);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json(result.responseData);
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}

exports.getPetDetail = async (req, res) => {
    try {
        const petId = req.params.id; 
        const result = await productBO.getPetDetail(petId);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json(result.responseData);
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}
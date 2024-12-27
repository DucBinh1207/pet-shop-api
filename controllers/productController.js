const productBO = require("../BO/productBO");

exports.getPet = async (req, res) => {
    const category = req.query.category || 'all';
    const breeds = req.query.breeds ? req.query.breeds.split(',') : [];
    const sortBy = req.query.sortBy || 'default';
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    try {
        const result = await productBO.getPet(category, breeds, sortBy,
            minPrice, maxPrice, page, limit);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json(
                    {
                        products: result.products,
                        currentPage: result.currentPage,
                        totalPages: result.totalPages,
                        limit: result.limit,
                    });
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}

exports.getFood = async (req, res) => {
    const ingredient = req.query.ingredient?.toLowerCase() || 'all';
    const weightQuery = req.query.weight || 'all';
    const sortBy = req.query.sortBy || 'default';
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
    const type = req.query.type || 'all';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    try {
        const result = await productBO.getFood(ingredient, weightQuery, sortBy,
            minPrice, maxPrice, type, page, limit);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json(
                    {
                        products: result.products,
                        currentPage: result.currentPage,
                        totalPages: result.totalPages,
                        limit: result.limit,
                    });
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}

exports.getSupplies = async (req, res) => {
    const category = req.query.category?.toLowerCase() || 'all';
    const sortBy = req.query.sortBy || 'default';
    const color = req.query.color?.toLowerCase();
    const size = req.query.size?.toLowerCase();
    const type = req.query.type?.toLowerCase(); // Thêm type vào query parameters
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    try {
        const result = await productBO.getSupplies(category, sortBy, color, size, type,
            minPrice, maxPrice, page, limit);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json(
                    {
                        products: result.products,
                        currentPage: result.currentPage,
                        totalPages: result.totalPages,
                        limit: result.limit,
                    });
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}

exports.searchProduct = async (req, res) => {
    const name = req.query.name; // Lấy giá trị name từ query string

    if (!name) {
        return res.status(400).json();
    }
    try {
        const result = await productBO.searchProduct(name);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json(
                    result.customProducts
                );
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}

exports.getBestSeller = async (req, res) => {
    const amount = parseInt(req.query.amount); // Chuyển đổi giá trị amount sang số nguyên

    if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount parameter' });
    }
    try {
        const result = await productBO.getBestSeller(amount);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json(
                    {bestSellers: result.bestSellers}
                );
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}

exports.searchProductMobile = async (req, res) => {
    const name = req.query.name; // Lấy giá trị name từ query string

    if (!name) {
        return res.status(400).json();
    }
    try {
        const result = await productBO.searchProductMobile(name);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json(
                    result.customProducts
                );
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}
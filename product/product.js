const { client } = require("../db");

//Check sp có status = 1 và quantity > 0
async function checkValidProduct(id_product_variant, category) {
    try {
        await client.connect();
        const db = client.db("PBL6");

        // Lấy thông tin từ collection dựa trên category
        let product;
        if (category === "foods") {
            product = await db.collection("foods").findOne({ _id: id_product_variant });
        } else if (category === "supplies") {
            product = await db.collection("supplies").findOne({ _id: id_product_variant });
        } else if (category === "pets") {
            product = await db.collection("pets").findOne({ _id: id_product_variant });
        }

        if (product && product.status === 1 && product.quantity > 0) {
            return { success: true };
        }

        return { success: false, message: "Sản phẩm đã bị xóa hoặc đã hết hàng." };
    } catch (err) {
        console.error("Error checking product validity:", err);
        return { success: false, message: "Lỗi kiểm tra sản phẩm." };
    }
}
//Check sp có số lượng tồn kho lớn hơn quantity đưa vào
async function checkProductStockForCart(id_product_variant, category, quantity) {
    try {
        await client.connect();
        const db = client.db("PBL6");

        // Lấy thông tin từ collection dựa trên category
        let product;
        if (category === "foods") {
            product = await db.collection("foods").findOne({ _id: id_product_variant });
        } else if (category === "supplies") {
            product = await db.collection("supplies").findOne({ _id: id_product_variant });
        } else if (category === "pets") {
            product = await db.collection("pets").findOne({ _id: id_product_variant });
        }

        if (product && product.quantity > quantity) {
            return { success: true };
        }

        return { success: false, message: "Sản phẩm không đủ hàng để thêm vào giỏ." };
    } catch (err) {
        console.error("Error checking product validity:", err);
        return { success: false, message: "Lỗi kiểm tra sản phẩm." };
    }
}
//Check sp có số lượng tồn kho > 0 
async function checkProductStock(id_product_variant, category) {
    try {
        await client.connect();
        const db = client.db("PBL6");

        // Lấy thông tin từ collection dựa trên category
        let product;
        if (category === "foods") {
            product = await db.collection("foods").findOne({ _id: id_product_variant });
        } else if (category === "supplies") {
            product = await db.collection("supplies").findOne({ _id: id_product_variant });
        } else if (category === "pets") {
            product = await db.collection("pets").findOne({ _id: id_product_variant });
        }

        if (product && product.quantity > 0) {
            return {
                success: true,
                availableQuantity: product.quantity 
            };
        }

        return { success: false, message: "Sản phẩm đã hết hàng." };
    } catch (err) {
        console.error("Error checking product validity:", err);
        return { success: false, message: "Lỗi kiểm tra sản phẩm." };
    }
}
//Check sp bị xóa chưa status = 1
async function checkProductAvailability(id_product_variant, category) {
    try {
        await client.connect();
        const db = client.db("PBL6");

        // Lấy thông tin từ collection dựa trên category
        let product;
        if (category === "foods") {
            product = await db.collection("foods").findOne({ _id: id_product_variant });
        } else if (category === "supplies") {
            product = await db.collection("supplies").findOne({ _id: id_product_variant });
        } else if (category === "pets") {
            product = await db.collection("pets").findOne({ _id: id_product_variant });
        }

        if (product && product.status === 1) {
            return { success: true };
        }

        return { success: false, message: "Sản phẩm đã bị xóa." };
    } catch (err) {
        console.error("Error checking product validity:", err);
        return { success: false, message: "Lỗi kiểm tra sản phẩm." };
    }
}
module.exports = {
    checkValidProduct,
    checkProductStockForCart,
    checkProductStock,
    checkProductAvailability
};

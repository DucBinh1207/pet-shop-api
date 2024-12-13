const { getClient } = require("../db");
const redisClient = require("../middleware/redisClient");
const redis = redisClient.init();

//Check sp có status = 1 và quantity > 0
async function checkValidProduct(id_product_variant, category) {
    try {
        const client = getClient();
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
        const client = getClient();
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
        const client = getClient();
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
        const client = getClient();
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
//Giữ hàng cho user khi checkout tim xem user ton tai chua
async function reserveStockForUser(id_user, cartItems) {
    try {
        const cartKey = process.env.PREFIX_RESERVED_STOCK + id_user;
        const cartKeyLater = process.env.PREFIX_RESERVED_STOCK_LATER + id_user;
        const cartData = JSON.stringify(cartItems); // Convert cartItems thành JSON string

        // Kiểm tra xem key đã tồn tại chưa, nếu có thì hoàn lại hàng trước khi xóa
        const exists = await redis.exists(cartKey);
        if (exists) {
            // Trước khi xóa, hoàn lại hàng
            const oldCartData = await redis.get(cartKey);  // Lấy dữ liệu cũ
            await returnStock(cartKey, oldCartData);  // Gọi hàm hoàn lại hàng
            await redis.del(cartKey);  // Xóa key cũ
        }

        await redis.del(cartKeyLater);  // Xóa key cũ


        // Lưu vào Redis với thời gian hết hạn là 5 giây cho cartKey và 7 giây cho cartKeyLater
        await redis.set(cartKey, cartData, { EX: 300 }); // 5 phút = 300 giây
        await redis.set(cartKeyLater, cartData, { EX: 310 }); // 5 phút 10 giây = 310 giây

        return { success: true, message: "Stock reserved successfully." };
    } catch (err) {
        console.error("Lỗi giữ hàng", err);
        return { success: false, message: "Lỗi giữ hàng." };
    }
}
//Route check ko cần dùng
async function checkReservedStock(id_user) {
    try {
        const cartKey = process.env.PREFIX_RESERVED_STOCK + id_user;

        // Lấy dữ liệu từ Redis
        const cartData = await redis.get(cartKey);

        if (!cartData) {
            return { success: false, message: "Record has expired or does not exist." };
        }

        // Parse JSON data từ Redis
        const cartItems = JSON.parse(cartData);

        return {
            success: true,
            message: "Record is still valid.",
            data: cartItems,
        };
    } catch (err) {
        console.error("Error checking reserved stock:", err);
        return { success: false, message: "Error checking reserved stock.", error: err };
    }
}
//Trả hàng khi hết thời gian
async function returnStock(expiredKey, data) {
    try {
        // Nếu data là null, xóa key Redis và trả về
        if (data === null) {
            await redis.del(expiredKey);
            return { success: true, message: "Data null" };
        }
        let reservedItems = JSON.parse(data);

        if (!Array.isArray(reservedItems)) {
            // Nếu là đối tượng, chuyển đối tượng đó thành mảng với cấu trúc { product_variant_id, category, quantity }
            if (typeof reservedItems === 'object') {
                reservedItems = [reservedItems]; // Chuyển đối tượng thành mảng với 1 phần tử là đối tượng đó
            } else {
                console.log("Dữ liệu không hợp lệ:", reservedItems);
                return res.status(400).json();
            }
        }
        // Nếu data là một đối tượng, chuyển nó thành mảng để xử lý chung
        // const reservedItems = Array.isArray(data) ? data : [data];

        for (const item of reservedItems) {
            let collectionName;

            switch (item.category) {
                case "pets":
                    collectionName = "pets";
                    break;
                case "foods":
                    collectionName = "foods";
                    break;
                case "supplies":
                    collectionName = "supplies";
                    break;
                default:
                    console.log(`Danh mục không hợp lệ: ${item.category}`);
                    continue;
            }
            const numericQuantity = Number(item.quantity);
            if (isNaN(numericQuantity)) {
                console.log("Quantity không phải là số hợp lệ:", quantity);
            }
            // Trả lại số lượng vào tồn kho
            await client.db("PBL6").collection(collectionName).updateOne(
                { _id: item.product_variant_id },
                { $inc: { quantity: numericQuantity } }
            );
            console.log(`Đã trả lại ${item.quantity} cho sản phẩm ${item.product_variant_id}`);
        }

        // Xóa key Redis (nếu chưa bị xóa bởi TTL)
        await redis.del(expiredKey);

    } catch (err) {
        console.error("Lỗi khi trả lại tồn kho:", err);
    }
}


module.exports = {
    checkValidProduct,
    checkProductStockForCart,
    checkProductStock,
    checkProductAvailability,
    reserveStockForUser,
    checkReservedStock,
    returnStock
};

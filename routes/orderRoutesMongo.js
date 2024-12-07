const express = require('express');
const router = express.Router();
const redisClient = require("../middleware/redisClient");
const redis = redisClient.init();

// Middleware để parse JSON body
router.use(express.json());
const { authenticateToken } = require("../middleware/authenticateToken");
const { client } = require("../db");
const {
    checkValidProduct,
    checkProductStockForCart,
    reserveStockForUser,
} = require("../product/product");

// Lấy danh sách đơn hàng của 1 user
router.get('/orders/user', authenticateToken, async (req, res) => {
    const id_user = req.user.userId; // Lấy id_user từ token
    try {
        await client.connect();
        const db = client.db("PBL6"); // Kết nối tới database "PBL6"
        const ordersCollection = db.collection('orders'); // Truy cập vào collection 'orders'

        // Truy vấn các đơn hàng của user từ MongoDB
        const orders = await ordersCollection
            .find({ id_user: id_user, status: { $ne: 0 } })
            .sort({ date: -1 }) // Sắp xếp giảm dần theo createdAt (mới nhất lên đầu)
            .toArray();

        if (orders.length === 0) {
            return res.status(404).json({ message: 'Không có đơn hàng nào' });
        }
        // Custom tên trường trả về
        const customOrders = orders.map(order => ({
            id: order._id,
            name: order.name,
            telephone_number: order.telephone_number,
            email: order.email,
            total_price: order.total_price,
            shipping_price: order.shipping_price,
            subtotal_price: order.subtotal_price,
            date_created: order.date,
            province: order.province,
            district: order.district,
            ward: order.ward,
            street: order.street,
            voucher_code: order.voucher_code,
            payment_method: order.payment_method,
            note: order.note,
            status: order.status
        }));

        return res.status(200).json(customOrders);
    } catch (err) {
        console.error("Lỗi khi lấy đơn hàng:", err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
// Lấy thông tin 1 order của user từ id_order
router.get('/orders/user/detail', authenticateToken, async (req, res) => {
    const id_order = req.query.id_order; // Lấy id_order từ query parameters
    console.log("id_order: " + id_order);

    try {
        await client.connect();
        const db = client.db("PBL6"); // Kết nối đến database "PBL6"
        const ordersCollection = db.collection('orders'); // Truy cập collection "orders"

        // Tìm kiếm đơn hàng dựa trên id_order trong MongoDB
        const order = await ordersCollection.findOne({ _id: id_order });

        if (!order) {
            console.log("Không tìm thấy order với id: " + id_order);
            return res.status(404).json({ message: 'Đơn hàng không tìm thấy' });
        }

        // Chuẩn bị thông tin đơn hàng để trả về
        const orderInfo = {
            id: order._id,
            date_created: order.date,
            status: order.status,
            subtotal_price: order.subtotal_price,
            shipping_price: order.shipping_price,
            total_price: order.total_price,
            payment_method: order.payment_method,
            note: order.note,
            name: order.name,
            telephone_number: order.telephone_number,
            email: order.email,
            nationality: order.nationality,
            province: order.province,
            district: order.district,
            ward: order.ward,
            street: order.street
        };

        // Gửi thông tin đơn hàng dưới dạng JSON
        res.status(200).json(orderInfo);

    } catch (error) {
        console.error("Lỗi khi lấy thông tin đơn hàng:", error);
        return res.status(500).json({ message: 'Lỗi server khi lấy thông tin đơn hàng' });
    }
});
// Đặt hàng
router.post('/orders/create', authenticateToken, async (req, res) => {
    const id_user = req.user.userId;

    const cartKey = process.env.PREFIX_RESERVED_STOCK + id_user;
    const cartKeyLater = process.env.PREFIX_RESERVED_STOCK_LATER + id_user;
    try {
        let products;
        // Kiểm tra xem có dữ liệu trong Redis hay không
        const exists = await redis.exists(cartKey);
        if (exists) {
            // Lấy dữ liệu từ Redis
            const reservedStockData = await redis.get(cartKey);
            products = JSON.parse(reservedStockData); // Giả sử dữ liệu lưu dưới dạng JSON

            if (!products || products.length === 0) {
                console.log("Không có sản phẩm nào trong giỏ hàng");
                return res.status(400).json({ message: "Không có sản phẩm nào trong giỏ hàng" });
            }
            console.log("Dữ liệu giỏ hàng:", products);

            // Xóa key cũ sau khi lấy dữ liệu
            await redis.del(cartKey);
        } else {
            console.log("Hết thời gian giữ hàng");
            return res.status(400).json({ message: "Hết thời gian giữ hàng" });
        }

        // Xóa dữ liệu giữ hàng tạm (cartKeyLater)
        await redis.del(cartKeyLater);

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

        // Kiểm tra dữ liệu đầu vào
        const missingFields = [];
        if (!name) missingFields.push('name');
        if (!telephone_number) missingFields.push('telephone_number');
        if (!email) missingFields.push('email');
        if (!total_price) missingFields.push('total_price');
        if (!shipping_price) missingFields.push('shipping_price');
        if (!province) missingFields.push('province');
        if (!district) missingFields.push('district');
        if (!ward) missingFields.push('ward');
        if (!street) missingFields.push('street');
        if (!payment_method) missingFields.push('payment_method');

        if (missingFields.length > 0) {
            console.log("Các trường bị thiếu:", missingFields.join(', '));
            return res.status(400).json({ message: `Các trường bị thiếu: ${missingFields.join(', ')}` });
        }

        await client.connect();
        const db = client.db("PBL6"); // Kết nối tới cơ sở dữ liệu MongoDB
        const ordersCollection = db.collection('orders');
        const vouchersCollection = db.collection('vouchers');

        if (voucher_code) {
            const voucher = await vouchersCollection.findOne({ code: voucher_code, status: 1 });
            if (!voucher) {
                console.log("Voucher không tồn tại");
                return res.status(400).json();
            }
            if (voucher.quantity <= 0) {
                console.log("Voucher đã hết");
                return res.status(400).json();
            }
            // Trừ 1 số lượng voucher
            await vouchersCollection.updateOne(
                { code: voucher_code },
                { $inc: { quantity: -1 } }
            );
            console.log("Đã trừ số lượng voucher");
        }

        const orderItemsCollection = db.collection('order_items');
        const paymentsCollection = db.collection('payments');

        // Tạo đơn hàng mới
        const newOrder = {
            _id: Date.now().toString(),
            id_user: id_user,
            name: name,
            telephone_number: telephone_number,
            email: email,
            total_price: total_price,
            shipping_price: shipping_price,
            subtotal_price: subtotal_price,
            date: new Date(),
            province: province,
            district: district,
            ward: ward,
            street: street,
            voucher_code: voucher_code || null,
            payment_method: payment_method,
            note: note || null,
            status: 5
        };
        // 6: đơn hàng đang chờ xác nhận
        // 5: đơn hàng đã được đặt
        // 4: đơn hàng đang được chuẩn bị
        // 3: đơn hàng đang được vận chuyển
        // 2: đơn hàng đang được giao tới bạn
        // 1: đơn hàng đã giao thành công
        // 0: đơn hàng đã bị hủy
        // 5 6 4 3 2 1
        const orderResult = await ordersCollection.insertOne(newOrder);
        const id_order = orderResult.insertedId;

        if (!Array.isArray(products)) {
            if (typeof products === 'object') {
                products = [products];
            } else {
                console.log("Dữ liệu không hợp lệ:", products);
                return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
            }
        }
        console.log("Dữ liệu giỏ hàng sau khi chuyển:", products);

        const orderItems = await Promise.all(
            products.map(async (product) => {
                let option = {};

                // Lấy thông tin chi tiết sản phẩm dựa trên category
                if (product.category === "pets") {
                    const pet = await db.collection("pets").findOne({ _id: product.product_variant_id });
                    const productInfo = await db.collection("products").findOne({ _id: pet.id_product });
                    if (pet && productInfo) {
                        option = {
                            id_product: productInfo._id,
                            name: productInfo.name,
                            price: pet.price,
                        };
                        // Tăng sold
                        await db.collection("products").updateOne(
                            { _id: pet.id_product },
                            { $inc: { sold: product.quantity } }
                        );
                    }
                } else if (product.category === "foods") {
                    const food = await db.collection("foods").findOne({ _id: product.product_variant_id });
                    const productInfo = await db.collection("products").findOne({ _id: food.id_product });
                    if (food) {
                        option = {
                            id_product: productInfo._id,
                            name: productInfo.name,
                            ingredient: food.ingredient,
                            weight: food.weight,
                            price: food.price,
                        };
                        // Tăng sold
                        await db.collection("products").updateOne(
                            { _id: food.id_product },
                            { $inc: { sold: product.quantity } }
                        );
                    }
                } else if (product.category === "supplies") {
                    const supplies = await db.collection("supplies").findOne({ _id: product.product_variant_id });
                    const productInfo = await db.collection("products").findOne({ _id: supplies.id_product });
                    if (supplies) {
                        option = {
                            id_product: productInfo._id,
                            name: productInfo.name,
                            color: supplies.color,
                            size: supplies.size,
                            price: supplies.price,
                        };
                        // Tăng sold
                        await db.collection("products").updateOne(
                            { _id: supplies.id_product },
                            { $inc: { sold: product.quantity } }
                        );
                    }
                }

                // Trả về một object order_item
                return {
                    id_order: id_order.toString(),
                    category: product.category,
                    quantity: product.quantity,
                    option: option,
                };
            })
        );

        // Lưu tất cả order_items vào MongoDB
        await orderItemsCollection.insertMany(orderItems);
        console.log("Đã thêm order items với option");

        // Xóa cartItems có product_variant_id tương ứng trong bảng cart_items
        const productVariantIds = products.map(product => product.product_variant_id);
        await db.collection('cart_items').deleteMany({ product_variant_id: { $in: productVariantIds } });
        console.log("Đã xóa các cart items");

        // Tạo bản ghi payment mới trong collection `payments`
        const newPayment = {
            _id: Date.now().toString(),
            id_order: id_order.toString(),
            date_created: new Date(),
            payment_at: null,
            amount: total_price,
            method: payment_method,
            status: 2
        };
        // 1: Thanh toán thành công
        // 2: Chờ thanh toán
        // 3: Thanh toán thất bại
        await paymentsCollection.insertOne(newPayment);
        console.log("Đã tạo bản ghi payment");

        res.status(201).json({ id_order: id_order.toString() });

    } catch (error) {
        console.error('Lỗi tạo order', error);
        res.status(500).json({ message: "Lỗi máy chủ", error });
    }
});
// Lấy danh sách order items của 1 order dựa trên id_order
router.get('/orders/user/items', authenticateToken, async (req, res) => {
    const id_order = req.query.id_order;

    // Kiểm tra xem id_order có được cung cấp không
    if (!id_order) {
        return res.status(400).json({ message: 'Vui lòng cung cấp id_order' });
    }

    try {
        await client.connect();
        const db = client.db("PBL6"); // Kết nối đến database "PBL6"
        const orderItemsCollection = db.collection('order_items'); // Truy cập collection "order_items"

        // Lấy thông tin các order items từ id_order
        const orderItems = await orderItemsCollection.find({ id_order: id_order }).toArray();

        if (!orderItems || orderItems.length === 0) {
            return res.status(400).json();
        }

        const completeOrderItems = await Promise.all(orderItems.map(async (item) => {
            let completeItem = {
                id: item._id.toString(),
                id_product: item.option.id_product,
                category: item.category,
                quantity: item.quantity,
                // Dữ liệu mặc định
                ingredient: "",
                weight: "",
                size: "",
                color: "",
                name: item.option.name,  // Lấy name từ option
                price: item.option.price,  // Lấy price từ option
                image: ""   // Lấy image từ option
            };

            // Lấy thông tin sản phẩm từ bảng "products" dựa trên id_product
            const product = await db.collection("products").findOne({ _id: item.option.id_product });

            if (product) {
                completeItem.image = product.image;  // Lấy image từ sản phẩm
            }
            // Dựa trên category, lấy thêm các thông tin khác từ option
            if (item.category === "foods") {
                completeItem.ingredient = item.option.ingredient;  // Lấy ingredient từ option
                completeItem.weight = item.option.weight;  // Lấy weight từ option 
            } else if (item.category === "supplies") {
                completeItem.color = item.option.color;  // Lấy color từ option
                completeItem.size = item.option.size;  // Lấy size từ option
            }

            return completeItem;
        }));

        // Trả về danh sách order items dưới dạng JSON
        res.status(200).json(completeOrderItems);

    } catch (error) {
        console.error("Lỗi khi lấy sản phẩm cho đơn hàng:", error);
        return res.status(500).json({ message: 'Lỗi server khi lấy sản phẩm cho đơn hàng' });
    }
});
// Web gọi API này để lấy thông tin chi tiết order
router.get('/orders/user/details', authenticateToken, async (req, res) => {
    const id_order = req.query.id_order; // Lấy id_order từ query parameters

    if (!id_order) {
        return res.status(400).json({ message: 'Vui lòng cung cấp id_order' });
    }

    try {
        await client.connect();
        const db = client.db("PBL6"); // Kết nối đến database "PBL6"
        const ordersCollection = db.collection('orders'); // Truy cập collection "orders"
        const orderItemsCollection = db.collection('order_items'); // Truy cập collection "order_items"

        // Tìm kiếm đơn hàng dựa trên id_order trong MongoDB
        const order = await ordersCollection.findOne({ _id: id_order });

        if (!order) {
            console.log("Không tìm thấy order với id: " + id_order);
            return res.status(404).json({ message: 'Đơn hàng không tìm thấy' });
        }

        // Lấy danh sách sản phẩm trong đơn hàng
        const orderItems = await orderItemsCollection.find({ id_order: id_order }).toArray();

        // Chuẩn bị thông tin chi tiết của các sản phẩm trong đơn hàng
        const completeOrderItems = await Promise.all(orderItems.map(async (item) => {
            let completeItem = {
                id: item._id.toString(),
                id_product: item.option.id_product,
                category: item.category,
                quantity: item.quantity,
                ingredient: "",
                weight: "",
                size: "",
                color: "",
                name: item.option.name,  // Lấy name từ option
                price: item.option.price,  // Lấy price từ option
                image: ""
            };

            // Lấy thông tin sản phẩm từ bảng "products" dựa trên id_product
            const product = await db.collection("products").findOne({ _id: item.option.id_product });

            if (product) {
                completeItem.image = product.image;  // Lấy image từ sản phẩm
            }
            // Dựa trên category, lấy thêm các thông tin khác từ option
            if (item.category === "foods") {
                completeItem.ingredient = item.option.ingredient;  // Lấy ingredient từ option
                completeItem.weight = item.option.weight;  // Lấy weight từ option 
            } else if (item.category === "supplies") {
                completeItem.color = item.option.color;  // Lấy color từ option
                completeItem.size = item.option.size;  // Lấy size từ option
            }

            return completeItem;
        }));

        // Thêm danh sách sản phẩm vào thông tin đơn hàng
        const orderInfo = {
            id: order._id,
            date_created: order.date,
            status: order.status,
            subtotal_price: order.subtotal_price,
            shipping_price: order.shipping_price,
            total_price: order.total_price,
            payment_method: order.payment_method,
            note: order.note,
            name: order.name,
            telephone_number: order.telephone_number,
            email: order.email,
            nationality: order.nationality,
            province: order.province,
            district: order.district,
            ward: order.ward,
            street: order.street,
            orderItems: completeOrderItems // Thêm orderItems vào thông tin đơn hàng
        };

        // Trả về thông tin đơn hàng dưới dạng JSON, bao gồm cả danh sách orderItems
        res.status(200).json({ order: orderInfo });

    } catch (error) {
        console.error("Lỗi khi lấy thông tin đơn hàng:", error);
        return res.status(500).json({ message: 'Lỗi server khi lấy thông tin đơn hàng và sản phẩm' });
    }
});
// Mua ngay
router.post('/orders/buyNow', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const {
        product_variant_id,
        category,
        quantity
    } = req.body;
    try {
        await client.connect();
        const db = client.db("PBL6");

        // Kiểm tra tính hợp lệ của sản phẩm
        const productCheck = await checkValidProduct(product_variant_id, category);
        if (!productCheck.success) {
            console.log("SP hết hàng hoặc ko còn tồn tại");
            return res.status(400).json();
        }
        //Check có đủ số lượng trong kho ko
        const productCheckQuantity = await checkProductStockForCart(product_variant_id, category, quantity);
        if (!productCheckQuantity.success) {
            console.log("SP ko đủ hàng");
            return res.status(400).json();
        }

        let collectionName;
        // Xác định collection dựa trên category
        switch (category) {
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
                console.log("Category lỗi");
                return res.status(400).json();
        }

        // Trừ tồn kho trong collection tương ứng
        const updatedStock = await db.collection(collectionName).updateOne(
            { _id: product_variant_id },
            { $inc: { quantity: -quantity } }
        );

        // Kiểm tra kết quả cập nhật
        if (updatedStock.modifiedCount === 0) {
            console.log(`Không thể trừ tồn kho cho sản phẩm ${product_variant_id} thuộc danh mục ${category}.`)
            return res.status(400).json();
        }

        // Tạo dữ liệu JSON cho giữ hàng
        const productData = {
            product_variant_id,
            category,
            quantity
        };

        // Nếu kiểm tra thành công, giữ hàng trong Redis
        const reserveStock = await reserveStockForUser(userId, productData);
        if (!reserveStock.success) {
            console.log("Lỗi giữ hàng");
            return res.status(400).json();
        }

        res.status(201).json();

    } catch (error) {
        console.error('Lỗi mua ngay:', error); // In ra lỗi nếu có
        res.status(500).json({ message: "Lỗi máy chủ", error });
    }

});

module.exports = router;
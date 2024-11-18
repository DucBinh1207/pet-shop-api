const express = require('express');
const router = express.Router();
const redisClient = require("../middleware/redisClient");
const redis = redisClient.init();

// Middleware để parse JSON body
router.use(express.json());
const { authenticateToken } = require("../middleware/authenticateToken");
const { client } = require("../db");

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
    console.log(req.body);
    console.log("id_user: " + id_user);

    const cartKey = process.env.PREFIX_RESERVED_STOCK + id_user;
    const cartKeyLater = process.env.PREFIX_RESERVED_STOCK_LATER + id_user;
    const exists = await redis.exists(cartKey);
    if (exists) {
        await redis.del(cartKey);  // Xóa key cũ
    } else {
        console.log("Hết thời gian giữ hàng");
        return res.status(400).json();
    }
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
        return res.status(400).json();
    }

    try {
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

        const cartItemsCollection = db.collection('cart_items');
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
            //Status
        };
        // 6: đơn hàng đang chờ xác nhận
        // 5: đơn hàng đã được đặt
        // 4: đơn hàng đang được chuẩn bị
        // 3: đơn hàng đang được vận chuyển
        // 2: đơn hàng đang được giao tới bạn
        // 1: đơn hàng đã giao thành công
        // 0: đơn hàng đã bị hủy
        // 5 6 4 3 2 1
        // Thêm đơn hàng vào MongoDB và lấy `id_order` mới
        const orderResult = await ordersCollection.insertOne(newOrder);
        const id_order = orderResult.insertedId;

        // Lấy tất cả các cart_items có id_user này
        const cartItems = await cartItemsCollection.find({ id_user: id_user }).toArray();

        if (cartItems.length === 0) {
            console.log("Không có sản phẩm trong giỏ hàng");
            return res.status(400).json();
        }

        // Tạo danh sách order_items từ cart_items
        const orderItems = await Promise.all(
            cartItems.map(async (cartItem) => {
                let option = {};

                // Lấy thông tin chi tiết sản phẩm dựa trên category
                if (cartItem.category === "pets") {
                    const pet = await db.collection("pets").findOne({ _id: cartItem.id_product_variant });
                    const productInfo = await db.collection("products").findOne({ _id: pet.id_product });
                    if (pet && productInfo) {
                        option = {
                            id_product: productInfo._id,
                            name: productInfo.name,
                            price: pet.price,
                        };
                    }
                } else if (cartItem.category === "foods") {
                    const food = await db.collection("foods").findOne({ _id: cartItem.id_product_variant });
                    const productInfo = await db.collection("products").findOne({ _id: food.id_product });
                    if (food) {
                        option = {
                            id_product: productInfo._id,
                            name: productInfo.name,
                            ingredient: food.ingredient,
                            weight: food.weight,
                            price: food.price,
                        };
                    }
                } else if (cartItem.category === "supplies") {
                    const supplies = await db.collection("supplies").findOne({ _id: cartItem.id_product_variant });
                    const productInfo = await db.collection("products").findOne({ _id: supplies.id_product });
                    if (supplies) {
                        option = {
                            id_product: productInfo._id,
                            name: productInfo.name,
                            color: supplies.color,
                            size: supplies.size,
                            price: supplies.price,
                        };
                    }
                }

                // Trả về một object order_item
                return {
                    id_order: id_order.toString(),
                    category: cartItem.category,
                    quantity: cartItem.quantity,
                    option: option, // Thêm trường option
                };
            })
        );

        // Lưu tất cả order_items vào MongoDB
        await orderItemsCollection.insertMany(orderItems);
        console.log("Đã thêm order items với option");

        // Xóa tất cả các cart_items có id_user này
        await cartItemsCollection.deleteMany({ id_user: id_user });
        console.log("Đã xóa các sản phẩm trong giỏ hàng");

        // Tạo bản ghi payment mới trong collection `payments`
        const newPayment = {
            _id: Date.now().toString(), // ID duy nhất cho payment
            id_order: id_order.toString(),
            date_created: new Date(),
            payment_at: null,
            amount: total_price,
            method: payment_method,
            status: 2
            // 1: Thanh toán thành công
            // 2: Chờ thanh toán
            // 3: Thanh toán thất bại
        };

        await paymentsCollection.insertOne(newPayment);
        console.log("Đã tạo bản ghi payment");


        // Trả về phản hồi thành công
        return res.status(201).json({ id_order: id_order.toString() });
    } catch (err) {
        console.log("Lỗi khi xử lý đơn hàng:", err);
        return res.status(500).json({ message: 'Lỗi server khi xử lý đơn hàng' });
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



module.exports = router;
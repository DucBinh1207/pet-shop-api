const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb'); // Thêm ObjectId

const SECRET_KEY = '0f5f43b5b226531628722a0f20b4c276de87615dfc8516ea4240c93f4135d4b1'; // Thay thế bằng secret key của bạn

// MongoDB connection (nếu không cần tái sử dụng kết nối từ file chính)
const uri = "mongodb+srv://tdv0905179758:qMdBYWg45uwOUz9F@viet.fn3ykhs.mongodb.net/?retryWrites=true&w=majority&appName=Viet";
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
// Middleware để parse JSON body
router.use(express.json());

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' }); // Không có token

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            // Kiểm tra xem lỗi có phải là do token hết hạn hay không
            if (err.name === 'TokenExpiredError') {
                return res.status(403).json({ message: 'Token has expired' }); // Token hết hạn
            }
            return res.status(403).json({ message: 'Invalid token' }); // Token không hợp lệ
        }
        req.user = user; // Lưu thông tin người dùng vào request
        next();
    });
};
// Lấy danh sách đơn hàng của 1 user
router.get('/orders/user', authenticateToken, async (req, res) => {
    const id_user = req.user.userId; // Lấy id_user từ token
    try {
        const db = client.db("PBL6"); // Kết nối tới database "PBL6"
        const ordersCollection = db.collection('orders'); // Truy cập vào collection 'orders'

        // Truy vấn các đơn hàng của user từ MongoDB
        const orders = await ordersCollection.find({ id_user: id_user, status: { $ne: 0 } }).toArray();

        if (orders.length === 0) {
            return res.status(404).json({ message: 'Không có đơn hàng nào' });
        }

        return res.status(200).json(orders); // Trả về danh sách đơn hàng
    } catch (err) {
        console.error("Lỗi khi lấy đơn hàng:", err);
        return res.status(500).json({ message: 'Lỗi server khi lấy danh sách đơn hàng' });
    }
});
// Lấy thông tin 1 order của user từ id_order
router.get('/orders/user/detail', authenticateToken, async (req, res) => {
    const id_order = req.query.id_order; // Lấy id_order từ query parameters
    console.log("id_order: " + id_order);

    try {
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
            _id: order._id,
            date: order.date,
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
        res.json(orderInfo);

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
        return res.status(400).json({
            message: 'Vui lòng nhập đầy đủ thông tin',
            missingFields: missingFields
        });
    }

    try {
        const db = client.db("PBL6"); // Kết nối tới cơ sở dữ liệu MongoDB
        const ordersCollection = db.collection('orders');
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
            return res.status(400).json({ message: 'Không có sản phẩm trong giỏ hàng' });
        }

        // Tạo danh sách order_items từ cart_items
        const orderItems = cartItems.map(cartItem => ({
            id_order: id_order.toString(),
            id_product_variant: cartItem.id_product_variant,
            category: cartItem.category,
            quantity: cartItem.quantity
        }));

        // Lưu tất cả order_items vào MongoDB
        await orderItemsCollection.insertMany(orderItems);
        console.log("Đã thêm order items");

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
        return res.status(201).json({ message: 'Đặt hàng thành công', orderId: id_order });
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

    const db = client.db("PBL6"); // Kết nối đến database "PBL6"
    const orderItemsCollection = db.collection('order_items'); // Truy cập collection "order_items"

    try {
        const orderItems = await orderItemsCollection.find({ id_order: id_order }).toArray();

        if (!orderItems || orderItems.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm nào cho đơn hàng này' });
        }
        //console.log("orderItems:", orderItems);
        const completeOrderItems = await Promise.all(orderItems.map(async (item) => {
            let completeItem = {
                _id: item._id.toString(),
                id_product_variant: item.id_product_variant,
                category: item.category,
                quantity: item.quantity,
                ingredient: "",
                weight: "",
                size: "",
                color: ""
            };

            // Lấy thông tin sản phẩm dựa trên category
            if (item.category === "pets") {
                const petInfo = await db.collection("pets").findOne({ _id: item.id_product_variant });
                const productInfo = await db.collection("products").findOne({ _id: petInfo.id_product });
                if (petInfo && productInfo) {
                    completeItem.name = productInfo.name;
                    completeItem.price = petInfo.price;
                    completeItem.image = productInfo.image;
                }
            } else if (item.category === "foods") {
                const foodInfo = await db.collection("foods").findOne({ _id: item.id_product_variant });
                const productInfo = await db.collection("products").findOne({ _id: foodInfo.id_product });
                // console.log(suppliesInfo.id_product_variant);
                if (productInfo && foodInfo) {
                    completeItem.name = productInfo.name;
                    completeItem.price = foodInfo.price;
                    completeItem.image = productInfo.image;
                    completeItem.ingredient = foodInfo.ingredient;
                    completeItem.weight = foodInfo.weight;
                }
            } else if (item.category === "supplies") {
                const suppliesInfo = await db.collection("supplies").findOne({ _id: item.id_product_variant });
                //console.log(suppliesInfo.id_product_variant);
                const productInfo = await db.collection("products").findOne({ _id: suppliesInfo.id_product });
                if (productInfo && suppliesInfo) {
                    completeItem.name = productInfo.name;
                    completeItem.image = productInfo.image;
                    completeItem.price = suppliesInfo.price;
                    completeItem.size = suppliesInfo.size;
                    completeItem.color = suppliesInfo.color;
                }
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
//Lấy 2 thông tin cùng một lúc
router.get('/orders/user/details', authenticateToken, async (req, res) => {
    const id_order = req.query.id_order; // Lấy id_order từ query parameters

    if (!id_order) {
        return res.status(400).json({ message: 'Vui lòng cung cấp id_order' });
    }

    try {
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
                _id: item._id.toString(),
                id_product_variant: item.id_product_variant,
                category: item.category,
                quantity: item.quantity,
                ingredient: "",
                weight: "",
                size: "",
                color: ""
            };

            // Lấy thông tin sản phẩm dựa trên category
            if (item.category === "pets") {
                const petInfo = await db.collection("pets").findOne({ _id: item.id_product_variant });
                const productInfo = await db.collection("products").findOne({ _id: petInfo.id_product });
                if (petInfo && productInfo) {
                    completeItem.name = productInfo.name;
                    completeItem.price = petInfo.price;
                    completeItem.image = productInfo.image;
                }
            } else if (item.category === "foods") {
                const foodInfo = await db.collection("foods").findOne({ _id: item.id_product_variant });
                const productInfo = await db.collection("products").findOne({ _id: foodInfo.id_product });
                if (productInfo && foodInfo) {
                    completeItem.name = productInfo.name;
                    completeItem.price = foodInfo.price;
                    completeItem.image = productInfo.image;
                    completeItem.ingredient = foodInfo.ingredient;
                    completeItem.weight = foodInfo.weight;
                }
            } else if (item.category === "supplies") {
                const suppliesInfo = await db.collection("supplies").findOne({ _id: item.id_product_variant });
                const productInfo = await db.collection("products").findOne({ _id: suppliesInfo.id_product });
                if (productInfo && suppliesInfo) {
                    completeItem.name = productInfo.name;
                    completeItem.image = productInfo.image;
                    completeItem.price = suppliesInfo.price;
                    completeItem.size = suppliesInfo.size;
                    completeItem.color = suppliesInfo.color;
                }
            }

            return completeItem;
        }));

        // Thêm danh sách sản phẩm vào thông tin đơn hàng
        const orderInfo = {
            _id: order._id,
            date: order.date,
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
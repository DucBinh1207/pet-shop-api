const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getClient } = require("../db");
// Middleware để parse JSON body
router.use(express.json());
const { authenticateToken } = require("../middleware/authenticateToken");
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Thư mục lưu ảnh
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); // Tạo tên file duy nhất
    }
});
const upload = multer({ storage: storage });

router.get("/admin/orders", authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền truy cập
    if (id_role !== 2 && id_role !== 3) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    const id_user = req.query.userId || ""; // Lấy id_user từ query (nếu có)
    const status = req.query.status || ""; // Lấy trạng thái từ query (nếu có)
    const sortBy = req.query.sortBy || ""; // Mặc định sắp xếp theo "lastest" nếu không truyền
    const limit = parseInt(req.query.limit, 10) || 10; // Mặc định lấy 10 đơn hàng mỗi trang
    const page = parseInt(req.query.page, 10) || 1; // Mặc định là trang 1

    console.log({ id_user });
    console.log({ status });
    console.log({ sortBy });
    console.log({ limit });
    console.log({ page });

    try {
        const client = getClient();
        const db = client.db("PBL6");
        const ordersCollection = db.collection("orders"); // Truy cập vào collection 'orders'

        // Điều kiện lọc
        let filter = {};
        if (id_user) {
            filter.id_user = id_user;
        }
        if (status) {
            filter.status = parseInt(status, 10); // Lọc theo trạng thái nếu được truyền
        }

        // Điều kiện sắp xếp
        let sortCondition = {};
        if (sortBy === "lastest") {
            sortCondition = { time_created: -1 }; // Sắp xếp theo thời gian giảm dần (mới nhất)
        }

        // Tính toán skip và limit
        const skip = (page - 1) * limit;

        // Tìm kiếm các orders theo filter và sortCondition
        const orders = await ordersCollection
            .find(filter)
            .sort(sortCondition)
            .skip(skip)
            .limit(limit)
            .toArray();

        // Tổng số đơn hàng để tính tổng số trang
        const totalOrders = await ordersCollection.countDocuments(filter);
        const totalPages = Math.ceil(totalOrders / limit);

        // Chuẩn bị kết quả trả về
        const completeOrderItems = orders.map(order => ({
            id: order._id.toString(),
            userId: order.id_user,
            name: order.name,
            total_price: order.total_price,
            date_created: order.date,
            status: order.status,
        }));

        res.status(200).json({
            orders: completeOrderItems,
            //totalOrders,
            totalPages,
            currentPage: page,
        }); // Trả về danh sách orders kèm thông tin phân trang
    } catch (error) {
        console.error("Error loading orders:", error); // In ra lỗi nếu có
        res.status(500).json({ message: "Lỗi máy chủ", error });
    } finally {
    }
});

router.put("/admin/orders/status", authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền truy cập
    if (id_role !== 2) { // Chỉ admin được phép truy cập
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    const { id, status } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!id || status === undefined) {
        console.log("Vui lòng cung cấp đầy đủ id và status");
        return res.status(400).json();
    }

    try {
        const parsedStatus = parseInt(status, 10);
        if (isNaN(parsedStatus)) {
            console.log("Status phải là một số nguyên hợp lệ");
            return res.status(400).json();
        }

        // Kết nối đến MongoDB
        const client = getClient();
        const db = client.db("PBL6");
        const ordersCollection = db.collection("orders");

        // Tìm đơn hàng
        const order = await ordersCollection.findOne({ _id: id });

        if (!order) {
            console.log("Không tìm thấy đơn hàng với ID đã cung cấp");
            return res.status(400).json();
        }

        // Cập nhật trạng thái đơn hàng
        await ordersCollection.updateOne(
            { _id: id },
            { $set: { status: parsedStatus } }
        );

        res.status(200).json();
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ message: "Lỗi máy chủ. Vui lòng thử lại sau." });
    }
});

router.post('/admin/orders/create', authenticateToken, upload.none(), async (req, res) => {
    const id_role = req.user.id_role;
    
    if (id_role !== 2 && id_role !== 3) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }
    
    const {
        name,
        telephone_number,
        email,
        province,
        district,
        ward,
        street,
        note,
        product
    } = req.body;
    console.log(req.body);
    // Kiểm tra dữ liệu đầu vào
    // if (!name || !telephone_number || !email || !province || !district || !ward || !street || !product || !Array.isArray(product) || product.length === 0) {
    //     return res.status(400).json({ message: "Vui lòng cung cấp đầy đủ thông tin đơn hàng" });
    // }

    try {
        let products, totalPrice = 0;
        products = JSON.parse(product); // Chuyển chuỗi thành mảng JSON
        if (!Array.isArray(products)) {
            console.log("Product ko phải là một mảng hợp lệ");
            return res.status(400).json();
        }
        const client = getClient();
        const db = client.db("PBL6");
        const ordersCollection = db.collection("orders");
        const orderItemsCollection = db.collection("order_items");
        const paymentsCollection = db.collection('payments');

        const id_user = req.user.id;

        // Tạo đơn hàng mới
        const newOrder = {
            _id: Date.now().toString(),
            id_user: id_user,
            name: name || null,
            telephone_number: telephone_number || null,
            email: email || null,
            total_price: 0,
            shipping_price: 0,
            subtotal_price: 0,
            date: new Date(),
            province: province || null,
            district: district || null,
            ward: ward || null,
            street: street || null,
            voucher_code: null,
            payment_method: "Trả tiền khi nhận hàng",
            note: note || null,
            status: 1, // Đã giao hàng
        };

        // Lưu đơn hàng vào MongoDB
        await ordersCollection.insertOne(newOrder);
        console.log("Đã thêm order mới");
        // Tạo các mục đơn hàng

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
                    if (food && productInfo) {
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
                    if (supplies && productInfo) {
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

                // Tính tổng giá trị đơn hàng
                totalPrice += option.price * product.quantity;

                // Trả về một object order_item
                return {
                    id_order: newOrder._id,
                    category: product.category,
                    quantity: product.quantity,
                    option: option,
                };
            })
        );

        // Lưu tất cả order_items vào MongoDB
        await orderItemsCollection.insertMany(orderItems);
        console.log("Đã thêm order items với option");
        // Cập nhật tổng giá trị đơn hàng
        await ordersCollection.updateOne(
            { _id: newOrder._id },
            {
                $set: {
                    total_price: totalPrice,
                    shipping_price: 0,
                    subtotal_price: totalPrice
                }
            }
        );
        console.log("Đã thêm giá tiền order");

        // Tạo bản ghi payment mới trong collection `payments`
        const newPayment = {
            _id: Date.now().toString(),
            id_order: newOrder._id.toString(),
            date_created: new Date(),
            payment_at: null,
            amount: totalPrice,
            method: "Trả tiền khi nhận hàng",
            status: 1
        };

        await paymentsCollection.insertOne(newPayment);
        console.log("Đã tạo bản ghi payment");

        res.status(201).json({
            id: newOrder._id.toString(),
            amount: totalPrice,
        });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ message: "Lỗi máy chủ", error });
    }
});

module.exports = router;
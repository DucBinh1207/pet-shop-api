const express = require('express');
const router = express.Router();
const redisClient = require("../middleware/redisClient");
const redis = redisClient.init();

// Middleware để parse JSON body
router.use(express.json());
const {
    checkValidProduct,
    checkProductStockForCart,
    reserveStockForUser,
} = require("../product/product");
const Order = require('../BEAN/Order');
const OrderInfo = require('../BEAN/OrderInfo ');
const { getClient } = require("../db");
const { parse } = require('dotenv');

exports.getOrder = async (id_user) => {
    try {
        const client = getClient();
        const db = client.db("PBL6");
        const ordersCollection = db.collection('orders'); // Truy cập vào collection 'orders'

        // Truy vấn các đơn hàng của user từ MongoDB
        const orders = await ordersCollection
            .find({ id_user: id_user, status: { $ne: 0 } })
            .sort({ date: -1 }) // Sắp xếp giảm dần theo createdAt (mới nhất lên đầu)
            .toArray();

        if (orders.length === 0) {
            return {
                status: 200,
            };
        }
        const customOrders = orders.map(order => new Order(order));

        return {
            status: 200,
            customOrders
        };
    } catch (err) {
        console.error("Lỗi khi lấy đơn hàng:", err);
        return {
            status: 500,
            message: 'Internal server error'
        };
    }
};
//Mobile xai`
exports.getOrderDetail = async (id_order) => {
    try {
        const client = getClient();
        const db = client.db("PBL6");
        const ordersCollection = db.collection('orders'); // Truy cập collection "orders"
        const vouchersCollection = db.collection('vouchers'); // Truy cập collection "vouchers"

        // Tìm kiếm đơn hàng dựa trên id_order trong MongoDB
        const order = await ordersCollection.findOne({ _id: id_order });

        if (!order) {
            console.log("Không tìm thấy order với id: " + id_order);
            return {
                status: 404,
                message: 'Đơn hàng không tìm thấy'
            };
        }

        // Tìm kiếm thông tin voucher nếu có
        let voucherInfo = null;
        if (order.voucher_code) {
            voucherInfo = await vouchersCollection.findOne({ code: order.voucher_code });
        }

        // Tạo thông tin đơn hàng
        const orderInfo = new OrderInfo(order, voucherInfo);

        // Gửi thông tin đơn hàng dưới dạng JSON
        return {
            status: 200,
            orderInfo
        };

    } catch (error) {
        console.error("Lỗi khi lấy thông tin đơn hàng:", error);
        return {
            status: 500,
            message: 'Lỗi server khi lấy thông tin đơn hàng'
        };
    }
};
//API mobile
exports.createOrder = async (
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
    note) => {
    const cartKey = process.env.PREFIX_RESERVED_STOCK + id_user;
    const cartKeyLater = process.env.PREFIX_RESERVED_STOCK_LATER + id_user;
    try {
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
            return {
                status: 400,
                message: `Các trường bị thiếu: ${missingFields.join(', ')}`
            };
        }
        const client = getClient();
        const db = client.db("PBL6");
        const ordersCollection = db.collection('orders');
        const vouchersCollection = db.collection('vouchers');

        if (voucher_code) {
            const voucher = await vouchersCollection.findOne({ code: voucher_code, status: 1 });
            if (!voucher) {
                console.log("Voucher không tồn tại");
                return {
                    status: 400,
                };
            }
            if (voucher.quantity <= 0) {
                console.log("Voucher đã hết");
                return {
                    status: 400,
                };
            }
            // Trừ 1 số lượng voucher
            await vouchersCollection.updateOne(
                { code: voucher_code },
                { $inc: { quantity: -1 } }
            );
            console.log("Đã trừ số lượng voucher");
        }

        let products;
        // Kiểm tra xem có dữ liệu trong Redis hay không
        const exists = await redis.exists(cartKey);
        if (exists) {
            // Lấy dữ liệu từ Redis
            const reservedStockData = await redis.get(cartKey);
            products = JSON.parse(reservedStockData); // Giả sử dữ liệu lưu dưới dạng JSON

            if (!products || products.length === 0) {
                console.log("Không có sản phẩm nào trong giỏ hàng");
                return {
                    status: 400,
                    message: "Không có sản phẩm nào trong giỏ hàng"
                };
            }
            console.log("Dữ liệu giỏ hàng:", products);

            // Xóa key cũ sau khi lấy dữ liệu
            await redis.del(cartKey);
        } else {
            console.log("Hết thời gian giữ hàng");
            return {
                status: 400,
                message: "Hết thời gian giữ hàng"
            };
        }
        payment_method = (payment_method === "Trả tiền khi nhận hàng") ? 1 : 2;
        // Xóa dữ liệu giữ hàng tạm (cartKeyLater)
        await redis.del(cartKeyLater);

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
                return {
                    status: 400,
                    message: "Dữ liệu không hợp lệ"
                };
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

        return {
            status: 201,
            id_order: id_order.toString(),
            amount: total_price
        };

    } catch (error) {
        console.error('Lỗi tạo order', error);
        return {
            status: 500,
            message: "Lỗi máy chủ",
            error
        };
    }
};
//Mobile xai`
exports.getOrderItems = async (id_order) => {
    try {
        const client = getClient();
        const db = client.db("PBL6");
        const orderItemsCollection = db.collection('order_items'); // Truy cập collection "order_items"

        // Lấy thông tin các order items từ id_order
        const orderItems = await orderItemsCollection.find({ id_order: id_order }).toArray();

        if (!orderItems || orderItems.length === 0) {
            return {
                status: 400,
            };
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
        return {
            status: 200,
            completeOrderItems
        };

    } catch (error) {
        console.error("Lỗi khi lấy sản phẩm cho đơn hàng:", error);
        return {
            status: 500,
            message: 'Lỗi server khi lấy sản phẩm cho đơn hàng'
        };
    }
};

exports.webGetOrder = async (id_order) => {
    try {
        const client = getClient();
        const db = client.db("PBL6");
        const ordersCollection = db.collection('orders'); // Truy cập collection "orders"
        const orderItemsCollection = db.collection('order_items'); // Truy cập collection "order_items"
        const vouchersCollection = db.collection('vouchers');

        // Tìm kiếm đơn hàng dựa trên id_order trong MongoDB
        const order = await ordersCollection.findOne({ _id: id_order });

        if (!order) {
            console.log("Không tìm thấy order với id: " + id_order);
            return {
                status: 200,
                message: 'Đơn hàng không tìm thấy'
            };
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

        let voucherInfo = null;
        if (order.voucher_code) {
            voucherInfo = await vouchersCollection.findOne({ code: order.voucher_code });
        }

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
            voucher: order.voucher_code ? order.voucher_code : null,
            percent: voucherInfo ? voucherInfo.percent : "0",
            orderItems: completeOrderItems // Thêm orderItems vào thông tin đơn hàng
        };

        // Trả về thông tin đơn hàng dưới dạng JSON, bao gồm cả danh sách orderItems
        return {
            status: 200,
            order: orderInfo
        };

    } catch (error) {
        console.error("Lỗi khi lấy thông tin đơn hàng:", error);
        return {
            status: 500,
            message: 'Lỗi server khi lấy thông tin đơn hàng và sản phẩm'
        };
    }
};

exports.buyNow = async (userId, product_variant_id, category, quantity) => {
    try {
        const quantityToReturn = quantity;
        quantity = parseInt(quantity, 10);
        const client = getClient();
        const db = client.db("PBL6");

        // Kiểm tra tính hợp lệ của sản phẩm
        const productCheck = await checkValidProduct(product_variant_id, category);
        if (!productCheck.success) {
            console.log("SP hết hàng hoặc ko còn tồn tại");
            return {
                status: 400,
                message: "SP hết hàng hoặc ko còn tồn tại"
            };
        }
        //Check có đủ số lượng trong kho ko
        const productCheckQuantity = await checkProductStockForCart(product_variant_id, category, quantity);
        if (!productCheckQuantity.success) {
            console.log("SP ko đủ hàng");
            return {
                status: 400,
                message: "SP ko đủ hàng"
            };
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
                return {
                    status: 400,
                };
        }

        // Trừ tồn kho trong collection tương ứng
        const updatedStock = await db.collection(collectionName).updateOne(
            { _id: product_variant_id },
            { $inc: { quantity: -quantity } }
        );

        // Kiểm tra kết quả cập nhật
        if (updatedStock.modifiedCount === 0) {
            console.log(`Không thể trừ tồn kho cho sản phẩm ${product_variant_id} thuộc danh mục ${category}.`)
            return {
                status: 400,
            };
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
            return {
                status: 400,
            };
        }

        return {
            status: 201,
            quantityToReturn
        };

    } catch (error) {
        console.error('Lỗi mua ngay:', error); // In ra lỗi nếu có
        return {
            status: 500,
            message: "Lỗi máy chủ",
            error
        };
    }
}

exports.getOrderMobile = async (id_user) => {
    try {
        const client = getClient();
        const db = client.db("PBL6");
        const ordersCollection = db.collection('orders'); // Truy cập vào collection 'orders'

        // Truy vấn các đơn hàng của user từ MongoDB
        const orders = await ordersCollection
            .find({ id_user: id_user, status: { $ne: 0 } })
            .sort({ date: -1 }) // Sắp xếp giảm dần theo createdAt (mới nhất lên đầu)
            .toArray();

        if (orders.length === 0) {
            return {
                status: 404,
                message: 'Không có đơn hàng nào'
            };
        }
        const customOrders = orders.map(order => new Order(order));

        return {
            status: 200,
            customOrders
        };
    } catch (err) {
        console.error("Lỗi khi lấy đơn hàng:", err);
        return {
            status: 500,
            message: 'Internal server error'
        };
    }
};

exports.createOrder2 = async (
    id_user,
    name,
    telephone_number,
    email,
    province,
    district,
    ward,
    street,
    voucher_code,
    payment_method,
    note) => {
    const cartKey = process.env.PREFIX_RESERVED_STOCK + id_user;
    const cartKeyLater = process.env.PREFIX_RESERVED_STOCK_LATER + id_user;
    try {
        // Kiểm tra dữ liệu đầu vào
        const missingFields = [];
        if (!name) missingFields.push('name');
        if (!telephone_number) missingFields.push('telephone_number');
        if (!email) missingFields.push('email');
        if (!province) missingFields.push('province');
        if (!district) missingFields.push('district');
        if (!ward) missingFields.push('ward');
        if (!street) missingFields.push('street');
        if (!payment_method) missingFields.push('payment_method');

        if (missingFields.length > 0) {
            console.log("Các trường bị thiếu:", missingFields.join(', '));
            return {
                status: 400,
                message: `Các trường bị thiếu: ${missingFields.join(', ')}`
            };
        }
        const client = getClient();
        const db = client.db("PBL6");
        const ordersCollection = db.collection('orders');
        const vouchersCollection = db.collection('vouchers');

        let discountPercent = 0;
        if (voucher_code) {
            console.log({ voucher_code });
            const voucher = await vouchersCollection.findOne({ code: voucher_code, status: 1 });
            if (!voucher) {
                console.log("Voucher không tồn tại");
                return {
                    status: 400,
                };
            }
            if (voucher.quantity <= 0) {
                console.log("Voucher đã hết");
                return {
                    status: 400,
                };
            }
            // Trừ 1 số lượng voucher
            await vouchersCollection.updateOne(
                { code: voucher_code },
                { $inc: { quantity: -1 } }
            );
            console.log("Đã trừ số lượng voucher");
            discountPercent = parseFloat(voucher.percent);
            console.log({ discountPercent });
        }

        let products;
        // Kiểm tra xem có dữ liệu trong Redis hay không
        const exists = await redis.exists(cartKey);
        if (exists) {
            // Lấy dữ liệu từ Redis
            const reservedStockData = await redis.get(cartKey);
            products = JSON.parse(reservedStockData); // Giả sử dữ liệu lưu dưới dạng JSON

            if (!products || products.length === 0) {
                console.log("Không có sản phẩm nào trong giỏ hàng");
                return {
                    status: 400,
                    message: "Không có sản phẩm nào trong giỏ hàng"
                };
            }
            console.log("Dữ liệu giỏ hàng:", products);

            // Xóa key cũ sau khi lấy dữ liệu
            await redis.del(cartKey);
        } else {
            console.log("Hết thời gian giữ hàng");
            return {
                status: 400,
                message: "Hết thời gian giữ hàng"
            };
        }

        // Xóa dữ liệu giữ hàng tạm (cartKeyLater)
        await redis.del(cartKeyLater);

        const orderItemsCollection = db.collection('order_items');
        const paymentsCollection = db.collection('payments');

        // Tạo orderItems và tính subtotal_price
        let subtotal_price = 0;
        const orderItems2 = await Promise.all(
            products.map(async (product) => {
                let price = 0;

                // Lấy thông tin chi tiết sản phẩm dựa trên category
                if (product.category === "pets") {
                    const pet = await db.collection("pets").findOne({ _id: product.product_variant_id });
                    if (pet) {
                        price = pet.price;
                    }
                } else if (product.category === "foods") {
                    const food = await db.collection("foods").findOne({ _id: product.product_variant_id });
                    if (food) {
                        price = food.price;
                    }
                } else if (product.category === "supplies") {
                    const supplies = await db.collection("supplies").findOne({ _id: product.product_variant_id });
                    if (supplies) {
                        price = supplies.price;
                    }
                }
                // Tính tổng tiền từng sản phẩm
                subtotal_price += price * product.quantity;
            })
        );

        // Xử lý shipping_price dựa trên subtotal_price
        let shipping_price = 0;
        if (subtotal_price > 5000000) {
            shipping_price = 0;
        } else if (subtotal_price >= 2000000) {
            shipping_price = 200000;
        } else if (subtotal_price >= 500000) {
            shipping_price = 100000;
        } else if (subtotal_price >= 200000) {
            shipping_price = 80000;
        } else {
            shipping_price = 50000;
        }

        subtotal_price = subtotal_price * (1 - discountPercent / 100);

        // Tính total_price
        const total_price = subtotal_price + shipping_price;

        //Chuyen int payment_method
        // payment_method = parseInt(payment_method, 10);
        
        // Lưu order vào MongoDB
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
            status: 5,
        };
        const orderResult = await ordersCollection.insertOne(newOrder);
        const id_order = orderResult.insertedId;

        if (!Array.isArray(products)) {
            if (typeof products === 'object') {
                products = [products];
            } else {
                console.log("Dữ liệu không hợp lệ:", products);
                return {
                    status: 400,
                    message: "Dữ liệu không hợp lệ"
                };
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
        console.log("payment_method", payment_method);
        return {
            status: 201,
            id_order: id_order.toString(),
            amount: total_price,
            payment_method: payment_method
        };

    } catch (error) {
        console.error('Lỗi tạo order', error);
        return {
            status: 500,
            message: "Lỗi máy chủ",
            error
        };
    }
};
// payment.js
const express = require("express");
const axios = require("axios").default;
const CryptoJS = require("crypto-js");
const moment = require("moment");
const qs = require("qs");
const { getClient } = require("../db");
const router = express.Router();

// MongoDB connection (nếu không cần tái sử dụng kết nối từ file chính)
const { client } = require("../db");
// Middleware để parse JSON body
router.use(express.json());
const { authenticateToken } = require("../middleware/authenticateToken");

// APP INFO
const config = {
    app_id: "2553",
    key1: "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
    key2: "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz",
    endpoint: "https://sb-openapi.zalopay.vn/v2/create",
};
// Payment route
router.post("/payment", authenticateToken, async (req, res) => {
    const { id_order} = req.body;

    const embed_data = {
        redirecturl: `https://pet-shop-test-deploy.vercel.app/cart/order-success?id_order=${id_order}`
    };

    // Kiểm tra xem id_order và amount có tồn tại hay không
    if (!id_order) {
        return res.status(400).json({ error: "id_order is required" });
    }
    let amount = 0;
    try {
        const client = getClient();
        const db = client.db("PBL6");
        const ordersCollection = db.collection("orders");
        const order = await ordersCollection.findOne({ _id: id_order });
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        amount = order.total_price;
    } catch (error) {
        console.error("Lỗi khi lấy thông tin đơn hàng:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
    const items = [{}];
    const transID = Math.floor(Math.random() * 1000000);
    const transID_new = `${moment().format("YYMMDD")}_${transID}`;
    const order = {
        app_id: config.app_id,
        app_trans_id: transID_new, // ID giao dịch duy nhất dựa trên thời gian và transID ngẫu nhiên
        app_user: "user123",
        app_time: Date.now(), // thời gian tạo đơn hàng
        item: JSON.stringify(items),
        embed_data: JSON.stringify(embed_data),
        amount: amount, // Số tiền được nhận từ yêu cầu
        description: `Pet Shop - Payment for order #${id_order}`, // Mô tả đơn hàng với id_order
        bank_code: "",
        callback_url: "https://pet-shop-api-2zab.onrender.com/api/callback",
    };

    const data =
        config.app_id +
        "|" +
        order.app_trans_id +
        "|" +
        order.app_user +
        "|" +
        order.amount +
        "|" +
        order.app_time +
        "|" +
        order.embed_data +
        "|" +
        order.item;
    order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

    try {
        const result = await axios.post(config.endpoint, null, {
            params: order,
        });
        await saveTransID(transID_new, id_order);

        return res.status(201).json(result.data);
    } catch (error) {
        console.log(error.message);
    }

});

// Callback route
router.post("/callback", async (req, res) => {
    const { data: dataStr, mac: reqMac } = req.body;
    let result = { return_code: 0, return_message: "An error occurred" };

    try {
        // Kiểm tra tính toàn vẹn của dữ liệu
        const mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();
        if (reqMac !== mac) {
            result.return_message = "MAC not equal";
            return res.json(result);
        }
        
        const dataJson = JSON.parse(dataStr, config.key2);
        const { app_trans_id, embed_data, app_id } = dataJson;
        console.log({ app_trans_id });
        await updatePaymentStatus(app_trans_id);

        // Parse JSON string to object
        const parsedData = JSON.parse(embed_data);
        // Access id_order
        const id_order = parsedData.id_order;
        console.log(id_order);
        console.log({ app_id });


        result = { return_code: 1, return_message: "Success" };
    } catch (error) {
        result.return_message = error.message;
    }

    res.json(result);
});

// Cập nhật trạng thái thanh toán
async function updatePaymentStatus(app_trans_id) 
{
    try {
        const client = getClient();
        const db = client.db("PBL6");
        const paymentsCollection = db.collection("payments");
        // Tìm và cập nhật bản ghi có id_order
        const { modifiedCount } = await paymentsCollection.updateOne(
            { trans_id: app_trans_id },
            { $set: { status: 1, payment_at: new Date() } }
        );
        if (modifiedCount === 0) {
            throw new Error("Payment record not found or already updated");
        }
        // Lấy `id_order` của bản ghi vừa cập nhật trong `payments`
        const paymentRecord = await paymentsCollection.findOne({ trans_id: app_trans_id });
        const id_order = paymentRecord?.id_order;
        // Tìm và cập nhật trạng thái của bản ghi tương ứng trong `orders`
        const ordersCollection = db.collection("orders");
        const orderResult = await ordersCollection.updateOne(
            { _id: id_order },
            { $set: { status: 6 } }
        );

        if (orderResult.modifiedCount === 0) {
            throw new Error("Order record not found or already updated");
        }

    } catch (error) {
        console.error("Lỗi khi cập nhật app_trans_id:", error);
    }
}

// Lưu trans_id vào payment
async function saveTransID(app_trans_id, id_order) {
    try {
        const client = getClient();
        const db = client.db("PBL6");
        const paymentsCollection = db.collection("payments");
        // Tìm và cập nhật bản ghi có id_order
        const result = await paymentsCollection.updateOne(
            { id_order: id_order },  // Điều kiện tìm kiếm
            { $set: { trans_id: app_trans_id } }  // Trường cần cập nhật
        );
    } catch (error) {
        console.error("Lỗi khi cập nhật app_trans_id:", error);
    }
}

// Order status route
router.post("/order-status/:app_trans_id", async (req, res) => {
    const app_trans_id = req.params.app_trans_id;

    let postData = {
        app_id: config.app_id,
        app_trans_id: app_trans_id,
    };

    let data = postData.app_id + "|" + postData.app_trans_id + "|" + config.key1;
    postData.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

    let postConfig = {
        method: "post",
        url: "https://sb-openapi.zalopay.vn/v2/query",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data: qs.stringify(postData),
    };

    try {
        const result = await axios(postConfig);
        return res.status(200).json(result.data);
    } catch (error) {
        console.log(error.message);
    }
});

router.put("/updateStatus", authenticateToken, async (req, res) => {
    const { id_order } = req.body;
    
    console.log("Received request with id_order:", id_order);

    if (!id_order) {
        console.log("Error: id_order is missing from the request body");
        return res.status(400).json({ message: "id_order is required" });
    }

    try {
        const client = getClient();
        const db = client.db("PBL6");
        const paymentsCollection = db.collection("payments");

        // Tìm và cập nhật bản ghi trong `payments`
        const { modifiedCount } = await paymentsCollection.updateOne(
            { id_order: id_order },
            { $set: { status: 1, payment_at: new Date() } }
        );

        console.log("Payments collection update result:", modifiedCount);

        if (modifiedCount === 0) {
            console.log("Payment record not found or already updated");
            return res.status(404).json({ message: "Payment record not found or already updated" });
        }

        // Lấy `id_order` của bản ghi vừa cập nhật trong `payments`
        const paymentRecord = await paymentsCollection.findOne({ id_order: id_order });
        console.log("Fetched paymentRecord:", paymentRecord);

        if (!paymentRecord) {
            console.log("Error: paymentRecord not found after update");
            return res.status(404).json({ message: "Payment record not found after update" });
        }

        // Tìm và cập nhật trạng thái trong `orders`
        const ordersCollection = db.collection("orders");
        const orderResult = await ordersCollection.updateOne(
            { _id: id_order },
            { $set: { status: 6 } }
        );

        console.log("Orders collection update result:", orderResult.modifiedCount);

        if (orderResult.modifiedCount === 0) {
            console.log("Order record not found or already updated");
            return res.status(404).json({ message: "Order record not found or already updated" });
        }

        // Trả về phản hồi thành công với mã 201
        console.log("Status updated successfully for id_order:", id_order);
        return res.status(200).json();

    } catch (error) {
        console.error("Lỗi khi cập nhật app_trans_id:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;

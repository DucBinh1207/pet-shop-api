const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
// Middleware để parse JSON body
router.use(express.json());
const { authenticateToken } = require("../middleware/authenticateToken");
const { client } = require("../db");

router.get("/admin/income/orders", authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền admin
    if (id_role !== 2) {
        return res.status(400).json({ message: "Bạn không có quyền truy cập" });
    }

    // Nhận query từ client
    const startDateString = req.query.startDate; // Ngày bắt đầu từ client dưới dạng DD-MM-YY
    const endDateString = req.query.endDate; // Ngày kết thúc từ client dưới dạng DD-MM-YY
    const option = req.query.option || "day"; // "day" hoặc "month"

    // Kiểm tra định dạng ngày từ client
    const parseDate = (dateString) => {
        const [day, month, year] = dateString.split("-");
        const fullYear = `20${year}`;
        return new Date(`${fullYear}-${month}-${day}`);
    };

    const startDate = parseDate(startDateString); // Chuyển đổi ngày bắt đầu
    const endDate = parseDate(endDateString); // Chuyển đổi ngày kết thúc

    try {
        await client.connect();
        const db = client.db("PBL6");
        const ordersCollection = db.collection("orders");

        // Lấy các đơn hàng trong khoảng thời gian và loại bỏ các đơn hàng có status = 0
        const orders = await ordersCollection
            .find({
                status: { $ne: 0 }, // Lọc các đơn hàng có status khác 0
                date: { $gte: startDate, $lte: endDate },
            })
            .toArray();

        // Nhóm dữ liệu
        const groupedIncome = {};

        orders.forEach((order) => {
            // Định dạng ngày theo DD-MM-YY
            const formattedDate = order.date.toLocaleDateString("en-GB"); // Định dạng là ngày-tháng-năm

            // Tạo key nhóm theo ngày hoặc tháng
            const dateKey = option === "month"
                ? formattedDate.slice(3, 10) // Lấy "MM-YY"
                : formattedDate; // Lấy "DD-MM-YY"

            // Cộng dồn doanh thu
            if (!groupedIncome[dateKey]) {
                groupedIncome[dateKey] = 0;
            }
            // Chuyển total_price về kiểu số (loại bỏ số 0 ở trước)
            groupedIncome[dateKey] += parseInt(order.total_price, 10);
        });

        // Chuyển dữ liệu nhóm sang dạng mảng
        const incomeData = Object.keys(groupedIncome).map((key) => ({
            date: key,
            totalIncome: groupedIncome[key], // Trả về dưới dạng số
        }));

        // Tính tổng doanh thu
        const totalIncome = incomeData.reduce((sum, item) => sum + item.totalIncome, 0);

        res.status(200).json({
            totalIncome, // Tổng doanh thu là một số thực
            details: incomeData, // Doanh thu theo ngày/tháng
        });
    } catch (error) {
        console.error("Error calculating income:", error);
        res.status(500).json({ message: "Lỗi máy chủ", error });
    } finally {
        await client.close(); // Đóng kết nối
    }
});

router.get("/admin/income/products/soldNumber", authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền admin
    if (id_role !== 2) {
        return res.status(400).json({ message: "Bạn không có quyền truy cập" });
    }

    const startDateString = req.query.startDate; // Ngày bắt đầu từ client dưới dạng DD-MM-YY
    const endDateString = req.query.endDate; // Ngày kết thúc từ client dưới dạng DD-MM-YY

    // Hàm parse ngày từ DD-MM-YY thành đối tượng Date
    const parseDate = (dateString) => {
        const [day, month, year] = dateString.split("-");
        const fullYear = `20${year}`;
        return new Date(`${fullYear}-${month}-${day}`);
    };

    const startDate = parseDate(startDateString); // Chuyển đổi ngày bắt đầu
    const endDate = parseDate(endDateString); // Chuyển đổi ngày kết thúc

    try {
        await client.connect();
        const db = client.db("PBL6");
        const ordersCollection = db.collection("orders");
        const orderItemsCollection = db.collection("order_items");

        // Bước 1: Tìm các đơn hàng trong khoảng thời gian
        const orders = await ordersCollection
            .find({
                status: { $ne: 0 }, // Lọc các đơn hàng có status khác 0
                date: { $gte: startDate, $lte: endDate },
            })
            .toArray();

        // Lấy id_order từ các đơn hàng
        const orderIds = orders.map((order) => order._id);

        // Bước 2: Tìm các bản ghi trong order_items với id_order đó
        const orderItems = await orderItemsCollection
            .find({
                id_order: { $in: orderIds },
            })
            .toArray();

        // Nhóm theo id_product và tính tổng quantity
        const productSoldData = {};

        orderItems.forEach((item) => {
            const productId = item.option.id_product;
            const productName = item.option.name;
            const quantity = parseInt(item.quantity, 10); // Chuyển quantity về số

            // Nhóm theo id_product và cộng quantity
            if (!productSoldData[productId]) {
                productSoldData[productId] = {
                    id: productId,
                    name: productName,
                    soldQuantity: 0,
                };
            }
            productSoldData[productId].soldQuantity += quantity;
        });

        // Chuyển dữ liệu nhóm sang dạng mảng
        const result = Object.values(productSoldData); // Chỉ lấy các giá trị từ object

        res.status(200).json({
            details: result,
        });
    } catch (error) {
        console.error("Error calculating sold products:", error);
        res.status(500).json({ message: "Lỗi máy chủ", error });
    } finally {
        await client.close(); // Đóng kết nối
    }
}
);

module.exports = router;

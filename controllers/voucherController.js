const voucherBO = require("../BO/voucherBO");

exports.applyVoucher = async (req, res) => {
    try {
        const { code } = req.params; // Lấy code từ params
        console.log(code);

        if (!code) {
            return res.status(400).json(); // Nếu không có mã
        }
        const result = await voucherBO.applyVoucher(code);

        if (result.status === 500) {
            res.status(result.status).json({ message: result.message, error: result.error });
        } else {
            if (result.message) {
                res.status(result.status).json({ message: result.message });
            } else {
                res.status(result.status).json({
                    id: result.id, // Chuyển ObjectId thành string
                    code: result.code,
                    percent: result.percent,
                    date_created: result.date_created,
                });
            }
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}
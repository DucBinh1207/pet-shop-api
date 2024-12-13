const voucherDAO = require("../DAO/voucherDAO");
require("dotenv").config();

exports.applyVoucher = async (code) => {
    return await voucherDAO.applyVoucher(code);
};
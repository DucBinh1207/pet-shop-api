const orderDAO = require("../DAO/orderDAO");
require("dotenv").config();

exports.getOrder = async (id_user) => {
    return await orderDAO.getOrder(id_user);
};

exports.getOrderDetail = async (id_order) => {
    return await orderDAO.getOrderDetail(id_order);
};

exports.createOrder = async (id_user,
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
    return await orderDAO.createOrder(id_user,
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
        note);
};

exports.getOrderItems = async (id_order) => {
    return await orderDAO.getOrderItems(id_order);
};

exports.webGetOrder = async (id_order) => {
    return await orderDAO.webGetOrder(id_order);
};

exports.buyNow = async (userId, product_variant_id, category, quantity) => {
    return await orderDAO.buyNow(userId, product_variant_id, category, quantity);
};

exports.getOrderMobile = async (id_user) => {
    return await orderDAO.getOrderMobile(id_user);
};

exports.createOrder2 = async (id_user,
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
    return await orderDAO.createOrder2(id_user,
        name,
        telephone_number,
        email,
        province,
        district,
        ward,
        street,
        voucher_code,
        payment_method,
        note);
};
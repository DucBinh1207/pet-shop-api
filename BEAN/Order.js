// bean/Order.js
class Order {
    constructor(order) {
        this.id = order._id;
        this.name = order.name;
        this.telephone_number = order.telephone_number;
        this.email = order.email;
        this.total_price = order.total_price;
        this.shipping_price = order.shipping_price;
        this.subtotal_price = order.subtotal_price;
        this.date_created = order.date;
        this.province = order.province;
        this.district = order.district;
        this.ward = order.ward;
        this.street = order.street;
        this.voucher_code = order.voucher_code;
        this.payment_method = order.payment_method;
        this.note = order.note;
        this.status = order.status;
    }
}

module.exports = Order;

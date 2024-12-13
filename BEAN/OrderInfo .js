// bean/OrderInfo.js
class OrderInfo {
    constructor(order) {
        this.id = order._id;
        this.date_created = order.date;
        this.status = order.status;
        this.subtotal_price = order.subtotal_price;
        this.shipping_price = order.shipping_price;
        this.total_price = order.total_price;
        this.payment_method = order.payment_method;
        this.note = order.note;
        this.name = order.name;
        this.telephone_number = order.telephone_number;
        this.email = order.email;
        this.nationality = order.nationality;
        this.province = order.province;
        this.district = order.district;
        this.ward = order.ward;
        this.street = order.street;
    }
}

module.exports = OrderInfo;

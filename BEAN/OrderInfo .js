class OrderInfo {
    constructor(order, voucherInfo) {
        let a = "a";
        if(order.payment_method === 1) {
            a = "Trả tiền khi nhận hàng";
        }else{
            a = "Chuyển khoản online";
        }
        this.id = order._id;
        this.date_created = order.date;
        this.status = order.status;
        this.subtotal_price = order.subtotal_price;
        this.shipping_price = order.shipping_price;
        this.total_price = order.total_price;
        this.payment_method = a;
        this.note = order.note;
        this.name = order.name;
        this.telephone_number = order.telephone_number;
        this.email = order.email;
        this.nationality = order.nationality;
        this.province = order.province;
        this.district = order.district;
        this.ward = order.ward;
        this.street = order.street;

        // Thêm thông tin voucher vào đơn hàng
        this.voucher = order.voucher_code ? order.voucher_code : null;
        this.percent = voucherInfo ? voucherInfo.percent : "0"; // Nếu có voucher, lấy percent, nếu không thì mặc định là 0
    }
}

module.exports = OrderInfo;

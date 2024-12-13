// bean/CompleteCartItem.js
class CompleteCartItem {
    constructor(item) {
        this.id = item._id;
        this.product_id = "";
        this.product_variant_id = item.product_variant_id;
        this.category = item.category;
        this.name = "";
        this.quantity = parseInt(item.quantity, 10);
        this.stock = null;
        this.ingredient = "";
        this.weight = "";
        this.size = "";
        this.color = "";
        this.price = "";
        this.image = "";
        this.status = null;
    }
}

module.exports = CompleteCartItem;

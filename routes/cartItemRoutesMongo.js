const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Middleware để parse JSON body
router.use(express.json());
const { authenticateToken } = require("../middleware/authenticateToken");
const { client } = require("../db");


// Route để thêm sản phẩm vào giỏ hàng
router.post('/cartItem/add', authenticateToken, async (req, res) => {
    const { id_product_variant, category, quantity } = req.body;
    const userId = req.user.userId;  // Lấy id_user từ token sau khi xác thực
    console.log(req.body);
    try {
        await client.connect(); 
        const db = client.db("PBL6"); // Kết nối tới database "PBL6"
        const cartCollection = db.collection('cart_items'); // Truy cập vào collection 'cart_items'

        // Kiểm tra xem đã có sản phẩm với cùng 3 tham số (userId, id_product_variant, category) trong giỏ hàng hay chưa
        const existingItem = await cartCollection.findOne({
            id_user: userId,
            id_product_variant,
            category
        });

        if (existingItem) {
            // Nếu sản phẩm đã tồn tại trong giỏ hàng, cập nhật số lượng
            const updatedQuantity = (parseInt(existingItem.quantity, 10)
                + parseInt(quantity, 10)).toString();
            await cartCollection.updateOne(
                { _id: existingItem._id }, // Dựa vào _id của sản phẩm trong giỏ hàng
                { $set: { quantity: updatedQuantity } }
            );

            res.status(200).json();
        } else {
            // Nếu không có sản phẩm trong giỏ hàng, thêm mới
            const newItem = {
                _id: Date.now().toString(),
                id_user: userId, // Lưu ObjectId của user
                id_product_variant,
                category,
                quantity: quantity.toString(),
                created_at: new Date() // Thêm trường thời gian tạo
            };

            await cartCollection.insertOne(newItem); // Thêm sản phẩm mới vào giỏ hàng

            res.status(201).json();
        }
    } catch (error) {
        console.error('Error adding item to cart:', error); // In ra lỗi nếu có
        res.status(500).json({ message: "Lỗi máy chủ", error });
    }
});
// Route load sản phẩm giỏ hàng của 1 user
router.get("/cartItems", authenticateToken, async (req, res) => {
    const userId = req.user.userId; // Lấy id_user từ token

    try {
        await client.connect(); 
        const db = client.db("PBL6"); // Kết nối tới database "PBL6"
        const cartItemsCollection = db.collection('cart_items'); // Truy cập vào collection 'cart_items'
        const productsCollection = db.collection('products'); // Collection chứa thông tin sản phẩm chung
        const petCollection = db.collection('pets'); // Collection chứa thông tin sản phẩm loại pets
        const foodCollection = db.collection('foods'); // Collection chứa thông tin sản phẩm loại food
        const suppliesCollection = db.collection('supplies'); // Collection chứa thông tin sản phẩm loại supplies

        // Tìm tất cả cart items của user trong MongoDB
        const cartItems = await cartItemsCollection.find({ id_user: userId }).toArray();

        // Kiểm tra nếu không có sản phẩm trong giỏ hàng
        if (!cartItems.length) {
            return res.status(404).json({ message: "Giỏ hàng trống" });
        }

        // Tạo một danh sách để lưu các item hoàn chỉnh
        const completeCartItems = await Promise.all(cartItems.map(async (item) => {
            let completeItem = {
                _id: item._id,
                id_product_variant: item.id_product_variant,
                category: item.category,
                quantity: item.quantity,
                ingredient: "",
                weight: "",
                size: "",
                color: ""
            };

            // Lấy thông tin từ bảng pet, food hoặc supplies dựa trên category
            if (item.category === "pets") {
                const petInfo = await petCollection.findOne({ _id: item.id_product_variant });
                const productInfo = await productsCollection.findOne({ _id: petInfo.id_product });
                if (productInfo && petInfo) {
                    completeItem.name = productInfo.name;
                    completeItem.price = petInfo.price;
                    completeItem.image = productInfo.image;
                }
            } else if (item.category === "foods") {
                const foodInfo = await foodCollection.findOne({ _id: item.id_product_variant });
                const productInfo = await productsCollection.findOne({ _id: foodInfo.id_product });
                if (productInfo && foodInfo) {
                    completeItem.name = productInfo.name;
                    completeItem.price = foodInfo.price;
                    completeItem.image = productInfo.image;
                    completeItem.ingredient = foodInfo.ingredient;
                    completeItem.weight = foodInfo.weight;
                }
            } else if (item.category === "supplies") {
                const suppliesInfo = await suppliesCollection.findOne({ _id: item.id_product_variant });
                const productInfo = await productsCollection.findOne({ _id: suppliesInfo.id_product });
                if (suppliesInfo && productInfo) {
                    completeItem.name = productInfo.name;
                    completeItem.image = productInfo.image;
                    completeItem.price = suppliesInfo.price;
                    completeItem.size = suppliesInfo.size;
                    completeItem.color = suppliesInfo.color;
                }
            }

            return completeItem; // Trả về item hoàn chỉnh
        }));

        // Trả về danh sách item hoàn chỉnh
        res.status(200).json(completeCartItems);
    } catch (error) {
        console.error('Error loading cart items:', error); // In ra lỗi nếu có
        res.status(500).json({ message: "Lỗi máy chủ", error });
    }
});
// Route để cập nhật giỏ hàng
router.put('/cartItems/update', authenticateToken, async (req, res) => {
    const userId = req.user.userId; // Lấy id_user từ token
    const cartItems = req.body; // Nhận danh sách cart items cần cập nhật
    console.log(req.body);

    // Danh sách các ID cần giữ lại
    const idsToKeep = cartItems.map(item => item.id);

    try {
        await client.connect(); 
        const db = client.db("PBL6"); // Kết nối tới database "PBL6"
        const cartItemsCollection = db.collection('cart_items'); // Truy cập vào collection 'cart_items'

        // Lặp qua từng cart item để cập nhật
        for (const item of cartItems) {
            const { id, id_product_variant, category, quantity } = item;
            console.log(id);

            // Kiểm tra xem có item tương ứng trong cart_items không
            const existingItem = await cartItemsCollection.findOne({
                _id: id,
                id_user: userId
            });

            if (existingItem) {
                // Nếu có, cập nhật quantity
                const updatedQuantity = parseInt(quantity, 10);
                await cartItemsCollection.updateOne(
                    { _id: id },
                    { $set: { quantity: updatedQuantity } }
                );
                console.log("Cập nhật: " + updatedQuantity);
            } else {
                // Nếu không có, tạo mới (nếu cần)
                const newItem = {
                    _id: Date.now().toString(),  // Tạo ID duy nhất cho cart item
                    id_user: userId,
                    id_product_variant,
                    category,
                    quantity: quantity
                };
                await cartItemsCollection.insertOne(newItem);
                console.log("Tạo mới: " + id);
            }
        }

        // Xóa các item không có trong danh sách cartItems
        await cartItemsCollection.deleteMany({
            id_user: userId,
            _id: { $nin: idsToKeep.map(id => id) } 
        });

        res.status(201).json();
    } catch (error) {
        console.error('Error updating cart items:', error); // In ra lỗi nếu có
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
});
//Web gọi api này khi muốn delete 1 sp trong giỏ
router.put('/cartItems/delete', authenticateToken, async (req, res) => {
    const userId = req.user.userId; // Lấy id_user từ token
    const { id_item } = req.body; // Nhận id của item cần xóa từ body request
    console.log({id_item});
    try {
        await client.connect(); 
        const db = client.db("PBL6"); // Kết nối tới database "PBL6"
        const cartItemsCollection = db.collection('cart_items'); // Truy cập vào collection 'cart_items'

        // Xóa sản phẩm có id_item và thuộc về user
        const result = await cartItemsCollection.deleteOne({
            _id: id_item,
            id_user: userId
        });

        if (result.deletedCount > 0) {
            res.status(200).json();
        } else {
            res.status(404).json({ message: 'Sản phẩm không tồn tại trong giỏ hàng' });
        }
    } catch (error) {
        console.error('Error deleting cart item:', error); // In ra lỗi nếu có
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
});

module.exports = router;
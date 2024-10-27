const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb'); // Thêm ObjectId

const SECRET_KEY = '0f5f43b5b226531628722a0f20b4c276de87615dfc8516ea4240c93f4135d4b1'; // Thay thế bằng secret key của bạn

// MongoDB connection (nếu không cần tái sử dụng kết nối từ file chính)
const uri = "mongodb+srv://tdv0905179758:qMdBYWg45uwOUz9F@viet.fn3ykhs.mongodb.net/?retryWrites=true&w=majority&appName=Viet";
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
// Middleware để parse JSON body
router.use(express.json());
// Middleware để xác thực token
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' }); // Không có token

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            // Kiểm tra xem lỗi có phải là do token hết hạn hay không
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token has expired' }); // Token hết hạn
            }
            return res.status(401).json({ message: 'Invalid token' }); // Token không hợp lệ
        }
        req.user = user; // Lưu thông tin người dùng vào request
        next();
    });
};
// Route để thêm sản phẩm vào giỏ hàng
router.post('/cartItem/add', authenticateToken, async (req, res) => {
    const { id_product_variant, category, quantity } = req.body;
    const userId = req.user.id;  // Lấy id_user từ token sau khi xác thực

    try {
        const db = client.db("PBL6"); // Kết nối tới database "PBL6"
        const cartCollection = db.collection('cart_items'); // Truy cập vào collection 'cart_items'

        // Chuyển đổi userId từ token sang ObjectId
        const objectId = new ObjectId(userId);

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

            res.status(200).json({ message: 'Cập nhật giỏ hàng thành công!' });
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

            res.status(201).json({ message: 'Thêm vào giỏ hàng thành công!' });
        }
    } catch (error) {
        console.error('Error adding item to cart:', error); // In ra lỗi nếu có
        res.status(500).json({ message: "Lỗi máy chủ", error });
    }
});
// Route load sản phẩm giỏ hàng của 1 user
router.get("/cartItems", authenticateToken, async (req, res) => {
    const userId = req.user.id; // Lấy id_user từ token

    try {
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
        res.json(completeCartItems);
    } catch (error) {
        console.error('Error loading cart items:', error); // In ra lỗi nếu có
        res.status(500).json({ message: "Lỗi máy chủ", error });
    }
});
// Route để cập nhật giỏ hàng
router.post('/cartItems/update', authenticateToken, async (req, res) => {
    const userId = req.user.id; // Lấy id_user từ token
    const cartItems = req.body; // Nhận danh sách cart items cần cập nhật
    console.log(req.body);

    // Danh sách các ID cần giữ lại
    const idsToKeep = cartItems.map(item => item.id);

    try {
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

        res.status(200).json({ message: 'Cập nhật giỏ hàng thành công!' });
    } catch (error) {
        console.error('Error updating cart items:', error); // In ra lỗi nếu có
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
});

module.exports = router;
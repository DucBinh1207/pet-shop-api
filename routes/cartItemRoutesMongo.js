const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Middleware để parse JSON body
router.use(express.json());
const { authenticateToken } = require("../middleware/authenticateToken");
const { client } = require("../db");
const {
    checkValidProduct,
    checkProductStockForCart,
    checkProductStock,
    checkProductAvailability,
    reserveStockForUser,
    checkReservedStock
} = require("../product/product");

// Route để thêm sản phẩm vào giỏ hàng
router.post('/cartItem/add', authenticateToken, async (req, res) => {
    const { product_variant_id, category, quantity } = req.body;
    const userId = req.user.userId;  // Lấy id_user từ token sau khi xác thực
    console.log(req.body);
    try {
        // Kiểm tra tính hợp lệ của sản phẩm
        const productCheck = await checkValidProduct(product_variant_id, category);
        if (!productCheck.success) {
            console.log("SP hết hàng hoặc ko còn tồn tại");
            return res.status(400).json({message: "Sản phẩm đã hết hàng hoặc không còn tồn tại"});
        }
        //Check có đủ số lượng trong kho ko
        const productCheckQuantity = await checkProductStockForCart(product_variant_id, category, quantity);
        if (!productCheckQuantity.success) {
            console.log("SP ko đủ hàng");
            return res.status(400).json({message: "Sản phẩm không đủ hàng"});
        }

        await client.connect();
        const db = client.db("PBL6"); // Kết nối tới database "PBL6"
        const cartCollection = db.collection('cart_items'); // Truy cập vào collection 'cart_items'

        // Kiểm tra xem đã có sản phẩm với cùng 3 tham số (userId, product_variant_id, category) trong giỏ hàng hay chưa
        const existingItem = await cartCollection.findOne({
            id_user: userId,
            product_variant_id: product_variant_id,
            category
        });

        if (existingItem) {
            // Nếu sản phẩm đã tồn tại trong giỏ hàng, cập nhật số lượng
            const updatedQuantity = (parseInt(existingItem.quantity, 10)
                + parseInt(quantity, 10));
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
                product_variant_id: product_variant_id,
                category,
                quantity: parseInt(quantity, 10),
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
    console.log({ userId });
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
            return res.status(200).json();
        }

        // Tạo một danh sách để lưu các item hoàn chỉnh
        const completeCartItems = await Promise.all(cartItems.map(async (item) => {
            let completeItem = {
                id: item._id,
                id_product: "",
                product_variant_id: item.product_variant_id,
                category: item.category,
                name: "",
                quantity: parseInt(item.quantity, 10),
                stock: null,
                ingredient: "",
                weight: "",
                size: "",
                color: "",
                price: "",
                image: "",
                status: null
            };

            // Lấy thông tin từ bảng pet, food hoặc supplies dựa trên category
            if (item.category === "pets") {
                const petInfo = await petCollection.findOne({ _id: item.product_variant_id });
                const productInfo = await productsCollection.findOne({ _id: petInfo.id_product });
                if (productInfo && petInfo) {
                    completeItem.id_product = productInfo._id;
                    completeItem.name = productInfo.name;
                    completeItem.price = petInfo.price;
                    completeItem.image = productInfo.image;
                    completeItem.stock = petInfo.quantity;
                    completeItem.status = 1;
                }
            } else if (item.category === "foods") {
                const foodInfo = await foodCollection.findOne({ _id: item.product_variant_id });
                const productInfo = await productsCollection.findOne({ _id: foodInfo.id_product });
                if (productInfo && foodInfo) {
                    completeItem.id_product = productInfo._id;
                    completeItem.name = productInfo.name;
                    completeItem.price = foodInfo.price;
                    completeItem.image = productInfo.image;
                    completeItem.ingredient = foodInfo.ingredient;
                    completeItem.weight = foodInfo.weight;
                    completeItem.stock = foodInfo.quantity;
                    completeItem.status = 1;
                }
            } else if (item.category === "supplies") {
                const suppliesInfo = await suppliesCollection.findOne({ _id: item.product_variant_id });
                const productInfo = await productsCollection.findOne({ _id: suppliesInfo.id_product });
                if (suppliesInfo && productInfo) {
                    completeItem.id_product = productInfo._id;
                    completeItem.name = productInfo.name;
                    completeItem.image = productInfo.image;
                    completeItem.price = suppliesInfo.price;
                    completeItem.size = suppliesInfo.size;
                    completeItem.color = suppliesInfo.color;
                    completeItem.stock = suppliesInfo.quantity;
                    completeItem.status = 1;
                }
            }

            const productCheckStock = await checkProductStock(completeItem.product_variant_id, completeItem.category);
            if (!productCheckStock.success) {
                console.log("SP hết hàng ");
                completeItem.status = 2;
            } else {
                // Nếu số lượng trong giỏ hàng lớn hơn tồn kho, điều chỉnh lại
                if (item.quantity > productCheckStock.availableQuantity) {
                    completeItem.quantity = productCheckStock.availableQuantity; // Điều chỉnh lại số lượng trong giỏ
                    // Cập nhật lại số lượng trong giỏ hàng
                    await cartItemsCollection.updateOne(
                        { _id: item._id },
                        { $set: { quantity: productCheckStock.availableQuantity } }
                    );
                }
            }
            const productCheckAvailability = await checkProductAvailability(completeItem.product_variant_id, completeItem.category);
            if (!productCheckAvailability.success) {
                console.log("SP đã bị xóa ");
                completeItem.status = 3;
            }
            return completeItem; // Trả về item hoàn chỉnh
        }));

        completeCartItems.sort((a, b) => a.status - b.status);
        // Trả về danh sách item hoàn chỉnh
        res.status(200).json(completeCartItems);
    } catch (error) {
        console.error('Error loading cart items:', error); // In ra lỗi nếu có
        res.status(500).json({ message: "Lỗi máy chủ", error });
    }
});
// Route get cart items cho mobile
router.get("/cartItems/mobile", authenticateToken, async (req, res) => {
    const userId = req.user.userId; // Lấy id_user từ token
    console.log({ userId });
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
            return res.status(400).json();
        }

        // Tạo một danh sách để lưu các item hoàn chỉnh
        const completeCartItems = await Promise.all(cartItems.map(async (item) => {
            let completeItem = {
                id: item._id,
                product_variant_id: item.product_variant_id,
                category: item.category,
                name: "",
                quantity: parseInt(item.quantity, 10),
                ingredient: "",
                weight: "",
                size: "",
                color: "",
                price: "",
                image: "",
                status: null
            };

            // Lấy thông tin từ bảng pet, food hoặc supplies dựa trên category
            if (item.category === "pets") {
                const petInfo = await petCollection.findOne({ _id: item.product_variant_id });
                const productInfo = await productsCollection.findOne({ _id: petInfo.id_product });
                if (productInfo && petInfo) {
                    completeItem.name = productInfo.name;
                    completeItem.price = petInfo.price;
                    completeItem.image = productInfo.image;
                    completeItem.status = 1;
                }
            } else if (item.category === "foods") {
                const foodInfo = await foodCollection.findOne({ _id: item.product_variant_id });
                const productInfo = await productsCollection.findOne({ _id: foodInfo.id_product });
                if (productInfo && foodInfo) {
                    completeItem.name = productInfo.name;
                    completeItem.price = foodInfo.price;
                    completeItem.image = productInfo.image;
                    completeItem.ingredient = foodInfo.ingredient;
                    completeItem.weight = foodInfo.weight;
                    completeItem.status = 1;
                }
            } else if (item.category === "supplies") {
                const suppliesInfo = await suppliesCollection.findOne({ _id: item.product_variant_id });
                const productInfo = await productsCollection.findOne({ _id: suppliesInfo.id_product });
                if (suppliesInfo && productInfo) {
                    completeItem.name = productInfo.name;
                    completeItem.image = productInfo.image;
                    completeItem.price = suppliesInfo.price;
                    completeItem.size = suppliesInfo.size;
                    completeItem.color = suppliesInfo.color;
                    completeItem.status = 1;
                }
            }

            const productCheckStock = await checkProductStock(completeItem.product_variant_id, completeItem.category);
            if (!productCheckStock.success) {
                console.log("SP hết hàng ");
                completeItem.status = 2;
            } else {
                // Nếu số lượng trong giỏ hàng lớn hơn tồn kho, điều chỉnh lại
                if (item.quantity > productCheckStock.availableQuantity) {
                    completeItem.quantity = productCheckStock.availableQuantity; // Điều chỉnh lại số lượng trong giỏ
                    // Cập nhật lại số lượng trong giỏ hàng
                    await cartItemsCollection.updateOne(
                        { _id: item._id },
                        { $set: { quantity: productCheckStock.availableQuantity } }
                    );
                }
            }
            const productCheckAvailability = await checkProductAvailability(completeItem.product_variant_id, completeItem.category);
            if (!productCheckAvailability.success) {
                console.log("SP đã bị xóa ");
                completeItem.status = 3;
            }
            return completeItem; // Trả về item hoàn chỉnh
        }));

        completeCartItems.sort((a, b) => a.status - b.status);
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
            const { id, product_variant_id, category, quantity } = item;
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
                    product_variant_id,
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
    console.log({ id_item });
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
            res.status(400).json();
        }
    } catch (error) {
        console.error('Error deleting cart item:', error); // In ra lỗi nếu có
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
});
//Route check sản phẩm có hợp lệ trc khi chuyển qua thanh toán
router.get("/cartItems/verify", authenticateToken, async (req, res) => {
    const userId = req.user.userId; // Lấy id_user từ token

    try {
        await client.connect();
        const db = client.db("PBL6"); // Kết nối tới database "PBL6"
        const cartItemsCollection = db.collection('cart_items'); // Truy cập vào collection 'cart_items'

        // Tìm tất cả cart items của user trong MongoDB
        const cartItems = await cartItemsCollection.find({ id_user: userId }).toArray();

        // Kiểm tra nếu không có sản phẩm trong giỏ hàng
        if (!cartItems.length) {
            console.log("Ko có sp trong giỏ")
            return res.status(400).json({message: "Không có sản phẩm trong giỏ"});
        }

        // Kiểm tra từng item trong giỏ hàng
        for (const item of cartItems) {
            // Kiểm tra số lượng tồn kho
            const productCheckStock = await checkProductStock(item.product_variant_id, item.category);
            if (!productCheckStock.success) {
                console.log("Sản phẩm hết hàng: ", item.product_variant_id);
                return res.status(400).json({message: "Sản phẩm hết hàng: " + item.product_variant_id});
            }

            // Nếu số lượng trong giỏ hàng lớn hơn tồn kho, điều chỉnh lại
            if (item.quantity > productCheckStock.availableQuantity) {
                // Cập nhật lại số lượng trong giỏ hàng
                await cartItemsCollection.updateOne(
                    { _id: item._id },
                    { $set: { quantity: productCheckStock.availableQuantity } }
                );
                console.log(`Số lượng sản phẩm ${item.product_variant_id} đã được điều chỉnh.`);
                return res.status(400).json({message: "Sản phẩm nhiều hơn tồn kho, đã điều chỉnh lại"});
            }

            // Kiểm tra tính khả dụng của sản phẩm
            const productCheckAvailability = await checkProductAvailability(item.product_variant_id, item.category);
            if (!productCheckAvailability.success) {
                console.log("Sản phẩm đã bị xóa: ", item.product_variant_id);
                return res.status(400).json({message: "Sản phẩm đã bị xóa: " + item.product_variant_id});
            }
        }

        for (const item of cartItems) {
            let collectionName;

            // Xác định collection dựa trên category
            switch (item.category) {
                case "pets":
                    collectionName = "pets";
                    break;
                case "foods":
                    collectionName = "foods";
                    break;
                case "supplies":
                    collectionName = "supplies";
                    break;
                default:
                    console.log("Category lỗi", item.product_variant_id);
                    return res.status(400).json({message: "Category lỗi"});
            }

            // Trừ tồn kho trong collection tương ứng
            const updatedStock = await db.collection(collectionName).updateOne(
                { _id: item.product_variant_id },
                { $inc: { quantity: -item.quantity } }
            );

            // Kiểm tra kết quả cập nhật
            if (updatedStock.modifiedCount === 0) {
                console.log(`Không thể trừ tồn kho cho sản phẩm ${item.product_variant_id} thuộc danh mục ${item.category}.`)
                return res.status(400).json({message: "Không thể trừ tồn kho"});
            }
        }

        // Nếu kiểm tra thành công, giữ hàng trong Redis
        const reserveStock = await reserveStockForUser(userId, cartItems);
        if (!reserveStock.success) {
            console.log("Lỗi giữ hàng");
            return res.status(400).json({message: "Lỗi giữ hàng"});
        }

        // Nếu tất cả đều hợp lệ, trả về thành công
        res.status(200).json();

    } catch (error) {
        console.error('Error loading cart items:', error); // In ra lỗi nếu có
        res.status(500).json({
            message: "Lỗi máy chủ"
        });
    }
});
//Route check stock (ko cần dùng)
router.get("/cartItems/checkStock", authenticateToken, async (req, res) => {
    const userId = req.user.userId; // Lấy id_user từ token
    try {
        await client.connect();

        // Nếu kiểm tra thành công, giữ hàng trong Redis
        const checkReserveStock = await checkReservedStock(userId);
        if (!checkReserveStock.success) {
            console.log("Lỗi giữ hàng");
            return res.status(400).json({
                success: false,
                message: checkReserveStock.message,
            });
        }

        // Nếu tất cả đều hợp lệ, trả về thành công
        res.status(200).json({
            success: true,
            message: checkReserveStock.data,
        });

    } catch (error) {
        console.error('Error loading cart items:', error); // In ra lỗi nếu có
        res.status(500).json({
            success: false,
            message: "Lỗi máy chủ",
            error,
        });
    }
});

module.exports = router;
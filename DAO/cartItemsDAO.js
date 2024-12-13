const express = require('express');
const router = express.Router();
// Middleware để parse JSON body
router.use(express.json());
const {
    checkValidProduct,
    checkProductStockForCart,
    checkProductStock,
    checkProductAvailability,
    reserveStockForUser,
} = require("../product/product");
const { getClient } = require("../db");
const CompleteCartItem = require('../BEAN/completeCartItems');

exports.addToCart = async (product_variant_id, category,
    quantity, userId) => {
    try {
        // Kiểm tra tính hợp lệ của sản phẩm
        const productCheck = await checkValidProduct(product_variant_id, category);
        if (!productCheck.success) {
            console.log("SP hết hàng hoặc ko còn tồn tại");
            return {
                status: 400,
                message: "Sản phẩm đã hết hàng hoặc không còn tồn tại"
            };
        }
        //Check có đủ số lượng trong kho ko
        const productCheckQuantity = await checkProductStockForCart(product_variant_id, category, quantity);
        if (!productCheckQuantity.success) {
            console.log("SP ko đủ hàng");
            return {
                status: 400,
                message: "Sản phẩm không đủ hàng"
            };
        }

        const client = getClient();
        const db = client.db("PBL6");
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
            return {
                status: 200,
            };
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

            return {
                status: 201,
            };
        }
    } catch (error) {
        console.error('Error adding item to cart:', error); // In ra lỗi nếu có
        return {
            status: 500,
            message: "Lỗi máy chủ",
            error
        };
    }
};

exports.getCartItems = async (userId) => {
    try {
        const client = getClient();
        const db = client.db("PBL6");
        const cartItemsCollection = db.collection('cart_items'); // Truy cập vào collection 'cart_items'
        const productsCollection = db.collection('products'); // Collection chứa thông tin sản phẩm chung
        const petCollection = db.collection('pets'); // Collection chứa thông tin sản phẩm loại pets
        const foodCollection = db.collection('foods'); // Collection chứa thông tin sản phẩm loại food
        const suppliesCollection = db.collection('supplies'); // Collection chứa thông tin sản phẩm loại supplies

        // Tìm tất cả cart items của user trong MongoDB
        const cartItems = await cartItemsCollection.find({ id_user: userId }).toArray();

        // Kiểm tra nếu không có sản phẩm trong giỏ hàng
        if (!cartItems.length) {
            return {
                status: 200,
            };
        }

        // Tạo một danh sách để lưu các item hoàn chỉnh
        const completeCartItems = await Promise.all(cartItems.map(async (item) => {
            let completeItem = new CompleteCartItem(item);

            let productInfo, variantInfo;

            switch (item.category) {
                case "pets":
                    variantInfo = await petCollection.findOne({ _id: item.product_variant_id });
                    productInfo = await productsCollection.findOne({ _id: variantInfo.id_product });
                    if (variantInfo && productInfo) {
                        completeItem.product_id = productInfo._id;
                        completeItem.name = productInfo.name;
                        completeItem.price = variantInfo.price;
                        completeItem.image = productInfo.image;
                        completeItem.stock = variantInfo.quantity;
                        completeItem.status = 1;
                    }
                    break;
                case "foods":
                    variantInfo = await foodCollection.findOne({ _id: item.product_variant_id });
                    productInfo = await productsCollection.findOne({ _id: variantInfo.id_product });
                    if (variantInfo && productInfo) {
                        completeItem.product_id = productInfo._id;
                        completeItem.name = productInfo.name;
                        completeItem.price = variantInfo.price;
                        completeItem.image = productInfo.image;
                        completeItem.ingredient = variantInfo.ingredient;
                        completeItem.weight = variantInfo.weight;
                        completeItem.stock = variantInfo.quantity;
                        completeItem.status = 1;
                    }
                    break;
                case "supplies":
                    variantInfo = await suppliesCollection.findOne({ _id: item.product_variant_id });
                    productInfo = await productsCollection.findOne({ _id: variantInfo.id_product });
                    if (variantInfo && productInfo) {
                        completeItem.product_id = productInfo._id;
                        completeItem.name = productInfo.name;
                        completeItem.image = productInfo.image;
                        completeItem.price = variantInfo.price;
                        completeItem.size = variantInfo.size;
                        completeItem.color = variantInfo.color;
                        completeItem.stock = variantInfo.quantity;
                        completeItem.status = 1;
                    }
                    break;
            }

            const productCheckStock = await checkProductStock(completeItem.product_variant_id, completeItem.category);
            if (!productCheckStock.success) {
                console.log("SP hết hàng");
                completeItem.status = 2;
            } else if (item.quantity > productCheckStock.availableQuantity) {
                completeItem.quantity = productCheckStock.availableQuantity;
                await cartItemsCollection.updateOne(
                    { _id: item._id },
                    { $set: { quantity: productCheckStock.availableQuantity } }
                );
            }

            const productCheckAvailability = await checkProductAvailability(completeItem.product_variant_id, completeItem.category);
            if (!productCheckAvailability.success) {
                console.log("SP đã bị xóa");
                completeItem.status = 3;
            }

            return completeItem;
        }));

        completeCartItems.sort((a, b) => a.status - b.status);
        // Trả về danh sách item hoàn chỉnh
        return {
            status: 200,
            completeCartItems
        };
    } catch (error) {
        console.error('Error loading cart items:', error); // In ra lỗi nếu có
        return {
            status: 500,
            message: "Lỗi máy chủ",
            error
        };
    }
};

exports.getCartItemsMobile = async (userId) => {
    try {
        const client = getClient();
        const db = client.db("PBL6");
        const cartItemsCollection = db.collection('cart_items'); // Truy cập vào collection 'cart_items'
        const productsCollection = db.collection('products'); // Collection chứa thông tin sản phẩm chung
        const petCollection = db.collection('pets'); // Collection chứa thông tin sản phẩm loại pets
        const foodCollection = db.collection('foods'); // Collection chứa thông tin sản phẩm loại food
        const suppliesCollection = db.collection('supplies'); // Collection chứa thông tin sản phẩm loại supplies

        // Tìm tất cả cart items của user trong MongoDB
        const cartItems = await cartItemsCollection.find({ id_user: userId }).toArray();

        // Kiểm tra nếu không có sản phẩm trong giỏ hàng
        if (!cartItems.length) {
            return {
                status: 400,
            };
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
        return {
            status: 200,
            completeCartItems
        };
    } catch (error) {
        console.error('Error loading cart items:', error); // In ra lỗi nếu có
        return {
            status: 500,
            message: "Lỗi máy chủ",
            error
        };
    }
};

exports.updateCart = async (userId, cartItems) => {
    // Danh sách các ID cần giữ lại
    const idsToKeep = cartItems.map(item => item.id);

    try {
        const client = getClient();
        const db = client.db("PBL6");
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

        return {
            status: 201,
        };
    } catch (error) {
        console.error('Error updating cart items:', error); // In ra lỗi nếu có
        return {
            status: 500,
            message: 'Lỗi máy chủ',
            error
        };
    }
};

exports.deleteCartItems = async (userId, id_item) => {
    try {
        const client = getClient();
        const db = client.db("PBL6");
        const cartItemsCollection = db.collection('cart_items'); // Truy cập vào collection 'cart_items'

        // Xóa sản phẩm có id_item và thuộc về user
        const result = await cartItemsCollection.deleteOne({
            _id: id_item,
            id_user: userId
        });

        if (result.deletedCount > 0) {
            return {
                status: 200,
            };
        } else {
            return {
                status: 400,
            };
        }
    } catch (error) {
        console.error('Error deleting cart item:', error); // In ra lỗi nếu có
        return {
            status: 500,
            message: 'Lỗi máy chủ',
            error
        };
    }
};

exports.verifyCart = async (userId) => {
    try {
        const client = getClient();
        const db = client.db("PBL6");
        const cartItemsCollection = db.collection('cart_items'); // Truy cập vào collection 'cart_items'

        // Tìm tất cả cart items của user trong MongoDB
        const cartItems = await cartItemsCollection.find({ id_user: userId }).toArray();

        // Kiểm tra nếu không có sản phẩm trong giỏ hàng
        if (!cartItems.length) {
            console.log("Ko có sp trong giỏ")
            return {
                status: 400,
                message: "Không có sản phẩm trong giỏ"
            };
        }

        // Kiểm tra từng item trong giỏ hàng
        for (const item of cartItems) {
            // Kiểm tra số lượng tồn kho
            const productCheckStock = await checkProductStock(item.product_variant_id, item.category);
            if (!productCheckStock.success) {
                console.log("Sản phẩm hết hàng: ", item.product_variant_id);
                return {
                    status: 400,
                    message: "Sản phẩm hết hàng: " + item.product_variant_id
                };
            }

            // Nếu số lượng trong giỏ hàng lớn hơn tồn kho, điều chỉnh lại
            if (item.quantity > productCheckStock.availableQuantity) {
                // Cập nhật lại số lượng trong giỏ hàng
                await cartItemsCollection.updateOne(
                    { _id: item._id },
                    { $set: { quantity: productCheckStock.availableQuantity } }
                );
                console.log(`Số lượng sản phẩm ${item.product_variant_id} đã được điều chỉnh.`);
                return {
                    status: 400,
                    message: "Sản phẩm nhiều hơn tồn kho, đã điều chỉnh lại"
                };
            }

            // Kiểm tra tính khả dụng của sản phẩm
            const productCheckAvailability = await checkProductAvailability(item.product_variant_id, item.category);
            if (!productCheckAvailability.success) {
                console.log("Sản phẩm đã bị xóa: ", item.product_variant_id);
                return {
                    status: 400,
                    message: "Sản phẩm đã bị xóa: " + item.product_variant_id
                };
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
                    return {
                        status: 400,
                        message: "Category lỗi"
                    };
            }

            // Trừ tồn kho trong collection tương ứng
            const updatedStock = await db.collection(collectionName).updateOne(
                { _id: item.product_variant_id },
                { $inc: { quantity: -item.quantity } }
            );

            // Kiểm tra kết quả cập nhật
            if (updatedStock.modifiedCount === 0) {
                console.log(`Không thể trừ tồn kho cho sản phẩm ${item.product_variant_id} thuộc danh mục ${item.category}.`)
                return {
                    status: 400,
                    message: "Không thể trừ tồn kho"
                };
            }
        }

        // Nếu kiểm tra thành công, giữ hàng trong Redis
        const reserveStock = await reserveStockForUser(userId, cartItems);
        if (!reserveStock.success) {
            console.log("Lỗi giữ hàng");
            return {
                status: 400,
                message: "Lỗi giữ hàng"
            };
        }

        // Nếu tất cả đều hợp lệ, trả về thành công
        return {
            status: 200,
        };

    } catch (error) {
        console.error('Error loading cart items:', error); // In ra lỗi nếu có
        return {
            status: 500,
            message: "Lỗi máy chủ"
        };
    }
};

exports.verifyCart2 = async (userId, selectedIds) => {
    try {
        
        const client = getClient();
        const db = client.db("PBL6");
        const cartItemsCollection = db.collection('cart_items'); // Truy cập vào collection 'cart_items'
        
        if (!Array.isArray(selectedIds)) {
            selectedIds = [selectedIds];  // Chuyển đổi giá trị duy nhất thành mảng
        }
        
        // Tìm các cart items được chọn trong MongoDB
        const cartItems = await cartItemsCollection.find({ 
            id_user: userId, 
            _id: { $in: selectedIds } 
        }).toArray();

        // Kiểm tra nếu không có sản phẩm được chọn
        if (!cartItems.length) {
            console.log("Không có sản phẩm nào được chọn");
            return {
                status: 400,
                message: "Không có sản phẩm nào được chọn"
            };
        }

        // Kiểm tra từng item trong danh sách được chọn
        for (const item of cartItems) {
            // Kiểm tra số lượng tồn kho
            const productCheckStock = await checkProductStock(item.product_variant_id, item.category);
            if (!productCheckStock.success) {
                console.log("Sản phẩm hết hàng: ", item.product_variant_id);
                return {
                    status: 400,
                    message: "Sản phẩm hết hàng: " + item.product_variant_id
                };
            }

            // Nếu số lượng trong giỏ hàng lớn hơn tồn kho, điều chỉnh lại
            if (item.quantity > productCheckStock.availableQuantity) {
                // Cập nhật lại số lượng trong giỏ hàng
                await cartItemsCollection.updateOne(
                    { _id: item._id },
                    { $set: { quantity: productCheckStock.availableQuantity } }
                );
                console.log(`Số lượng sản phẩm ${item.product_variant_id} đã được điều chỉnh.`);
                return {
                    status: 400,
                    message: "Sản phẩm nhiều hơn tồn kho, đã điều chỉnh lại"
                };
            }

            // Kiểm tra tính khả dụng của sản phẩm
            const productCheckAvailability = await checkProductAvailability(item.product_variant_id, item.category);
            if (!productCheckAvailability.success) {
                console.log("Sản phẩm đã bị xóa: ", item.product_variant_id);
                return {
                    status: 400,
                    message: "Sản phẩm đã bị xóa: " + item.product_variant_id
                };
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
                    return {
                        status: 400,
                        message: "Category lỗi"
                    };
            }

            // Trừ tồn kho trong collection tương ứng
            const updatedStock = await db.collection(collectionName).updateOne(
                { _id: item.product_variant_id },
                { $inc: { quantity: -item.quantity } }
            );

            // Kiểm tra kết quả cập nhật
            if (updatedStock.modifiedCount === 0) {
                console.log(`Không thể trừ tồn kho cho sản phẩm ${item.product_variant_id} thuộc danh mục ${item.category}.`)
                return {
                    status: 400,
                    message: "Không thể trừ tồn kho"
                };
            }
        }

        // Nếu kiểm tra thành công, giữ hàng trong Redis
        const reserveStock = await reserveStockForUser(userId, cartItems);
        if (!reserveStock.success) {
            console.log("Lỗi giữ hàng");
            return {
                    status: 400,
                message: "Lỗi giữ hàng"
            };
        }

        // Nếu tất cả đều hợp lệ, trả về thành công
        return {
            status: 200,
        };

    } catch (error) {
        console.error('Error loading cart items:', error); // In ra lỗi nếu có
        return {
            status: 500,
            message: "Lỗi máy chủ"
        };
    }
};

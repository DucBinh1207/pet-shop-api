const { client } = require("../db");
const cloudinary = require('cloudinary').v2;
const { v4: uuidv4 } = require('uuid');

// Cấu hình tài khoản Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

async function addPet(name, description, imagePath,
    price, gender, health, father, mother, type, deworming,
    vaccine, breed, breed_origin, trait, date_of_birth, quantity) {
    try {
        await client.connect();
        const database = client.db("PBL6");
        const productsCollection = database.collection("products");
        const petsCollection = database.collection("pets");

        // Tải ảnh lên Cloudinary
        const uploadResult = await cloudinary.uploader.upload(imagePath, {
            folder: "pets" // Đặt thư mục trên Cloudinary nếu muốn
        });

        // Sau khi tải ảnh thành công, lưu URL của ảnh
        const imageUrl = uploadResult.secure_url;

        // Tạo đối tượng sản phẩm mới
        _id = Date.now().toString();
        const newProduct = {
            _id: _id,
            category: "pets",
            name: name,
            description: description,
            image: imageUrl, // Sử dụng URL từ Cloudinary
            rating: 1,
            date_created: new Date(),
            status: 1,
        };

        // Thêm sản phẩm vào MongoDB
        const resultProduct = await productsCollection.insertOne(newProduct);
        console.log("Đã thêm product cho pet");

        const newPet = {
            _id: Date.now().toString(),
            id_product: _id,
            price: parseInt(price, 10), // Chuyển price thành số nguyên (int)
            gender: gender === 'true', // Chuyển gender thành boolean
            health: health,
            father: father,
            mother: mother,
            type: type,
            deworming: deworming,
            vaccine: vaccine,
            breed: breed,
            breed_origin: breed_origin === 'true', // Chuyển breed_origin thành boolean
            trait: trait,
            date_of_birth: new Date(date_of_birth),
            quantity: parseInt(quantity, 10),
            status: 1,
        };

        const resultPet = await petsCollection.insertOne(newPet);
        console.log("Đã thêm pet cho pet");
        return { success: true };
    } catch (err) {
        console.error(err);
        return { success: false, message: "Error adding pet." };
    }
}

async function addFood(name, description, imagePath, pet_type, nutrition_info, expire_date, brand, variations_food) {
    productFood_id = uuidv4();
    try {
        await client.connect();
        const database = client.db("PBL6");
        const productsCollection = database.collection("products");
        const foodsCollection = database.collection("foods");

        // Tải ảnh lên Cloudinary
        const uploadResult = await cloudinary.uploader.upload(imagePath, {
            folder: "foods" // Đặt thư mục trên Cloudinary nếu muốn
        });

        // Sau khi tải ảnh thành công, lưu URL của ảnh
        const imageUrl = uploadResult.secure_url;

        // Đầu tiên, lưu thông tin của sản phẩm 'food' chính
        const foodDoc = {
            _id: productFood_id,
            category: "foods",
            name: name,
            description: description,
            image: imageUrl,
            status: 1,
            date_created: new Date(),
            rating: 1

        };
        // Thêm sản phẩm vào 'products'
        const result = await productsCollection.insertOne(foodDoc);

        // Nếu không thêm thành công, trả về lỗi
        if (!result.acknowledged) {
            return { success: false, message: "Failed to add food product." };
        }
        variations_food = typeof variations_food === 'string' ? JSON.parse(variations_food) : variations_food;
        // Tiếp theo, lưu từng variation (biến thể) vào cơ sở dữ liệu
        const variationPromises = variations_food.map(async (variation) => {
            const variationDoc = {
                _id: uuidv4(),
                id_product: productFood_id,  // Liên kết với ID của sản phẩm chính
                ingredient: variation.ingredient,
                weight: variation.weight,
                price: parseInt(variation.price, 10),
                pet_type: pet_type,
                nutrition_info: nutrition_info,
                expire_date: new Date(expire_date), // Chuyển expire_date thành kiểu ngày tháng
                brand: brand,
                quantity: parseInt(variation.quantity, 10),
                date_created: new Date(),
                status: 1 // Trạng thái mặc định là 1
            };

            // Thêm mỗi variation vào bảng 'foods'
            await foodsCollection.insertOne(variationDoc);
        });

        // Chờ đợi tất cả các variation được thêm vào
        await Promise.all(variationPromises);

        return { success: true, message: "Food product and its variations added successfully." };
    } catch (err) {
        console.error("Error adding food product and variations:", err);
        return { success: false, message: "Internal server error" };
    }
}

async function addSupplies(name, description, imagePath, material, brand, type, suppliesVariations) {
    productSupplies_id = uuidv4();
    try {
        await client.connect();
        const database = client.db("PBL6");
        const productsCollection = database.collection("products");
        const suppliesCollection = database.collection("supplies");

        // Tải ảnh lên Cloudinary
        const uploadResult = await cloudinary.uploader.upload(imagePath, {
            folder: "supplies" // Đặt thư mục trên Cloudinary nếu muốn
        });

        // Sau khi tải ảnh thành công, lưu URL của ảnh
        const imageUrl = uploadResult.secure_url;

        // Đầu tiên, lưu thông tin của sản phẩm 'food' chính
        const supplyDoc = {
            _id: productSupplies_id,
            category: "supplies",
            name: name,
            description: description,
            image: imageUrl,
            status: 1,
            date_created: new Date(),
            rating: 1

        };
        // Thêm sản phẩm vào 'products'
        const result = await productsCollection.insertOne(supplyDoc);

        // Nếu không thêm thành công, trả về lỗi
        if (!result.acknowledged) {
            return { success: false, message: "Failed to add supply product." };
        }
        suppliesVariations = typeof suppliesVariations === 'string' ? JSON.parse(suppliesVariations) : variations_food;
        // Tiếp theo, lưu từng variation (biến thể) vào cơ sở dữ liệu
        const variationPromises = suppliesVariations.map(async (variation) => {
            const variationDoc = {
                _id: uuidv4(),
                id_product: productSupplies_id,  // Liên kết với ID của sản phẩm chính
                color: variation.color,
                size: variation.size,
                price: parseInt(variation.price, 10),
                material: material,
                brand: brand,
                type: type,
                quantity: parseInt(variation.quantity, 10),
                date_created: new Date(),
                status: 1 // Trạng thái mặc định là 1
            };

            // Thêm mỗi variation vào bảng 'supplies'
            await suppliesCollection.insertOne(variationDoc);
        });

        // Chờ đợi tất cả các variation được thêm vào
        await Promise.all(variationPromises);

        return { success: true, message: "Supply product and its variations added successfully." };
    } catch (err) {
        console.error("Error adding supply product and variations:", err);
        return { success: false, message: "Internal server error" };
    }
}

async function updatePet(_id, name, description, imagePath,
    price, gender, health, father, mother, type, deworming,
    vaccine, breed, breed_origin, trait, date_of_birth, quantity) {
    try {
        await client.connect();
        const database = client.db("PBL6");
        const productsCollection = database.collection("products");
        const petsCollection = database.collection("pets");

        const productPet = await productsCollection.findOne({ _id: _id });
        const oldImageURL = productPet.image;

        // Tách public_id từ link ảnh
        const publicId = oldImageURL.split('/').slice(-2).join('/').replace(/\.[^/.]+$/, "");

        // Xóa ảnh trên Cloudinary dựa vào public_id
        cloudinary.uploader.destroy(publicId, (error, result) => {
            if (error) {
                console.error("Failed to delete image on Cloudinary:", error);
            } else {
                console.log("Image deleted on Cloudinary:", result);
            }
        });
        // Tải ảnh mới lên Cloudinary
        const uploadResult = await cloudinary.uploader.upload(imagePath, {
            folder: "pets" // Đặt thư mục trên Cloudinary nếu muốn
        });
        // Sau khi tải ảnh thành công, lưu URL của ảnh
        const imageUrl = uploadResult.secure_url;

    } catch (err) {
        console.error(err);
        return { success: false, message: "Error adding pet." };
    }
}
module.exports = {
    addPet,
    addFood,
    addSupplies,
    updatePet,
};

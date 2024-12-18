const { getClient } = require("../db");
const cloudinary = require('cloudinary').v2;
const { v4: uuidv4 } = require('uuid');

// Cấu hình tài khoản Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

async function updateAvatarUser(userId, imagePath) {
    try {
        // Upload ảnh mới lên Cloudinary
        const result = await cloudinary.uploader.upload(imagePath, {
            folder: "avatars", // Thư mục chứa ảnh avatar
            public_id: `user_${userId}_${uuidv4()}`, // Tạo tên ảnh độc nhất
            overwrite: true // Cho phép ghi đè lên ảnh cũ nếu có
        });

        // Lấy URL ảnh mới từ Cloudinary
        const imageUrl = result.secure_url;

        // Truy cập MongoDB và tìm người dùng
        const client = getClient();
        const db = client.db("PBL6");
        const usersCollection = db.collection('users');

        // Kiểm tra xem người dùng có ảnh cũ không
        const user = await usersCollection.findOne({ _id: userId });

        if (user && user.image) {
            // Nếu người dùng đã có ảnh, xóa ảnh cũ khỏi Cloudinary
            const publicId = user.image.split('/').pop().split('.')[0]; // Lấy public_id từ URL ảnh cũ
            await cloudinary.uploader.destroy(`avatars/${publicId}`);
        }

        // Cập nhật ảnh mới vào thông tin người dùng
        await usersCollection.updateOne(
            { _id: userId },
            { $set: { image: imageUrl } }
        );

        return { success: true, imageUrl }; // Trả về URL ảnh mới
    } catch (err) {
        console.error("Error updating avatar:", err);
        return { success: false, message: "Lỗi cập nhật avatar" };
    }
}
async function updatePetImage(imagePath, id_product) {
    try {
        // Upload ảnh mới lên Cloudinary
        const result = await cloudinary.uploader.upload(imagePath, {
            folder: "pets", // Thư mục chứa ảnh pets
            public_id: `pet_${id_product}_${uuidv4()}`, // Tạo tên ảnh độc nhất
            overwrite: true // Cho phép ghi đè lên ảnh cũ nếu có
        });

        // Lấy URL ảnh mới từ Cloudinary
        const imageUrl = result.secure_url;

        // Truy cập MongoDB và tìm sản phẩm pet
        const client = getClient();
        const db = client.db("PBL6");
        const productsCollection = db.collection('products');

        // Kiểm tra xem sản phẩm có ảnh cũ không
        const pet = await productsCollection.findOne({ _id: id_product });

        if (pet && pet.image) {
            // Nếu sản phẩm đã có ảnh, xóa ảnh cũ khỏi Cloudinary
            const publicId = pet.image.split('/').slice(-2).join('/').split('.')[0]; // Lấy public_id từ URL ảnh cũ
            await cloudinary.uploader.destroy(publicId);
        }

        // Cập nhật ảnh mới vào sản phẩm
        await productsCollection.updateOne(
            { _id: id_product },
            { $set: { image: imageUrl } }
        );

        return { success: true, imageUrl }; // Trả về URL ảnh mới
    } catch (err) {
        console.error("Error updating pet image:", err);
        return { success: false, message: "Lỗi cập nhật ảnh pet" };
    }
}
async function updateFoodImage(imagePath, id_product) {
    try {
        // Upload ảnh mới lên Cloudinary
        const result = await cloudinary.uploader.upload(imagePath, {
            folder: "foods", // Thư mục chứa ảnh pets
            public_id: `food_${id_product}_${uuidv4()}`, // Tạo tên ảnh độc nhất
            overwrite: true // Cho phép ghi đè lên ảnh cũ nếu có
        });

        // Lấy URL ảnh mới từ Cloudinary
        const imageUrl = result.secure_url;

        // Truy cập MongoDB và tìm sản phẩm pet
        const client = getClient();
        const db = client.db("PBL6");
        const productsCollection = db.collection('products');

        // Kiểm tra xem sản phẩm có ảnh cũ không
        const food = await productsCollection.findOne({ _id: id_product });

        if (food && food.image) {
            // Nếu sản phẩm đã có ảnh, xóa ảnh cũ khỏi Cloudinary
            const publicId = food.image.split('/').slice(-2).join('/').split('.')[0]; // Lấy public_id từ URL ảnh cũ
            await cloudinary.uploader.destroy(publicId);
        }

        // Cập nhật ảnh mới vào sản phẩm
        await productsCollection.updateOne(
            { _id: id_product },
            { $set: { image: imageUrl } }
        );

        return { success: true, imageUrl }; // Trả về URL ảnh mới
    } catch (err) {
        console.error("Error updating food image:", err);
        return { success: false, message: "Lỗi cập nhật ảnh food" };
    }
}
async function updateSuppliesImage(imagePath, id_product) {
    try {
        // Upload ảnh mới lên Cloudinary
        const result = await cloudinary.uploader.upload(imagePath, {
            folder: "supplies", // Thư mục chứa ảnh pets
            public_id: `supply_${id_product}_${uuidv4()}`, // Tạo tên ảnh độc nhất
            overwrite: true // Cho phép ghi đè lên ảnh cũ nếu có
        });

        // Lấy URL ảnh mới từ Cloudinary
        const imageUrl = result.secure_url;

        // Truy cập MongoDB và tìm sản phẩm pet
        const client = getClient();
        const db = client.db("PBL6");
        const productsCollection = db.collection('products');

        // Kiểm tra xem sản phẩm có ảnh cũ không
        const supply = await productsCollection.findOne({ _id: id_product });

        if (supply && supply.image) {
            // Nếu sản phẩm đã có ảnh, xóa ảnh cũ khỏi Cloudinary
            const publicId = supply.image.split('/').slice(-2).join('/').split('.')[0]; // Lấy public_id từ URL ảnh cũ
            await cloudinary.uploader.destroy(publicId);
        }

        // Cập nhật ảnh mới vào sản phẩm
        await productsCollection.updateOne(
            { _id: id_product },
            { $set: { image: imageUrl } }
        );

        return { success: true, imageUrl }; // Trả về URL ảnh mới
    } catch (err) {
        console.error("Error updating food image:", err);
        return { success: false, message: "Lỗi cập nhật ảnh supply" };
    }
}
module.exports = {
    updateAvatarUser,
    updatePetImage,
    updateFoodImage,
    updateSuppliesImage
};

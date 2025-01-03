const express = require('express');
const router = express.Router();
const { getClient } = require("../db");

exports.getSuppliesDetail = async (productId) => {
    try {
        const client = getClient();
        const database = client.db("PBL6");
        const productsCollection = database.collection('products');
        const suppliesCollection = database.collection('supplies');
        const commentsCollection = database.collection("comments");

        // Fetch the product from the products collection
        const product = await productsCollection.findOne({ _id: productId, status:1 });

        if (!product) {
            return {
                status: 404,
                message: 'Product not found or deleted'
            };
        }
        // Lấy số lượng bình luận có id_product = productId
        const totalReview = await commentsCollection.countDocuments({ id_product: productId });
        // Fetch supplies linked to the product, ensuring status = 1
        const supplies = await suppliesCollection
            .find({ id_product: productId, status: 1 })
            .toArray();

        // Construct the response object
        const response = {
            id: product._id,
            name: product.name,
            description: product.description,
            image: product.image,
            date_created: product.date_created,
            rating: product.rating,
            category: product.category,
            material: supplies[0]?.material || null, // Use the first variation for shared fields
            brand: supplies[0]?.brand || null,       // Use the first variation for shared fields
            type: supplies[0]?.type || null,         // Use the first variation for shared fields
            totalReview: totalReview,
            variations_supplies: supplies.map(supply => ({
                product_variant_id: supply._id,
                color: supply.color,
                size: supply.size,
                price: supply.price,
                quantity: supply.quantity,
                date_created: supply.date_created
            })),
        };

        return {
            status: 200,
            response
        };
    } catch (err) {
        console.error(err);
        return {
            status: 500,
            message: 'Internal Server Error'
        };
    } finally {
    }
};

exports.getFoodDetail = async (foodId) => {
    try {

        // Kết nối tới MongoDB và lấy các collection
        const client = getClient();
        const database = client.db("PBL6");
        const foodsCollection = database.collection('foods');
        const productsCollection = database.collection('products');
        const commentsCollection = database.collection("comments");

        // Lấy thông tin food theo ID
        const food = await foodsCollection.findOne({ id_product: foodId, status: 1 });

        if (!food) {
            return {
                status: 404,
                message: "Food không tồn tại hoặc đã bị ẩn"
            };
        }
        // Lấy số lượng bình luận có id_product = productId
        const totalReview = await commentsCollection.countDocuments({ id_product: foodId });
        // Lấy thông tin sản phẩm tương ứng
        const product = await productsCollection.findOne({ _id: food.id_product, status: 1 });

        if (!product) {
            return {
                status: 404,
                message: "Sản phẩm không tồn tại hoặc đã bị ẩn"
            };
        }

        // Lấy tất cả variations của sản phẩm từ bảng foods
        const allVariations = await foodsCollection.find({ id_product: product._id, status: 1 }).toArray();

        // Xử lý variations_food
        const variationsFood = allVariations.map(variation => ({
            product_variant_id: variation._id,
            ingredient: variation.ingredient === "Chicken" ? "Gà" : variation.ingredient === "Beef" ? "Bò" : variation.ingredient,
            weight: variation.weight,
            price: variation.price,
            quantity: variation.quantity,
            date_created: variation.date_created
        }));

        // Tạo đối tượng response
        const responseData = {
            id: product._id,
            name: product.name,
            description: product.description,
            image: product.image,
            date_created: product.date_created,
            rating: product.rating,
            category: product.category,
            pet_type: food.pet_type,
            nutrition_info: food.nutrition_info,
            expire_date: food.expire_date,
            brand: food.brand,
            type: food.type,
            totalReview: totalReview,
            variations_foods: variationsFood,
        };

        return {
            status: 200,
            responseData
        };
    } catch (err) {
        console.error(err);
        return {
            status: 500,
            message: 'Internal Server Error'
        };
    } finally {
    }
}

exports.getPetDetail = async (petId) => {
    try {
        // Kết nối tới MongoDB và lấy các collection
        const client = getClient();
        const database = client.db("PBL6");
        const petsCollection = database.collection('pets');
        const productsCollection = database.collection('products');
        const commentsCollection = database.collection("comments");

        // Lấy thông tin pet theo ID
        const pet = await petsCollection.findOne({ id_product: petId, status: 1 });

        if (!pet) {
            return {
                status: 404,
                message: "Pet không tồn tại hoặc đã bị ẩn"
            };
        }
        // Lấy số lượng bình luận có id_product = productId
        const totalReview = await commentsCollection.countDocuments({ id_product: petId });

        // Lấy thông tin sản phẩm tương ứng
        const product = await productsCollection.findOne({ _id: pet.id_product, status: 1 });

        if (!product) {
            return {
                status: 404,
                message: "Sản phẩm không tồn tại hoặc đã bị ẩn"
            };
        }

        // Lấy tất cả variations của sản phẩm từ bảng pets
        const allVariations = await petsCollection.find({
            id_product: product._id,
            status: 1,
        }).toArray();

        // Xử lý variations_pets
        const variationsPets = allVariations.map(variation => ({
            product_variant_id: variation._id,
            price: variation.price,
            gender: variation.gender,
            health: variation.health,
            father: variation.father,
            mother: variation.mother,
            type: variation.type,
            deworming: variation.deworming,
            vaccine: variation.vaccine,
            breed: variation.breed,
            breed_origin: variation.breed_origin,
            trait: variation.trait,
            date_of_birth: variation.date_of_birth,
            quantity: variation.quantity,
            date_created: variation.date_created,
        }));

        // Tạo đối tượng response
        const responseData = {
            id: product._id,
            name: product.name,
            description: product.description,
            image: product.image,
            date_created: product.date_created,
            rating: product.rating,
            category: product.category,
            totalReview: totalReview,
            variations_pets: variationsPets,
        };

        return {
            status: 200,
            responseData
        };
    } catch (err) {
        console.error(err);
        return {
            status: 500,
            message: 'Internal Server Error'
        };
    } finally {
    }
}
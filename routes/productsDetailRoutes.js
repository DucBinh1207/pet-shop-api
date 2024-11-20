const express = require('express');
const router = express.Router();
const { client } = require('../db');

router.get('/products/supplies/:id', async (req, res) => {
  try {
    await client.connect();
    const database = client.db('PBL6');
    const productsCollection = database.collection('products');
    const suppliesCollection = database.collection('supplies');

    // Get the product id from the URL
    const productId = req.params.id;

    // Fetch the product from the products collection
    const product = await productsCollection.findOne({ _id: productId });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

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
      variations_supplies: supplies.map(supply => ({
        product_variant_id: supply._id,
        color: supply.color,
        size: supply.size,
        price: supply.price,
        quantity: supply.quantity,
        date_created: supply.date_created
      })),
    };

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    await client.close();
  }
});

router.get('/products/foods/:id', async (req, res) => {
  try {
    const foodId = req.params.id; // Lấy ID từ tham số URL

    // Kết nối tới MongoDB và lấy các collection
    await client.connect();
    const database = client.db('PBL6');
    const foodsCollection = database.collection('foods');
    const productsCollection = database.collection('products');

    // Lấy thông tin food theo ID
    const food = await foodsCollection.findOne({ id_product: foodId, status: 1 });

    if (!food) {
      return res.status(404).json({ message: "Food không tồn tại hoặc đã bị ẩn" });
    }

    // Lấy thông tin sản phẩm tương ứng
    const product = await productsCollection.findOne({ _id: food.id_product, status: 1 });

    if (!product) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại hoặc đã bị ẩn" });
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
      variations_foods: variationsFood,
    };

    res.json(responseData); // Trả lại dữ liệu
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    await client.close(); // Đảm bảo đóng kết nối MongoDB
  }
});

router.get('/products/pets/:id', async (req, res) => {
  try {
    const petId = req.params.id; // Lấy ID từ tham số URL

    // Kết nối tới MongoDB và lấy các collection
    await client.connect();
    const database = client.db('PBL6');
    const petsCollection = database.collection('pets');
    const productsCollection = database.collection('products');

    // Lấy thông tin pet theo ID
    const pet = await petsCollection.findOne({ id_product: petId, status: 1 });

    if (!pet) {
      return res.status(404).json({ message: "Pet không tồn tại hoặc đã bị ẩn" });
    }

    // Lấy thông tin sản phẩm tương ứng
    const product = await productsCollection.findOne({ _id: pet.id_product, status: 1 });

    if (!product) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại hoặc đã bị ẩn" });
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
      variations_pets: variationsPets,
    };

    res.json(responseData); // Trả lại dữ liệu
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    await client.close(); // Đảm bảo đóng kết nối MongoDB
  }
});


module.exports = router;

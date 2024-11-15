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
        quantity: supply.quantity
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
    }));

    // Tạo đối tượng response
    const responseData = {
      id: product._id,
      category: product.category,
      name: product.name,
      description: product.description,
      image: product.image,
      date_created: product.date_created,
      rating: product.rating,
      pet_type: food.pet_type,
      nutrition_info: food.nutrition_info,
      expire_date: food.expire_date,
      brand: food.brand,
      variations_food: variationsFood,
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
      variations_pet: variationsPets,
    };

    res.json(responseData); // Trả lại dữ liệu
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    await client.close(); // Đảm bảo đóng kết nối MongoDB
  }
});


// Partially update product by ID
router.patch('/products/:type/:id', async (req, res) => {
  try {
    await client.connect();
    const database = client.db('PBL6');
    const { type, id } = req.params;
    const { name, description, image, status, date_created, rating, category } = req.body;

    // Determine collection based on product type (e.g., supplies, foods, pets)
    // let collectionName;
    // if (type === 'supplies') {
    //   collectionName = 'supplies';
    // } else if (type === 'foods') {
    //   collectionName = 'foods';
    // } else if (type === 'pets') {
    //   collectionName = 'pets';
    // } else {
    //   return res.status(400).json({ message: 'Invalid product type' });
    // }

    const collection = database.collection("products");

    // Prepare update data with only the specified attributes
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (status !== undefined) updateData.status = status;
    // if (date_created !== undefined) updateData.date_created = date_created;
    // if (rating !== undefined) updateData.rating = rating;
    // if (category !== undefined) updateData.category = category;

    // Ensure there is at least one field to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update' });
    }

    // Update item by id
    const result = await collection.updateOne(
      { _id: id },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    await client.close();
  }
});

router.patch('/products/pets/:id/:id_variant', async (req, res) => {
  try {
    await client.connect();
    const database = client.db('PBL6');
    const { id, id_variant } = req.params;
    const {
      price,
      gender,
      health,
      father,
      mother,
      type: variantType,
      deworming,
      vaccine,
      breed,
      breed_origin,
      trait,
      date_of_birth,
      quantity,
      date_created,
      status
    } = req.body;

    console.log(req.body);
    

    // Determine collection based on product type
    // let collectionName;
    // if (type === 'supplies') {
    //   collectionName = 'supplies';
    // } else if (type === 'foods') {
    //   collectionName = 'foods';
    // } else if (type === 'pets') {
    //   collectionName = 'pets';
    // } else {
    //   return res.status(400).json({ message: 'Invalid product type' });
    // }

    const collection = database.collection("pets");

    // Prepare update data for the variant
    const updateData = {};
    if (price !== undefined) updateData['price'] = price;
    if (gender !== undefined) updateData['gender'] = gender;
    if (health !== undefined) updateData['health'] = health;
    if (father !== undefined) updateData['father'] = father;
    if (mother !== undefined) updateData['mother'] = mother;
    if (variantType !== undefined) updateData['type'] = variantType;
    if (deworming !== undefined) updateData['deworming'] = deworming;
    if (vaccine !== undefined) updateData['vaccine'] = vaccine;
    if (breed !== undefined) updateData['breed'] = breed;
    if (breed_origin !== undefined) updateData['breed_origin'] = breed_origin;
    if (trait !== undefined) updateData['trait'] = trait;
    if (date_of_birth !== undefined) updateData['date_of_birth'] = date_of_birth;
    if (quantity !== undefined) updateData['quantity'] = quantity;
    if (date_created !== undefined) updateData['date_created'] = date_created;
    if (status !== undefined) updateData['status'] = status;

    // Ensure there is at least one field to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update' });
    }

    // Update specific variant in the array of variants
    const result = await collection.updateOne(
      { _id: id_variant, id_product: id },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Variant not found' });
    }

    res.json({ message: 'Variant updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    await client.close();
  }
});

router.patch('/products/supplies/:id/:id_variant', async (req, res) => {
  try {
    await client.connect();
    const database = client.db('PBL6');
    const { id, id_variant } = req.params;
    const {
      color,
      size,
      price,
      material,
      brand,
      type,
      quantity,
      date_created,
      status
    } = req.body;

    console.log(req.body);

    const collection = database.collection("supplies");

    // Prepare update data for the supplies item
    const updateData = {};
    if (color !== undefined) updateData['color'] = color;
    if (size !== undefined) updateData['size'] = size;
    if (price !== undefined) updateData['price'] = price;
    if (material !== undefined) updateData['material'] = material;
    if (brand !== undefined) updateData['brand'] = brand;
    if (type !== undefined) updateData['type'] = type;
    if (quantity !== undefined) updateData['quantity'] = quantity;
    if (date_created !== undefined) updateData['date_created'] = date_created;
    if (status !== undefined) updateData['status'] = status;

    // Ensure there is at least one field to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update' });
    }

    // Update specific supplies item
    const result = await collection.updateOne(
      { _id: id_variant, id_product: id },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Supply variant not found' });
    }

    res.json({ message: 'Supply variant updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    await client.close();
  }
});

router.patch('/products/foods/:id/:id_variant', async (req, res) => {
  try {
    await client.connect();
    const database = client.db('PBL6');
    const { id, id_variant } = req.params;
    const {
      ingredient,
      weight,
      price,
      pet_type,
      nutrition_info,
      expire_date,
      brand,
      quantity,
      date_created,
      status
    } = req.body;

    console.log(req.body);

    const collection = database.collection("foods");

    // Prepare update data for the foods item
    const updateData = {};
    if (ingredient !== undefined) updateData['ingredient'] = ingredient;
    if (weight !== undefined) updateData['weight'] = weight;
    if (price !== undefined) updateData['price'] = price;
    if (pet_type !== undefined) updateData['pet_type'] = pet_type;
    if (nutrition_info !== undefined) updateData['nutrition_info'] = nutrition_info;
    if (expire_date !== undefined) updateData['expire_date'] = expire_date;
    if (brand !== undefined) updateData['brand'] = brand;
    if (quantity !== undefined) updateData['quantity'] = quantity;
    if (date_created !== undefined) updateData['date_created'] = date_created;
    if (status !== undefined) updateData['status'] = status;

    // Ensure there is at least one field to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update' });
    }

    // Update specific food item
    const result = await collection.updateOne(
      { _id: id_variant, id_product: id },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Food variant not found' });
    }

    res.json({ message: 'Food variant updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    await client.close();
  }
});



module.exports = router;

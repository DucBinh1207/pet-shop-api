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

    // Aggregation pipeline
    const pipeline = [
      {
        // Step 1: Match the product by id
        $match: { _id: productId },
      },
      {
        // Step 2: Lookup supplies collection to combine with product
        $lookup: {
          from: 'supplies',
          localField: '_id',
          foreignField: 'id_product',
          as: 'supplies',
        },
      },
      {
        // Step 3: Unwind supplies array
        $unwind: '$supplies',
      },
      {
        // Step 4: Group by product, collecting all variations into an array
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          description: { $first: '$description' },
          image: { $first: '$image' },
          status: { $first: '$status' },
          date_created: { $first: '$date_created' },
          rating: { $first: '$rating' },
          category: { $first: '$category' },
          variations_supplies: { $push: '$supplies' },
          min_price: { $min: '$supplies.price' },
        },
      },
    ];

    // Execute the aggregation
    const product = await productsCollection.aggregate(pipeline).toArray();

    if (product.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product[0]); // Return the single product
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    await client.close();
  }
});

router.get('/products/foods/:id', async (req, res) => {
    try {
      await client.connect();
      const database = client.db('PBL6');
      const productsCollection = database.collection('products');
      const suppliesCollection = database.collection('foods');
  
      // Get the product id from the URL
      const productId = req.params.id;
  
      // Aggregation pipeline
      const pipeline = [
        {
          // Step 1: Match the product by id
          $match: { _id: productId },
        },
        {
          // Step 2: Lookup foods collection to combine with product
          $lookup: {
            from: 'foods',
            localField: '_id',
            foreignField: 'id_product',
            as: 'foods',
          },
        },
        {
          // Step 3: Unwind foods array
          $unwind: '$foods',
        },
        {
          // Step 4: Group by product, collecting all variations into an array
          $group: {
            _id: '$_id',
            name: { $first: '$name' },
            description: { $first: '$description' },
            image: { $first: '$image' },
            status: { $first: '$status' },
            date_created: { $first: '$date_created' },
            rating: { $first: '$rating' },
            category: { $first: '$category' },
            variations_foods: { $push: '$foods' },
            min_price: { $min: '$foods.price' },
          },
        },
      ];
  
      // Execute the aggregation
      const product = await productsCollection.aggregate(pipeline).toArray();
  
      if (product.length === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }
  
      res.json(product[0]); // Return the single product
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      await client.close();
    }
  });

router.get('/products/pets/:id', async (req, res) => {
  try {
    await client.connect();
    const database = client.db('PBL6');
    const productsCollection = database.collection('products');
    const suppliesCollection = database.collection('pets');

    // Get the product id from the URL
    const productId = req.params.id;

    // Aggregation pipeline
    const pipeline = [
      {
        // Step 1: Match the product by id
        $match: { _id: productId },
      },
      {
        // Step 2: Lookup pets collection to combine with product
        $lookup: {
          from: 'pets',
          localField: '_id',
          foreignField: 'id_product',
          as: 'pets',
        },
      },
      {
        // Step 3: Unwind pets array
        $unwind: '$pets',
      },
      {
        // Step 4: Group by product, collecting all variations into an array
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          description: { $first: '$description' },
          image: { $first: '$image' },
          status: { $first: '$status' },
          date_created: { $first: '$date_created' },
          rating: { $first: '$rating' },
          category: { $first: '$category' },
          variations_pets: { $push: '$pets' },
          min_price: { $min: '$pets.price' },
        },
      },
    ];

    // Execute the aggregation
    const product = await productsCollection.aggregate(pipeline).toArray();

    if (product.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product[0]); // Return the single product
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    await client.close();
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

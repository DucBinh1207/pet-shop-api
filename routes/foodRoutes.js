const express = require('express');
const router = express.Router();
const { client } = require('../db')

router.get('/products/foods', async (req, res) => {
  try {
    await client.connect();
    const database = client.db('PBL6');
    const productsCollection = database.collection('products');
    const foodsCollection = database.collection('foods');

    // Query parameters
    const ingredient = req.query.ingredient?.toLowerCase() || 'all';
    const categories = req.query.category ? req.query.category.split(',').map(c => c.toLowerCase()) : [];
    const weight = parseInt(req.query.weight) || null;
    const sortBy = req.query.sortBy || 'default';
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Build filters for foods
    let foodFilters = {
      status: 1, // Ensure only foods with status = 1
      price: { $gte: minPrice, $lte: maxPrice },
    };

    if (ingredient !== 'all') {
      foodFilters['ingredient'] = { $regex: new RegExp(ingredient, 'i') };
    }

    if (categories.length > 0) {
      foodFilters['category'] = { $in: categories.map(c => new RegExp(`^${c}$`, 'i')) };
    }

    if (weight) {
      foodFilters['weight'] = { $lte: weight };
    }

    // Get filtered foods
    const foods = await foodsCollection.find(foodFilters).toArray();

    // Group foods by product ID
    const productIds = [...new Set(foods.map(food => food.id_product))];

    // Build filters for products
    const productFilters = {
      _id: { $in: productIds },
      status: 1, // Ensure only products with status = 1
    };

    // Count total products for pagination
    const totalProducts = await productsCollection.countDocuments(productFilters);
    const totalPages = Math.ceil(totalProducts / limit);

    // Fetch products with pagination
    const products = await productsCollection
      .find(productFilters)
      .sort(
        sortBy === 'rating'
          ? { rating: -1 }
          : sortBy === 'latest'
            ? { date_created: -1 }
            : sortBy === 'price'
              ? { price: 1 }
              : sortBy === 'price-desc'
                ? { price: -1 }
                : { date_created: -1 }
      )
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Combine products with their foods
    const fullProducts = products.map(product => {
      const productFoods = foods.filter(food =>
        food.id_product.toString() === product._id.toString()
      );

      return {
        id: product._id,
        name: product.name,
        description: product.description,
        image: product.image,
        date_created: product.date_created,
        rating: product.rating,
        category: product.category,
        pet_type: productFoods[0]?.pet_type,
        nutrition_info: productFoods[0]?.nutrition_info,
        expire_date: productFoods[0]?.expire_date,
        brand: productFoods[0]?.brand,
        variations_foods: productFoods.map(food => ({
          product_variant_id: food._id,
          ingredient: food.ingredient,
          weight: food.weight,
          price: food.price,
          quantity: food.quantity,
          date_created: food.date_created,
        }))
      };
    });

    res.json({
      products: fullProducts,
      currentPage: page,
      totalPages,
      limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    await client.close();
  }
});


module.exports = router;

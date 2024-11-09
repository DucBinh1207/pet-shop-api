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
    const ingredient = req.query.ingredient?.toLowerCase() || 'all'; // Default to 'all'
    const categories = req.query.category ? req.query.category.split(',').map(c => c.toLowerCase()) : []; 
    const weight = parseInt(req.query.weight) || null;
    const sortBy = req.query.sortBy || 'default';
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Filters
    let filters = {
      'foods.price': { $gte: minPrice, $lte: maxPrice },
    };

    // Add ingredient filter if provided
    if (ingredient !== 'all') {
      filters['foods.ingredient'] = { $regex: new RegExp(ingredient, 'i') };
    }

    // Add category filter if multiple categories are provided
    if (categories.length > 0) {
      filters['foods.category'] = { $in: categories.map(c => new RegExp(`^${c}$`, 'i')) };
    }

    // Add weight filter if provided
    if (weight) {
      filters['foods.weight'] = { $lte: weight };
    }

    // Aggregation pipeline
    const pipeline = [
      {
        // Step 1: Lookup foods collection to combine with product
        $lookup: {
          from: 'foods',
          localField: '_id',
          foreignField: 'id_product',
          as: 'foods',
        },
      },
      {
        // Unwind the 'foods' array to avoid nesting
        $unwind: '$foods',
      },
      {
        // Step 2: Match with the provided filters
        $match: filters,
      },
      {
        // Step 3: Group by product, collecting all variations into an array
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
          min_price: { $min: '$foods.price' }
        }
      },
      {
        // Step 4: Sort based on the sortBy parameter
        $sort: (() => {
          switch (sortBy) {
            case 'rating':
              return { rating: -1 };
            case 'latest':
              return { date_created: -1 };
            case 'price':
              return { min_Price: 1 };
            case 'price-desc':
              return { min_price: -1 };
            default:
              return { date_created: -1 };
          }
        })(),
      },
      {
        // Step 5: Pagination
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit,
      }
    ];

    // Execute the aggregation
    const fullFoods = await productsCollection.aggregate(pipeline).toArray();

    res.json({
      products: fullFoods,
      currentPage: page,
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

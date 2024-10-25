const express = require('express');
const router = express.Router();
const { client } = require('../db')

router.get('/products/pets', async (req, res) => {
  try {
    await client.connect();
    const database = client.db('PBL6');
    const productsCollection = database.collection('products');
    const petsCollection = database.collection('pets');

    // Query parameters
    const category = req.query.category || 'all'; // Default to 'all'
    const sortBy = req.query.sortBy || 'default';
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Match category
    let categoryFilter = {};
    if (category !== 'all') {
      categoryFilter = { 'pets.type': category };
    }

    // Aggregation pipeline
    const pipeline = [
      {
        // Step 1: Lookup pets collection to combine with product
        $lookup: {
          from: 'pets',
          localField: '_id',
          foreignField: 'id_product',
          as: 'pets',
        },
      },
      {
        // Step 2: Unwind pets array
        $unwind: '$pets',
      },
      // {
      //   // Step 3: Add variations_foods field to replace foods
      //   $addFields: {
      //     variations_pets: '$pets',
      //   },
      // },
      {
        // Step 3: Filter based on category and price
        $match: {
          ...categoryFilter,
          'pets.price': { $gte: minPrice, $lte: maxPrice },
        },
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
          variations_pets: { $push: '$pets' },
          min_price: { $min: '$pest.price' }
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
              return { min_price: 1 };
            case 'price-desc':
              return { min_price: -1 };
            default:
              return { date_created: -1 }; // Default sorting
          }
        })(),
      },
      // {
      //   // (Optional) Step 4: Project to remove the original 'foods' field
      //   $unset: 'pets',
      // },
      {
        // Step 5: Pagination
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit,
      },
    ];

    // Execute the aggregation
    const fullProducts = await productsCollection.aggregate(pipeline).toArray();

    res.json({
      products: fullProducts,
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
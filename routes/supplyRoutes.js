const express = require('express');
const router = express.Router();
const { client } = require('../db')

router.get('/products/supplies', async (req, res) => {
    try {
      await client.connect();
      const database = client.db('PBL6');
      const productsCollection = database.collection('products');
      const suppliesCollection = database.collection('supplies');
  
      // Query parameters
      const category = req.query.category?.toLowerCase() || 'all'; // Default to 'all'
      const sortBy = req.query.sortBy || 'default';
      const color = req.query.color?.toLowerCase();
      const size = req.query.size?.toLowerCase();
      const minPrice = parseFloat(req.query.minPrice) || 0;
      const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
  
      // Filters
      let filters = {
        'status': 1, // Ensure status = 1 in products collection
        'supplies.status': 1, // Ensure status = 1 in foods collection
        'supplies.price': { $gte: minPrice, $lte: maxPrice },
      };
  
      // Add category (supplies type) filter if provided
      if (category !== 'all') {
        filters['supplies.type'] = { $regex: new RegExp(category, 'i') };
      }
  
      // Add color filter if provided
      if (color) {
        filters['supplies.color'] = { $regex: new RegExp(color, 'i') };
      }
  
      // Add size filter if provided
      if (size) {
        filters['supplies.size'] = { $regex: new RegExp(size, 'i') };
      }
  
      // Aggregation pipeline
      const pipeline = [
        {
          // Step 1: Lookup supplies collection to combine with product
          $lookup: {
            from: 'supplies',
            localField: '_id',
            foreignField: 'id_product',
            as: 'supplies',
          },
        },
        {
          // Step 2: Unwind supplies array
          $unwind: '$supplies',
        },
        // {
        //   // Step 3: Add variations_foods field to replace foods
        //   $addFields: {
        //     variations_supplies: '$supplies',
        //   },
        // },
        {
          // Step 3: Filter based on category, color, size, and price
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
            material: { $first: '$supplies.material' },
            brand: { $first: '$supplies.brand' },
            type: { $first: '$supplies.type' },
            variations_supplies: {
              $push: {
                color: '$supplies.color',
                size: '$supplies.size',
                price: '$supplies.price',
                quantity: '$supplies.quantity',
                date_created: '$supplies.date_created'
  
              }
            }
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
        //   $unset: 'supplies',
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
      const fullSupplies = await productsCollection.aggregate(pipeline).toArray();
  
      res.json({
        products: fullSupplies,
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
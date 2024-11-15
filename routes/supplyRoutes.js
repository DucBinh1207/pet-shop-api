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
    const category = req.query.category?.toLowerCase() || 'all';
    const sortBy = req.query.sortBy || 'default';
    const color = req.query.color?.toLowerCase();
    const size = req.query.size?.toLowerCase();
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Filters for supplies
    let supplyFilters = {
      status: 1,
      price: { $gte: minPrice, $lte: maxPrice },
    };

    if (category !== 'all') {
      supplyFilters.type = { $regex: new RegExp(category, 'i') };
    }
    if (color) {
      supplyFilters.color = { $regex: new RegExp(color, 'i') };
    }
    if (size) {
      supplyFilters.size = { $regex: new RegExp(size, 'i') };
    }

    // Find all supplies matching filters
    const supplies = await suppliesCollection.find(supplyFilters).toArray();

    // Extract product IDs from supplies
    const productIds = supplies.map(supply => supply.id_product);

    // Find products matching IDs
    const products = await productsCollection
      .find({ _id: { $in: productIds }, status: 1 })
      .toArray();

    // Combine products with their variations
    const combinedProducts = products.map(product => {
      const relatedSupplies = supplies.filter(supply => supply.id_product === product._id.toString());
      return {
        id: product._id, // Convert MongoDB _id to id
        name: product.name,
        description: product.description,
        image: product.image,
        date_created: product.date_created,
        rating: product.rating,
        category: product.category,
        material: relatedSupplies[0]?.material || null,
        brand: relatedSupplies[0]?.brand || null,
        type: relatedSupplies[0]?.type || null,
        variations_supplies: relatedSupplies.map(supply => ({
          product_variant_id: supply._id,
          color: supply.color,
          size: supply.size,
          price: supply.price,
          quantity: supply.quantity,
          date_created: supply.date_created,
        })),
      };
    });

    // Sorting
    if (sortBy === 'rating') {
      combinedProducts.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'latest') {
      combinedProducts.sort((a, b) => new Date(b.date_created) - new Date(a.date_created));
    } else if (sortBy === 'price') {
      combinedProducts.sort((a, b) => {
        const minA = Math.min(...a.variations_supplies.map(v => v.price));
        const minB = Math.min(...b.variations_supplies.map(v => v.price));
        return minA - minB;
      });
    } else if (sortBy === 'price-desc') {
      combinedProducts.sort((a, b) => {
        const maxA = Math.max(...a.variations_supplies.map(v => v.price));
        const maxB = Math.max(...b.variations_supplies.map(v => v.price));
        return maxB - maxA;
      });
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedProducts = combinedProducts.slice(startIndex, startIndex + limit);

    // Calculate total pages
    const totalItems = combinedProducts.length;
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      products: paginatedProducts,
      currentPage: page,
      limit,
      totalPages, // Return total pages
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    await client.close();
  }
});





module.exports = router;
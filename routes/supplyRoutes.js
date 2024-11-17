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
    const type = req.query.type?.toLowerCase(); // Thêm type vào query parameters
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
    if (type) {  // Lọc theo loại sản phẩm
      supplyFilters.type = { $regex: new RegExp(type, 'i') }; 
    }

    // Find all supplies matching filters
    const supplies = await suppliesCollection.find(supplyFilters).toArray();

    // Extract product IDs from supplies
    const productIds = supplies.map(supply => supply.id_product);

    // Build filters for products
    const productFilters = {
      _id: { $in: productIds },
      status: 1,
    };

    // Count total products for pagination
    const totalProducts = await productsCollection.countDocuments(productFilters);
    const totalPages = Math.ceil(totalProducts / limit);

    // Fetch products with pagination
    const products = await productsCollection
      .find(productFilters)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Find all supplies related to the products
    const allSupplies = await suppliesCollection
      .find({ id_product: { $in: productIds } })
      .toArray();

    // Sắp xếp các variants theo size (Nhỏ -> Trung bình -> Lớn)
    const sizeOrder = {
      'nhỏ': 1,
      'trung bình': 2,
      'lớn': 3
    };

    // Combine products with their variations
    const fullProducts = products.map(product => {
      const productSupplies = allSupplies.filter(supply => supply.id_product.toString() === product._id.toString());

      // Kiểm tra nếu có ít nhất một variant thỏa mãn điều kiện lọc (color hoặc size)
      const hasMatchingVariant = productSupplies.some(supply => {
        const matchesColor = color ? supply.color.toLowerCase().includes(color) : true;
        const matchesSize = size ? supply.size.toLowerCase().includes(size) : true;
        return matchesColor || matchesSize;
      });

      // Nếu không có variant nào phù hợp, bỏ qua sản phẩm này
      if (!hasMatchingVariant) return null;

      // Sắp xếp các variants theo size
      const sortedSupplies = productSupplies.sort((a, b) => {
        const sizeA = a.size.toLowerCase(); // Chuyển size về chữ thường để so sánh không phân biệt chữ hoa chữ thường
        const sizeB = b.size.toLowerCase();
        return (sizeOrder[sizeA] || 0) - (sizeOrder[sizeB] || 0);
      });

      return {
        id: product._id, // Convert MongoDB _id to id
        name: product.name,
        description: product.description,
        image: product.image,
        date_created: product.date_created,
        rating: product.rating,
        category: product.category,
        material: sortedSupplies[0]?.material || null,
        brand: sortedSupplies[0]?.brand || null,
        type: sortedSupplies[0]?.type || null,
        variations_supplies: sortedSupplies.map(supply => ({
          product_variant_id: supply._id,
          color: supply.color,
          size: supply.size,
          price: supply.price,
          quantity: supply.quantity,
          date_created: supply.date_created,
        })),
      };
    }).filter(product => product !== null); // Lọc bỏ các sản phẩm không có variant phù hợp

    // Sorting
    if (sortBy === 'rating') {
      fullProducts.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'latest') {
      fullProducts.sort((a, b) => new Date(b.date_created) - new Date(a.date_created));
    } else if (sortBy === 'price') {
      fullProducts.sort((a, b) => {
        const minA = Math.min(...a.variations_supplies.map(v => v.price));
        const minB = Math.min(...b.variations_supplies.map(v => v.price));
        return minA - minB;
      });
    } else if (sortBy === 'price-desc') {
      fullProducts.sort((a, b) => {
        const minA = Math.min(...a.variations_supplies.map(v => v.price));
        const minB = Math.min(...b.variations_supplies.map(v => v.price));
        return minB - minA;
      });
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedProducts = fullProducts.slice(startIndex, startIndex + limit);

    res.json({
      products: paginatedProducts,
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

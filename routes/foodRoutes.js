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
    const weightQuery = req.query.weight || 'all';
    const categories = req.query.category ? req.query.category.split(',').map(c => c.toLowerCase()) : [];
    const sortBy = req.query.sortBy || 'default';
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Build filters for foods
    let foodFilters = {
      status: 1,
      price: { $gte: minPrice, $lte: maxPrice },
    };

    // Filter by ingredient
    if (ingredient !== 'all') {
      foodFilters['ingredient'] = { $regex: new RegExp(ingredient, 'i') };
    }

    // Filter by weight (normalize both query and DB values)
    if (weightQuery !== 'all') {
      const normalizedWeightQuery = parseInt(weightQuery.replace(/\D/g, ''), 10); // Extract numeric value from weight query
      foodFilters['weight'] = { 
        $regex: new RegExp(`^${normalizedWeightQuery}kg$`, 'i') 
      };
    }

    // Filter by categories
    if (categories.length > 0) {
      foodFilters['category'] = { $in: categories.map(c => new RegExp(`^${c}$`, 'i')) };
    }

    // Lấy danh sách foods khớp filter
    const matchedFoods = await foodsCollection.find(foodFilters).toArray();

    // Lấy danh sách id_product từ foods khớp filter
    const productIds = [...new Set(matchedFoods.map(food => food.id_product))];

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

    // Lấy toàn bộ biến thể của các sản phẩm
    const allFoods = await foodsCollection
      .find({ id_product: { $in: productIds } })
      .toArray();

    // Hàm chuẩn hóa trọng lượng (loại bỏ ký tự kg và chuyển sang số)
    const normalizeWeight = (weight) => {
      return parseInt(weight.replace(/\D/g, ''), 10); // Loại bỏ ký tự không phải là số
    };

    // Kết hợp sản phẩm với toàn bộ biến thể và tìm giá thấp nhất của mỗi sản phẩm
    const fullProducts = products.map(product => {
      const productFoods = allFoods.map(food => ({
        ...food,
        normalizedWeight: normalizeWeight(food.weight), // Chuẩn hóa cân nặng
      })).filter(food => food.id_product.toString() === product._id.toString());

      // Tìm giá thấp nhất trong các biến thể
      const minPriceVariant = Math.min(...productFoods.map(food => food.price));

      // Sắp xếp các biến thể theo weight (tăng dần)
      const sortedProductFoods = productFoods.sort((a, b) => a.normalizedWeight - b.normalizedWeight);

      return {
        id: product._id,
        name: product.name,
        description: product.description,
        image: product.image,
        date_created: product.date_created,
        rating: product.rating,
        category: product.category,
        pet_type: sortedProductFoods[0]?.pet_type,
        nutrition_info: sortedProductFoods[0]?.nutrition_info,
        expire_date: sortedProductFoods[0]?.expire_date,
        brand: sortedProductFoods[0]?.brand,
        variations_foods: sortedProductFoods.map(food => ({
          product_variant_id: food._id,
          ingredient: food.ingredient,
          weight: food.weight,
          price: food.price,
          quantity: food.quantity,
          date_created: food.date_created,
        })),
        //min_price_variant: minPriceVariant, // Lưu giá thấp nhất của biến thể
      };
    });

    // Sort fullProducts based on the sortBy field
    let sortedProducts;
    switch (sortBy) {
      case 'price':
        sortedProducts = fullProducts.sort((a, b) => a.min_price_variant - b.min_price_variant); // Price ascending
        break;
      case 'price_desc':
        sortedProducts = fullProducts.sort((a, b) => b.min_price_variant - a.min_price_variant); // Price descending
        break;
      case 'rating':
        sortedProducts = fullProducts.sort((a, b) => b.rating - a.rating); // Rating descending
        break;
      case 'latest':
        sortedProducts = fullProducts.sort((a, b) => new Date(b.date_created) - new Date(a.date_created)); // Latest first
        break;
      default:
        sortedProducts = fullProducts; // No sorting
        break;
    }

    res.json({
      products: sortedProducts,
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

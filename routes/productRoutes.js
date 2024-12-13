const express = require('express');
const router = express.Router();
const { client } = require('../db')

const { getPet, getFood, getSupplies, searchProduct, getBestSeller, searchProductMobile } = require("../controllers/productController");

// Filter sort péts
// router.get('/products/pets', async (req, res) => {
//     try {
//         await client.connect();
//         const database = client.db('PBL6');
//         const productsCollection = database.collection('products');
//         const petsCollection = database.collection('pets');

//         // Query parameters
//         const category = req.query.category || 'all';
//         const breeds = req.query.breeds ? req.query.breeds.split(',') : [];
//         const sortBy = req.query.sortBy || 'default';
//         const minPrice = parseFloat(req.query.minPrice) || 0;
//         const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
//         const page = parseInt(req.query.page) || 1;
//         const limit = parseInt(req.query.limit) || 10;

//         // Build filters for pets
//         let filters = { status: 1 }; // Only fetch pets with status = 1
//         if (category !== 'all') {
//             filters['type'] = { $regex: new RegExp(category, 'i') };
//         }
//         if (breeds.length > 0) {
//             filters['breed'] = { $in: breeds.map(breed => new RegExp(breed, 'i')) };
//         }
//         filters['price'] = { $gte: minPrice, $lte: maxPrice };

//         // Get filtered pets
//         let pets;
//         if (sortBy === 'price') {
//             pets = await petsCollection.find(filters).sort({ price: 1 }).toArray();
//         } else if (sortBy === 'price-desc') {
//             pets = await petsCollection.find(filters).sort({ price: -1 }).toArray();
//         } else {
//             pets = await petsCollection.find(filters).toArray();
//         }

//         // Group pets by product ID
//         const productIds = [...new Set(pets.map(pet => pet.id_product))];

//         // Get products matching the filtered pets with status = 1
//         const totalProducts = await productsCollection.countDocuments({
//             _id: { $in: productIds },
//             status: 1
//         });
//         const totalPages = Math.ceil(totalProducts / limit);

//         // Fetch products with pagination and status = 1
//         let products = await productsCollection
//             .find({
//                 _id: { $in: productIds },
//                 status: 1
//             })
//             .sort(
//                 sortBy === 'rating'
//                     ? { rating: -1 }
//                     : sortBy === 'latest'
//                         ? { date_created: -1 }
//                         : { date_created: -1 }
//             )
//             .skip((page - 1) * limit)
//             .limit(limit)
//             .toArray();

//         // Combine products with their pets
//         let fullProducts = products.map(product => {
//             const productPets = pets.filter(pet =>
//                 pet.id_product.toString() === product._id.toString()
//             );

//             return {
//                 id: product._id,
//                 name: product.name,
//                 description: product.description,
//                 image: product.image,
//                 date_created: product.date_created,
//                 rating: product.rating,
//                 category: product.category,
//                 variations_pets: productPets.map(pet => ({
//                     product_variant_id: pet._id,
//                     price: pet.price,
//                     gender: pet.gender,
//                     health: pet.health,
//                     father: pet.father,
//                     mother: pet.mother,
//                     type: pet.type,
//                     deworming: pet.deworming,
//                     vaccine: pet.vaccine,
//                     breed: pet.breed,
//                     breed_origin: pet.breed_origin,
//                     trait: pet.trait,
//                     date_of_birth: pet.date_of_birth,
//                     quantity: pet.quantity,
//                     date_created: pet.date_created,
//                 }))
//             };
//         });

//         // Sort by minimum pet price if needed
//         if (sortBy === 'price' || sortBy === 'price-desc') {
//             fullProducts = fullProducts.sort((a, b) => {
//                 const minPriceA = Math.min(...a.variations_pets.map(pet => pet.price));
//                 const minPriceB = Math.min(...b.variations_pets.map(pet => pet.price));
//                 return sortBy === 'price' ? minPriceA - minPriceB : minPriceB - minPriceA;
//             });
//         }

//         res.json({
//             products: fullProducts,
//             currentPage: page,
//             totalPages,
//             limit
//         });

//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Internal Server Error' });
//     } finally {
//         await client.close();
//     }
// });

router.get('/products/pets', getPet);
// Filter sort foods
router.get('/products/foods', getFood);
// Filter sort supplies
router.get('/products/supplies', getSupplies);
// Search sp
router.get('/products/search', searchProduct);
// Best sellers
router.get('/products/bestSellers', getBestSeller);

router.get('/products/searchMobile', searchProductMobile);



module.exports = router;
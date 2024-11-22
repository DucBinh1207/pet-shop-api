const express = require('express');
const router = express.Router();
const { client } = require('../db')

// Filter sort péts
router.get('/products/pets', async (req, res) => {
    try {
        await client.connect();
        const database = client.db('PBL6');
        const productsCollection = database.collection('products');
        const petsCollection = database.collection('pets');

        // Query parameters
        const category = req.query.category || 'all';
        const breeds = req.query.breeds ? req.query.breeds.split(',') : [];
        const sortBy = req.query.sortBy || 'default';
        const minPrice = parseFloat(req.query.minPrice) || 0;
        const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Build filters for pets
        let filters = { status: 1 }; // Only fetch pets with status = 1
        if (category !== 'all') {
            filters['type'] = { $regex: new RegExp(category, 'i') };
        }
        if (breeds.length > 0) {
            filters['breed'] = { $in: breeds.map(breed => new RegExp(breed, 'i')) };
        }
        filters['price'] = { $gte: minPrice, $lte: maxPrice };

        // Get filtered pets
        let pets;
        if (sortBy === 'price') {
            pets = await petsCollection.find(filters).sort({ price: 1 }).toArray();
        } else if (sortBy === 'price-desc') {
            pets = await petsCollection.find(filters).sort({ price: -1 }).toArray();
        } else {
            pets = await petsCollection.find(filters).toArray();
        }

        // Group pets by product ID
        const productIds = [...new Set(pets.map(pet => pet.id_product))];

        // Get products matching the filtered pets with status = 1
        const totalProducts = await productsCollection.countDocuments({
            _id: { $in: productIds },
            status: 1
        });
        const totalPages = Math.ceil(totalProducts / limit);

        // Fetch products with pagination and status = 1
        let products = await productsCollection
            .find({
                _id: { $in: productIds },
                status: 1
            })
            .sort(
                sortBy === 'rating'
                    ? { rating: -1 }
                    : sortBy === 'latest'
                        ? { date_created: -1 }
                        : { date_created: -1 }
            )
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        // Combine products with their pets
        let fullProducts = products.map(product => {
            const productPets = pets.filter(pet =>
                pet.id_product.toString() === product._id.toString()
            );

            return {
                id: product._id,
                name: product.name,
                description: product.description,
                image: product.image,
                date_created: product.date_created,
                rating: product.rating,
                category: product.category,
                variations_pets: productPets.map(pet => ({
                    product_variant_id: pet._id,
                    price: pet.price,
                    gender: pet.gender,
                    health: pet.health,
                    father: pet.father,
                    mother: pet.mother,
                    type: pet.type,
                    deworming: pet.deworming,
                    vaccine: pet.vaccine,
                    breed: pet.breed,
                    breed_origin: pet.breed_origin,
                    trait: pet.trait,
                    date_of_birth: pet.date_of_birth,
                    quantity: pet.quantity,
                    date_created: pet.date_created,
                }))
            };
        });

        // Sort by minimum pet price if needed
        if (sortBy === 'price' || sortBy === 'price-desc') {
            fullProducts = fullProducts.sort((a, b) => {
                const minPriceA = Math.min(...a.variations_pets.map(pet => pet.price));
                const minPriceB = Math.min(...b.variations_pets.map(pet => pet.price));
                return sortBy === 'price' ? minPriceA - minPriceB : minPriceB - minPriceA;
            });
        }

        res.json({
            products: fullProducts,
            currentPage: page,
            totalPages,
            limit
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        await client.close();
    }
});
// Filter sort foods
router.get('/products/foods', async (req, res) => {
    try {
        await client.connect();
        const database = client.db('PBL6');
        const productsCollection = database.collection('products');
        const foodsCollection = database.collection('foods');

        // Query parameters
        const ingredient = req.query.ingredient?.toLowerCase() || 'all';
        const weightQuery = req.query.weight || 'all';
        const sortBy = req.query.sortBy || 'default';
        const minPrice = parseFloat(req.query.minPrice) || 0;
        const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
        const pet_type = req.query.pet_type || 'all';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        console.log({ pet_type });
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

        if (pet_type !== 'all') {
            if (pet_type === 'Chó-Mèo') {
                foodFilters['pet_type'] = { $regex: new RegExp(`Chó và mèo`, 'i') }; // Trả về "Chó và mèo"
            } else {
                foodFilters['pet_type'] = { $regex: new RegExp(`^${pet_type}$`, 'i') }; // Khớp chính xác "Chó" hoặc "Mèo"
            }
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
                //min_price_variant: minPriceVariant,
                variations_foods: sortedProductFoods.map(food => ({
                    product_variant_id: food._id,
                    ingredient: food.ingredient,
                    weight: food.weight,
                    price: food.price,
                    quantity: food.quantity,
                    date_created: food.date_created,
                })),
                // Lưu giá thấp nhất của biến thể
            };
        });

        // Sort fullProducts based on the sortBy field
        let sortedProducts;
        switch (sortBy) {
            case 'price':
                sortedProducts = fullProducts.sort((a, b) => a.min_price_variant - b.min_price_variant); // Giá thấp nhất tăng dần
                break;
            case 'price-desc':
                sortedProducts = fullProducts.sort((a, b) => b.min_price_variant - a.min_price_variant); // Giá thấp nhất giảm dần
                break;
            case 'rating':
                sortedProducts = fullProducts.sort((a, b) => b.rating - a.rating); // Rating giảm dần
                break;
            case 'latest':
                sortedProducts = fullProducts.sort((a, b) => new Date(b.date_created) - new Date(a.date_created)); // Mới nhất trước
                break;
            default:
                sortedProducts = fullProducts; // Không sắp xếp
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
// Filter sort supplies
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
        if (type) {
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

            // Tính giá thấp nhất từ các variations
            const lowestPrice = Math.min(...sortedSupplies.map(supply => supply.price));

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
                //lowest_price: lowestPrice,
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
            // Xếp tăng dần theo lowest_price
            fullProducts.sort((a, b) => a.lowest_price - b.lowest_price);
        } else if (sortBy === 'price-desc') {
            // Xếp giảm dần theo lowest_price
            fullProducts.sort((a, b) => b.lowest_price - a.lowest_price);
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
// Search sp
router.get('/products/search', async (req, res) => {
    const name = req.query.name; // Lấy giá trị name từ query string

    if (!name) {
        return res.status(400).json();
    }

    try {
        await client.connect();
        const database = client.db('PBL6');
        const productsCollection = database.collection('products');
        const foodsCollection = database.collection('foods');
        const suppliesCollection = database.collection('supplies');
        const petsCollection = database.collection('pets');

        let filters = {};
        if (name) {
            const normalizeText = (text) =>
                text
                    .normalize('NFD') // Phân tách Unicode
                    .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu
                    .replace(/[^a-zA-Z0-9 ]/g, '') // Loại bỏ ký tự đặc biệt
                    .toLowerCase();

            const normalizedSearch = normalizeText(name);

            filters.$or = [
                {
                    name: { $regex: new RegExp(normalizedSearch, 'i') },
                    status: 1
                },

            ];
        }
        let products = await productsCollection.find(filters).toArray();
        // Tìm kiếm sản phẩm theo tên và chỉ lấy sản phẩm có status = 1
        // const products = await productsCollection
        //     .find({
        //         name: { $regex: name.toString(), $options: 'i' },
        //     })
        //     .toArray();

        // Custom tên trường trả về
        const customProducts = await Promise.all(
            products.map(async (product) => {
                let priceRange = null;

                // Lấy biến thể theo category
                if (product.category === 'foods') {
                    const variants = await foodsCollection
                        .find({ id_product: product._id })
                        .toArray();

                    if (variants.length > 0) {
                        const prices = variants.map(variant => parseFloat(variant.price));
                        const minPrice = Math.min(...prices);
                        const maxPrice = Math.max(...prices);
                        priceRange = `${minPrice}đ - ${maxPrice}đ`;
                    }
                } else if (product.category === 'supplies') {
                    const variants = await suppliesCollection
                        .find({ id_product: product._id })
                        .toArray();

                    if (variants.length > 0) {
                        const prices = variants.map(variant => parseFloat(variant.price));
                        const minPrice = Math.min(...prices);
                        const maxPrice = Math.max(...prices);
                        priceRange = `${minPrice}đ - ${maxPrice}đ`;
                    }
                } else if (product.category === 'pets') {
                    const variant = await petsCollection.findOne({ id_product: product._id });

                    if (variant) {
                        priceRange = variant.price.toString() + "đ";
                    }
                }

                return {
                    id: product._id, // Chuyển `_id` thành `id`
                    name: product.name,
                    description: product.description,
                    price: priceRange || 'N/A', // Khoảng giá hoặc N/A nếu không có biến thể
                    image: product.image,
                    rating: product.rating
                };
            })
        );

        res.status(200).json(customProducts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        await client.close();
    }
});



module.exports = router;
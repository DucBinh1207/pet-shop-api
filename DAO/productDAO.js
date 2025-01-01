const express = require('express');
const { getClient } = require("../db");

exports.getPet = async (category, breeds, sortBy,
    minPrice, maxPrice, page, limit) => {
    try {
        const client = getClient();
        const database = client.db("PBL6");
        const productsCollection = database.collection('products');
        const petsCollection = database.collection('pets');

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
        const totalRecords = fullProducts.length;
        return {
            status: 200,
            products: fullProducts,
            currentPage: page,
            totalPages,
            totalRecords,
            limit
        };

    } catch (err) {
        console.error(err);
        return {
            status: 500,
            message: 'Internal Server Error'
        };
    } finally {
    }
};

exports.getFood = async (ingredient, weightQuery, sortBy,
    minPrice, maxPrice, type, page, limit) => {
    try {
        const client = getClient();
        const database = client.db("PBL6");
        const productsCollection = database.collection('products');
        const foodsCollection = database.collection('foods');

        // Build filters for foods
        let foodFilters = {
            status: 1,
            price: { $gte: minPrice, $lte: maxPrice },
        };

        // Filter by ingredient
        // if (ingredient !== 'all') {
        //     foodFilters['ingredient'] = { $regex: new RegExp(ingredient, 'i') };
        // }
        console.log({ingredient});  
        if (ingredient !== 'all') {
            if (ingredient == 'khác') {
                foodFilters['ingredient'] = {
                    $not: { $regex: 'Bò|Gà|Heo|Cá', $options: 'i' }
                };
            } else {
                foodFilters['ingredient'] = {
                    $regex: ingredient, $options: 'i'
                };
            }
        }

        // Filter by weight (normalize both query and DB values)
        if (weightQuery !== 'all') {
            const normalizedWeightQuery = parseInt(weightQuery.replace(/\D/g, ''), 10); // Extract numeric value from weight query
            foodFilters['weight'] = {
                $regex: new RegExp(`^${normalizedWeightQuery}kg$`, 'i')
            };
        }

        if (type !== 'all') {
            foodFilters['type'] = { $regex: new RegExp(`^${type}$`, 'i') };

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
                    type: food.type,
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
        const totalRecords = sortedProducts.length;
        return {
            status: 200,
            products: sortedProducts,
            currentPage: page,
            totalPages,
            totalRecords,
            limit
        };
    } catch (err) {
        console.error(err);
        return {
            status: 500,
            message: 'Internal Server Error'
        };
    }
}

exports.getSupplies = async (category, sortBy, color, size, type,
    minPrice, maxPrice, page, limit) => {
    try {
        const client = getClient();
        const database = client.db("PBL6");
        const productsCollection = database.collection('products');
        const suppliesCollection = database.collection('supplies');

        // Filters for supplies
        let supplyFilters = {
            status: 1,
            price: { $gte: minPrice, $lte: maxPrice },
        };

        if (category !== 'all') {
            supplyFilters.category = { $regex: new RegExp(category, 'i') };
        }
        // if (color) {
        //     supplyFilters.color = { $regex: new RegExp(color, 'i') };
        // }
        // if (color) {
        //     supplyFilters.color = { $regex: color, $options: 'i' }; // 'i' để không phân biệt hoa thường
        // }
        if (color !== 'all') {
            if (color == 'khác') {
                supplyFilters.color = { 
                    $nin: ['Đen', 'Trắng', 'Đỏ', 'Vàng', 'Cam', 'Lam', 'Lục', 'Tím', 'Hồng'] 
                };
            } else {
                supplyFilters.color = { 
                    $regex: color, $options: 'i' 
                };
            }
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
        // const startIndex = (page - 1) * limit;
        // const paginatedProducts = fullProducts.slice(startIndex, startIndex + limit);
        const totalRecords = fullProducts.length;
        return {
            status: 200,
            products: fullProducts,
            currentPage: page,
            totalPages,
            totalRecords,
            limit
        };
    } catch (err) {
        console.error(err);
        return {
            status: 500,
            message: 'Internal Server Error'
        };
    }
}

exports.searchProduct = async (name) => {
    try {
        const client = getClient();
        const database = client.db("PBL6");
        const productsCollection = database.collection('products');
        const foodsCollection = database.collection('foods');
        const suppliesCollection = database.collection('supplies');
        const petsCollection = database.collection('pets');

        let filters = {};
        if (name) {
            const normalizeText = (text) =>
                text
                    .replace(/[^a-zA-Z0-9ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯăắằẵẳặâấầẩẫậêếềểễệôốồổỗộơớờởỡợêêíìỉĩịùúủũụưứừửữựỳýỷỹỵ ]/g, '') // Loại bỏ ký tự đặc biệt
                    .toLowerCase();

            const normalizedSearch = normalizeText(name);
            console.log(normalizedSearch);
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
                    category: product.category,
                    name: product.name,
                    description: product.description,
                    price: priceRange || 'N/A', // Khoảng giá hoặc N/A nếu không có biến thể
                    image: product.image,
                    rating: product.rating
                };
            })
        );
        const totalRecords = customProducts.length;
        return {
            status: 200,
            customProducts,
            totalRecords
        };
    } catch (err) {
        console.error(err);
        return {
            status: 500,
            message: 'Internal Server Error'
        };
    }
}

exports.getBestSeller = async (amount) => {
    try {
        const client = getClient();
        const database = client.db("PBL6");
        const productsCollection = database.collection('products');

        // Lấy các sản phẩm có sold cao nhất
        const bestSellers = await productsCollection
            .find({})
            .sort({ sold: -1 }) // Sắp xếp giảm dần theo trường sold
            .limit(amount) // Giới hạn số lượng kết quả
            .toArray();

        return {
            status: 200,
            bestSellers
        };
    } catch (err) {
        console.error(err);
        return {
            status: 500,
            message: 'Internal Server Error'
        };
    }
}

exports.searchProductMobile = async (name) => {
    try {
        const client = getClient();
        const database = client.db("PBL6");
        const productsCollection = database.collection('products');
        const foodsCollection = database.collection('foods');
        const suppliesCollection = database.collection('supplies');
        const petsCollection = database.collection('pets');

        // Initialize filters
        let filters = { status: 1 }; // Fetch only active products
        if (name) {
            const normalizeText = (text) =>
                text
                    .replace(/[^a-zA-Z0-9ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯăắằẵẳặâấầẩẫậêếềểễệôốồổỗộơớờởỡợêêíìỉĩịùúủũụưứừửữựỳýỷỹỵ ]/g, '') // Loại bỏ ký tự đặc biệt
                    .toLowerCase();

            const normalizedSearch = normalizeText(name);
            filters.name = { $regex: new RegExp(normalizedSearch, 'i') };
        }

        // Fetch products
        let products = await productsCollection.find(filters).toArray();

        // Map products with their respective variations
        const customProducts = await Promise.all(
            products.map(async (product) => {
                let variations = [];
                let priceRange = null;
                let variationField = null;

                // Fetch variations based on category
                if (product.category === 'foods') {
                    variations = await foodsCollection
                        .find({ id_product: product._id })
                        .toArray();

                    if (variations.length > 0) {
                        const prices = variations.map(variant => parseFloat(variant.price));
                        priceRange = `${Math.min(...prices)} - ${Math.max(...prices)}`;
                    }
                    variationField = 'variations_foods';
                } else if (product.category === 'supplies') {
                    variations = await suppliesCollection
                        .find({ id_product: product._id })
                        .toArray();

                    if (variations.length > 0) {
                        const prices = variations.map(variant => parseFloat(variant.price));
                        priceRange = `${Math.min(...prices)} - ${Math.max(...prices)}`;
                    }
                    variationField = 'variations_supplies';
                } else if (product.category === 'pets') {
                    variations = await petsCollection
                        .find({ id_product: product._id })
                        .toArray();

                    if (variations.length > 0) {
                        const prices = variations.map(variant => parseFloat(variant.price));
                        priceRange = `${Math.min(...prices)}`;
                    }
                    variationField = 'variations_pets';
                }

                // Format the product data
                return {
                    id: product._id, // Map `_id` to `id`
                    name: product.name,
                    description: product.description,
                    price: priceRange || 'N/A', // Price range or N/A if no variations exist
                    image: product.image,
                    rating: product.rating,
                    [variationField]: variations.map(variant => ({
                        product_variant_id: variant._id,
                        price: variant.price,
                        ...(product.category === 'foods' && {
                            ingredient: variant.ingredient,
                            weight: variant.weight,
                            quantity: variant.quantity,
                            date_created: variant.date_created,
                        }),
                        ...(product.category === 'supplies' && {
                            color: variant.color,
                            size: variant.size,
                            quantity: variant.quantity,
                            date_created: variant.date_created,
                        }),
                        ...(product.category === 'pets' && {
                            gender: variant.gender,
                            health: variant.health,
                            father: variant.father,
                            mother: variant.mother,
                            type: variant.type,
                            deworming: variant.deworming,
                            vaccine: variant.vaccine,
                            breed: variant.breed,
                            breed_origin: variant.breed_origin,
                            trait: variant.trait,
                            date_of_birth: variant.date_of_birth,
                            quantity: variant.quantity,
                        })
                    }))
                };
            })
        );

        return {
            status: 200,
            customProducts
        };
    } catch (err) {
        console.error(err);
        return {
            status: 500,
            message: 'Internal Server Error'
        };
    }
};


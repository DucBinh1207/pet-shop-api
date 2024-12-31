const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticateToken } = require("../middleware/authenticateToken");
const { getClient } = require("../db");
const {
    addPet,
    addFood,
    addSupplies,
    updatePet,
    updateFood,
    updateSupplies } = require("../product-admin/product");

const {
    updatePetImage,
    updateFoodImage,
    updateSuppliesImage } = require("../image/image");

router.use(express.json());

// Cấu hình multer để lưu trữ ảnh
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Thư mục lưu ảnh
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); // Tạo tên file duy nhất
    }
});
const upload = multer({ storage: storage });
const default_product_image = './defaultImage/default_product.jpg';
// Tạo sp mới
router.post('/admin/products/create', authenticateToken, upload.single('image'), async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền truy cập
    if (id_role !== 2) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    const { nameTag } = req.body;
    console.log("File:", req.file);
    console.log("Body:", req.body);

    // Xử lý theo nameTag
    switch (nameTag) {
        case 'pets':
            const {
                name: petName,
                description: petDescription,
                price: petPrice,
                gender: petGender,
                health: petHealth,
                father: petFather,
                mother: petMother,
                type: petType,
                deworming: petDeworming,
                vaccine: petVaccine,
                breed: petBreed,
                breed_origin: petBreedOrigin,
                trait: petTrait,
                date_of_birth: petDateOfBirth,
                quantity: petQuantity,
            } = req.body;

            // Lấy đường dẫn của ảnh đã upload
            const imagePathPet = req.file ? req.file.path : default_product_image;

            // Thêm sản phẩm vào cơ sở dữ liệu
            try {
                const result = await addPet(
                    petName,
                    petDescription,
                    imagePathPet,
                    petPrice,
                    petGender,
                    petHealth,
                    petFather,
                    petMother,
                    petType,
                    petDeworming,
                    petVaccine,
                    petBreed,
                    petBreedOrigin,
                    petTrait,
                    petDateOfBirth,
                    petQuantity
                );
                if (result.success) {
                    res.status(201).json();
                } else {
                    res.status(400).json({ message: result.message });
                }
            } catch (err) {
                res.status(500).json({ message: "Internal server error" });
            }
            break;

        case 'foods':
            const {
                name: foodName,
                description: foodDescription,
                pet_type: pet_type,
                nutrition_info: nutrition_info,
                expire_date: expire_date,
                brand: brand,
                variations_food
            } = req.body;

            const imagePathFood = req.file ? req.file.path : default_product_image;
            // Kiểm tra xem có variations_food hay không
            const foodVariations = variations_food ? JSON.parse(variations_food) : [];
            try {
                const result = await addFood(
                    foodName,
                    foodDescription,
                    imagePathFood, // Sử dụng đường dẫn của ảnh thay vì image từ body
                    pet_type,
                    nutrition_info,
                    expire_date,
                    brand,
                    foodVariations
                );
                if (result.success) {
                    res.status(201).json();
                } else {
                    res.status(401).json({ message: result.message });
                }
            } catch (err) {
                console.error("Error adding food:", err);
                res.status(500).json({ message: "Internal server error" });
            }
            break;

        case 'supplies':
            const {
                name: suppliesName,
                description: suppliesDescription,
                material: material,
                brand: suppliesBrand,
                type: type,
                variations_supplies
            } = req.body;

            const imagePathSupplies = req.file ? req.file.path : default_product_image;
            // Kiểm tra xem có variations_food hay không
            const suppliesVariations = variations_supplies ? JSON.parse(variations_supplies) : [];
            try {
                const result = await addSupplies(
                    suppliesName,
                    suppliesDescription,
                    imagePathSupplies, // Sử dụng đường dẫn của ảnh thay vì image từ body
                    material,
                    suppliesBrand,
                    type,
                    suppliesVariations
                );
                if (result.success) {
                    res.status(201).json();
                } else {
                    res.status(401).json({ message: result.message });
                }
            } catch (err) {
                console.error("Error adding food:", err);
                res.status(500).json({ message: "Internal server error" });
            }
            break;

        default:
            // Trả về lỗi nếu nameTag không hợp lệ
            return res.status(400).json({ message: 'Invalid nameTag value.' });
    }
});
// Cập nhật 1 sp
router.put('/admin/products/update', authenticateToken, upload.none(), async (req, res) => {
    const id_role = req.user.id_role;
    // Kiểm tra quyền truy cập
    if (id_role !== 2) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }
    const { nameTag } = req.body;
    console.log("Body:", req.body);

    // Xử lý theo nameTag
    switch (nameTag) {
        case 'pets':
            const {
                _id: _id,
                name: petName,
                description: petDescription,
                price: petPrice,
                gender: petGender,
                health: petHealth,
                father: petFather,
                mother: petMother,
                type: petType,
                deworming: petDeworming,
                vaccine: petVaccine,
                breed: petBreed,
                breed_origin: petBreedOrigin,
                trait: petTrait,
                date_of_birth: petDateOfBirth,
                quantity: petQuantity,
            } = req.body;

            // Thêm sản phẩm vào cơ sở dữ liệu
            try {
                const result = await updatePet(
                    _id,
                    petName,
                    petDescription,
                    petPrice,
                    petGender,
                    petHealth,
                    petFather,
                    petMother,
                    petType,
                    petDeworming,
                    petVaccine,
                    petBreed,
                    petBreedOrigin,
                    petTrait,
                    petDateOfBirth,
                    petQuantity
                );
                if (result.success) {
                    res.status(200).json();
                } else {
                    res.status(400).json();
                }
            } catch (err) {
                res.status(500).json({ message: "Internal server error" });
            }
            break;

        case 'foods':
            const {
                _id: _idFood,
                name: foodName,
                description: foodDescription,
                pet_type: pet_type,
                nutrition_info: nutrition_info,
                expire_date: expire_date,
                brand: brand,
                variations_food
            } = req.body;

            // Kiểm tra xem variations_food có hợp lệ hay không
            if (!variations_food || (typeof variations_food === 'string' && JSON.parse(variations_food).length === 0)) {
                return res.status(400).json(); // Bắt buộc phải có ít nhất 1 variant gửi xuống
            }

            const foodVariations = JSON.parse(variations_food);
            try {
                const result = await updateFood(
                    _idFood,
                    foodName,
                    foodDescription,
                    pet_type,
                    nutrition_info,
                    expire_date,
                    brand,
                    foodVariations
                );
                if (result.success) {
                    res.status(200).json();
                } else {
                    res.status(400).json();
                }
            } catch (err) {
                console.error("Error adding food:", err);
                res.status(500).json({ message: "Internal server error" });
            }
            break;

        case 'supplies':
            const {
                _id: idSupplies,
                name: suppliesName,
                description: suppliesDescription,
                material: material,
                brand: suppliesBrand,
                type: type,
                variations_supplies
            } = req.body;

            // Kiểm tra xem variations_food có hợp lệ hay không
            if (!variations_supplies || (typeof variations_supplies === 'string' && JSON.parse(variations_supplies).length === 0)) {
                return res.status(400).json(); // Bắt buộc phải có ít nhất 1 variant gửi xuống
            }

            const suppliesVariations = JSON.parse(variations_supplies);
            try {
                const result = await updateSupplies(
                    idSupplies,
                    suppliesName,
                    suppliesDescription,
                    material,
                    suppliesBrand,
                    type,
                    suppliesVariations
                );
                if (result.success) {
                    res.status(200).json();
                } else {
                    res.status(400).json();
                }
            } catch (err) {
                console.error("Error update supp:", err);
                res.status(500).json({ message: "Internal server error" });
            }
            break;

        default:
            // Trả về lỗi nếu nameTag không hợp lệ
            return res.status(400).json({ message: 'Invalid nameTag value.' });
    }
});
// Delete sp
router.put('/admin/products/delete', authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền truy cập
    if (id_role !== 2) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }
    console.log("Body:", req.body);

    const { id_product, category } = req.body;

    if (!id_product || !category) {
        return res.status(400).json();
    }

    try {
        // Kết nối đến database
        const client = getClient();
        const database = client.db("PBL6");
        // Cập nhật status = 0 trong collection products
        const productsCollection = database.collection("products");
        const updateProductResult = await productsCollection.updateOne(
            { _id: id_product },
            { $set: { status: 0 } }
        );

        if (updateProductResult.matchedCount === 0) {
            console.log("Ko tìm thấy sp")
            return res.status(400).json(); // Ko tìm thấy
        }

        // Thực hiện cập nhật status = 0 trong category tương ứng
        switch (category) {
            case 'pets':
                const petsCollection = database.collection("pets");
                await petsCollection.updateMany(
                    { id_product },
                    { $set: { status: 0 } }
                );
                console.log("Updated status to 0 in pets category");
                break;
            case 'foods':
                const foodsCollection = database.collection("foods");
                await foodsCollection.updateMany(
                    { id_product },
                    { $set: { status: 0 } }
                );
                console.log("Updated status to 0 in foods category");
                break;
            case 'supplies':
                const suppliesCollection = database.collection("supplies");
                await suppliesCollection.updateMany(
                    { id_product },
                    { $set: { status: 0 } }
                );
                console.log("Updated status to 0 in supplies category");
                break;
            default:
                return res.status(400).json(); //Category ko hợp lệ
        }

        return res.status(200).json();
    } catch (err) {
        console.error("Error updating product status:", err);
        return res.status(500).json({ message: "Internal server error" });
    } finally {
    }
});
//Undelete product
router.put('/admin/products/unDelete', authenticateToken, upload.none(), async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền truy cập
    if (id_role !== 2) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }
    console.log("Body:", req.body);

    const { id_product, category } = req.body;

    if (!id_product || !category) {
        return res.status(400).json();
    }

    try {
        // Kết nối đến database
        const client = getClient();
        const database = client.db("PBL6");
        // Cập nhật status = 0 trong collection products
        const productsCollection = database.collection("products");
        const updateProductResult = await productsCollection.updateOne(
            { _id: id_product },
            { $set: { status: 1 } }
        );

        if (updateProductResult.matchedCount === 0) {
            console.log("Ko tìm thấy sp")
            return res.status(400).json(); // Ko tìm thấy
        }

        // Thực hiện cập nhật status = 0 trong category tương ứng
        switch (category) {
            case 'pets':
                const petsCollection = database.collection("pets");
                await petsCollection.updateMany(
                    { id_product },
                    { $set: { status: 1 } }
                );
                console.log("Updated status to 1 in pets category");
                break;
            case 'foods':
                const foodsCollection = database.collection("foods");
                await foodsCollection.updateMany(
                    { id_product },
                    { $set: { status: 1 } }
                );
                console.log("Updated status to 1 in foods category");
                break;
            case 'supplies':
                const suppliesCollection = database.collection("supplies");
                await suppliesCollection.updateMany(
                    { id_product },
                    { $set: { status: 1 } }
                );
                console.log("Updated status to 1 in supplies category");
                break;
            default:
                return res.status(400).json(); //Category ko hợp lệ
        }

        return res.status(200).json();
    } catch (err) {
        console.error("Error updating product status:", err);
        return res.status(500).json({ message: "Internal server error" });
    } finally {
    }
});
// Cập nhật ảnh cho sp
router.put('/admin/products/image', authenticateToken, upload.single('image'), async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền truy cập
    if (id_role !== 2) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }
    const {
        category,
        id_product
    } = req.body;
    console.log("File:", req.file);
    console.log("Body:", req.body);

    // Xử lý theo nameTag
    switch (category) {
        case 'pets':
            const imagePathPet = req.file ? req.file.path : default_product_image;
            try {
                const result = await updatePetImage(
                    imagePathPet,
                    id_product
                );
                if (result.success) {
                    res.status(200).json({ imgURL: result.imageUrl });
                } else {
                    res.status(400).json();
                }
            } catch (err) {
                console.error("Error updating pet image:", err);
                res.status(500).json({ message: "Internal server error" });
            }
            break;

        case 'foods':
            const imagePathFood = req.file ? req.file.path : default_product_image;
            try {
                const result = await updateFoodImage(
                    imagePathFood,
                    id_product
                );
                if (result.success) {
                    res.status(200).json({ imgURL: result.imageUrl });
                } else {
                    res.status(400).json();
                }
            } catch (err) {
                console.error("Error image food:", err);
                res.status(500).json({ message: "Internal server error" });
            }
            break;

        case 'supplies':
            const imagePathSupplies = req.file ? req.file.path : default_product_image;
            try {
                const result = await updateSuppliesImage(
                    imagePathSupplies,
                    id_product
                );
                if (result.success) {
                    res.status(200).json({ imgURL: result.imageUrl });
                } else {
                    res.status(400).json();
                }
            } catch (err) {
                console.error("Error image supp:", err);
                res.status(500).json({ message: "Internal server error" });
            }
            break;

        default:
            // Trả về lỗi nếu nameTag không hợp lệ
            return res.status(400).json({ message: 'Invalid nameTag value.' });
    }
});
// Get pets
router.get('/admin/products/pets', authenticateToken, async (req, res) => {
    console.log("Query params:");
    const id_role = req.user.id_role;
    // Kiểm tra quyền truy cập
    if (id_role !== 2 && id_role !== 3) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }
    try {
        const client = getClient();
        const database = client.db("PBL6");
        const productsCollection = database.collection('products');
        const petsCollection = database.collection('pets');

        // Query parameters
        const category = req.query.category || 'all';
        const search = req.query.search ? req.query.search.split(',') : [];
        const sortBy = req.query.sortBy || 'default';
        const minPrice = parseFloat(req.query.minPrice) || 0;
        const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
        const status = parseInt(req.query.status) || 1;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        console.log("Query params:", req.query);
        // Build filters for pets
        let filters = {};
        if (category !== 'all') {
            filters['type'] = { $regex: new RegExp(category, 'i') };
        }
        if (search.length > 0) {
            filters['breed'] = { $in: search.map(search => new RegExp(search, 'i')) };
        }
        filters['price'] = { $gte: minPrice, $lte: maxPrice };

        // Apply status filter for pets
        if (status === 2) {
            filters['quantity'] = { $gt: 0 }; // Còn hàng
            filters['status'] = 1;
        } else if (status === 3) {
            filters['quantity'] = 0; // Hết hàng
            filters['status'] = 1;
        } else if (status === 4) {
            filters['status'] = 0; // Bị xóa
        } else {
            // filters['status'] = 1; // Mặc định
        }

        // Get filtered pets
        let pets = await petsCollection.find(filters).toArray();

        // Group pets by product ID
        const productIds = [...new Set(pets.map(pet => pet.id_product))];

        // Get total products matching the filtered pets
        const totalProducts = await productsCollection.countDocuments({
            _id: { $in: productIds }
        });
        const totalPages = Math.ceil(totalProducts / limit);

        // Fetch products with pagination
        let products = await productsCollection
            .find({ _id: { $in: productIds } })
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

        // Combine products with their minimum pet price
        let fullProducts = products.map(product => {
            const productPets = pets.filter(pet =>
                pet.id_product.toString() === product._id.toString()
            );
            const minPrice = productPets.length > 0
                ? Math.min(...productPets.map(pet => pet.price))
                : "";
            const type = productPets.length > 0
                ? productPets[0].type
                : "";
            const breed1 = productPets.length > 0
                ? productPets[0].breed
                : "";
            return {
                id: product._id,
                name: product.name,
                image: product.image,
                date_created: product.date_created,
                rating: product.rating,
                breed: breed1,
                type: type,
                price: minPrice, // Đưa giá trực tiếp ra ngoài
                status: product.status
            };
        });

        // Sort products by price if needed
        if (sortBy === 'price' || sortBy === 'price-desc') {
            fullProducts = fullProducts.sort((a, b) => {
                if (a.price === null || b.price === null) return 0; // Bỏ qua sản phẩm không có giá
                return sortBy === 'price' ? a.price - b.price : b.price - a.price;
            });
        }
        const totalRecords = fullProducts.length;
        res.json({
            products: fullProducts,
            currentPage: page,
            totalPages,
            totalRecords,
            limit
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
// Get foods
router.get('/admin/products/foods', authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;
    // Kiểm tra quyền truy cập
    if (id_role !== 2 && id_role !== 3) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    try {
        const client = getClient();
        const database = client.db("PBL6");
        const productsCollection = database.collection('products');
        const foodsCollection = database.collection('foods');

        // Query parameters
        const search = req.query.search?.toLowerCase() || 'all';
        const ingredient = req.query.ingredient?.toLowerCase() || 'all';
        const weightQuery = req.query.weight || 'all';
        const categories = req.query.category ? req.query.category.split(',').map(c => c.toLowerCase()) : [];
        const sortBy = req.query.sortBy || 'default';
        const status = parseInt(req.query.status) || 1;
        const minPrice = parseFloat(req.query.minPrice) || 0;
        const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const type = req.query.type || 'all';
        console.log("Query params:", req.query);
        // Build filters for foods
        let foodFilters = {
            price: { $gte: minPrice, $lte: maxPrice },
        };

        // Filter by ingredient
        // if (ingredient !== 'all') {
        //     foodFilters['ingredient'] = { $regex: new RegExp(ingredient, 'i') };
        // }
        if (ingredient !== 'all') {
            foodFilters['ingredient'] = { $regex: ingredient, $options: 'i' };
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

        if (type !== 'all') {
            foodFilters['type'] = { $regex: new RegExp(`^${type}$`, 'i') }; // Khớp chính xác "Chó" hoặc "Mèo"

        }

        // Lấy danh sách foods khớp filter
        const matchedFoods = await foodsCollection.find(foodFilters).toArray();

        // Lấy danh sách id_product từ foods khớp filter
        const productIds = matchedFoods.map(food => food.id_product);
        // Build filters for products
        const productFilters = {
            _id: { $in: productIds },
        };
        if (search !== 'all') {
            productFilters['name'] = { $regex: new RegExp(search, 'i') };
        }
        if (status !== 1 && status !== 4) {
            productFilters.status = 1; // Chỉ lấy sản phẩm active nếu không phải get all
        }
        if (status === 2) {
            // Lấy tất cả các biến thể, nhóm theo id_product và chỉ xét status = 1
            const groupedFoods = await foodsCollection.aggregate([
                { $match: { price: { $gte: minPrice, $lte: maxPrice }, status: 1 } }, // Chỉ lấy các biến thể active
                { $group: { _id: "$id_product", allQuantities: { $push: "$quantity" } } },
            ]).toArray();

            // Lọc chỉ các sản phẩm có tất cả biến thể quantity > 0
            const validProductIds = groupedFoods
                .filter(group => group.allQuantities.every(qty => qty > 0))
                .map(group => group._id);

            productFilters._id = { $in: validProductIds }; // Chỉ giữ các sản phẩm hợp lệ
        } else if (status === 3) {
            // Lấy tất cả các biến thể, nhóm theo id_product và chỉ xét status = 1
            const groupedFoods = await foodsCollection.aggregate([
                { $match: { price: { $gte: minPrice, $lte: maxPrice }, status: 1 } }, // Chỉ lấy các biến thể active
                { $group: { _id: "$id_product", hasZeroQuantity: { $max: { $eq: ["$quantity", 0] } } } },
            ]).toArray();

            // Lọc chỉ các sản phẩm có ít nhất một biến thể quantity = 0
            const validProductIds = groupedFoods
                .filter(group => group.hasZeroQuantity)
                .map(group => group._id);

            productFilters._id = { $in: validProductIds }; // Chỉ giữ các sản phẩm hợp lệ
        } else if (status === 4) {
            foodFilters.status = 0; // Bị xóa
            productFilters.status = 0;
        }
        // Count total products for pagination
        const totalProducts = await productsCollection.countDocuments(productFilters);
        const totalPages = Math.ceil(totalProducts / limit);

        // Fetch products with pagination
        let products = await productsCollection
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
            const maxPriceVariant = Math.max(...productFoods.map(food => food.price));
            const priceRange = `${minPriceVariant} - ${maxPriceVariant}`;
            // Sắp xếp các biến thể theo weight (tăng dần)
            const sortedProductFoods = productFoods.sort((a, b) => a.normalizedWeight - b.normalizedWeight);

            return {
                id: product._id,
                name: product.name,
                image: product.image,
                date_created: product.date_created,
                rating: product.rating,
                category: product.category,
                type: sortedProductFoods[0]?.type,
                //min_price_variant: minPriceVariant, // Giá thấp nhất
                price: priceRange,
                status: product.status
            };
        });

        // Sort fullProducts based on the sortBy field
        switch (sortBy) {
            case 'price':
                fullProducts.sort((a, b) => parseFloat(a.price.split(' - ')[0]) - parseFloat(b.price.split(' - ')[0])); // Giá thấp nhất tăng dần
                break;
            case 'price-desc':
                fullProducts.sort((a, b) => parseFloat(b.price.split(' - ')[0]) - parseFloat(a.price.split(' - ')[0])); // Giá thấp nhất giảm dần
                break;
            case 'rating':
                fullProducts.sort((a, b) => b.rating - a.rating); // Rating giảm dần
                break;
            case 'latest':
                fullProducts.sort((a, b) => new Date(b.date_created) - new Date(a.date_created)); // Mới nhất trước
                break;
            default:
                fullProducts; // Không sắp xếp
                break;
        }
        // Pagination
        // const startIndex = (page - 1) * limit;
        // const paginatedProducts = fullProducts.slice(startIndex, startIndex + limit);
        const totalRecords = fullProducts.length;
        res.json({
            products: fullProducts,
            currentPage: page,
            totalPages,
            totalRecords,
            limit,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {

    }
});
// Get supplies
router.get('/admin/products/supplies', authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;
    // Kiểm tra quyền truy cập
    if (id_role !== 2 && id_role !== 3) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    try {
        const client = getClient();
        const database = client.db("PBL6");
        const productsCollection = database.collection('products');
        const suppliesCollection = database.collection('supplies');

        // Query parameters
        const search = req.query.search?.toLowerCase() || 'all';
        const category = req.query.category?.toLowerCase() || 'all';
        const sortBy = req.query.sortBy || 'default';
        const color = req.query.color?.toLowerCase();
        const status = parseInt(req.query.status) || 1; // 1: all, 2: còn hàng, 3: hết hàng, 4: bị xóa
        const size = req.query.size?.toLowerCase();
        const type = req.query.type?.toLowerCase();
        const minPrice = parseFloat(req.query.minPrice) || 0;
        const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Filters for supplies
        let supplyFilters = {
            price: { $gte: minPrice, $lte: maxPrice },
        };

        if (category !== 'all') {
            supplyFilters.type = { $regex: new RegExp(category, 'i') };
        }
        // if (color) {
        //     supplyFilters.color = { $regex: new RegExp(color, 'i') };
        // }
        if (color) {
            supplyFilters.color = { $regex: color, $options: 'i' }; // 'i' để không phân biệt hoa thường
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
        };
        if (search !== 'all') {
            productFilters['name'] = { $regex: new RegExp(search, 'i') };
        }
        if (status !== 1 && status !== 4) {
            productFilters.status = 1; // Chỉ lấy sản phẩm active nếu không phải get all
        }
        if (status === 2) {
            // Lấy tất cả các biến thể, nhóm theo id_product
            const groupedSupplies = await suppliesCollection.aggregate([
                { $match: { price: { $gte: minPrice, $lte: maxPrice }, status: 1 } },
                { $group: { _id: "$id_product", allQuantities: { $push: "$quantity" } } },
            ]).toArray();

            // Lọc chỉ các sản phẩm có tất cả biến thể quantity > 0
            const validProductIds = groupedSupplies
                .filter(group => group.allQuantities.every(qty => qty > 0))
                .map(group => group._id);

            productFilters._id = { $in: validProductIds }; // Chỉ giữ các sản phẩm hợp lệ
        } else if (status === 3) {
            // Lấy tất cả các biến thể, nhóm theo id_product
            const groupedSupplies = await suppliesCollection.aggregate([
                { $match: { price: { $gte: minPrice, $lte: maxPrice }, status: 1 } },
                { $group: { _id: "$id_product", hasZeroQuantity: { $max: { $eq: ["$quantity", 0] } } } },
            ]).toArray();

            // Lọc chỉ các sản phẩm có ít nhất một biến thể quantity = 0
            const validProductIds = groupedSupplies
                .filter(group => group.hasZeroQuantity)
                .map(group => group._id);

            productFilters._id = { $in: validProductIds }; // Chỉ giữ các sản phẩm hợp lệ
        } else if (status === 4) {
            supplyFilters.status = 0; // Bị xóa
            productFilters.status = 0;
        }

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
            'lớn': 3,
        };

        // Combine products with their variations
        const fullProducts = products.map(product => {
            const productSupplies = allSupplies.filter(supply => supply.id_product.toString() === product._id.toString());

            // Tính giá thấp nhất và giá cao nhất từ các variations
            const prices = productSupplies.map(supply => supply.price);
            const priceRange = `${Math.min(...prices)} - ${Math.max(...prices)}`; // Trả về dưới dạng string

            // Sắp xếp các variants theo size
            const sortedSupplies = productSupplies.sort((a, b) => {
                const sizeA = a.size.toLowerCase();
                const sizeB = b.size.toLowerCase();
                return (sizeOrder[sizeA] || 0) - (sizeOrder[sizeB] || 0);
            });

            return {
                id: product._id, // Convert MongoDB _id to id
                name: product.name,
                image: product.image,
                description: product.description,
                date_created: product.date_created,
                rating: product.rating,
                type: sortedSupplies[0]?.type || null,
                price: priceRange, // Trả về priceRange dưới dạng string
                status: product.status
            };
        }).filter(product => product !== null); // Lọc bỏ các sản phẩm không có variant phù hợp

        // Sorting
        if (sortBy === 'rating') {
            fullProducts.sort((a, b) => b.rating - a.rating);
        } else if (sortBy === 'latest') {
            fullProducts.sort((a, b) => new Date(b.date_created) - new Date(a.date_created));
        } else if (sortBy === 'price') {
            fullProducts.sort((a, b) => parseFloat(a.price.split(' - ')[0]) - parseFloat(b.price.split(' - ')[0]));
        } else if (sortBy === 'price-desc') {
            fullProducts.sort((a, b) => parseFloat(b.price.split(' - ')[0]) - parseFloat(a.price.split(' - ')[0]));
        }

        // Pagination
        // const startIndex = (page - 1) * limit;
        // const paginatedProducts = fullProducts.slice(startIndex, startIndex + limit);
        const totalRecords = fullProducts.length;
        res.json({
            products: fullProducts,
            currentPage: page,
            totalPages,
            totalRecords,
            limit,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {

    }
});
// Search sp
router.get('/admin/products/search', authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;
    // Kiểm tra quyền truy cập
    if (id_role !== 2 && id_role !== 3) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    const name = req.query.name; // Lấy giá trị name từ query string

    if (!name) {
        return res.status(400).json();
    }

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
                    .normalize('NFD') // Phân tách Unicode
                    .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu
                    .replace(/[^a-zA-Z0-9 ]/g, '') // Loại bỏ ký tự đặc biệt
                    .toLowerCase();

            const normalizedSearch = normalizeText(name);

            filters.$or = [
                { name: { $regex: new RegExp(normalizedSearch, 'i') } },
            ];
        }
        let products = await productsCollection.find(filters).toArray();

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
                    rating: product.rating,
                    status: product.status
                };
            })
        );
        // Sắp xếp sản phẩm: status = 1 (trước), status = 0 (sau)
        customProducts.sort((a, b) => b.status - a.status);
        const totalRecords = customProducts.length;
        res.status(200).json({ customProducts, totalRecords });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {

    }
});
// Search sp trả về tất cả variation
router.get('/admin/products/searchByName', authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;
    // Kiểm tra quyền truy cập
    if (id_role !== 2 && id_role !== 3) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    const name = req.query.name; // Lấy giá trị name từ query string

    if (!name) {
        return res.status(400).json({ message: 'Name query parameter is required' });
    }

    try {
        const client = getClient();
        const database = client.db("PBL6");
        const productsCollection = database.collection('products');
        const foodsCollection = database.collection('foods');
        const suppliesCollection = database.collection('supplies');
        const petsCollection = database.collection('pets');

        const normalizeText = (text) =>
            text
                .normalize('NFD') // Phân tách Unicode
                .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu
                .replace(/[^a-zA-Z0-9 ]/g, '') // Loại bỏ ký tự đặc biệt
                .toLowerCase();

        const normalizedSearch = normalizeText(name);

        const filters = {
            name: { $regex: new RegExp(name, 'i') }
        };

        const products = await productsCollection.find(filters).toArray();

        const productVariants = [];

        for (const product of products) {
            let variants = [];

            if (product.category === 'foods') {
                variants = await foodsCollection.find({ id_product: product._id }).toArray();
            } else if (product.category === 'supplies') {
                variants = await suppliesCollection.find({ id_product: product._id }).toArray();
            } else if (product.category === 'pets') {
                const variant = await petsCollection.findOne({ id_product: product._id });
                if (variant) {
                    variants.push(variant);
                }
            }

            for (const variant of variants) {
                productVariants.push({
                    product_variant_id: variant._id,
                    name: product.name,
                    category: product.category,
                    stock: variant.quantity || variant.stock || 0,
                    ingredient: variant.ingredient || '',
                    weight: variant.weight || '',
                    size: variant.size || '',
                    color: variant.color || '',
                    price: variant.price || 0
                });
            }
        }
        const totalRecords = productVariants.length;
        res.status(200).json({ productVariants, totalRecords });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
// Get supplies details
router.get('/admin/products/supplies/:id', authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;
    const productId = req.params.id;
    // Kiểm tra quyền truy cập
    if (id_role !== 2 && id_role !== 3) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }
    try {
        const client = getClient();
        const database = client.db("PBL6");
        const productsCollection = database.collection('products');
        const suppliesCollection = database.collection('supplies');
        const commentsCollection = database.collection("comments");

        // Fetch the product from the products collection
        const product = await productsCollection.findOne({ _id: productId });

        if (!product) {
            res.status(404).json({ message: 'Product not found' });
        }
        // Lấy số lượng bình luận có id_product = productId
        const totalReview = await commentsCollection.countDocuments({ id_product: productId });
        // Fetch supplies linked to the product, ensuring status = 1
        const supplies = await suppliesCollection
            .find({ id_product: productId })
            .toArray();

        // Construct the response object
        const response = {
            id: product._id,
            name: product.name,
            description: product.description,
            image: product.image,
            date_created: product.date_created,
            rating: product.rating,
            category: product.category,
            material: supplies[0]?.material || null, // Use the first variation for shared fields
            brand: supplies[0]?.brand || null,       // Use the first variation for shared fields
            type: supplies[0]?.type || null,         // Use the first variation for shared fields
            totalReview: totalReview,
            status: product.status,
            variations_supplies: supplies.map(supply => ({
                product_variant_id: supply._id,
                color: supply.color,
                size: supply.size,
                price: supply.price,
                quantity: supply.quantity,
                date_created: supply.date_created,
                status: supply.status,
            })),
        };
        res.status(200).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
    }
});
// Get foods details
router.get('/admin/products/foods/:id', authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;
    const foodId = req.params.id;
    // Kiểm tra quyền truy cập
    if (id_role !== 2 && id_role !== 3) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }
    try {

        // Kết nối tới MongoDB và lấy các collection
        const client = getClient();
        const database = client.db("PBL6");
        const foodsCollection = database.collection('foods');
        const productsCollection = database.collection('products');
        const commentsCollection = database.collection("comments");

        // Lấy thông tin food theo ID
        const food = await foodsCollection.findOne({ id_product: foodId });

        if (!food) {
            res.status(404).json({ message: "Food không tồn tại hoặc đã bị ẩn" });
        }
        // Lấy số lượng bình luận có id_product = productId
        const totalReview = await commentsCollection.countDocuments({ id_product: foodId });
        // Lấy thông tin sản phẩm tương ứng
        const product = await productsCollection.findOne({ _id: food.id_product });

        if (!product) {
            res.status(404).json({ message: "Sản phẩm không tồn tại hoặc đã bị ẩn" });
        }

        // Lấy tất cả variations của sản phẩm từ bảng foods
        const allVariations = await foodsCollection.find({ id_product: product._id }).toArray();

        // Xử lý variations_food
        const variationsFood = allVariations.map(variation => ({
            product_variant_id: variation._id,
            ingredient: variation.ingredient === "Chicken" ? "Gà" : variation.ingredient === "Beef" ? "Bò" : variation.ingredient,
            weight: variation.weight,
            price: variation.price,
            quantity: variation.quantity,
            date_created: variation.date_created,
            status: variation.status,
        }));

        // Tạo đối tượng response
        const responseData = {
            id: product._id,
            name: product.name,
            description: product.description,
            image: product.image,
            date_created: product.date_created,
            rating: product.rating,
            category: product.category,
            pet_type: food.pet_type,
            nutrition_info: food.nutrition_info,
            expire_date: food.expire_date,
            brand: food.brand,
            type: food.type,
            totalReview: totalReview,
            status: product.status,
            variations_foods: variationsFood,
        };

        res.status(200).json(responseData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
    }
});
// Get pets details
router.get('/admin/products/pets/:id', authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;
    const petId = req.params.id;
    // Kiểm tra quyền truy cập
    if (id_role !== 2 && id_role !== 3) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }
    try {
        // Kết nối tới MongoDB và lấy các collection
        const client = getClient();
        const database = client.db("PBL6");
        const petsCollection = database.collection('pets');
        const productsCollection = database.collection('products');
        const commentsCollection = database.collection("comments");

        // Lấy thông tin pet theo ID
        const pet = await petsCollection.findOne({ id_product: petId });

        if (!pet) {
            return res.status(404).json({ message: "Pet không tồn tại" });
        }
        // Lấy số lượng bình luận có id_product = productId
        const totalReview = await commentsCollection.countDocuments({ id_product: petId });

        // Lấy thông tin sản phẩm tương ứng
        const product = await productsCollection.findOne({ _id: pet.id_product });

        if (!product) {
            return res.status(404).json({ message: "Sản phẩm  không tồn tại" });
        }

        // Lấy tất cả variations của sản phẩm từ bảng pets
        const allVariations = await petsCollection.find({
            id_product: product._id,
        }).toArray();

        // Xử lý variations_pets
        const variationsPets = allVariations.map(variation => ({
            product_variant_id: variation._id,
            price: variation.price,
            gender: variation.gender,
            health: variation.health,
            father: variation.father,
            mother: variation.mother,
            type: variation.type,
            deworming: variation.deworming,
            vaccine: variation.vaccine,
            breed: variation.breed,
            breed_origin: variation.breed_origin,
            trait: variation.trait,
            date_of_birth: variation.date_of_birth,
            quantity: variation.quantity,
            date_created: variation.date_created,
            status: variation.status,
        }));

        // Tạo đối tượng response
        const responseData = {
            id: product._id,
            name: product.name,
            description: product.description,
            image: product.image,
            date_created: product.date_created,
            rating: product.rating,
            category: product.category,
            totalReview: totalReview,
            status: product.status,
            variations_pets: variationsPets,

        };
        return res.status(200).json(responseData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
    }
});

module.exports = router;

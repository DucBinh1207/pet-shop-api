const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticateToken } = require("../middleware/authenticateToken");
const { client } = require("../db");
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
// Tạo sp mới
router.post('/admin/products/create', authenticateToken, upload.single('image'), async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền truy cập
    if (id_role !== 2) {
        return res.status(400).json();
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
            const imagePathPet = req.file ? req.file.path : null;

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

            const imagePathFood = req.file ? req.file.path : null;
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

            const imagePathSupplies = req.file ? req.file.path : null;
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
        return res.status(400).json();
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
// List sp
router.get('/admin/products/get', authenticateToken, upload.single('image'), async (req, res) => {
    const id_role = req.user.id_role;
    // Kiểm tra quyền truy cập
    if (id_role !== 2) {
        return res.status(400).json();
    }

    const { nameTag } = req.body;
    try {
        switch (nameTag) {
            case 'pets':
                // Query parameters
                const category = req.query.category || 'all'; // Default to 'all'
                const breeds = req.query.breeds ? req.query.breeds.split(',') : [];
                const sortBy = req.query.sortBy || 'default';
                const minPrice = parseFloat(req.query.minPrice) || 0;
                const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;

                // Call getPet function and return the result as JSON
                const { products, totalPages } = await getPet(category, breeds, sortBy, minPrice, maxPrice, page, limit);
                return res.json({
                    products,
                    currentPage: page,
                    limit,
                    totalPages,
                });

            case 'foods':
                // Call getFood function and return the result as JSON (implement similar to getPet if needed)
                break;

            case 'supplies':
                // Call getSupplies function and return the result as JSON (implement similar to getPet if needed)
                break;

            default:
                // Trả về lỗi nếu nameTag không hợp lệ
                return res.status(400).json({ message: 'Invalid nameTag value.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
// Delete sp
router.put('/admin/products/delete', authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền truy cập
    if (id_role !== 2) {
        return res.status(400).json(); 
    }
    console.log("Body:", req.body);

    const { id_product, category } = req.body;

    if (!id_product || !category) {
        return res.status(400).json();
    }

    try {
        // Kết nối đến database
        await client.connect();
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
        await client.close();
    }
});
// Cập nhật ảnh cho sp
router.put('/admin/products/image', authenticateToken, upload.single('image'), async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền truy cập
    if (id_role !== 2) {
        return res.status(400).json();
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
            const imagePathPet = req.file ? req.file.path : null;
            try {
                const result = await updatePetImage(
                    imagePathPet,
                    id_product
                );
                if (result.success) {
                    res.status(200).json();
                } else {
                    res.status(400).json();
                }
            } catch (err) {
                console.error("Error updating pet image:", err);
                res.status(500).json({ message: "Internal server error" });
            }
            break;

        case 'foods':
            const imagePathFood = req.file ? req.file.path : null;
            try {
                const result = await updateFoodImage(
                    imagePathFood,
                    id_product
                );
                if (result.success) {
                    res.status(200).json();
                } else {
                    res.status(400).json();
                }
            } catch (err) {
                console.error("Error image food:", err);
                res.status(500).json({ message: "Internal server error" });
            }
            break;

        case 'supplies':
            const imagePathSupplies = req.file ? req.file.path : null;
            try {
                const result = await updateSuppliesImage(
                    imagePathSupplies,
                    id_product
                );
                if (result.success) {
                    res.status(200).json();
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
module.exports = router;

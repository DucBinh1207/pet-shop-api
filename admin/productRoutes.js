const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticateToken } = require("../middleware/authenticateToken");
const { client } = require("../db");
const { 
    addPet,
    addFood,
    addSupplies,
    updatePet } = require("../product-admin/product");


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

router.post('/admin/products/create', authenticateToken, upload.single('image'), async (req, res) => {
    const id_role = req.user.id_role;

    // Kiểm tra quyền truy cập
    if (id_role !== 2) {
        return res.status(400).json({ message: 'Access denied. You are not an admin.' });
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
                    res.status(401).json({ message: result.message });
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

router.post('/admin/products/update', authenticateToken, async (req, res) => {
    const id_role = req.user.id_role;

    upload.single('image');
    
    // Kiểm tra quyền truy cập
    if (id_role !== 2) {
        return res.status(400).json({ message: 'Access denied. You are not an admin.' });
    }

    const { nameTag } = req.body;
    console.log("File:", req.file);
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

            // Lấy đường dẫn của ảnh đã upload
            const imagePathPet = req.file ? req.file.path : null;

            // Thêm sản phẩm vào cơ sở dữ liệu
            try {
                const result = await updatePet(
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
                    res.status(401).json({ message: result.message });
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
module.exports = router;

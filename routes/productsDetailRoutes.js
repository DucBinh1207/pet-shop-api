const express = require('express');
const router = express.Router();

const { getSuppliesDetail, getFoodDetail, getPetDetail } = require("../controllers/productsDetailController");


router.get('/products/supplies/:id', getSuppliesDetail);

router.get('/products/foods/:id', getFoodDetail);

router.get('/products/pets/:id', getPetDetail);


module.exports = router;

const { client } = require("../db");

async function updateAvatarUser(id_product_variant, category) {
    try {
        await client.connect();
        const db = client.db("PBL6");


        
    } catch (err) {
        console.error("Error checking product validity:", err);
        return { success: false, message: "" };
    }
}

module.exports = {

};

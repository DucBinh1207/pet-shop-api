const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = "mongodb+srv://tdv0905179758:qMdBYWg45uwOUz9F@viet.fn3ykhs.mongodb.net/?retryWrites=true&w=majority&appName=Viet";
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Kết nối MongoDB khi ứng dụng khởi động
async function connectToDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB", error);
        throw error;
    }
}

// Hàm để lấy client khi cần
function getClient() {
    return client;
}

async function closeDBConnection() {
    await client.close();
    console.log("MongoDB connection closed");
}

module.exports = { connectToDB, getClient, closeDBConnection }
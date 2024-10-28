
const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const authRoutes = require("./routes/authRoutes"); // Import module route
const petRoutes = require("./routes/petRoutes"); // Import module route
const foodRoutes = require("./routes/foodRoutes"); // Import module route
const supplyRoutes = require("./routes/supplyRoutes"); // Import module route
const cartRoutes = require("./routes/cartItemRoutesMongo"); // Import module route
const orderRoutes = require("./routes/orderRoutesMongo"); // Import module route
const cors = require("cors");



const app = express();
const port = 8000; // Port để lắng nghe


const uri = "mongodb+srv://tdv0905179758:qMdBYWg45uwOUz9F@viet.fn3ykhs.mongodb.net/?retryWrites=true&w=majority&appName=Viet";

// Tạo một MongoClient với MongoClientOptions object để cài đặt Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,

  }
});

// Middleware để parse JSON body
app.use(express.json());
app.use(
  cors({
    credentials: true,
     origin: ['http://localhost:3000', 'http://localhost:3001'],
  })
);

// Kết nối đến MongoDB khi khởi động server
async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB successfully!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

app.get('/', (req, res) => {
  res.send('Hello from Express server!');
});

// Route kiểm tra kết nối MongoDB
app.get('/pingMongo', async (req, res) => {
  try {
    await client.db("admin").command({ ping: 1 });
    res.send("Pinged MongoDB deployment. Successfully connected!");
  } catch (error) {
    res.status(500).send("Failed to ping MongoDB: " + error);
  }
});

// Dẫn các route liên quan đến xác thực sang authRoutesMongo.js
app.use("/api/auth", authRoutes); // Thêm tiền tố '/auth' cho các route xác thực
app.use("/api", petRoutes);
app.use("/api", foodRoutes);
app.use("/api", supplyRoutes);
app.use("/api", cartRoutes);
app.use("/api", orderRoutes);
app.use(express.static("public"));




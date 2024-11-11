const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const authRoutes = require("./routes/authRoutes");
const petRoutes = require("./routes/petRoutes");
const foodRoutes = require("./routes/foodRoutes");
const supplyRoutes = require("./routes/supplyRoutes");
const cartRoutes = require("./routes/cartItemRoutesMongo");
const orderRoutes = require("./routes/orderRoutesMongo");
const commentRoutes = require("./routes/commentRoutes");
const cors = require("cors");

const app = express();
const port = 8000;

const uri = "mongodb+srv://tdv0905179758:qMdBYWg45uwOUz9F@viet.fn3ykhs.mongodb.net/?retryWrites=true&w=majority&appName=Viet";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

app.use(express.json());
app.use(
  cors({
    credentials: true,
    origin: ['http://localhost:3000', 'http://localhost:3001', 'https://pet-shop-test-deploy.vercel.app'],
  })
);

// Middleware để log route và mã trả về mỗi khi được gọi
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`Route: ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Time: ${duration}ms`);
  });
  
  next();
});

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

app.get('/pingMongo', async (req, res) => {
  try {
    await client.db("admin").command({ ping: 1 });
    res.send("Pinged MongoDB deployment. Successfully connected!");
  } catch (error) {
    res.status(500).send("Failed to ping MongoDB: " + error);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api", petRoutes);
app.use("/api", foodRoutes);
app.use("/api", supplyRoutes);
app.use("/api", cartRoutes);
app.use("/api", orderRoutes);
app.use("/api", commentRoutes);
app.use(express.static("public"));

// Middleware xử lý lỗi
app.use((err, req, res, next) => {
  console.error(`Error occurred on route ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ message: "Đã xảy ra lỗi trên máy chủ", error: err.message });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  connectToMongoDB();
});

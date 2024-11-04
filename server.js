const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
// const authRoutes = require('./routes/authRoutes'); // Import module route
const petRoutes = require('./routes/petRoutes'); // Import module route
const suppliesRoutes = require('./routes/suppliesRoutes'); // Import module route
const foodsRoutes = require('./routes/foodRoutes'); // Import module route
const detailRoutes = require('./routes/productsDetailRoutes'); // Import module route
const commentRoutes = require('./routes/commentRoutes'); // Import module route

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

// Kết nối đến MongoDB khi khởi động server
async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB successfully!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

// Route mặc định
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

app.use((req, res, next) => {
  // Lưu thời gian bắt đầu
  const start = Date.now();

  // Khi response hoàn thành, lắng nghe sự kiện 'finish'
  res.on('finish', () => {
    const duration = Date.now() - start; // Tính thời gian thực thi
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Dẫn các route liên quan đến xác thực sang authRoutesMongo.js
// app.use('/api/auth', authRoutes); // Thêm tiền tố '/auth' cho các route xác thực
app.use('/api', petRoutes); 
app.use('/api', suppliesRoutes); 
app.use('/api', foodsRoutes); 
app.use('/api', detailRoutes);
app.use('/api/comment', commentRoutes);
// app.use(express.static('public'));

// Khởi động server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  connectToMongoDB(); // Kết nối tới MongoDB khi server khởi động
});
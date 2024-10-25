const express = require("express");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/authRoutes");
const petRoutes = require("./routes/petRoutes");

const server = express();
const PORT = 8000;

server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));

const fs = require("fs");

const readDataFromFile = (filePath) => {
  const data = fs.readFileSync(filePath);
  return JSON.parse(data);
};

const writeDataToFile = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Routes
server.use("/api/auth", authRoutes);
server.use("/api", petRoutes)

server.get("/test", (req, res) => {
  res.json({ message: "Test route is working!" });
});

server.use((req, res, next) => {
  if (req.method === "POST") {
    req.body.createdAt = Date.now();
    req.body.updatedAt = Date.now();
  }
  next();
});

server.get("/api/products", (req, res) => {
  const products = readDataFromFile("data.json").products || [];
  res.json(products);
});

server.post("/api/products", (req, res) => {
  const products = readDataFromFile("data.json").products || [];
  const newProduct = req.body;
  products.push(newProduct);
  writeDataToFile("data.json", { products });
  res.status(201).json(newProduct);
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

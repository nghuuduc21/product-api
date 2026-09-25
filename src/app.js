const mongoose = require("mongoose");
const express = require("express");
const Product = require("./models/Product");

const app = express();

app.use(express.json({ limit: "100kb" }));

app.get("/health", async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        status: "unhealthy",
        database: "disconnected",
      });
    }

    await mongoose.connection.db.command(
      { ping: 1 },
      { timeoutMS: 2000 }
    );

    return res.status(200).json({
      status: "healthy",
      database: "connected",
    });
  } catch {
    return res.status(503).json({
      status: "unhealthy",
      database: "unavailable",
    });
  }
});

// POST và PUT yêu cầu đủ bốn trường.
// PUT thay thế toàn bộ dữ liệu nghiệp vụ của sản phẩm.
function validateProduct(req, res, next) {
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ message: "Body phải là JSON object" });
  }

  const allowed = ["pid", "pname", "price", "quantity"];

  if (Object.keys(body).some((key) => !allowed.includes(key))) {
    return res.status(400).json({ message: "Có trường không hợp lệ" });
  }

  const { pid, pname, price, quantity } = body;

  if (typeof pid !== "string" || !pid.trim()) {
    return res.status(400).json({ message: "pid phải là chuỗi không rỗng" });
  }

  if (typeof pname !== "string" || !pname.trim()) {
    return res.status(400).json({ message: "pname phải là chuỗi không rỗng" });
  }

  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    return res.status(400).json({ message: "price phải là số không âm" });
  }

  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    return res.status(400).json({
      message: "quantity phải là số nguyên không âm",
    });
  }

  req.productData = {
    pid: pid.trim(),
    pname: pname.trim(),
    price,
    quantity,
  };

  next();
}

// Create
app.post("/api/products", validateProduct, async (req, res) => {
  const product = await Product.create(req.productData);
  res.status(201).json(product);
});

// Read: danh sách
app.get("/api/products", async (req, res) => {
  const products = await Product.find().sort({ pid: 1 });
  res.json(products);
});

// Read: một sản phẩm theo pid
app.get("/api/products/:pid", async (req, res) => {
  const product = await Product.findOne({ pid: req.params.pid });

  if (!product) {
    return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  }

  res.json(product);
});

// Update: giữ nguyên mã pid
app.put("/api/products/:pid", validateProduct, async (req, res) => {
  if (req.productData.pid !== req.params.pid) {
    return res.status(400).json({
      message: "pid trong body phải trùng pid trên URL",
    });
  }

  const product = await Product.findOneAndUpdate(
    { pid: req.params.pid },
    { $set: req.productData },
    { new: true, runValidators: true }
  );

  if (!product) {
    return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  }

  res.json(product);
});

// Delete
app.delete("/api/products/:pid", async (req, res) => {
  const product = await Product.findOneAndDelete({ pid: req.params.pid });

  if (!product) {
    return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  }

  res.status(204).send();
});

app.use((req, res) => {
  res.status(404).json({ message: "Endpoint không tồn tại" });
});

// Middleware xử lý lỗi phải đặt sau các route.
app.use((err, req, res, next) => {
  if (err.code === 11000) {
    return res.status(409).json({ message: "pid đã tồn tại" });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "JSON không hợp lệ" });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Body vượt quá 100 KB" });
  }

  if (err.name === "ValidationError" || err.name === "CastError") {
    return res.status(400).json({ message: "Dữ liệu sản phẩm không hợp lệ" });
  }

  console.error(err);
  res.status(500).json({ message: "Lỗi máy chủ" });
});

module.exports = app;
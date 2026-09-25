require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./app");
const Product = require("./models/Product");

async function start() {
  const port = Number(process.env.PORT);
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Thiếu MONGODB_URI trong .env");
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT phải là số nguyên từ 1 đến 65535");
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  // Chờ unique index của pid sẵn sàng trước khi nhận request.
  await Product.init();

  console.log("Đã kết nối MongoDB");

  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`Product API đang chạy tại http://localhost:${port}`);
  });

  server.on("error", (error) => {
    console.error("Không thể chạy HTTP server:", error.message);
    process.exit(1);
  });

  async function shutdown() {
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();

    server.close(async () => {
      try {
        await mongoose.disconnect();
        process.exit(0);
      } catch {
        process.exit(1);
      }
    });
  }

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error("Khởi động thất bại:", error.message);
  process.exit(1);
});
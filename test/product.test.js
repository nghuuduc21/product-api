const test = require("node:test");
const assert = require("node:assert/strict");
const Product = require("../src/models/Product");

function validProduct() {
  return {
    pid: "TEST001",
    pname: "Ban phim",
    price: 350000,
    quantity: 10,
  };
}

async function expectInvalid(data, field) {
  const product = new Product(data);

  await assert.rejects(
    () => product.validate(),
    (error) =>
      error.name === "ValidationError" &&
      Boolean(error.errors[field])
  );
}

test("Chấp nhận sản phẩm hợp lệ", async () => {
  await new Product(validProduct()).validate();
});

test("Từ chối sản phẩm thiếu pid", async () => {
  const data = validProduct();
  delete data.pid;

  await expectInvalid(data, "pid");
});

test("Từ chối tên sản phẩm chỉ có khoảng trắng", async () => {
  await expectInvalid(
    { ...validProduct(), pname: "   " },
    "pname"
  );
});

test("Từ chối giá âm", async () => {
  await expectInvalid(
    { ...validProduct(), price: -1 },
    "price"
  );
});

test("Từ chối số lượng âm hoặc không nguyên", async () => {
  for (const quantity of [-1, 1.5]) {
    await expectInvalid(
      { ...validProduct(), quantity },
      "quantity"
    );
  }
});

test("Chấp nhận giá và số lượng bằng 0", async () => {
  await new Product({
    ...validProduct(),
    price: 0,
    quantity: 0,
  }).validate();
});
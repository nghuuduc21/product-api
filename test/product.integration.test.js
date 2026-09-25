const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

const baseURL = process.env.API_BASE_URL || "http://127.0.0.1:3001";

async function request(method, path, body) {
  const response = await fetch(`${baseURL}${path}`, {
    method,
    headers: body === undefined
      ? {}
      : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });

  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
}

test("API CRUD với MongoDB thực", { timeout: 60000 }, async (t) => {
  const pid = `CI-${randomUUID()}`;
  const path = `/api/products/${pid}`;
  const product = {
    pid,
    pname: "San pham CI",
    price: 350000,
    quantity: 10,
  };

  // Dọn sản phẩm thử ngay cả khi một assertion thất bại.
  t.after(async () => {
    const result = await request("DELETE", path);
    assert.ok([204, 404].includes(result.status));
  });

  await t.test("Healthcheck xác nhận kết nối MongoDB", async () => {
    const result = await request("GET", "/health");

    assert.equal(result.status, 200);
    assert.equal(result.body.status, "healthy");
    assert.equal(result.body.database, "connected");
  });

  await t.test("POST tạo sản phẩm", async () => {
    const result = await request("POST", "/api/products", product);

    assert.equal(result.status, 201);
    assert.equal(result.body.pid, pid);
    assert.equal(result.body.pname, product.pname);
    assert.equal(result.body.price, 350000);
    assert.equal(result.body.quantity, 10);
    assert.ok(result.body._id);
  });

  await t.test("POST trùng pid trả 409", async () => {
    const result = await request("POST", "/api/products", product);
    assert.equal(result.status, 409);
  });

  await t.test("GET danh sách chứa sản phẩm đã tạo", async () => {
    const result = await request("GET", "/api/products");

    assert.equal(result.status, 200);
    assert.ok(Array.isArray(result.body));
    assert.ok(result.body.some((item) => item.pid === pid));
  });

  await t.test("GET chi tiết trả dữ liệu đã lưu", async () => {
    const result = await request("GET", path);

    assert.equal(result.status, 200);
    assert.equal(result.body.pid, pid);
    assert.equal(result.body.price, 350000);
    assert.equal(result.body.quantity, 10);
  });

  await t.test("PUT cập nhật và GET xác nhận dữ liệu mới", async () => {
    const result = await request("PUT", path, {
      ...product,
      price: 320000,
      quantity: 8,
    });

    assert.equal(result.status, 200);
    assert.equal(result.body.price, 320000);
    assert.equal(result.body.quantity, 8);

    const saved = await request("GET", path);
    assert.equal(saved.status, 200);
    assert.equal(saved.body.price, 320000);
    assert.equal(saved.body.quantity, 8);
  });

  await t.test("PUT dữ liệu sai trả 400 và không đổi dữ liệu", async () => {
    for (const invalid of [
      { price: -1 },
      { quantity: -1 },
      { quantity: 1.5 },
      { pname: "   " },
      { pid: `${pid}-changed` },
    ]) {
      const result = await request("PUT", path, {
        ...product,
        ...invalid,
      });

      assert.equal(result.status, 400);
    }

    const saved = await request("GET", path);
    assert.equal(saved.status, 200);
    assert.equal(saved.body.price, 320000);
    assert.equal(saved.body.quantity, 8);
  });

  await t.test("POST thiếu pid trả 400", async () => {
    const { pid: omitted, ...withoutPid } = product;
    const result = await request("POST", "/api/products", withoutPid);

    assert.equal(result.status, 400);
  });

  await t.test("DELETE xóa sản phẩm", async () => {
    const result = await request("DELETE", path);

    assert.equal(result.status, 204);
    assert.equal(result.body, null);
  });

  await t.test("GET, PUT, DELETE sản phẩm không tồn tại trả 404", async () => {
    assert.equal((await request("GET", path)).status, 404);
    assert.equal((await request("PUT", path, product)).status, 404);
    assert.equal((await request("DELETE", path)).status, 404);
  });
});
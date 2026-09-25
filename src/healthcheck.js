const port = process.env.PORT || "3000";

async function check() {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const body = await response.json();

    if (body.status !== "healthy" || body.database !== "connected") {
      throw new Error("API hoặc MongoDB chưa sẵn sàng");
    }

    process.exit(0);
  } catch (error) {
    console.error("Healthcheck failed:", error.message);
    process.exit(1);
  }
}

check();
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const host = "0.0.0.0";
const port = Number(process.env.PORT) || 3000;
const indexPath = path.join(__dirname, "index.html");
const menu = [
  { id: "cinnamon-capybara", name: "Коричная капибара" },
  { id: "vanilla-croissant", name: "Ванильный круассан" },
  { id: "chocolate-croissant", name: "Шоколадный круассан" }
];

function sendJson(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(data));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 8192) {
        reject(new Error("Тело запроса слишком большое"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Некорректный JSON"));
      }
    });
    request.on("error", reject);
  });
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${host}`);
  const route = `${request.method} ${requestUrl.pathname}`;

  if (route === "GET /" || route === "GET /index.html") {
    fs.readFile(indexPath, (error, content) => {
      if (error) {
        response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Не удалось открыть страницу");
        return;
      }
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(content);
    });
    return;
  }

  if (route === "GET /api/menu") {
    sendJson(response, 200, { items: menu });
    return;
  }

  if (route === "POST /api/selection") {
    try {
      const selection = await readJson(request);
      const item = menu.find((entry) => entry.id === selection.id);
      if (!item) {
        sendJson(response, 400, { error: "Неизвестная позиция меню" });
        return;
      }
      sendJson(response, 200, { ok: true, message: `Вы выбрали: ${item.name}. Это локальное подтверждение.`, item });
    } catch (error) {
      if (!response.headersSent && !response.destroyed) sendJson(response, 400, { error: error.message });
    }
    return;
  }

  if (route === "POST /api/reset") {
    sendJson(response, 200, { ok: true, message: "Выбор сброшен." });
    return;
  }

  if (route === "GET /api/status") {
    sendJson(response, 200, { ok: true, time: new Date().toISOString() });
    return;
  }

  sendJson(response, 404, { error: "Маршрут не найден" });
});

server.listen(port, host, () => {
  console.log(`Сервер запущен: http://${host}:${port}`);
});

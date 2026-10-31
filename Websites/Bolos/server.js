import "dotenv/config";
import { createServer as createHttpServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createMailer } from "./main/mailer.js";
import { formatOrderEmail, OrderValidationError, validateOrder } from "./main/order.js";

const root = dirname(fileURLToPath(import.meta.url));
const maxBodyBytes = 32 * 1024;
const staticFiles = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/pedido", ["pedido.html", "text/html; charset=utf-8"]],
  ["/pedido/", ["pedido.html", "text/html; charset=utf-8"]],
  ["/pedido.html", ["pedido.html", "text/html; charset=utf-8"]],
  ["/main/script.js", ["main/script.js", "text/javascript; charset=utf-8"]],
  ["/main/style.css", ["main/style.css", "text/css; charset=utf-8"]],
  ["/main/home.css", ["main/home.css", "text/css; charset=utf-8"]],
  ["/pink_cake.jpg", ["pink_cake.jpg", "image/jpeg"]],
]);

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const contentType = request.headers["content-type"] || "";
  if (contentType.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new OrderValidationError("O pedido precisa ser enviado como JSON.");
  }

  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > maxBodyBytes) {
      throw new OrderValidationError("O pedido enviado é muito grande.");
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new OrderValidationError("O conteúdo do pedido é inválido.");
  }
}

function createApplication(mailer) {
  return async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname === "/api/orders") {
      if (request.method !== "POST") {
        response.setHeader("Allow", "POST");
        return sendJson(response, 405, { ok: false, error: "Método não permitido." });
      }

      try {
        const body = await readJson(request);
        if (body && typeof body === "object" && body.website) {
          return sendJson(response, 200, { ok: true });
        }
        const order = validateOrder(body);
        await mailer.sendOrder(formatOrderEmail(order));
        return sendJson(response, 200, { ok: true });
      } catch (error) {
        if (error instanceof OrderValidationError) {
          return sendJson(response, 400, { ok: false, error: error.message });
        }
        console.error("Failed to send bakery order email:", error);
        return sendJson(response, 502, {
          ok: false,
          error: "Não foi possível enviar o pedido agora. Tente novamente.",
        });
      }
    }

    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");
      return sendJson(response, 405, { ok: false, error: "Método não permitido." });
    }

    const asset = staticFiles.get(url.pathname);
    if (!asset) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return response.end("Not found");
    }

    try {
      const [filename, contentType] = asset;
      const contents = await readFile(join(root, filename));
      response.writeHead(200, {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      });
      return response.end(contents);
    } catch (error) {
      console.error("Failed to serve website asset:", error);
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      return response.end("Unable to serve website");
    }
  };
}

const mailer = createMailer();
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid port number.");
}

const application = createApplication(mailer);
const server = createHttpServer((request, response) => {
  application(request, response).catch((error) => {
    console.error("Unhandled request error:", error);
    if (!response.headersSent) {
      sendJson(response, 500, { ok: false, error: "Ocorreu um erro inesperado." });
    } else {
      response.destroy(error);
    }
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Bolos da Salette listening on port ${port}`);
});

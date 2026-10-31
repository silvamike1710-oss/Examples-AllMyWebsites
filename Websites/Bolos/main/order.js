const MAX_ITEMS = 100;
const MAX_ORDER_TOTAL_CENTS = 100_000_000;
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export class OrderValidationError extends Error {}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function brazilToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

function validCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function requiredText(value, field, maxLength) {
  if (typeof value !== "string") {
    throw new OrderValidationError(`Confira o campo ${field}.`);
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength || /[\u0000-\u001f\u007f]/.test(trimmed)) {
    throw new OrderValidationError(`Confira o campo ${field}.`);
  }
  return trimmed;
}

export function validateOrder(input) {
  if (!isPlainObject(input)) {
    throw new OrderValidationError("Pedido inválido.");
  }

  const name = requiredText(input.name, "nome", 120);
  const email = requiredText(input.email, "e-mail", 254);
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
    throw new OrderValidationError("Confira o e-mail informado.");
  }
  const phone = requiredText(input.phone, "telefone", 30);
  if (!/^[0-9+().\s-]+$/.test(phone) || (phone.match(/\d/g) || []).length < 8) {
    throw new OrderValidationError("Confira o telefone informado.");
  }

  const pickupDate = input.pickupDate === "" ? "" : input.pickupDate;
  if (typeof pickupDate !== "string"
      || (pickupDate && (!validCalendarDate(pickupDate) || pickupDate < brazilToday()))) {
    throw new OrderValidationError("Escolha uma data de coleta válida.");
  }

  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > MAX_ITEMS) {
    throw new OrderValidationError("Adicione ao menos um item ao pedido.");
  }

  let totalCents = 0;
  const items = input.items.map((item) => {
    if (!isPlainObject(item)) {
      throw new OrderValidationError("Confira os itens do pedido.");
    }
    const description = requiredText(item.description, "item", 300);
    if (typeof item.amount !== "number" || !Number.isFinite(item.amount) || item.amount <= 0) {
      throw new OrderValidationError("Confira os valores dos itens.");
    }
    const amountCents = Math.round(item.amount * 100);
    if (Math.abs(item.amount * 100 - amountCents) > 1e-7) {
      throw new OrderValidationError("Confira os valores dos itens.");
    }
    totalCents += amountCents;
    if (totalCents > MAX_ORDER_TOTAL_CENTS) {
      throw new OrderValidationError("O valor total do pedido excede o limite permitido.");
    }
    return { description, amountCents };
  });

  return { name, email, phone, pickupDate, items, totalCents };
}

export function formatOrderEmail(order) {
  const date = order.pickupDate
    ? order.pickupDate.split("-").reverse().join("/")
    : "A combinar";
  const textItems = order.items
    .map(({ description, amountCents }) => `- ${description} — ${money.format(amountCents / 100)}`)
    .join("\n");
  const htmlItems = order.items
    .map(({ description, amountCents }) => (
      `<li>${escapeHtml(description)} — ${money.format(amountCents / 100)}</li>`
    ))
    .join("");

  return {
    subject: `Novo pedido - ${order.name} - coleta ${date}`,
    replyTo: order.email,
    text: [
      `Novo pedido de ${order.name}`,
      `E-mail: ${order.email}`,
      `Telefone / WhatsApp: ${order.phone}`,
      `Data de coleta: ${date}`,
      "",
      "Itens:",
      textItems,
      "",
      `Total estimado: ${money.format(order.totalCents / 100)}`,
      "O valor final deve ser confirmado pela Salette.",
    ].join("\n"),
    html: [
      `<h2>Novo pedido de ${escapeHtml(order.name)}</h2>`,
      `<p><strong>E-mail:</strong> ${escapeHtml(order.email)}<br>`,
      `<strong>Telefone / WhatsApp:</strong> ${escapeHtml(order.phone)}<br>`,
      `<strong>Data de coleta:</strong> ${escapeHtml(date)}</p>`,
      `<ul>${htmlItems}</ul>`,
      `<p><strong>Total estimado:</strong> ${money.format(order.totalCents / 100)}</p>`,
      "<p>O valor final deve ser confirmado pela Salette.</p>",
    ].join(""),
  };
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

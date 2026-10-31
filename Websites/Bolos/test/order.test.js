import test from "node:test";
import assert from "node:assert/strict";
import { formatOrderEmail, OrderValidationError, validateOrder } from "../main/order.js";

test("validates an order and calculates its total in integer cents", () => {
  const order = validateOrder({
    name: "Ana Silva",
    email: "ana@example.com",
    phone: "(11) 91234-5678",
    pickupDate: "",
    items: [
      { description: "Bolo de brigadeiro", amount: 80 },
      { description: "Cento de doces", amount: 30.5 },
    ],
  });

  assert.equal(order.totalCents, 11050);
});

test("rejects invalid customer and item data", () => {
  assert.throws(
    () => validateOrder({
      name: "Ana",
      email: "ana@example.com",
      phone: "123",
      pickupDate: "",
      items: [{ description: "Bolo", amount: 10 }],
    }),
    OrderValidationError,
  );
  assert.throws(
    () => validateOrder({
      name: "Ana",
      email: "ana@example.com",
      phone: "11912345678",
      pickupDate: "",
      items: [{ description: "<script>", amount: Number.NaN }],
    }),
    OrderValidationError,
  );
  assert.throws(
    () => validateOrder({
      name: "Ana",
      email: "nao-e-um-email",
      phone: "11912345678",
      pickupDate: "",
      items: [{ description: "Bolo", amount: 10 }],
    }),
    OrderValidationError,
  );
});

test("escapes customer content in the HTML email", () => {
  const email = formatOrderEmail({
    name: "<Ana>",
    email: "ana@example.com",
    phone: "11912345678",
    pickupDate: "",
    items: [{ description: "<img src=x onerror=alert(1)>", amountCents: 1000 }],
    totalCents: 1000,
  });

  assert.match(email.html, /&lt;Ana&gt;/);
  assert.match(email.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(email.html, /<strong>E-mail:<\/strong> ana@example\.com/);
  assert.doesNotMatch(email.html, /<img src=x/);
  assert.equal(email.replyTo, "ana@example.com");
});

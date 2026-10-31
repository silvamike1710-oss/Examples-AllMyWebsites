# Bolos da Salette

## Run the website

Requires Node.js 20 or newer. Install dependencies with `npm install`, copy `.env.example` to `.env`, fill in the email settings, and start the server with `npm start`.

The home page is at `/`. Customers can start an order at `/pedido`.

The server sends bakery orders to `ORDER_EMAIL` using SMTP. For Gmail, use the account address in `SMTP_USER` and a Google App Password in `SMTP_PASS`; do not use the account's regular password. Keep `.env` private and never commit credentials.

The order form collects the customer's name, email, and phone number. The server validates the customer details and order, then sends the email to `ORDER_EMAIL` with the customer's address set as the reply-to. A delivery failure is shown to the customer instead of being reported as a successful order. The WhatsApp button opens a prefilled order message to the bakery's WhatsApp number; the customer confirms sending in WhatsApp.

Run the checks with `npm test`.

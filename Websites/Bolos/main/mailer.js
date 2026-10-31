import nodemailer from "nodemailer";

function requiredSetting(env, name) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required email setting: ${name}`);
  }
  return value;
}

export function createMailer(env = process.env) {
  const user = requiredSetting(env, "SMTP_USER");
  const password = requiredSetting(env, "SMTP_PASS");
  const recipient = requiredSetting(env, "ORDER_EMAIL");
  const host = env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(env.SMTP_PORT || 465);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid port number.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: env.SMTP_SECURE ? env.SMTP_SECURE.toLowerCase() === "true" : port === 465,
    auth: { user, pass: password },
  });

  return {
    async sendOrder(message) {
      await transporter.sendMail({
        from: user,
        to: recipient,
        replyTo: message.replyTo,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    },
  };
}

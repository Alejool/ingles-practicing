/**
 * Envío del enlace mágico.
 *
 * MAIL_PROVIDER: resend | postmark | smtp | log
 *   resend, postmark → API HTTP. Es lo que conviene en funciones serverless.
 *   smtp             → servidor SMTP propio o Mailpit. Es lo que usa docker compose.
 *   log              → no envía nada y escribe el enlace en los logs. Solo desarrollo.
 */

/**
 * ¿El correo va a un buzón de desarrollo (Mailpit/MailHog) o a un servidor real?
 * El front lo usa para decir dónde buscar el enlace en vez de mandar a mirar el spam.
 */
export function deliveryMode(): { mode: "mailbox" | "email"; mailboxUrl: string | null } {
  const provider = (process.env.MAIL_PROVIDER || "log").toLowerCase();
  const host = (process.env.SMTP_HOST || "").toLowerCase();
  const local = ["mailpit", "mailhog", "localhost", "127.0.0.1", "maildev"].some(h => host.includes(h));
  if (provider === "log" || (provider === "smtp" && local)) {
    return { mode: "mailbox", mailboxUrl: process.env.MAILBOX_URL || "http://localhost:8025" };
  }
  return { mode: "email", mailboxUrl: null };
}

export interface MailInput {
  to: string;
  link: string;
  minutes: number;
}

const FROM = process.env.MAIL_FROM || "Ruta B1→B2 <onboarding@resend.dev>";

function body({ link, minutes }: MailInput): { html: string; text: string; subject: string } {
  const subject = "Tu acceso a Ruta B1 → B2";
  const text =
    `Entra con este enlace:\n\n${link}\n\n` +
    `Caduca en ${minutes} minutos y solo funciona una vez.\n` +
    `Si no lo pediste tú, ignora este correo.`;
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#EDF0EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#131C1B">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" style="max-width:520px;background:#F8FAF8;border:1px solid #CCD5D2;border-radius:10px" cellpadding="0" cellspacing="0">
      <tr><td style="padding:28px 28px 8px">
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6A7977">Ruta B1 → B2</p>
        <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:24px;font-weight:500">Tu acceso</h1>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.55">Pulsa el botón para entrar. El enlace caduca en ${minutes} minutos y solo funciona una vez.</p>
        <p style="margin:0 0 22px"><a href="${link}" style="display:inline-block;background:#0B5D5B;color:#F4FAF9;text-decoration:none;padding:11px 20px;border-radius:6px;font-weight:600;font-size:15px">Entrar en la app</a></p>
        <p style="margin:0 0 6px;font-size:12.5px;color:#6A7977">Si el botón no funciona, copia esta dirección:</p>
        <p style="margin:0 0 22px;font-size:12.5px;word-break:break-all;color:#0B5D5B">${link}</p>
        <p style="margin:0;font-size:12.5px;color:#6A7977;border-top:1px solid #CCD5D2;padding-top:14px">Si no pediste este acceso, ignora el correo: sin pulsar el enlace no ocurre nada.</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
  return { subject, html, text };
}

export async function sendLoginLink(input: MailInput): Promise<void> {
  const provider = (process.env.MAIL_PROVIDER || "log").toLowerCase();
  const { subject, html, text } = body(input);

  if (provider === "log") {
    console.log(`[mail:log] Para ${input.to} · enlace: ${input.link}`);
    return;
  }

  if (provider === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: FROM, to: [input.to], subject, html, text }),
    });
    if (!res.ok) throw new Error("resend: " + res.status + " " + (await res.text()).slice(0, 300));
    return;
  }

  if (provider === "postmark") {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Postmark-Server-Token": process.env.POSTMARK_TOKEN || "",
      },
      body: JSON.stringify({ From: FROM, To: input.to, Subject: subject, HtmlBody: html, TextBody: text, MessageStream: "outbound" }),
    });
    if (!res.ok) throw new Error("postmark: " + res.status + " " + (await res.text()).slice(0, 300));
    return;
  }

  if (provider === "smtp") {
    // Import perezoso: quien use resend o postmark no necesita nodemailer.
    const nodemailer = await import("nodemailer");
    const user = process.env.SMTP_USER;
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "localhost",
      port: Number(process.env.SMTP_PORT || 1025),
      secure: process.env.SMTP_SECURE === "true",
      auth: user ? { user, pass: process.env.SMTP_PASS || "" } : undefined,
      tls: { rejectUnauthorized: process.env.SMTP_INSECURE !== "true" },
    });
    await transport.sendMail({ from: FROM, to: input.to, subject, html, text });
    return;
  }

  throw new Error("MAIL_PROVIDER desconocido: " + provider);
}

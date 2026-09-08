// Envoi d'email via le compte Gmail oracleprotocoleetservices@gmail.com,
// en SMTP avec un mot de passe d'application (pas le mot de passe du compte).
// Secrets requis (supabase secrets set) : GMAIL_USER, GMAIL_APP_PASSWORD.
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

export async function sendEmail({ subject, html, text }: { subject: string; html: string; text: string }) {
  const username = Deno.env.get('GMAIL_USER');
  const password = Deno.env.get('GMAIL_APP_PASSWORD');

  if (!username || !password) {
    throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD non configures (supabase secrets set).');
  }

  const client = new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: { username, password },
    },
  });

  await client.send({
    from: `ORACLE Protocoles et Services <${username}>`,
    to: 'oracleprotocoleetservices@gmail.com',
    subject,
    content: text,
    html,
  });

  await client.close();
}

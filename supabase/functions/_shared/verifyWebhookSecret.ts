// Verifie que la requete provient bien du trigger Postgres (et non d'un appel
// externe direct sur l'URL publique de la fonction).
export function verifyWebhookSecret(req: Request): boolean {
  const provided = req.headers.get('x-webhook-secret');
  const expected = Deno.env.get('WEBHOOK_SECRET');
  return Boolean(expected) && provided === expected;
}

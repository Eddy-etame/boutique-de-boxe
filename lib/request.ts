// Adresse du client derrière le proxy de l’hébergeur.
// Vercel renseigne x-real-ip puis x-forwarded-for à partir de la connexion réelle ;
// cf-connecting-ip n’est jamais posé par Vercel (il ne l’est que par les scripts de
// test locaux), donc il passe en dernier recours pour ne pas être usurpable en prod.
export function clientIp(request: Request): string {
  const real = request.headers.get('x-real-ip')?.trim();
  if (real) return real;
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;
  const synthetic = request.headers.get('cf-connecting-ip')?.trim();
  return synthetic || 'local';
}

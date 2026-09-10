// Adresse du client derrière le proxy de l’hébergeur.
// Vercel renseigne x-real-ip à partir de la connexion réelle ; les scripts de
// test locaux utilisent cf-connecting-ip ; x-forwarded-for reste le dernier recours.
export function clientIp(request: Request): string {
  const real = request.headers.get('x-real-ip')?.trim();
  if (real) return real;
  const synthetic = request.headers.get('cf-connecting-ip')?.trim();
  if (synthetic) return synthetic;
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || 'local';
}

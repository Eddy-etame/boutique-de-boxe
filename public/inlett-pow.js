self.onmessage = async ({ data }) => {
  const { challenge, difficulty } = data;
  const prefix = '0'.repeat(difficulty);
  const encoder = new TextEncoder();
  const deadline = performance.now() + 30000;
  for (let start = 0; start < 2000000 && performance.now() < deadline; start += 128) {
    const solutions = await Promise.all(Array.from({ length: 128 }, async (_, offset) => {
      const nonce = start + offset;
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(`${challenge}:${nonce}`)));
      const hex = Array.from(digest, b => b.toString(16).padStart(2, '0')).join('');
      return hex.startsWith(prefix) ? nonce : null;
    }));
    const nonce = solutions.find(n => n !== null);
    if (nonce !== undefined) { self.postMessage({ nonce: String(nonce) }); return; }
  }
  self.postMessage({ error: 'challenge-timeout' });
};

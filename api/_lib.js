// Utilidades compartidas: CORS, límites de abuso y llamada a ElevenLabs
const ORIGINS = ['https://handle-asis.neolabs.art', 'http://handle-asis.neolabs.art'];
const hits = new Map(); // memoria por instancia (suficiente para un demo)
export function cors(req, res) {
  const o = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', ORIGINS.includes(o) ? o : ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true }
  return false;
}
export function limited(key, max, windowMs) {
  const now = Date.now(), arr = (hits.get(key) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) return true;
  arr.push(now); hits.set(key, arr); return false;
}
export async function el(path, opts = {}) {
  const r = await fetch('https://api.elevenlabs.io' + path, {
    ...opts, headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'content-type': 'application/json', ...(opts.headers || {}) }
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j };
}

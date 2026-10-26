// GET /api/estado?id=conv_xxx → estado y resultado de la llamada (sin transcripción completa)
import { cors, el } from './_lib.js';
export default async function handler(req, res) {
  if (cors(req, res)) return;
  const id = String(req.query.id || '');
  if (!/^conv_[a-z0-9]+$/i.test(id)) return res.status(400).json({ error: 'id inválido' });
  const r = await el('/v1/convai/conversations/' + id);
  if (!r.ok) return res.status(502).json({ status: 'unknown' });
  if (r.j.agent_id && r.j.agent_id !== (process.env.EL_AGENT_ID || 'agent_7801m5vamq9aeqk9wtrxy9wy8hvk')) return res.status(403).json({ status: 'unknown' });
  const dc = r.j.analysis?.data_collection_results || {};
  res.setHeader('cache-control', 'no-store');
  res.status(200).json({
    status: r.j.status, resultado: dc.resultado?.value || null, fecha_promesa: dc.fecha_promesa?.value || null,
    whatsapp_enviado: dc.whatsapp_enviado?.value || false, resumen: r.j.analysis?.transcript_summary || null,
    duracion: r.j.metadata?.call_duration_secs || null
  });
}

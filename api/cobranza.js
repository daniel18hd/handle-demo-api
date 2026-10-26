// POST /api/cobranza  {nombre, cc:'52'|'1', tel:'10 dígitos', canal:'llamada'|'whatsapp'}
import { cors, limited, el } from './_lib.js';
const AGENT = process.env.EL_AGENT_ID || 'agent_7801m5vamq9aeqk9wtrxy9wy8hvk';
const PHONE = process.env.EL_PHONE_ID || 'phnum_5701m4vx6vvsfz1bn8bz4nzn4320'; // +1 832 346 6398
const RECIBO = { broker: 'Grupo Ejemplo Seguros', aseguradora: 'GNP', poliza: 'GNP-AUT-483920', ramo: 'de auto', monto: '$4,350 pesos', vencimiento: '20 de octubre', dias_atraso: '5' };

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const { nombre = '', cc = '', tel = '', canal = 'llamada', website = '' } = req.body || {};
  if (website) return res.status(200).json({ ok: true });
  const digits = String(tel).replace(/\D/g, '');
  if (!['52', '1'].includes(cc) || digits.length !== 10) return res.status(400).json({ error: 'Revisa tu número (10 dígitos).' });
  const name = String(nombre).replace(/[^\p{L} .'-]/gu, '').trim().slice(0, 40) || 'amigo';
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const to = `+${cc}${digits}`;
  if (limited('ip:' + ip, 4, 3600e3) || limited('tel:' + to, 2, 86400e3) || limited('all', 60, 86400e3))
    return res.status(429).json({ error: 'Ya probaste el demo varias veces. Intenta más tarde.' });
  if (!process.env.ELEVENLABS_API_KEY) return res.status(503).json({ error: 'El agente aún no está conectado a este demo.' });
  const vars = { ...RECIBO, cliente: name };

  if (canal === 'whatsapp') {
    const WA = process.env.EL_WA_PHONE_ID, TPL = process.env.EL_WA_TEMPLATE;
    if (!WA || !TPL) return res.status(501).json({ error: 'WhatsApp se está activando (plantilla en aprobación de Meta). Prueba la llamada.' });
    const r = await el('/v1/convai/whatsapp/outbound-message', { method: 'POST', body: JSON.stringify({
      whatsapp_phone_number_id: WA, whatsapp_user_id: `${cc}${digits}`,
      template_name: TPL, template_language_code: process.env.EL_WA_LANG || 'es_MX',
      template_params: [{ type: 'body', parameters: [{ type: 'text', text: name }, { type: 'text', text: vars.aseguradora }, { type: 'text', text: vars.monto }] }],
      agent_id: AGENT, conversation_initiation_client_data: { dynamic_variables: vars }
    }) });
    if (!r.ok) return res.status(502).json({ error: 'No se pudo enviar el WhatsApp.', detail: r.j?.detail?.message || r.status });
    return res.status(200).json({ ok: true, canal: 'whatsapp' });
  }

  const r = await el('/v1/convai/twilio/outbound-call', { method: 'POST', body: JSON.stringify({
    agent_id: AGENT, agent_phone_number_id: PHONE, to_number: to,
    conversation_initiation_client_data: { dynamic_variables: vars }
  }) });
  if (!r.ok || r.j?.success === false) return res.status(502).json({ error: 'No se pudo iniciar la llamada.', detail: r.j?.message || r.j?.detail?.message || r.status });
  return res.status(200).json({ ok: true, canal: 'llamada', conversation_id: r.j.conversation_id || null });
}

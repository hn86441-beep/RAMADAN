// Vercel Serverless Function: يحفظ ويقرأ بيانات الموقع من قاعدة Upstash Redis
const crypto = require('crypto');
const DB_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const DB_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'ramadan-data';
const hash = s => crypto.createHash('sha256').update(String(s || '')).digest();
const redis = async cmd => {
  const r = await fetch(DB_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + DB_TOKEN }, body: JSON.stringify(cmd) });
  return (await r.json()).result;
};
const isAdmin = req => !!process.env.ADMIN_PASSWORD &&
  crypto.timingSafeEqual(hash(req.headers['x-admin-password']), hash(process.env.ADMIN_PASSWORD));

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      if (req.query && req.query.check !== undefined) {
        if (isAdmin(req)) return res.status(200).json({ ok: true });
        await new Promise(r => setTimeout(r, 800));
        return res.status(401).json({ ok: false });
      }
      const d = await redis(['GET', KEY]);
      return res.status(200).json(d ? JSON.parse(d) : null);
    }
    if (req.method === 'POST') {
      if (!isAdmin(req)) { await new Promise(r => setTimeout(r, 800)); return res.status(401).json({ error: 'unauthorized' }); }
      await redis(['SET', KEY, JSON.stringify(req.body)]);
      return res.status(200).json({ ok: true });
    }
    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: 'server error' });
  }
};

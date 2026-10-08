const crypto = require('crypto');
const find = re => {
  const k = Object.keys(process.env).find(k => re.test(k) && !/READ_ONLY/.test(k));
  return k ? process.env[k] : undefined;
};
const DB_URL = find(/REST(_API)?_URL$/);
const DB_TOKEN = find(/REST(_API)?_TOKEN$/);
const KEY = 'ramadan-data';
const hash = s => crypto.createHash('sha256').update(String(s || '')).digest();
const redis = async cmd => {
  if (!DB_URL || !DB_TOKEN) throw new Error('متغيرات قاعدة البيانات غير موجودة في Vercel');
  const r = await fetch(DB_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + DB_TOKEN }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
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
    res.status(500).json({ error: e.message });
  }
};

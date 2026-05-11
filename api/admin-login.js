// Simple password check for admin login.
// Stores ADMIN_PASSWORD as a Vercel env var — never in code.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_PASSWORD) {
    console.error('Missing ADMIN_PASSWORD env var');
    return res.status(500).json({ error: 'Server not configured' });
  }

  // Short delay to slow down brute-force attempts
  await new Promise(r => setTimeout(r, 400));

  if (typeof password === 'string' && password === ADMIN_PASSWORD) {
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ error: 'Invalid password' });
}

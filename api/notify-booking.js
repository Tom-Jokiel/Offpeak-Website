// Vercel Serverless Function — sends two emails via Resend when a booking is made:
// 1. Admin notification (to you)
// 2. Customer confirmation (to the customer)
//
// Environment variables (set these in Vercel → Settings → Environment Variables):
//   RESEND_API_KEY  — your Resend API key (re_...)
//   ADMIN_EMAIL     — where to send booking notifications

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const ADMIN_EMAIL    = process.env.ADMIN_EMAIL;

  if (!RESEND_API_KEY || !ADMIN_EMAIL) {
    console.error('Missing env vars: RESEND_API_KEY or ADMIN_EMAIL');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const { booking } = req.body || {};
  if (!booking || !booking.customerEmail || !booking.date || !booking.startTime) {
    return res.status(400).json({ error: 'Missing booking data' });
  }

  // ── Helpers ──────────────────────────────────────────────────
  const fmtIDR = (n) => 'Rp ' + Number(n).toLocaleString('de-DE');
  const ADDON_NAMES = {
    photos:    '📷 Photos',
    video:     '🎥 Video',
    bundle:    '📷🎥 Photos + Video',
    transport: '🛺 Transport (Canggu pickup)',
  };
  const addonsList = (booking.addons || []).map(a => ADDON_NAMES[a] || a).join(', ') || '—';

  // ── Email 1: Admin notification ──────────────────────────────
  const adminHtml = `
    <!DOCTYPE html>
    <html><body style="font-family:-apple-system,sans-serif;background:#F3F0EA;margin:0;padding:24px;color:#2C2927">
      <div style="max-width:560px;margin:0 auto;background:#E8E4DC;border-radius:14px;overflow:hidden;border:1px solid rgba(44,41,39,0.08)">
        <div style="background:#2C2927;color:#E8E4DC;padding:24px 28px">
          <p style="margin:0;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#C8714A;font-weight:700">New Booking</p>
          <h1 style="margin:8px 0 0;font-size:24px;font-weight:900;letter-spacing:0.02em">🏄 ${escapeHtml(booking.customerName)}</h1>
        </div>
        <div style="padding:24px 28px">
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:8px 0;color:#4A4642;width:140px">📅 Date</td><td style="padding:8px 0;font-weight:600">${escapeHtml(booking.date)}</td></tr>
            <tr><td style="padding:8px 0;color:#4A4642">🕐 Time</td><td style="padding:8px 0;font-weight:600">${escapeHtml(booking.startTime)}</td></tr>
            <tr><td style="padding:8px 0;color:#4A4642">🏄 Package</td><td style="padding:8px 0;font-weight:600">${escapeHtml(booking.packageName || booking.package)}</td></tr>
            <tr><td style="padding:8px 0;color:#4A4642">👥 People</td><td style="padding:8px 0;font-weight:600">${booking.people}</td></tr>
            <tr><td style="padding:8px 0;color:#4A4642">➕ Add-ons</td><td style="padding:8px 0;font-weight:600">${escapeHtml(addonsList)}</td></tr>
            <tr><td colspan="2" style="padding-top:16px;border-top:1px solid rgba(44,41,39,0.12)"></td></tr>
            <tr><td style="padding:8px 0;color:#4A4642">💰 Total</td><td style="padding:8px 0;font-weight:900;color:#C8714A;font-size:18px">${fmtIDR(booking.totalAmount)}</td></tr>
          </table>

          <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:#4A4642;margin:24px 0 8px">Customer</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:6px 0;width:140px;color:#4A4642">Name</td><td style="padding:6px 0">${escapeHtml(booking.customerName)}</td></tr>
            <tr><td style="padding:6px 0;color:#4A4642">Email</td><td style="padding:6px 0"><a href="mailto:${escapeHtml(booking.customerEmail)}" style="color:#C8714A;text-decoration:none">${escapeHtml(booking.customerEmail)}</a></td></tr>
            <tr><td style="padding:6px 0;color:#4A4642">Phone</td><td style="padding:6px 0"><a href="https://wa.me/${escapeHtml((booking.customerPhone||'').replace(/[^\d]/g,''))}" style="color:#C8714A;text-decoration:none">${escapeHtml(booking.customerPhone || '—')}</a></td></tr>
          </table>

          ${booking.message ? `
            <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:#4A4642;margin:24px 0 8px">Message</h3>
            <p style="background:#F3F0EA;padding:12px 14px;border-radius:8px;font-size:14px;line-height:1.6;margin:0">${escapeHtml(booking.message)}</p>
          ` : ''}

          <p style="margin:24px 0 0;font-size:12px;color:#4A4642">💵 Payment: Cash in IDR, on arrival</p>
        </div>
      </div>
    </body></html>`;

  // ── Email 2: Customer confirmation ───────────────────────────
  const customerHtml = `
    <!DOCTYPE html>
    <html><body style="font-family:-apple-system,sans-serif;background:#F3F0EA;margin:0;padding:24px;color:#2C2927">
      <div style="max-width:560px;margin:0 auto;background:#E8E4DC;border-radius:14px;overflow:hidden;border:1px solid rgba(44,41,39,0.08)">
        <div style="background:#2C2927;color:#E8E4DC;padding:32px 28px;text-align:center">
          <p style="margin:0;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#C8714A;font-weight:700">Off Peak Surf Bali</p>
          <h1 style="margin:12px 0 0;font-size:30px;font-weight:900;letter-spacing:0.02em;line-height:1.1">You're all set,<br>${escapeHtml(firstName(booking.customerName))}! 🤙</h1>
        </div>
        <div style="padding:28px 28px 8px">
          <p style="font-size:15px;line-height:1.7;margin:0 0 20px;color:#4A4642">
            Your surf session is booked. Stoked to have you on the water! Here are the details:
          </p>

          <div style="background:#F3F0EA;border-radius:10px;padding:18px 20px;border-left:4px solid #C8714A">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:6px 0;color:#4A4642;width:120px">📅 Date</td><td style="padding:6px 0;font-weight:700">${escapeHtml(booking.date)}</td></tr>
              <tr><td style="padding:6px 0;color:#4A4642">🕐 Time</td><td style="padding:6px 0;font-weight:700">${escapeHtml(booking.startTime)}</td></tr>
              <tr><td style="padding:6px 0;color:#4A4642">🏄 Package</td><td style="padding:6px 0;font-weight:700">${escapeHtml(booking.packageName || booking.package)}</td></tr>
              <tr><td style="padding:6px 0;color:#4A4642">👥 People</td><td style="padding:6px 0;font-weight:700">${booking.people}</td></tr>
              ${booking.addons && booking.addons.length ? `<tr><td style="padding:6px 0;color:#4A4642">➕ Add-ons</td><td style="padding:6px 0;font-weight:700">${escapeHtml(addonsList)}</td></tr>` : ''}
              <tr><td colspan="2" style="padding-top:12px;border-top:1px solid rgba(44,41,39,0.12)"></td></tr>
              <tr><td style="padding:8px 0;color:#4A4642">💰 Total</td><td style="padding:8px 0;font-weight:900;color:#C8714A;font-size:18px">${fmtIDR(booking.totalAmount)}</td></tr>
            </table>
          </div>

          <div style="background:rgba(91,173,127,0.1);border:1px solid rgba(91,173,127,0.25);border-radius:10px;padding:14px 18px;margin:20px 0;font-size:14px;line-height:1.6">
            <strong style="color:#5BAD7F">💵 Payment:</strong> Cash in IDR, on arrival. No advance payment required.
          </div>

          <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:#4A4642;margin:24px 0 8px">What to bring</h3>
          <p style="font-size:14px;line-height:1.7;margin:0;color:#4A4642">Yourself, swimwear, sunscreen, and a towel. We provide the surfboard, rash guard, and everything else.</p>

          <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:#4A4642;margin:24px 0 8px">Meeting point</h3>
          <p style="font-size:14px;line-height:1.7;margin:0;color:#4A4642">We'll send you the exact meeting point in Canggu via WhatsApp the day before your session.</p>

          <div style="margin:28px 0 12px;text-align:center">
            <a href="https://wa.me/628873006018" style="display:inline-block;background:#C8714A;color:#fff;text-decoration:none;padding:12px 24px;border-radius:100px;font-weight:700;font-size:13px;letter-spacing:0.1em;text-transform:uppercase">Message us on WhatsApp</a>
          </div>

          <p style="font-size:13px;line-height:1.65;color:#4A4642;margin:24px 0 0;text-align:center;font-style:italic">
            Need to reschedule? Just drop us a message. See you in the water!
          </p>
        </div>
        <div style="background:#2C2927;color:rgba(232,228,220,0.5);padding:18px 28px;text-align:center;font-size:11px;letter-spacing:0.1em;text-transform:uppercase">
          Off Peak Surf Bali · Canggu, Indonesia
        </div>
      </div>
    </body></html>`;

  // ── Send both emails ─────────────────────────────────────────
  try {
    const results = await Promise.allSettled([
      sendEmail(RESEND_API_KEY, {
        from: 'Off Peak Bookings <onboarding@resend.dev>',
        to: ADMIN_EMAIL,
        subject: `🏄 New Booking: ${booking.customerName} — ${booking.date} ${booking.startTime}`,
        html: adminHtml,
        replyTo: booking.customerEmail,
      }),
      sendEmail(RESEND_API_KEY, {
        from: 'Off Peak Surf Bali <onboarding@resend.dev>',
        to: booking.customerEmail,
        subject: `Your booking is confirmed — Off Peak Surf Bali 🤙`,
        html: customerHtml,
        replyTo: ADMIN_EMAIL,
      }),
    ]);

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      console.error('Some emails failed:', failed);
    }

    return res.status(200).json({
      success: true,
      adminSent: results[0].status === 'fulfilled',
      customerSent: results[1].status === 'fulfilled',
    });
  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({ error: 'Failed to send emails' });
  }
}

// ── Utilities ──────────────────────────────────────────────────
async function sendEmail(apiKey, { from, to, subject, html, replyTo }) {
  const body = { from, to, subject, html };
  if (replyTo) body.reply_to = replyTo;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const errText = await r.text();
    throw new Error(`Resend ${r.status}: ${errText}`);
  }
  return r.json();
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function firstName(name) {
  if (!name) return 'there';
  return name.trim().split(/\s+/)[0];
}

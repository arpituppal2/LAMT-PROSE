// Central config — all org-specific values come from Railway environment variables.
// Set these in your Railway service's Variables tab.

export const ALLOWED_EMAIL_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || null; // e.g. "ucla.edu"

export const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(',').map((e) => e.trim()).filter(Boolean)
  : [];

export const GUEST_EMAIL = process.env.GUEST_EMAIL || null; // e.g. "guest@yourdomain.edu"

export const TOPICS = process.env.TOPICS
  ? process.env.TOPICS.split(',').map((t) => t.trim()).filter(Boolean)
  : ['Algebra', 'Combinatorics', 'Number Theory', 'Geometry'];

export const APP_NAME = process.env.APP_NAME || 'PROSE';

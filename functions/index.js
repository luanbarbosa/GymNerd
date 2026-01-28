const { onRequest } = require('firebase-functions/v2/https');
const fetch = require('node-fetch');

// Use Functions 2nd-gen `onRequest`. Provide secrets via environment variables
// (OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET) or bind Firebase Secrets when deploying.
// Here we set the function to run in `us-central1` and declare the secret names
// so Secrets Manager can be used during deployment.
// Export as `exchangeTokenV2` so deployment creates a new Gen-2 function instead
// of attempting to upgrade an existing Gen-1 function with the same name.
exports.exchangeTokenV2 = onRequest({ region: 'us-central1', secrets: ['OAUTH_CLIENT_SECRET', 'OAUTH_CLIENT_ID'] }, async (req, res) => {
  // CORS: allow specific origins (include localhost for local development)
  const allowedOrigins = new Set([
    'https://luanbarbosa.github.io',
    'http://localhost:8000',
    'http://127.0.0.1:8000'
  ]);
  const origin = req.get('origin');
  if (origin && allowedOrigins.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const { code, code_verifier, redirect_uri, refresh_token } = req.body || {};

    // Log the incoming request (avoid logging secrets)
    console.log('exchangeTokenV2 - incoming', {
      method: req.method,
      hasCode: !!code,
      hasRefreshToken: !!refresh_token,
      redirect_uri: redirect_uri || null
    });

    let bodyParams = {};
    if (refresh_token) {
      // Refresh token flow: server-side uses client secret
      bodyParams = {
        refresh_token,
        client_id: process.env.OAUTH_CLIENT_ID || process.env.CLIENT_ID,
        client_secret: process.env.OAUTH_CLIENT_SECRET || process.env.CLIENT_SECRET,
        grant_type: 'refresh_token'
      };
    } else {
      if (!code) return res.status(400).json({ error: 'missing_code' });
      bodyParams = {
        code,
        client_id: process.env.OAUTH_CLIENT_ID || process.env.CLIENT_ID,
        client_secret: process.env.OAUTH_CLIENT_SECRET || process.env.CLIENT_SECRET,
        code_verifier,
        redirect_uri,
        grant_type: 'authorization_code'
      };
    }

    const body = new URLSearchParams(bodyParams);

    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    const data = await r.json().catch(e => ({ error: 'invalid_json_response', details: String(e) }));
    // Log Google's response for debugging (do not log client_secret)
    try {
      console.log('exchangeTokenV2 - google_token_response', { status: r.status, data });
    } catch (e) { console.warn('logging failed', e); }

    return res.status(r.ok ? 200 : 400).json(data);
  } catch (err) {
    console.error('exchangeToken error', err);
    return res.status(500).json({ error: 'exchange_failed', details: String(err) });
  }
});

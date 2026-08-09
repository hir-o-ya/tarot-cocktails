// ============================================================
// MapKit JS 用の短命 JWT を発行する Cloudflare Worker
// ------------------------------------------------------------
// 秘密鍵(.p8)は Cloudflare の Secret に保存し、クライアント(アプリ)には一切渡さない。
// アプリはこの Worker の URL を叩くだけで、毎回新鮮なトークンを受け取る。
//
// 必要な環境変数:
//   MAPKIT_PRIVATE_KEY … .p8 の中身（PEM全体でも、base64本体だけでもOK） ← secret
//   MAPKIT_KEY_ID      … Key ID（10文字）                                 ← var
//   MAPKIT_TEAM_ID     … Team ID（10文字）                                ← var
//   TOKEN_TTL_SECONDS  … トークン有効秒数（任意、既定 1800 = 30分）        ← var(任意)
// ============================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

// ArrayBuffer / Uint8Array → base64url
function b64url(bytes) {
  const arr = new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// PEM(.p8) or base64本体 → DER(ArrayBuffer)
function pemToDer(pem) {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const bin = atob(body);
  const der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
  return der.buffer;
}

async function generateToken(env) {
  const ttl = Number(env.TOKEN_TTL_SECONDS) || 1800;
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'ES256', typ: 'JWT', kid: env.MAPKIT_KEY_ID };
  const payload = { iss: env.MAPKIT_TEAM_ID, iat: now, exp: now + ttl };

  const enc = (obj) => b64url(new TextEncoder().encode(JSON.stringify(obj)));
  const signingInput = enc(header) + '.' + enc(payload);

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(env.MAPKIT_PRIVATE_KEY),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput)
  );
  // Web Crypto の ECDSA 署名は既に JOSE(r‖s) 形式なので変換不要
  return signingInput + '.' + b64url(sig);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }
    // トークン取得は GET のみ許可
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405, headers: { ...CORS, 'Allow': 'GET, OPTIONS' } });
    }
    if (!env.MAPKIT_PRIVATE_KEY || !env.MAPKIT_KEY_ID || !env.MAPKIT_TEAM_ID) {
      return new Response('Server not configured', { status: 500, headers: CORS });
    }
    try {
      const token = await generateToken(env);
      return new Response(token, {
        headers: { ...CORS, 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
      });
    } catch (e) {
      // 内部エラーの詳細はクライアントに返さない（情報漏えい防止）
      return new Response('Token generation failed', { status: 500, headers: CORS });
    }
  },
};

#!/usr/bin/env node
/*
 * MapKit JS 用の JWT トークンを生成するローカルスクリプト。
 * 秘密鍵(.p8)はこの端末内だけで使い、アプリには「生成されたトークン文字列」だけを貼る。
 *
 * 事前に Apple Developer で作成しておくもの：
 *   1. Maps ID   … Certificates, Identifiers & Profiles → Identifiers → Maps IDs
 *   2. MapKit JS 用の Key（秘密鍵 .p8 をダウンロード）… Keys で「MapKit JS」を有効化して作成
 *      → 作成時に表示される「Key ID」と、Membership の「Team ID」を控える
 *
 * 使い方：
 *   node app/scripts/gen-mapkit-token.js <AuthKey_XXXX.p8のパス> <KeyID> <TeamID> [有効日数=180]
 *
 * 出力された文字列を app/assets/index.html の MAPKIT_TOKEN に貼る。
 * exp（有効期限）が切れたら再実行して貼り直し、アプリを再ビルド／再申請する。
 */
const fs = require('fs');
const crypto = require('crypto');

const [, , keyPath, keyId, teamId, daysArg] = process.argv;
if (!keyPath || !keyId || !teamId) {
  console.error('使い方: node gen-mapkit-token.js <AuthKey_XXXX.p8> <KeyID> <TeamID> [有効日数=180]');
  process.exit(1);
}

const days = Number(daysArg) || 180;
const privateKey = fs.readFileSync(keyPath, 'utf8');

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const now = Math.floor(Date.now() / 1000);
const header = { alg: 'ES256', typ: 'JWT', kid: keyId };
const payload = {
  iss: teamId,
  iat: now,
  exp: now + days * 24 * 60 * 60,
  // origin を制限したい場合は下行のコメントを外す（WebView からは効かないことが多いので通常は不要）
  // origin: 'https://example.com',
};

const signingInput = b64url(JSON.stringify(header)) + '.' + b64url(JSON.stringify(payload));
// ES256 は JOSE 形式(r||s)の署名が必要。DER ではなく ieee-p1363 を指定する。
const signature = crypto.sign('sha256', Buffer.from(signingInput), {
  key: privateKey,
  dsaEncoding: 'ieee-p1363',
});

const token = signingInput + '.' + b64url(signature);
console.log('\n--- MAPKIT_TOKEN に貼る文字列（有効期限: ' + new Date((now + days * 86400) * 1000).toISOString() + '） ---\n');
console.log(token);
console.log('');

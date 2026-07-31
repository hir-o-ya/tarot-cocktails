# tarot-mapkit-token (Cloudflare Worker)

MapKit JS 用の短命 JWT を発行する Worker。秘密鍵(.p8)は Cloudflare の Secret に保存し、
アプリには一切含めない。アプリはこの Worker の URL を叩いて毎回新鮮なトークンを受け取る。

## 事前に用意するもの（Apple Developer）

1. **Maps ID** … Identifiers → Maps IDs で作成
2. **MapKit JS Key** … Keys で「MapKit JS」を有効化して作成 → `.p8` をダウンロード
   - 作成時に表示される **Key ID**（10文字）
   - Membership の **Team ID**（10文字）

## デプロイ手順

```bash
cd worker
npm install

# Key ID / Team ID を wrangler.toml に記入（または wrangler secret で登録）

# 秘密鍵を Secret として登録（.p8 の中身を貼り付ける）
npx wrangler secret put MAPKIT_PRIVATE_KEY

# デプロイ
npx wrangler deploy
```

デプロイ後に表示される URL（例 `https://tarot-mapkit-token.xxxx.workers.dev/`）を
`app/assets/index.html` の `MAPKIT_TOKEN_URL` に設定する。

## 動作確認

```bash
curl https://tarot-mapkit-token.xxxx.workers.dev/
```

`xxxxx.yyyyy.zzzzz` のような JWT が返れば成功。
[jwt.io](https://jwt.io) に貼って header に `kid`、payload に `iss`/`exp` が入っていれば正しい。

## 環境変数

| 変数 | 種別 | 内容 |
|------|------|------|
| `MAPKIT_PRIVATE_KEY` | secret | `.p8` の中身（PEM全体でも base64本体だけでもOK） |
| `MAPKIT_KEY_ID` | var | Key ID |
| `MAPKIT_TEAM_ID` | var | Team ID |
| `TOKEN_TTL_SECONDS` | var(任意) | トークン有効秒数（既定 1800 = 30分） |

# YouTube 釣り判定 AI

YouTubeのURLを入力するだけで、AIがサムネイルやタイトルから「釣り動画」かどうかを判定するWebアプリです。

## 機能

- YouTubeのURL入力で動画を分析
- 5つの観点でレーダーチャート表示
  - タイトル誇張度
  - サムネ煽り度
  - 内容乖離度
  - 感情的釣り度
  - 緊急性演出度
- 総合スコアをアニメーション付きゲージで表示
- AIによるユーモアを交えた判定コメント

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS, shadcn/ui, Recharts
- **AI**: Vertex AI (Gemini 2.5 Flash)
- **インフラ**: Google Cloud Run

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `GOOGLE_CLOUD_PROJECT` | GCPプロジェクトID |
| `GOOGLE_CLOUD_LOCATION` | Vertex AIリージョン（デフォルト: `asia-northeast1`） |

## ローカル開発

```bash
# 依存関係をインストール
pnpm install

# ローカルでVertex AIを使うための認証
gcloud auth application-default login

# .env.local ファイルを作成
echo "GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID" > .env.local
echo "GOOGLE_CLOUD_LOCATION=asia-northeast1" >> .env.local

# 開発サーバーを起動
pnpm dev
```

http://localhost:3000 でアクセスできます。

## Cloud Runへのデプロイ

### 前提条件

- gcloud CLIがインストール済み
- GCPプロジェクトが作成済み
- 課金が有効化済み

### デプロイ手順

```bash
# GCPにログイン
gcloud auth login

# プロジェクトを設定
gcloud config set project YOUR_PROJECT_ID

# 必要なAPIを有効化
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable aiplatform.googleapis.com

# デプロイ
gcloud run deploy youtube-clickbait-checker \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
```

## ライセンス

MIT

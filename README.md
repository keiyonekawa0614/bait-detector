# YouTube 釣り判定 AI

YouTubeのURLを入力するだけで、AIがサムネイルやタイトルから「釣り動画」かどうかを判定するWebアプリです。

## 機能

### 基本分析
- YouTubeのURL入力で動画を分析
- 5つの観点でレーダーチャート表示
  - タイトル誇張度
  - サムネ煽り度
  - 内容乖離度
  - 感情的釣り度
  - 緊急性演出度
- 総合スコアをアニメーション付きゲージで表示
- AIによるユーモアを交えた判定コメント

### AIエージェント機能
- **ファクトチェック**: タイトルの主張をGoogle検索で自動検証
- **チャンネル評判調査**: 「炎上」「釣り」などのキーワードでチャンネルの過去の評判を調査

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS, shadcn/ui, Recharts
- **AI**: Vertex AI (Gemini 2.5 Flash)
- **API**: YouTube Data API v3, Google Custom Search API
- **インフラ**: Google Cloud Run

## AIエージェント実行フロー

```
POST /api/analyze
  │
  ▼
1. URL検証・videoId抽出
  │
  ▼
2. YouTube API で動画情報取得
  │  - タイトル、説明欄、タグ
  │  - 再生数、いいね数、投稿日
  │  - チャンネル名、登録者数
  │  - 上位コメント10件
  │
  ▼
3. AIエージェント調査開始
  │
  ├─ 3-1. ファクトチェッククエリ生成（Gemini）
  │       タイトルから検証すべき主張を抽出
  │
  ├─ 3-2. チャンネル評判クエリ生成
  │       「チャンネル名 + 炎上/釣り」等のクエリ作成
  │
  ├─ 3-3. 検索実行（並列）
  │   ├─ ファクトチェック検索（Google Custom Search）
  │   └─ チャンネル評判検索（Google Custom Search）
  │
  ├─ 3-4. ファクトチェック分析（Gemini）
  │       検索結果から事実確認レポート生成
  │
  └─ 3-5. チャンネル評判分析（Gemini）
          検索結果から信頼性レポート生成
  │
  ▼
4. エージェント調査結果をコンテキスト化
  │
  ▼
5. 最終分析実行（Gemini）
  │  - 動画情報 + エージェント調査結果を統合
  │  - 5つの観点でスコア算出
  │  - 総合釣り度スコア算出
  │  - 判定コメント生成
  │
  ▼
6. レスポンス返却
   - 動画詳細情報
   - 釣り度スコア（総合 + 5項目）
   - ファクトチェック結果
   - チャンネル評判調査結果
   - AI判定コメント
```

## 取得する動画情報

- サムネイル、タイトル、チャンネル名
- 説明欄、タグ、チャプター
- 再生時間、投稿日時
- 再生数、いいね数、登録者数
- 上位コメント（10件）

## 環境変数

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `GOOGLE_CLOUD_PROJECT` | GCPプロジェクトID | 必須 |
| `GOOGLE_CLOUD_LOCATION` | Vertex AIリージョン（デフォルト: `asia-northeast1`） | 任意 |
| `YOUTUBE_API_KEY` | YouTube Data API v3のAPIキー | 必須 |
| `GOOGLE_CUSTOM_SEARCH_API_KEY` | Google Custom Search APIキー（YouTube APIキーと同じでOK） | 必須 |
| `GOOGLE_CUSTOM_SEARCH_ENGINE_ID` | Programmable Search Engineの検索エンジンID | 必須 |

## ローカル開発

### 1. 依存関係をインストール

```bash
pnpm install
```

### 2. GCP認証

```bash
# ローカルでVertex AIを使うための認証
gcloud auth application-default login
```

### 3. 環境変数を設定

`.env.local` ファイルを作成:

```bash
GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
GOOGLE_CLOUD_LOCATION=asia-northeast1
YOUTUBE_API_KEY=YOUR_YOUTUBE_API_KEY
GOOGLE_CUSTOM_SEARCH_API_KEY=YOUR_API_KEY
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=YOUR_SEARCH_ENGINE_ID
```

### 4. 開発サーバーを起動

```bash
pnpm dev
```

http://localhost:3000 でアクセスできます。

## APIキーの取得方法

### YouTube Data API v3

1. [Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com) でYouTube Data API v3を有効化
2. [認証情報ページ](https://console.cloud.google.com/apis/credentials) で「認証情報を作成」→「APIキー」
3. 作成されたAPIキーをコピー

### Google Custom Search API

1. [Google Cloud Console](https://console.cloud.google.com/apis/library/customsearch.googleapis.com) でCustom Search APIを有効化
2. APIキーはYouTube APIと同じものを使用可能

### Programmable Search Engine（検索エンジンID）

1. [Programmable Search Engine](https://programmablesearchengine.google.com/controlpanel/all) にアクセス
2. 「追加」をクリック
3. 「ウェブ全体を検索」を選択して作成
4. 作成後、「カスタマイズ」→「基本」で検索エンジンIDをコピー

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
gcloud services enable youtube.googleapis.com
gcloud services enable customsearch.googleapis.com

# デプロイ
gcloud run deploy youtube-clickbait-checker \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID,YOUTUBE_API_KEY=YOUR_YOUTUBE_API_KEY,GOOGLE_CUSTOM_SEARCH_API_KEY=YOUR_API_KEY,GOOGLE_CUSTOM_SEARCH_ENGINE_ID=YOUR_SEARCH_ENGINE_ID
```

## ライセンス

MIT

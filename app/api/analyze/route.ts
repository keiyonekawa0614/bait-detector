import { generateObject } from "ai"
import { createVertex } from "@ai-sdk/google-vertex"
import { z } from "zod"

// Cloud Runでは環境変数から自動的に認証情報を取得
const vertex = createVertex({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION || "asia-northeast1",
})

const analysisSchema = z.object({
  isClickbait: z.boolean().describe("動画が釣り（クリックベイト）かどうか"),
  overallScore: z.number().min(0).max(100).describe("総合的な釣り度スコア（0-100）"),
  scores: z.object({
    titleExaggeration: z.number().min(0).max(100).describe("タイトルの誇張度"),
    thumbnailManipulation: z.number().min(0).max(100).describe("サムネイルの煽り度"),
    contentMismatch: z.number().min(0).max(100).describe("タイトル/サムネと実際の内容の乖離度"),
    emotionalBait: z.number().min(0).max(100).describe("感情を煽る釣り要素"),
    urgencyTactics: z.number().min(0).max(100).describe("緊急性や限定感を煽る要素"),
  }),
  analysis: z.string().describe("分析結果の日本語コメント（100-200文字程度）"),
})

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return Response.json({ error: "URLが必要です" }, { status: 400 })
    }

    const videoId = extractVideoId(url)
    if (!videoId) {
      return Response.json({ error: "有効なYouTube URLではありません" }, { status: 400 })
    }

    const videoInfo = await fetchVideoInfo(videoId)

    const { object: analysis } = await generateObject({
      model: vertex("gemini-2.5-flash"),
      schema: analysisSchema,
      prompt: `
あなたはYouTube動画の「釣り度」を判定するAIアシスタントです。
以下の動画情報を分析し、クリックベイト（釣り）かどうかを判定してください。

【動画情報】
タイトル: ${videoInfo?.title || "不明"}
チャンネル名: ${videoInfo?.channelName || "不明"}
サムネイル: ${videoInfo?.thumbnail ? "あり" : "なし"}

【判定基準】
- タイトルの誇張度: 「衝撃」「ヤバい」「〜した結果」などの煽り文句の使用
- サムネイルの煽り度: 赤丸、矢印、驚いた顔、過度な加工など
- 内容との乖離: タイトルやサムネが内容を正確に反映しているか
- 感情的な釣り: 怒り、驚き、恐怖などを煽る要素
- 緊急性の演出: 「今すぐ」「限定」「〜しないと後悔」などの焦らせる要素

日本のYouTubeの傾向を考慮して分析してください。
分析コメントは具体的で、ユーモアを交えた日本語で書いてください。
`,
    })

    return Response.json({
      ...analysis,
      videoInfo,
    })
  } catch (error) {
    console.error("[v0] API Error:", error)
    return Response.json({ error: "分析に失敗しました" }, { status: 500 })
  }
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }

  return null
}

async function fetchVideoInfo(videoId: string) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    const response = await fetch(oembedUrl)

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    return {
      title: data.title || null,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      channelName: data.author_name || null,
      description: null,
    }
  } catch (error) {
    console.error("[v0] Failed to fetch video info:", error)
    return null
  }
}

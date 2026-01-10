import { generateObject } from "ai"
import { createVertex } from "@ai-sdk/google-vertex"
import { z } from "zod"

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
    contentMismatch: z.number().min(0).max(100).describe("タイトル/サムネと説明欄の内容の乖離度"),
    emotionalBait: z.number().min(0).max(100).describe("感情を煽る釣り要素"),
    urgencyTactics: z.number().min(0).max(100).describe("緊急性や限定感を煽る要素"),
  }),
  analysis: z.string().describe("分析結果の日本語コメント（100-200文字程度）"),
})

interface YouTubeVideoData {
  title: string
  description: string
  channelTitle: string
  channelId: string
  tags: string[]
  publishedAt: string
  duration: string
  viewCount: string
  likeCount: string
  commentCount: string
  thumbnail: string
  subscriberCount: string | null
  chapters: { title: string; time: string }[]
  topComments: string[]
}

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

    const videoData = await fetchYouTubeData(videoId)

    console.log(videoData)

    if (!videoData) {
      return Response.json({ error: "動画情報を取得できませんでした" }, { status: 400 })
    }

    const { object: analysis } = await generateObject({
      model: vertex("gemini-2.5-flash"),
      schema: analysisSchema,
      prompt: `
あなたはYouTube動画の「釣り度」を判定するAIアシスタントです。
以下の動画情報を分析し、クリックベイト（釣り）かどうかを判定してください。

【基本情報】
タイトル: ${videoData.title}
チャンネル名: ${videoData.channelTitle}
投稿日: ${videoData.publishedAt}
再生時間: ${videoData.duration}

【統計情報】
再生数: ${videoData.viewCount}
いいね数: ${videoData.likeCount}
コメント数: ${videoData.commentCount}
チャンネル登録者数: ${videoData.subscriberCount || "不明"}

【タグ】
${videoData.tags.length > 0 ? videoData.tags.join(", ") : "なし"}

【説明欄】
${videoData.description.slice(0, 2000)}

【チャプター】
${videoData.chapters.length > 0 ? videoData.chapters.map((c) => `${c.time} - ${c.title}`).join("\n") : "なし"}

【上位コメント】
${videoData.topComments.length > 0 ? videoData.topComments.join("\n---\n") : "コメントなし"}

【判定基準】
- タイトルの誇張度: 「衝撃」「ヤバい」「〜した結果」などの煽り文句の使用
- サムネイルの煽り度: 赤丸、矢印、驚いた顔、過度な加工など（タイトルから推測）
- 内容との乖離: タイトルやサムネが説明欄の内容を正確に反映しているか
- 感情的な釣り: 怒り、驚き、恐怖などを煽る要素
- 緊急性の演出: 「今すぐ」「限定」「〜しないと後悔」などの焦らせる要素

特に上位コメントで「タイトル詐欺」「釣り」「内容と違う」などの指摘がないかチェックしてください。
チャプターがある場合は、タイトルとの整合性を確認してください。
再生数に対していいね数が極端に少ない場合も、釣りの可能性を考慮してください。

日本のYouTubeの傾向を考慮して分析してください。
分析コメントは具体的で、ユーモアを交えた日本語で書いてください。
`,
    })

    return Response.json({
      ...analysis,
      videoInfo: {
        title: videoData.title,
        thumbnail: videoData.thumbnail,
        channelName: videoData.channelTitle,
      },
      videoDetails: {
        viewCount: videoData.viewCount,
        likeCount: videoData.likeCount,
        commentCount: videoData.commentCount,
        subscriberCount: videoData.subscriberCount,
        publishedAt: videoData.publishedAt,
        duration: videoData.duration,
        hasChapters: videoData.chapters.length > 0,
        hasTags: videoData.tags.length > 0,
        hasComments: videoData.topComments.length > 0,
      },
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

async function fetchYouTubeData(videoId: string): Promise<YouTubeVideoData | null> {
  const apiKey = process.env.YOUTUBE_API_KEY

  if (!apiKey) {
    console.error("[v0] YOUTUBE_API_KEY is not set")
    return null
  }

  try {
    // 動画情報を取得
    const videoResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`,
    )

    if (!videoResponse.ok) {
      console.error("[v0] Failed to fetch video data:", videoResponse.status)
      return null
    }

    const videoData = await videoResponse.json()

    if (!videoData.items || videoData.items.length === 0) {
      console.error("[v0] Video not found")
      return null
    }

    const video = videoData.items[0]
    const snippet = video.snippet
    const contentDetails = video.contentDetails
    const statistics = video.statistics

    // チャンネル登録者数を取得
    let subscriberCount: string | null = null
    try {
      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${snippet.channelId}&key=${apiKey}`,
      )
      if (channelResponse.ok) {
        const channelData = await channelResponse.json()
        if (channelData.items && channelData.items.length > 0) {
          subscriberCount = channelData.items[0].statistics.subscriberCount
        }
      }
    } catch (e) {
      console.error("[v0] Failed to fetch channel data:", e)
    }

    // 上位コメントを取得
    let topComments: string[] = []
    try {
      const commentsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&order=relevance&maxResults=10&key=${apiKey}`,
      )
      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json()
        if (commentsData.items) {
          topComments = commentsData.items.map(
            (item: { snippet: { topLevelComment: { snippet: { textDisplay: string } } } }) =>
              item.snippet.topLevelComment.snippet.textDisplay,
          )
        }
      }
    } catch (e) {
      console.error("[v0] Failed to fetch comments:", e)
    }

    // 説明欄からチャプターを抽出
    const chapters = extractChapters(snippet.description)

    // 再生時間をフォーマット
    const duration = formatDuration(contentDetails.duration)

    return {
      title: snippet.title,
      description: snippet.description,
      channelTitle: snippet.channelTitle,
      channelId: snippet.channelId,
      tags: snippet.tags || [],
      publishedAt: new Date(snippet.publishedAt).toLocaleDateString("ja-JP"),
      duration,
      viewCount: Number(statistics.viewCount).toLocaleString(),
      likeCount: Number(statistics.likeCount).toLocaleString(),
      commentCount: Number(statistics.commentCount).toLocaleString(),
      thumbnail:
        snippet.thumbnails?.maxres?.url ||
        snippet.thumbnails?.high?.url ||
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      subscriberCount: subscriberCount ? Number(subscriberCount).toLocaleString() : null,
      chapters,
      topComments,
    }
  } catch (error) {
    console.error("[v0] Error fetching YouTube data:", error)
    return null
  }
}

// 説明欄からチャプターを抽出
function extractChapters(description: string): { title: string; time: string }[] {
  const chapters: { title: string; time: string }[] = []
  const lines = description.split("\n")

  for (const line of lines) {
    // 0:00 タイトル または 00:00 タイトル の形式を検出
    const match = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/)
    if (match) {
      chapters.push({
        time: match[1],
        title: match[2].trim(),
      })
    }
  }

  return chapters
}

// ISO 8601形式の再生時間をフォーマット
function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return isoDuration

  const hours = match[1] ? Number.parseInt(match[1]) : 0
  const minutes = match[2] ? Number.parseInt(match[2]) : 0
  const seconds = match[3] ? Number.parseInt(match[3]) : 0

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

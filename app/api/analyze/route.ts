import { generateObject, generateText } from "ai"
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

const factCheckSchema = z.object({
  verdict: z.string().describe("ファクトチェックの結論（50文字程度）"),
  credibleSources: z.number().min(0).max(5).describe("信頼できる情報源の数"),
})

const reputationSchema = z.object({
  verdict: z.string().describe("チャンネル評判の結論（50文字程度）"),
  warningSignals: z.array(z.string()).describe("警告サイン（炎上歴、釣り指摘など）"),
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

interface SearchResult {
  title: string
  snippet: string
  link: string
}

async function googleSearch(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY
  const searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID

  if (!apiKey || !searchEngineId) {
    console.log("[v0] Google Custom Search API not configured")
    return []
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=5&lr=lang_ja`,
    )

    if (!response.ok) {
      console.error("[v0] Search API error:", response.status)
      return []
    }

    const data = await response.json()

    if (!data.items) {
      return []
    }

    return data.items.map((item: { title: string; snippet: string; link: string }) => ({
      title: item.title,
      snippet: item.snippet,
      link: item.link,
    }))
  } catch (error) {
    console.error("[v0] Search error:", error)
    return []
  }
}

async function generateFactCheckQuery(title: string): Promise<string> {
  const { text } = await generateText({
    model: vertex("gemini-2.5-flash"),
    prompt: `
あなたはファクトチェッカーです。
以下のYouTube動画タイトルから、事実確認が必要な主張を抽出し、Google検索用のクエリを1つだけ生成してください。

タイトル: ${title}

ルール:
- 人名や固有名詞 + 主張内容（例: 「〇〇 逮捕」「〇〇 引退」）の形式で
- 日付や「速報」「緊急」などの煽り語は除去
- 検索クエリのみを出力（説明不要）
- 事実確認できる主張がない場合は「確認不要」と出力
`,
  })

  return text.trim()
}

function generateChannelReputationQuery(channelName: string): string {
  return `"${channelName}" 炎上 OR 釣り OR 詐欺 OR 批判`
}

async function runAgentInvestigation(
  title: string,
  channelName: string,
): Promise<{
  factCheck: {
    query: string
    results: SearchResult[]
    verdict: string
    credibleSources: number
  }
  channelReputation: {
    query: string
    results: SearchResult[]
    verdict: string
    warningSignals: string[]
  }
}> {
  // ファクトチェッククエリを生成
  const factCheckQuery = await generateFactCheckQuery(title)

  // チャンネル評判クエリを生成
  const reputationQuery = generateChannelReputationQuery(channelName)

  // 並列で検索を実行
  const [factCheckResults, reputationResults] = await Promise.all([
    factCheckQuery !== "確認不要" ? googleSearch(factCheckQuery) : Promise.resolve([]),
    googleSearch(reputationQuery),
  ])

  // ファクトチェック結果を分析
  let factCheckVerdict = "確認対象なし"
  let credibleSources = 0

  if (factCheckQuery !== "確認不要" && factCheckResults.length > 0) {
    const { object: factResult } = await generateObject({
      model: vertex("gemini-2.5-flash"),
      schema: factCheckSchema,
      prompt: `
YouTube動画タイトル: ${title}
検索クエリ: ${factCheckQuery}

検索結果:
${factCheckResults.map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}\n   ${r.link}`).join("\n\n")}

上記の検索結果を分析し、動画タイトルの主張が事実かどうか判定してください。
信頼できる情報源（大手ニュースサイト、公式サイトなど）がいくつあるか数えてください。
`,
    })
    factCheckVerdict = factResult.verdict
    credibleSources = factResult.credibleSources
  }

  // チャンネル評判を分析
  let reputationVerdict = "問題なし"
  let warningSignals: string[] = []

  if (reputationResults.length > 0) {
    const { object: repResult } = await generateObject({
      model: vertex("gemini-2.5-flash"),
      schema: reputationSchema,
      prompt: `
チャンネル名: ${channelName}
検索クエリ: ${reputationQuery}

検索結果:
${reputationResults.map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}\n   ${r.link}`).join("\n\n")}

上記の検索結果を分析し、このチャンネルの評判を判定してください。
炎上歴、釣り動画の指摘、詐欺疑惑などの警告サインがあれば列挙してください。
関係ない検索結果は無視してください。
`,
    })
    reputationVerdict = repResult.verdict
    warningSignals = repResult.warningSignals
  }

  return {
    factCheck: {
      query: factCheckQuery,
      results: factCheckResults,
      verdict: factCheckVerdict,
      credibleSources,
    },
    channelReputation: {
      query: reputationQuery,
      results: reputationResults,
      verdict: reputationVerdict,
      warningSignals,
    },
  }
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

    if (!videoData) {
      return Response.json({ error: "動画情報を取得できませんでした" }, { status: 400 })
    }

    const [agentInvestigation, _] = await Promise.all([
      runAgentInvestigation(videoData.title, videoData.channelTitle),
      Promise.resolve(), // プレースホルダー
    ])

    const agentContext = `
【AIエージェント調査結果】

■ ファクトチェック
検索クエリ: ${agentInvestigation.factCheck.query}
信頼できる情報源の数: ${agentInvestigation.factCheck.credibleSources}件
判定: ${agentInvestigation.factCheck.verdict}
${
  agentInvestigation.factCheck.results.length > 0
    ? `
関連記事:
${agentInvestigation.factCheck.results
  .slice(0, 3)
  .map((r) => `- ${r.title}`)
  .join("\n")}
`
    : ""
}

■ チャンネル評判調査
検索クエリ: ${agentInvestigation.channelReputation.query}
判定: ${agentInvestigation.channelReputation.verdict}
${agentInvestigation.channelReputation.warningSignals.length > 0 ? `警告サイン: ${agentInvestigation.channelReputation.warningSignals.join(", ")}` : "警告サインなし"}
${
  agentInvestigation.channelReputation.results.length > 0
    ? `
関連記事:
${agentInvestigation.channelReputation.results
  .slice(0, 3)
  .map((r) => `- ${r.title}`)
  .join("\n")}
`
    : ""
}
`

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

${agentContext}

【判定基準】
- タイトルの誇張度: 「衝撃」「ヤバい」「〜した結果」などの煽り文句の使用
- サムネイルの煽り度: 赤丸、矢印、驚いた顔、過度な加工など（タイトルから推測）
- 内容との乖離: タイトルやサムネが説明欄の内容を正確に反映しているか
- 感情的な釣り: 怒り、驚き、恐怖などを煽る要素
- 緊急性の演出: 「今すぐ」「限定」「〜しないと後悔」などの焦らせる要素

【重要】
- AIエージェント調査結果を重視してください
- ファクトチェックで信頼できる情報源が0件なのに断定的なタイトルの場合、釣りの可能性が高いです
- チャンネル評判調査で警告サインがある場合、過去の釣り傾向を考慮してください
- 上位コメントで「タイトル詐欺」「釣り」「内容と違う」などの指摘がないかチェックしてください

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
      agentInvestigation,
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

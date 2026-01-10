export interface ScoreBreakdown {
  titleExaggeration: number
  thumbnailManipulation: number
  contentMismatch: number
  emotionalBait: number
  urgencyTactics: number
}

export interface VideoInfo {
  title: string
  thumbnail: string | null
  channelName: string | null
}

export interface VideoDetails {
  viewCount: string
  likeCount: string
  commentCount: string
  subscriberCount: string | null
  publishedAt: string
  duration: string
  hasChapters: boolean
  hasTags: boolean
  hasComments: boolean
}

export interface SearchResult {
  title: string
  snippet: string
  link: string
}

export interface AgentInvestigation {
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
}

export interface AnalysisResult {
  isClickbait: boolean
  overallScore: number
  scores: ScoreBreakdown
  analysis: string
  videoInfo: VideoInfo | null
  videoDetails?: VideoDetails
  agentInvestigation?: AgentInvestigation
  error?: boolean
}

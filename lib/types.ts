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
  description: string | null
}

export interface AnalysisResult {
  isClickbait: boolean
  overallScore: number
  scores: ScoreBreakdown
  analysis: string
  videoInfo: VideoInfo | null
  error?: boolean
}

"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RadarChart } from "@/components/radar-chart"
import { ScoreMeter } from "@/components/score-meter"
import { RotateCcw, AlertTriangle, CheckCircle, Clock, Eye, ThumbsUp, Calendar } from "lucide-react"
import type { AnalysisResult } from "@/lib/types"

interface ResultDisplayProps {
  result: AnalysisResult
  onReset: () => void
}

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

function formatCount(count: string): string {
  const num = Number.parseInt(count.replace(/,/g, ""), 10)
  if (Number.isNaN(num)) return count
  if (num >= 100000000) {
    return `${(num / 100000000).toFixed(1)}億`
  }
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}万`
  }
  return num.toLocaleString()
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

export function ResultDisplay({ result, onReset }: ResultDisplayProps) {
  const { isClickbait, overallScore, scores, analysis, videoInfo, videoDetails, error } = result

  const getVerdict = () => {
    if (error) return { text: "エラー", emoji: "❓", color: "text-muted-foreground" }
    if (overallScore >= 70) return { text: "釣り確定！", emoji: "🎣", color: "text-danger" }
    if (overallScore >= 40) return { text: "ちょっと怪しい", emoji: "🤔", color: "text-warning" }
    return { text: "安心", emoji: "✨", color: "text-safe" }
  }

  const verdict = getVerdict()

  return (
    <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Video Info Preview */}
      {videoInfo && (
        <Card className="p-4 bg-card border-border">
          <div className="flex gap-3">
            {videoInfo.thumbnail && (
              <img
                src={videoInfo.thumbnail || "/placeholder.svg"}
                alt="サムネイル"
                className="w-24 h-16 object-cover rounded-lg flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-foreground line-clamp-2">{videoInfo.title}</h3>
              {videoInfo.channelName && (
                <p className="text-xs text-muted-foreground mt-1">
                  {videoInfo.channelName}
                  {videoDetails?.subscriberCount && (
                    <span className="ml-1">({formatCount(videoDetails.subscriberCount)}人)</span>
                  )}
                </p>
              )}
            </div>
          </div>
          {videoDetails && (
            <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(videoDetails.publishedAt)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatDuration(videoDetails.duration)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Eye className="w-3.5 h-3.5" />
                <span>{formatCount(videoDetails.viewCount)}回</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>{formatCount(videoDetails.likeCount)}</span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Main Verdict */}
      <div className="text-center py-6">
        <div className="text-6xl mb-4 animate-bounce">{verdict.emoji}</div>
        <h2 className={`text-3xl font-bold ${verdict.color}`}>{verdict.text}</h2>
        <p className="text-sm text-muted-foreground mt-2">釣り度スコア</p>
      </div>

      {/* Score Meter */}
      <ScoreMeter score={overallScore} />

      {/* Radar Chart */}
      <Card className="p-4 bg-card border-border">
        <h3 className="text-sm font-semibold text-foreground mb-4 text-center">詳細分析</h3>
        <RadarChart scores={scores} />
      </Card>

      {/* Score Breakdown */}
      <Card className="p-4 bg-card border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3">スコア内訳</h3>
        <div className="space-y-3">
          <ScoreItem label="タイトルの誇張" score={scores.titleExaggeration} />
          <ScoreItem label="サムネの煽り" score={scores.thumbnailManipulation} />
          <ScoreItem label="内容との乖離" score={scores.contentMismatch} />
          <ScoreItem label="感情的な釣り" score={scores.emotionalBait} />
          <ScoreItem label="緊急性の演出" score={scores.urgencyTactics} />
        </div>
      </Card>

      {/* AI Analysis */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-3">
          {isClickbait ? (
            <AlertTriangle className="w-4 h-4 text-warning" />
          ) : (
            <CheckCircle className="w-4 h-4 text-safe" />
          )}
          <h3 className="text-sm font-semibold text-foreground">AI分析コメント</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{analysis}</p>
      </Card>

      {/* Reset Button */}
      <Button
        onClick={onReset}
        variant="outline"
        className="w-full h-12 rounded-xl border-border hover:bg-muted bg-transparent"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        別の動画をチェック
      </Button>
    </div>
  )
}

function ScoreItem({ label, score }: { label: string; score: number }) {
  const getColor = () => {
    if (score >= 70) return "bg-danger"
    if (score >= 40) return "bg-warning"
    return "bg-safe"
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-medium text-foreground w-8 text-right">{score}</span>
    </div>
  )
}

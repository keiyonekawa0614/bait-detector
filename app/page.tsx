"use client"

import { useState } from "react"
import { UrlInputForm } from "@/components/url-input-form"
import { ResultDisplay } from "@/components/result-display"
import { FishingIcon } from "@/components/fishing-icon"
import type { AnalysisResult } from "@/lib/types"

export default function HomePage() {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleAnalyze = async (url: string) => {
    setIsAnalyzing(true)
    setResult(null)

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        throw new Error("分析に失敗しました")
      }

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("[v0] Analysis error:", error)
      setResult({
        isClickbait: false,
        overallScore: 0,
        scores: {
          titleExaggeration: 0,
          thumbnailManipulation: 0,
          contentMismatch: 0,
          emotionalBait: 0,
          urgencyTactics: 0,
        },
        analysis: "分析中にエラーが発生しました。URLを確認してもう一度お試しください。",
        videoInfo: null,
        error: true,
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReset = () => {
    setResult(null)
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 flex flex-col">
      {/* Header */}
      <header className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <FishingIcon className="w-10 h-10 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">釣り判定AI</h1>
        </div>
        <p className="text-sm text-muted-foreground">YouTubeのURLを入力して、釣りかどうかチェック！</p>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center">
        {!result ? (
          <UrlInputForm onSubmit={handleAnalyze} isLoading={isAnalyzing} />
        ) : (
          <ResultDisplay result={result} onReset={handleReset} />
        )}
      </div>

      {/* Footer */}
      <footer className="text-center mt-8 text-xs text-muted-foreground">
        <p>※ 判定結果はAIによる推測です。参考程度にご利用ください。</p>
      </footer>
    </main>
  )
}

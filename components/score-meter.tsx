"use client"

import { useEffect, useState } from "react"

interface ScoreMeterProps {
  score: number
}

export function ScoreMeter({ score }: ScoreMeterProps) {
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    const duration = 1000
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease out cubic

      setAnimatedScore(Math.round(score * eased))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  }, [score])

  const getColor = () => {
    if (score >= 70) return { primary: "#f43f5e", secondary: "#fda4af" }
    if (score >= 40) return { primary: "#f59e0b", secondary: "#fcd34d" }
    return { primary: "#10b981", secondary: "#6ee7b7" }
  }

  const colors = getColor()
  const circumference = 2 * Math.PI * 80
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference

  return (
    <div className="relative flex flex-col items-center">
      <svg width="200" height="200" className="transform -rotate-90">
        {/* Background circle */}
        <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="12" />
        {/* Progress circle */}
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke={colors.primary}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 8px ${colors.primary})`,
          }}
        />
      </svg>

      {/* Score display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold" style={{ color: colors.primary }}>
          {animatedScore}
        </span>
        <span className="text-sm text-muted-foreground mt-1">/ 100</span>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-safe" />
          <span className="text-muted-foreground">安心</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-warning" />
          <span className="text-muted-foreground">注意</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-danger" />
          <span className="text-muted-foreground">危険</span>
        </div>
      </div>
    </div>
  )
}

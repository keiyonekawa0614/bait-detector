"use client"

import { useEffect, useRef } from "react"
import type { ScoreBreakdown } from "@/lib/types"

interface RadarChartProps {
  scores: ScoreBreakdown
}

export function RadarChart({ scores }: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // High DPI support
    const dpr = window.devicePixelRatio || 1
    const size = 280
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)

    const centerX = size / 2
    const centerY = size / 2
    const maxRadius = 100

    const labels = [
      { key: "titleExaggeration", label: "タイトル誇張" },
      { key: "thumbnailManipulation", label: "サムネ煽り" },
      { key: "contentMismatch", label: "内容乖離" },
      { key: "emotionalBait", label: "感情的釣り" },
      { key: "urgencyTactics", label: "緊急性演出" },
    ] as const

    const numAxes = labels.length
    const angleStep = (Math.PI * 2) / numAxes
    const startAngle = -Math.PI / 2

    // Clear canvas
    ctx.clearRect(0, 0, size, size)

    // Draw background grid
    const gridLevels = [20, 40, 60, 80, 100]
    gridLevels.forEach((level) => {
      ctx.beginPath()
      for (let i = 0; i <= numAxes; i++) {
        const angle = startAngle + i * angleStep
        const radius = (level / 100) * maxRadius
        const x = centerX + Math.cos(angle) * radius
        const y = centerY + Math.sin(angle) * radius
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.closePath()
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
      ctx.lineWidth = 1
      ctx.stroke()
    })

    // Draw axes
    labels.forEach((_, i) => {
      const angle = startAngle + i * angleStep
      const x = centerX + Math.cos(angle) * maxRadius
      const y = centerY + Math.sin(angle) * maxRadius

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(x, y)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)"
      ctx.lineWidth = 1
      ctx.stroke()
    })

    // Draw data polygon
    ctx.beginPath()
    labels.forEach((item, i) => {
      const score = scores[item.key]
      const angle = startAngle + i * angleStep
      const radius = (score / 100) * maxRadius
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.closePath()

    // Fill with gradient
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius)
    gradient.addColorStop(0, "rgba(236, 72, 153, 0.3)")
    gradient.addColorStop(1, "rgba(236, 72, 153, 0.1)")
    ctx.fillStyle = gradient
    ctx.fill()

    // Stroke
    ctx.strokeStyle = "rgba(236, 72, 153, 0.8)"
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw points
    labels.forEach((item, i) => {
      const score = scores[item.key]
      const angle = startAngle + i * angleStep
      const radius = (score / 100) * maxRadius
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fillStyle = "#ec4899"
      ctx.fill()
      ctx.strokeStyle = "#fff"
      ctx.lineWidth = 2
      ctx.stroke()
    })

    // Draw labels
    ctx.font = "11px 'Geist', sans-serif"
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    labels.forEach((item, i) => {
      const angle = startAngle + i * angleStep
      const labelRadius = maxRadius + 25
      const x = centerX + Math.cos(angle) * labelRadius
      const y = centerY + Math.sin(angle) * labelRadius

      ctx.fillText(item.label, x, y)
    })
  }, [scores])

  return (
    <div className="flex justify-center">
      <canvas ref={canvasRef} className="max-w-full" />
    </div>
  )
}

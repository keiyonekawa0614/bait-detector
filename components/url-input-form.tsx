"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Search } from "lucide-react"

interface UrlInputFormProps {
  onSubmit: (url: string) => void
  isLoading: boolean
}

export function UrlInputForm({ onSubmit, isLoading }: UrlInputFormProps) {
  const [url, setUrl] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim() && !isLoading) {
      onSubmit(url.trim())
    }
  }

  const isValidYoutubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)/
    return youtubeRegex.test(url)
  }

  const isValid = url.trim() && isValidYoutubeUrl(url)

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Input
            type="url"
            placeholder="YouTubeのURLを貼り付け"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-14 pr-4 pl-4 text-base bg-card border-border rounded-xl placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
            disabled={isLoading}
          />
        </div>

        <Button
          type="submit"
          disabled={!isValid || isLoading}
          className="w-full h-14 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              分析中...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              釣り度をチェック
            </span>
          )}
        </Button>
      </form>

      {/* Example URLs */}
      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground mb-2">対応フォーマット</p>
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          <span className="px-2 py-1 bg-muted rounded-md">youtube.com/watch?v=...</span>
          <span className="px-2 py-1 bg-muted rounded-md">youtu.be/...</span>
          <span className="px-2 py-1 bg-muted rounded-md">youtube.com/shorts/...</span>
        </div>
      </div>

      {/* Animated decoration */}
      <div className="mt-10 flex justify-center">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-dashed border-muted rounded-full animate-spin-slow" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl">🎣</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  )
}

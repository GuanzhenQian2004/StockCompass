"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import NewsItem from "./NewsItem"

interface NewsItem {
  title: string
  source: string
  link: string
}

interface NewsCardProps {
  onClose: () => void
  newsItems: NewsItem[]
  summary?: string
  dateRange: string
}

export default function NewsCard({ onClose, newsItems, summary, dateRange }: NewsCardProps) {
  return (
    <Card className="w-full max-w-[400px] flex flex-col gap-5 pt-6">
      <div className="px-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-card-foreground leading-7">
          {dateRange}
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-6 w-6 text-secondary-foreground" />
        </Button>
      </div>

      <div className="px-6 pt-5 flex flex-col gap-6 border-t overflow-y-auto max-h-[650px]">
        {summary && (
          <div className="w-full space-y-4">
            {summary.split('\n').map((paragraph, index) => (
              <p key={index} className="text-base text-foreground leading-6">
                {paragraph}
              </p>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-4 pb-6">
          {newsItems.map((item, index) => (
            <NewsItem
              key={index}
              title={item.title}
              source={item.source}
              link={item.link}
            />
          ))}
        </div>
      </div>
    </Card>
  )
} 
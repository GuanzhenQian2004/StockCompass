"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

interface NewsItemProps {
  title: string
  source: string
  link: string
}

export default function NewsItem({ title, source, link }: NewsItemProps) {
  return (
    <div className="p-4 border rounded-md flex items-center justify-between gap-4">
      <div className="space-y-1 flex-1 min-w-0">
        <h3 className="text-sm font-medium text-foreground truncate">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground opacity-90">{source}</p>
      </div>
      <a 
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0"
      >
        <Button size="icon" className="flex-shrink-0">
          <ArrowRight />
        </Button>
      </a>
    </div>
  )
} 
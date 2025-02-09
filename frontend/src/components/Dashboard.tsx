"use client"

import * as React from "react"
import { Search, CircleUser, CircleArrowUp, CircleArrowDown, Forward, Radar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Slider } from "@/components/ui/slider"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="flex h-16 items-center justify-between px-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="text-primary">
                {/* Logo SVG placeholder */}
                <svg viewBox="0 0 24 24" className="h-6 w-6">
                  <circle cx="12" cy="12" r="10" className="fill-current" />
                </svg>
              </div>
              <span className="text-xl font-bold text-primary">StockCompass</span>
            </div>
            <div className="relative w-[640px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-10" placeholder="Input Ticker ..." />
            </div>
          </div>
          <Button size="icon" variant="secondary" className="rounded-full">
            <CircleUser className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <Card className="p-6">
            <div className="flex items-start justify-between pb-6">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-semibold">NVIDIA Corporation (NVDA)</h2>
                <p className="text-sm text-muted-foreground">Nasdaq · USD · Last Closed: 02-07-2025</p>
              </div>
              <div className="space-y-2 text-right">
                <div className="inline-flex items-center gap-2 rounded bg-green-100 px-2 py-1">
                  <CircleArrowUp className="h-4 w-4" />
                  <span className="text-sm font-medium">+10.4% MoM</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded bg-red-100 px-2 py-1">
                  <CircleArrowDown className="h-4 w-4" />
                  <span className="text-sm font-medium">-5.2% YoY</span>
                </div>
              </div>
            </div>

            <div className="mb-6 h-[300px]">
              <LineChart width={900} height={300} data={[]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#8884d8" />
              </LineChart>
            </div>

            <div className="flex items-center justify-between">
              <ToggleGroup type="single" defaultValue="1Y">
                <ToggleGroupItem value="3Y">3Y</ToggleGroupItem>
                <ToggleGroupItem value="1Y">1Y</ToggleGroupItem>
                <ToggleGroupItem value="6M">6M</ToggleGroupItem>
              </ToggleGroup>

              <div className="w-[505px]">
                <Slider defaultValue={[33]} max={100} step={1} />
                <div className="mt-2 flex justify-between">
                  <span className="text-sm font-medium">Date Range</span>
                  <span className="text-sm text-muted-foreground">05-12-2023 to 05-11-2024</span>
                </div>
              </div>

              <Button>
                <span>Event Analyzer</span>
                <Radar className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-5 gap-6 border rounded-md p-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Prev Close</p>
                <p className="text-3xl font-semibold text-green-600">+2.11%</p>
                <p className="text-2xl font-semibold">$128.68</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Market Cap</p>
                <p className="text-3xl font-semibold">3.18T</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Share Volume</p>
                <p className="text-3xl font-semibold">226,819,205</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">P/E (TTM)</p>
                <p className="text-3xl font-semibold">51.32</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">EPS (TTM)</p>
                <p className="text-3xl font-semibold">2.53</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold">June 6, 2023 - June 10, 2023</h3>
            </div>
            <div className="px-6">
              <p className="text-base leading-relaxed">
                Competition from Chinese AI firm DeepSeek: Nvidia's shares plunged 17% on January 27, 2025, amid concerns about competition from DeepSeek, a Chinese artificial intelligence start-up. This led to over $590 billion being wiped off Nvidia's market value, marking the biggest one-day value loss for any company in history.

                Market correction: Some analysts view the drop as a "healthy market correction" due to Nvidia's previously inflated valuations. The company's market cap loss stood at more than $475 billion at market close on January 27, 2025.
              </p>
            </div>
            <div className="space-y-2 p-6">
              {[
                { title: "Why Nvidia stock dip after deep seek launched its new model", source: "Tech Crunch" },
                { title: "Nvidia plunged 17% on Monday, which caught investors unprepared", source: "CNBC" },
                { title: "The REAL reason Nvidia stocks crash - and the lessons behind", source: "Market Watch" },
              ].map((news, index) => (
                <Card key={index} className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium">{news.title}</h4>
                    <p className="text-sm text-muted-foreground">{news.source}</p>
                  </div>
                  <Button size="icon">
                    <Forward className="h-4 w-4" />
                  </Button>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}

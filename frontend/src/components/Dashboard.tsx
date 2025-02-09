"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Search, CircleUser, ArrowUpCircle, ArrowDownCircle, Radar } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Slider } from "@/components/ui/slider"
import Image from 'next/image'
import { LineChart, Line, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceArea } from "recharts"
import NewsCard from "./NewsCard"

const newsData = {
  dateRange: "Jun 6, 2023 - Jun 10, 2023",
  summary: "Competition from Chinese AI firm DeepSeek: Nvidia's shares plunged 17% on January 27, 2025, amid concerns about competition from DeepSeek, a Chinese artificial intelligence start-up.\n\nThis led to over $590 billion being wiped off Nvidia's market value, marking the biggest one-day value loss for any company in history.",
  newsItems: [
    {
      title: "Why Nvidia stock dip after deep seek launched its new model",
      source: "Tech Crunch",
      link: "https://www.marketwatch.com/press-release/stelia-announced-as-gold-sponsor-for-nvidia-gtc-showcasing-hyperband-and-leading-ai-scalability-discussion-a5bbb8ff"
    },
    {
      title: "Nvidia plunged 17% on Monday, which caught investors unprepared",
      source: "CNBC",
      link: "https://www.marketwatch.com/press-release/stelia-announced-as-gold-sponsor-for-nvidia-gtc-showcasing-hyperband-and-leading-ai-scalability-discussion-a5bbb8ff"
    },
    {
      title: "The REAL reason Nvidia stocks crash - and the lessons behind",
      source: "Market Watch",
      link: "https://www.marketwatch.com/press-release/stelia-announced-as-gold-sponsor-for-nvidia-gtc-showcasing-hyperband-and-leading-ai-scalability-discussion-a5bbb8ff"
    }
  ]
};

export default function Dashboard() {
  const [selectedInterval, setSelectedInterval] = useState<string | null>(null);
  const [hoveredInterval, setHoveredInterval] = useState<string | null>(null);
  const [stockMetadata, setStockMetadata] = useState<any>(null);
  const [ticker, setTicker] = useState<string>("NVDA");
  const [chartData, setChartData] = useState<any[]>([]);
  const [finData, setFinData] = useState<any[]>([]);

  const fetchMetadata = async (tickerSymbol: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    try {
      const res = await fetch(`${apiUrl}/api/stock_metadata/?stockname=${tickerSymbol}`);
      const data = await res.json();
      if (data.status_code === 200 && data.metadata) {
        setStockMetadata(data.metadata);
      }
    } catch (err) {
      console.error("Failed to fetch stock metadata", err);
    }
  };

  useEffect(() => {
    fetchMetadata(ticker);
    async function fetchNVDAData() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const response = await fetch(`${apiUrl}/api/stockdata/?stockname=NVDA&period=1y&interval=1d`);
        const parsedData = await response.json();
        if (parsedData.status_code === 200 && parsedData.time_series) {
          setChartData(parsedData.time_series);
          if (parsedData.fin_data) {
            setFinData(parsedData.fin_data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch NVDA 1y data:", error);
      }
    }
    fetchNVDAData();
  }, []);

  const intervals = [
    { id: "fe-mar", label: "Fe-Mar", x1: "Feb", x2: "Mar" },
    { id: "apr-jun", label: "April - June", x1: "Apr", x2: "Jun" }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b flex-none">
        <div className="flex h-16 items-center justify-between px-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="text-primary h-6 w-6">
                <Image
                  src="/logo.svg"
                  alt="StockCompass Logo"
                  width={24}
                  height={24}
                  className="text-primary"
                />
              </div>
              <span className="text-xl font-bold text-primary font-kumbh">
                StockCompass
              </span>
            </div>
            <div className="relative w-[640px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Input Ticker ..."
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    fetchMetadata(ticker);
                  }
                }}
              />
            </div>
          </div>
          <Button size="icon" variant="secondary" className="rounded-full">
            <CircleUser className="h-4 w-4" />
          </Button>
        </div>
      </header>


      <main className="p-8 flex-1 flex">
        {selectedInterval ? (
          <div className="flex w-full gap-5">
            <div className="flex-1 min-w-0">
              <Card className="flex flex-col h-full">
                <div className="px-7 py-6 flex justify-between items-start border-b">
                  <div className="space-y-1.5">
                    <h2 className="text-2xl font-semibold text-card-foreground">
                      {stockMetadata ? stockMetadata.longName : "Loading..."}
                    </h2>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stockMetadata
                        ? `${stockMetadata.exchangeName} · ${stockMetadata.currency} · Last Closed: ${stockMetadata.lastClose}`
                        : "Last Closed: YYYY-MM-DD"
                      }
                    </p>
                  </div>
                  <div className="flex gap-4">
                    {stockMetadata && (
                      <>
                        <div className={`${stockMetadata.montly_pct_change >= 0 ? "bg-green-100" : "bg-red-100"} px-6 py-4 rounded flex items-center gap-2`}>
                          {stockMetadata.montly_pct_change >= 0 ? (
                            <ArrowUpCircle className="h-4 w-4" />
                          ) : (
                            <ArrowDownCircle className="h-4 w-4" />
                          )}
                          <span className="text-sm font-medium">
                            {`${stockMetadata.montly_pct_change >= 0 ? '+' : ''}${(stockMetadata.montly_pct_change * 100).toFixed(1)}% MoM`}
                          </span>
                        </div>
                        <div className={`${stockMetadata.yearly_pct_change >= 0 ? "bg-green-100" : "bg-red-100"} px-6 py-4 rounded flex items-center gap-2`}>
                          {stockMetadata.yearly_pct_change >= 0 ? (
                            <ArrowUpCircle className="h-4 w-4" />
                          ) : (
                            <ArrowDownCircle className="h-4 w-4" />
                          )}
                          <span className="text-sm font-medium">
                            {`${stockMetadata.yearly_pct_change >= 0 ? '+' : ''}${(stockMetadata.yearly_pct_change * 100).toFixed(1)}% YoY`}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0 border-b">
                  <div className="p-6 flex flex-col flex-1 min-h-0">
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData}
                          margin={{
                            top: 10,
                            right: 10,
                            left: 10,
                            bottom: 10,
                          }}
                        >
                          <defs>
                            <pattern
                              id="diagonalPatternRed"
                              patternUnits="userSpaceOnUse"
                              width="8"
                              height="8"
                            >
                              <rect width="8" height="8" fill="#fca5a5" opacity="0.2" />
                              <path
                                d="M-2,2 l4,-4
                                   M0,8 l8,-8
                                   M6,10 l4,-4"
                                style={{
                                  stroke: "#dc2626",
                                  strokeWidth: 1.5,
                                  opacity: 1
                                }}
                              />
                            </pattern>
                            <pattern
                              id="diagonalPattern"
                              patternUnits="userSpaceOnUse"
                              width="8"
                              height="8"
                            >
                              <rect width="8" height="8" fill="#e5e7eb" opacity="0.5"/>
                              <path
                                d="M-2,2 l4,-4
                                   M0,8 l8,-8
                                   M6,10 l4,-4"
                                style={{
                                  stroke: "#6b7280",
                                  strokeWidth: 1.5,
                                  opacity: 0.6
                                }}
                              />
                            </pattern>
                            <pattern
                              id="diagonalPatternGreen"
                              patternUnits="userSpaceOnUse"
                              width="8"
                              height="8"
                            >
                              <rect width="8" height="8" fill="#86efac" opacity="0.2" />
                              <path
                                d="M-2,2 l4,-4
                                   M0,8 l8,-8
                                   M6,10 l4,-4"
                                style={{
                                  stroke: "#16a34a",
                                  strokeWidth: 1.5,
                                  opacity: 1
                                }}
                              />
                            </pattern>
                          </defs>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" />
                          {intervals.map((interval) => {
                            return (() => {
                              // Determine the starting and ending values for the interval.
                              const startDatum = chartData.find(d => d.time === interval.x1);
                              const endDatum = chartData.find(d => d.time === interval.x2);
                              const trendColor = (startDatum && endDatum)
                                ? (endDatum.close_price - startDatum.close_price >= 0 ? "green" : "red")
                                : "gray";

                              const isSelected = selectedInterval === interval.id;
                              const isHovered = hoveredInterval === interval.id;
                              let fillColor: string;
                              if (isSelected) {
                                fillColor = trendColor === "green"
                                  ? "url(#diagonalPatternGreen)"
                                  : "url(#diagonalPatternRed)";
                              } else if (isHovered) {
                                fillColor = trendColor === "green" ? "#22c55e" : "#ef4444";  // Tailwind 500 variants
                              } else {
                                fillColor = trendColor === "green" ? "#86efac" : "#fca5a5";  // Tailwind 300 variants
                              }

                              return (
                                <ReferenceArea
                                  key={interval.id}
                                  x1={interval.x1}
                                  x2={interval.x2}
                                  fill={fillColor}
                                  fillOpacity={isSelected ? 1 : 0.5}
                                  onClick={() => {
                                    if (selectedInterval === interval.id) {
                                      setSelectedInterval(null);
                                    } else {
                                      setSelectedInterval(interval.id);
                                    }
                                  }}
                                  onMouseEnter={() => setHoveredInterval(interval.id)}
                                  onMouseLeave={() => setHoveredInterval(null)}
                                  className="cursor-pointer transition-colors duration-200 hover:opacity-90"
                                  role="button"
                                  aria-label={`Toggle highlight region ${interval.label}`}
                                  label={
                                    isHovered && !isSelected
                                      ? ({ viewBox }) => {
                                          const { x, y, width, height } = viewBox;
                                          const popupWidth = 100;
                                          const popupHeight = 30;
                                          return (
                                            <g>
                                              <rect
                                                x={x + width / 2 - popupWidth / 2}
                                                y={y + height * 0.1 - popupHeight / 2}
                                                width={popupWidth}
                                                height={popupHeight}
                                                rx={5}
                                                fill="hsl(var(--background))"
                                                stroke="hsl(var(--border))"
                                                strokeWidth={1}
                                                style={{
                                                  filter: "drop-shadow(0 2px 4px rgb(0 0 0 / 0.1))",
                                                  pointerEvents: "none",
                                                }}
                                              />
                                              <text
                                                x={x + width / 2}
                                                y={y + height * 0.1}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                className="text-sm font-medium fill-foreground select-none"
                                                style={{ pointerEvents: "none" }}
                                              >
                                                Investigate
                                              </text>
                                            </g>
                                          );
                                        }
                                      : undefined
                                  }
                                />
                              );
                            })();
                          })}
                          <XAxis
                            dataKey="time"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--popover))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "var(--radius)",
                            }}
                            labelStyle={{
                              color: "hsl(var(--muted-foreground))",
                              fontSize: "14px",
                              marginBottom: "4px",
                            }}
                            itemStyle={{
                              color: "hsl(var(--foreground))",
                              fontSize: "14px",
                            }}
                            formatter={(value) => [`$${value}`, "Price"]}
                          />
                          <Line
                            type="monotone"
                            dataKey="close_price"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-24">
                          <div className="flex-shrink-0">
                            <ToggleGroup type="single" defaultValue="1Y" aria-label="Select Time Range">
                              <ToggleGroupItem value="3Y" aria-label="3 Years">3Y</ToggleGroupItem>
                              <ToggleGroupItem value="1Y" aria-label="1 Year">1Y</ToggleGroupItem>
                              <ToggleGroupItem value="6M" aria-label="6 Months">6M</ToggleGroupItem>
                            </ToggleGroup>
                          </div>

                          <div className="w-[500px] space-y-3.5">
                            <Slider defaultValue={[70]} max={100} step={1} />
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Date Range</span>
                              <span className="text-sm font-medium text-muted-foreground">
                                05-12-2023 to 05-11-2024
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button>
                          Event Analyzer
                          <Radar className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-7 py-6 flex justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Prev Close</span>
                      {(() => {
                        const lastFin = finData[finData.length - 1];
                        if (!lastFin?.pct_change && lastFin?.pct_change !== 0) {
                          return <span className="text-sm font-medium text-muted-foreground">N/A</span>;
                        }
                        const sign = lastFin.pct_change > 0 ? "+" : "";
                        return (
                          <span className="text-sm font-medium text-green-600 text-muted-foreground">
                            {sign}{lastFin.pct_change.toFixed(2)}%
                          </span>
                        );
                      })()}
                    </div>
                    {(() => {
                      const lastItem = chartData[chartData.length - 1];
                      const price = lastItem?.close_price != null
                        ? `$${lastItem.close_price.toFixed(2)}`
                        : <span className="text-3xl font-semibold text-muted-foreground">N/A</span>;
                      return <div className="text-3xl font-semibold">{price}</div>;
                    })()}
                  </div>
                  <Separator orientation="vertical" />
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Market Cap</div>
                    {(() => {
                      const lastFin = finData[finData.length - 1];
                      if (!lastFin?.market_cap && lastFin?.market_cap !== 0) {
                        return <div className="text-3xl font-semibold text-muted-foreground">N/A</div>;
                      }
                      return (
                        <div className="text-3xl font-semibold">
                          {lastFin.market_cap.toLocaleString("en-US", {
                            style: "currency",
                            currency: "USD",
                            notation: "compact",
                            compactDisplay: "short",
                          })}
                        </div>
                      );
                    })()}
                  </div>
                  <Separator orientation="vertical" />
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Share Volume</div>
                    {(() => {
                      const lastTime = chartData[chartData.length - 1];
                      if (!lastTime || lastTime.volume == null) {
                        return <div className="text-3xl font-semibold text-muted-foreground">N/A</div>;
                      }
                      return (
                        <div className="text-3xl font-semibold">
                          {lastTime.volume.toLocaleString()}
                        </div>
                      );
                    })()}
                  </div>
                  <Separator orientation="vertical" />
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">P/E (TTM)</div>
                    {(() => {
                      const lastFin = finData[finData.length - 1];
                      if (lastFin?.pe == null) return <div className="text-3xl font-semibold text-muted-foreground">N/A</div>;
                      return (
                        <div className="text-3xl font-semibold">{lastFin.pe.toFixed(2)}</div>
                      );
                    })()}
                  </div>
                  <Separator orientation="vertical" />
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">EPS (TTM)</div>
                    {(() => {
                      const lastFin = finData[finData.length - 1];
                      if (!lastFin || lastFin.eps == null) {
                        return <div className="text-3xl font-semibold text-muted-foreground">N/A</div>;
                      }
                      return (
                        <div className="text-3xl font-semibold">
                          {lastFin.eps.toFixed(2)}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </Card>
            </div>
            <div className="w-[400px]">
              <NewsCard
                onClose={() => {
                  setSelectedInterval(null)
                  setHoveredInterval(null)
                }}
                newsItems={newsData.newsItems}
                summary={newsData.summary}
                dateRange={newsData.dateRange}
              />
            </div>
          </div>
        ) : (
          <Card className="w-full flex flex-col">
            <div className="px-7 py-6 flex justify-between items-start border-b">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-semibold text-card-foreground">
                  {stockMetadata ? stockMetadata.longName : "Loading..."}
                </h2>
                <p className="text-sm font-medium text-muted-foreground">
                  {stockMetadata
                    ? `${stockMetadata.exchangeName} · ${stockMetadata.currency} · Last Closed: ${stockMetadata.lastClose}`
                    : "Last Closed: YYYY-MM-DD"
                  }
                </p>
              </div>
              <div className="flex gap-4">
                {stockMetadata && (
                  <>
                    <div className={`${stockMetadata.montly_pct_change >= 0 ? "bg-green-100" : "bg-red-100"} px-6 py-4 rounded flex items-center gap-2`}>
                      {stockMetadata.montly_pct_change >= 0 ? (
                        <ArrowUpCircle className="h-4 w-4" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">
                        {`${stockMetadata.montly_pct_change >= 0 ? '+' : ''}${(stockMetadata.montly_pct_change * 100).toFixed(1)}% MoM`}
                      </span>
                    </div>
                    <div className={`${stockMetadata.yearly_pct_change >= 0 ? "bg-green-100" : "bg-red-100"} px-6 py-4 rounded flex items-center gap-2`}>
                      {stockMetadata.yearly_pct_change >= 0 ? (
                        <ArrowUpCircle className="h-4 w-4" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">
                        {`${stockMetadata.yearly_pct_change >= 0 ? '+' : ''}${(stockMetadata.yearly_pct_change * 100).toFixed(1)}% YoY`}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 border-b">
              <div className="p-6 flex flex-col flex-1 min-h-0">
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{
                        top: 10,
                        right: 10,
                        left: 10,
                        bottom: 10,
                      }}
                    >
                      <defs>
                        <pattern
                          id="diagonalPatternRed"
                          patternUnits="userSpaceOnUse"
                          width="8"
                          height="8"
                        >
                          <rect width="8" height="8" fill="#fca5a5" opacity="0.2" />
                          <path
                            d="M-2,2 l4,-4
                               M0,8 l8,-8
                               M6,10 l4,-4"
                            style={{
                              stroke: "#dc2626",
                              strokeWidth: 1.5,
                              opacity: 1
                            }}
                          />
                        </pattern>
                        <pattern
                          id="diagonalPattern"
                          patternUnits="userSpaceOnUse"
                          width="8"
                          height="8"
                        >
                          <rect width="8" height="8" fill="#e5e7eb" opacity="0.5"/>
                          <path
                            d="M-2,2 l4,-4
                               M0,8 l8,-8
                               M6,10 l4,-4"
                            style={{
                              stroke: "#6b7280",
                              strokeWidth: 1.5,
                              opacity: 0.6
                            }}
                          />
                        </pattern>
                        <pattern
                          id="diagonalPatternGreen"
                          patternUnits="userSpaceOnUse"
                          width="8"
                          height="8"
                        >
                          <rect width="8" height="8" fill="#86efac" opacity="0.2" />
                          <path
                            d="M-2,2 l4,-4
                               M0,8 l8,-8
                               M6,10 l4,-4"
                            style={{
                              stroke: "#16a34a",
                              strokeWidth: 1.5,
                              opacity: 1
                            }}
                          />
                        </pattern>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      {intervals.map((interval) => {
                        return (() => {
                          // Determine the starting and ending values for the interval.
                          const startDatum = chartData.find(d => d.time === interval.x1);
                          const endDatum = chartData.find(d => d.time === interval.x2);
                          const trendColor = (startDatum && endDatum)
                            ? (endDatum.close_price - startDatum.close_price >= 0 ? "green" : "red")
                            : "gray";

                          const isSelected = selectedInterval === interval.id;
                          const isHovered = hoveredInterval === interval.id;
                          let fillColor: string;
                          if (isSelected) {
                            fillColor = trendColor === "green"
                              ? "url(#diagonalPatternGreen)"
                              : "url(#diagonalPatternRed)";
                          } else if (isHovered) {
                            fillColor = trendColor === "green" ? "#22c55e" : "#ef4444";  // Tailwind 500 variants
                          } else {
                            fillColor = trendColor === "green" ? "#86efac" : "#fca5a5";  // Tailwind 300 variants
                          }

                          return (
                            <ReferenceArea
                              key={interval.id}
                              x1={interval.x1}
                              x2={interval.x2}
                              fill={fillColor}
                              fillOpacity={isSelected ? 1 : 0.5}
                              onClick={() => {
                                if (selectedInterval === interval.id) {
                                  setSelectedInterval(null);
                                } else {
                                  setSelectedInterval(interval.id);
                                }
                              }}
                              onMouseEnter={() => setHoveredInterval(interval.id)}
                              onMouseLeave={() => setHoveredInterval(null)}
                              className="cursor-pointer transition-colors duration-200 hover:opacity-90"
                              role="button"
                              aria-label={`Toggle highlight region ${interval.label}`}
                              label={
                                isHovered && !isSelected
                                  ? ({ viewBox }) => {
                                      const { x, y, width, height } = viewBox;
                                      const popupWidth = 100;
                                      const popupHeight = 30;
                                      return (
                                        <g>
                                          <rect
                                            x={x + width / 2 - popupWidth / 2}
                                            y={y + height * 0.1 - popupHeight / 2}
                                            width={popupWidth}
                                            height={popupHeight}
                                            rx={5}
                                            fill="hsl(var(--background))"
                                            stroke="hsl(var(--border))"
                                            strokeWidth={1}
                                            style={{
                                              filter: "drop-shadow(0 2px 4px rgb(0 0 0 / 0.1))",
                                              pointerEvents: "none",
                                            }}
                                          />
                                          <text
                                            x={x + width / 2}
                                            y={y + height * 0.1}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            className="text-sm font-medium fill-foreground select-none"
                                            style={{ pointerEvents: "none" }}
                                          >
                                            Investigate
                                          </text>
                                        </g>
                                      );
                                    }
                                  : undefined
                              }
                            />
                          );
                        })();
                      })}
                      <XAxis
                        dataKey="time"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                        labelStyle={{
                          color: "hsl(var(--muted-foreground))",
                          fontSize: "14px",
                          marginBottom: "4px",
                        }}
                        itemStyle={{
                          color: "hsl(var(--foreground))",
                          fontSize: "14px",
                        }}
                        formatter={(value) => [`$${value}`, "Price"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="close_price"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-24">
                      <div className="flex-shrink-0">
                        <ToggleGroup type="single" defaultValue="1Y" aria-label="Select Time Range">
                          <ToggleGroupItem value="3Y" aria-label="3 Years">3Y</ToggleGroupItem>
                          <ToggleGroupItem value="1Y" aria-label="1 Year">1Y</ToggleGroupItem>
                          <ToggleGroupItem value="6M" aria-label="6 Months">6M</ToggleGroupItem>
                        </ToggleGroup>
                      </div>

                      <div className="w-[500px] space-y-3.5">
                        <Slider defaultValue={[70]} max={100} step={1} />
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Date Range</span>
                          <span className="text-sm font-medium text-muted-foreground">
                            05-12-2023 to 05-11-2024
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button>
                      Event Analyzer
                      <Radar className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-7 py-6 flex justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Prev Close</span>
                  {(() => {
                    const lastFin = finData[finData.length - 1];
                    if (!lastFin?.pct_change && lastFin?.pct_change !== 0) {
                      return <span className="text-sm font-medium text-muted-foreground">N/A</span>;
                    }
                    const sign = lastFin.pct_change > 0 ? "+" : "";
                    return (
                      <span className="text-sm font-medium text-green-600 text-muted-foreground">
                        {sign}{lastFin.pct_change.toFixed(2)}%
                      </span>
                    );
                  })()}
                </div>
                {(() => {
                  const lastItem = chartData[chartData.length - 1];
                  const price = lastItem?.close_price != null
                    ? `$${lastItem.close_price.toFixed(2)}`
                    : <span className="text-3xl font-semibold text-muted-foreground">N/A</span>;
                  return <div className="text-3xl font-semibold">{price}</div>;
                })()}
              </div>
              <Separator orientation="vertical" />
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Market Cap</div>
                {(() => {
                  const lastFin = finData[finData.length - 1];
                  if (!lastFin?.market_cap && lastFin?.market_cap !== 0) {
                    return <div className="text-3xl font-semibold text-muted-foreground">N/A</div>;
                  }
                  return (
                    <div className="text-3xl font-semibold">
                      {lastFin.market_cap.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                        notation: "compact",
                        compactDisplay: "short",
                      })}
                    </div>
                  );
                })()}
              </div>
              <Separator orientation="vertical" />
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Share Volume</div>
                {(() => {
                  const lastTime = chartData[chartData.length - 1];
                  if (!lastTime || lastTime.volume == null) {
                    return <div className="text-3xl font-semibold text-muted-foreground">N/A</div>;
                  }
                  return (
                    <div className="text-3xl font-semibold">
                      {lastTime.volume.toLocaleString()}
                    </div>
                  );
                })()}
              </div>
              <Separator orientation="vertical" />
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">P/E (TTM)</div>
                {(() => {
                  const lastFin = finData[finData.length - 1];
                  if (lastFin?.pe == null) return <div className="text-3xl font-semibold text-muted-foreground">N/A</div>;
                  return (
                    <div className="text-3xl font-semibold">{lastFin.pe.toFixed(2)}</div>
                  );
                })()}
              </div>
              <Separator orientation="vertical" />
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">EPS (TTM)</div>
                {(() => {
                  const lastFin = finData[finData.length - 1];
                  if (!lastFin || lastFin.eps == null) {
                    return <div className="text-3xl font-semibold text-muted-foreground">N/A</div>;
                  }
                  return (
                    <div className="text-3xl font-semibold">
                      {lastFin.eps.toFixed(2)}
                    </div>
                  );
                })()}
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}

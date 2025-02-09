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

// Add this interface near the top of your file, with other types/interfaces
interface FormattedDataType {
  [key: string]: number[];
}

export default function Dashboard() {
  // Default to 1Y so we fetch 1-year data on preload
  const [selectedInterval, setSelectedInterval] = useState<string | null>("1Y");
  const [hoveredInterval, setHoveredInterval] = useState<string | null>(null);
  const [stockMetadata, setStockMetadata] = useState<any>(null);
  const [ticker, setTicker] = useState<string>("NVDA");
  const [chartData, setChartData] = useState<any[]>([]);
  const [finData, setFinData] = useState<any[]>([]);
  const [isFetchingMaxData, setIsFetchingMaxData] = useState<boolean>(true);
  // New state to preserve the initial 1Y data (baseline) and for interval calculations
  const [oneYearData, setOneYearData] = useState<any[]>([]);
  const [intervalEndDate, setIntervalEndDate] = useState<Date | null>(null);
  const [intervalStartDate, setIntervalStartDate] = useState<Date | null>(null);
  const [intervalError, setIntervalError] = useState<string>("");

  // NEW: State for slider value. Default 100 means slider is all the way to the right.
  const [sliderValue, setSliderValue] = useState<number>(100);

  // NEW: Add state and constant for event highlights shading mechanism
  const [eventRanges, setEventRanges] = useState<Array<{ start: string; end: string }>>([]);
  const [showEventHighlights, setShowEventHighlights] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

  // Transform the ranges to include IDs
  const eventHighlights = React.useMemo(() => 
    eventRanges.map((range, index) => ({
      id: `event${index + 1}`,
      ...range
    })), [eventRanges]
  );

  // Compute if controls (ToggleGroup and Slider) should be disabled until max data is loaded and interval dates are set.
  const controlsDisabled = isFetchingMaxData || !intervalStartDate || !intervalEndDate;

  // NEW: Helper function to format dates as MM-DD-YYYY.
  function formatDate(date: Date): string {
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  }

  // NEW: This function fetches data for any ticker: first 1Y, then max, merges, sets state
  async function fetchTickerData(tickerSymbol: string) {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      // 1) Fetch 1Y data
      const response1y = await fetch(`${apiUrl}/api/stockdata/?stockname=${tickerSymbol}&period=1y&interval=1d`);
      const data1y = await response1y.json();
      if (data1y.status_code === 200 && data1y.time_series) {
        setChartData(data1y.time_series);
        setOneYearData(data1y.time_series);
        if (data1y.fin_data) {
          setFinData(data1y.fin_data);
        }
      }
      // 2) Fetch max data
      const responseMax = await fetch(`${apiUrl}/api/stockdata/?stockname=${tickerSymbol}&period=max&interval=1d`);
      const dataMax = await responseMax.json();
      if (dataMax.status_code === 200 && dataMax.time_series) {
        // Combine 1Y with max data
        const combined = [...(data1y.time_series || []), ...dataMax.time_series];
        // De-duplicate based on "time"
        const dedupedData = combined.reduce<any[]>((acc, cur) => {
          if (!acc.some((item) => item.time === cur.time)) {
            acc.push(cur);
          }
          return acc;
        }, []);
        // Sort merged data by time
        dedupedData.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        setChartData(dedupedData);
        // Only set isFetchingMaxData to false after both datasets are loaded and merged
        setIsFetchingMaxData(false);
      }
    } catch (error) {
      console.error(`Failed to fetch data for ${tickerSymbol}:`, error);
      // In case of error, still set isFetchingMaxData to false to prevent permanent loading state
      setIsFetchingMaxData(false);
    }
  }

  // Keep metadata fetch the same, but call it inside a function for clarity
  async function fetchMetadata(tickerSymbol: string) {
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
  }

  // Unify data fetching in one effect, triggered by `ticker` changes.
  useEffect(() => {
    // Reset toggle group back to "1Y" and slider to the right (100)
    setSelectedInterval("1Y");
    setSliderValue(100);
    // Reset fetching state to true and clear interval dates
    setIsFetchingMaxData(true);
    setIntervalStartDate(null);
    setIntervalEndDate(null);

    // Clear event ranges and close the news panel when ticker changes
    setEventRanges([]);
    setSelectedEvent(null);
    setNewsPanelActive(false);

    fetchTickerData(ticker);
    fetchMetadata(ticker);
  }, [ticker]);

  // Recalculate the sliding window (intervalStartDate & intervalEndDate) based on the slider value,
  // selected interval (i.e. window length) and entire available (max period) chartData.
  useEffect(() => {
    if (chartData.length > 0) {
      const firstAvailable = new Date(chartData[0].time);
      const lastAvailable = new Date(chartData[chartData.length - 1].time);

      let windowDays = 0;
      if (selectedInterval === "1Y") {
        windowDays = 365;
      } else if (selectedInterval === "3Y") {
        windowDays = 365 * 3;
      } else if (selectedInterval === "6M") {
        windowDays = 182;
      }
      const windowMs = windowDays * 86400000; // milliseconds in a day

      // The minimum possible end date equals firstAvailable + window (i.e. leftmost slider)
      const minEndTime = firstAvailable.getTime() + windowMs;
      // The maximum possible end date equals the last available date in the merged dataset.
      const maxEndTime = lastAvailable.getTime();

      if (maxEndTime < minEndTime) {
        setIntervalError("Not enough data to display the selected time range.");
        return;
      } else {
        setIntervalError("");
      }

      // Map the slider value (0 to 100) to a currentEndTime in milliseconds.
      const currentEndTimeMs = minEndTime + ((sliderValue / 100) * (maxEndTime - minEndTime));
      const currentEndDate = new Date(currentEndTimeMs);
      const currentStartDate = new Date(currentEndTimeMs - windowMs);

      setIntervalEndDate(currentEndDate);
      setIntervalStartDate(currentStartDate);
    }
  }, [sliderValue, selectedInterval, chartData]);

  const intervals = [
    { id: "fe-mar", label: "Fe-Mar", x1: "Feb", x2: "Mar" },
    { id: "apr-jun", label: "April - June", x1: "Apr", x2: "Jun" }
  ];

  // Add a memoized filtered data set for the chart display
  const displayChartData = React.useMemo(() => {
    // Ensure display only shows data between intervalStartDate and intervalEndDate.
    if (!intervalStartDate || !intervalEndDate) return chartData;
    return chartData.filter(item => {
      const t = new Date(item.time);
      return t >= intervalStartDate && t <= intervalEndDate;
    });
  }, [chartData, intervalStartDate, intervalEndDate]);

  // Add this function to handle button click (similar to Enter key press)
  const handleSearch = (searchValue: string) => {
    const upperSearchValue = searchValue.toUpperCase();
    if (upperSearchValue) {
      setTicker(upperSearchValue);
      // Clear event ranges and close the news panel
      setEventRanges([]);
      setSelectedEvent(null);
      setNewsPanelActive(false);
    }
  };

  // Add this helper function near your other utility functions
  const calculatePriceTrend = (data: any[], startDate: string, endDate: string): "up" | "down" | "neutral" => {
    const periodData = data.filter(
      point => point.time >= startDate && point.time <= endDate
    );

    if (periodData.length < 2) return "neutral";

    const startPrice = periodData[0].close_price;
    const endPrice = periodData[periodData.length - 1].close_price;
    
    return endPrice > startPrice ? "up" : "down";
  };

  // Add this function to fetch unusual ranges
  const fetchUnusualRanges = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      // Clear the eventRanges so we always start fresh
      setEventRanges([]);

      // Format data the way your backend expects. For example, here we send parallel arrays:
      const requestBody = {
        data: {
          time: displayChartData.map(item => new Date(item.time).toISOString().split('T')[0]),
          price: displayChartData.map(item => Number(item.close_price)),
          volume: displayChartData.map(item => Number(item.volume))
        }
      };

      console.log("Fetching unusual ranges with:", requestBody);

      const response = await fetch(`${apiUrl}/api/unusual_range/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Error: ${response.status} => ${text}`);
      }

      const result = await response.json();
      console.log("Unusual ranges response:", result);

      // Convert each [start, end] to { start, end } and store in state
      if (Array.isArray(result.unusual_ranges)) {
        const newRanges = result.unusual_ranges.map(
          (range: [string, string]) => ({
            start: range[0],
            end: range[1],
          })
        );
        setEventRanges(newRanges);
      }

      // Always show the highlights after fetching
      setShowEventHighlights(true);

    } catch (error) {
      console.error("Failed to fetch unusual ranges:", error);
      // Optionally reset or handle error UI
      setEventRanges([]);
      setShowEventHighlights(false);
    }
  };

  // 1) Add extra state:
  const [shouldAnalyzeEvents, setShouldAnalyzeEvents] = useState(false);

  // 2) Modify the button click:
  const handleEventAnalyzerClick = () => {
    setSelectedEvent(null);
    setHoveredEvent(null);

    // Always set the flag, so if the user's data isn't ready yet,
    // we'll fetch as soon as it becomes ready:
    setShouldAnalyzeEvents(true);
  };

  // 3) useEffect that triggers once chart data arrives or user toggles:
  useEffect(() => {
    // If the user wants to see events AND our chart data is loaded, go fetch:
    if (shouldAnalyzeEvents && displayChartData.length > 0) {
      fetchUnusualRanges();
      setShouldAnalyzeEvents(false);
    }
  }, [shouldAnalyzeEvents, displayChartData]);

  // Around line ~76, you have a "controlsDisabled" boolean.
  // You can reuse that or create a new "eventAnalyzerDisabled" condition:
  const eventAnalyzerDisabled = displayChartData.length === 0 || isFetchingMaxData;

  const [newsPanelActive, setNewsPanelActive] = useState<boolean>(false);
  const [newsPanelDateRange, setNewsPanelDateRange] = useState<string>("");

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
            <div className="flex items-center gap-3 justify-center w-full max-w-xl mx-auto">
              <Input
                type="text"
                placeholder="Search stocks..."
                className="w-[400px]" // Increased width from 250px to 400px
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch((e.target as HTMLInputElement).value);
                  }
                }}
              />
              <Button 
                type="submit" 
                size="icon"
                onClick={() => {
                  // Get the input value from the Input component
                  const inputEl = document.querySelector('input[type="text"]') as HTMLInputElement;
                  handleSearch(inputEl.value);
                }}
              >
                <Search className="h-4 w-4" />
              </Button>
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
                          data={displayChartData}
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
                          {showEventHighlights && eventHighlights.map((event) => {
                            const trend = calculatePriceTrend(chartData, event.start, event.end);
                            
                            let fillColor: string;
                            if (selectedEvent === event.id) {
                              fillColor = trend === "up" 
                                ? "url(#diagonalPatternGreen)" 
                                : "url(#diagonalPatternRed)";
                            } else if (hoveredEvent === event.id) {
                              fillColor = trend === "up" 
                                ? "#22c55e"  // Tailwind green-500
                                : "#ef4444"; // Tailwind red-500
                            } else {
                              fillColor = trend === "up" 
                                ? "#86efac"  // Tailwind green-300
                                : "#fca5a5"; // Tailwind red-300
                            }

                            return (
                              <ReferenceArea
                                key={event.id}
                                x1={event.start}
                                x2={event.end}
                                fill={fillColor}
                                fillOpacity={selectedEvent === event.id ? 1 : 0.5}
                                onClick={() => {
                                  if (selectedEvent === event.id) {
                                    setSelectedEvent(null);
                                    setNewsPanelActive(false);
                                  } else {
                                    setSelectedEvent(event.id);
                                    setNewsPanelActive(true);
                                    setNewsPanelDateRange(`${event.start} - ${event.end}`);
                                  }
                                }}
                                onMouseEnter={() => setHoveredEvent(event.id)}
                                onMouseLeave={() => setHoveredEvent(null)}
                                cursor="pointer"
                                label={
                                  hoveredEvent === event.id && selectedEvent !== event.id
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
                          })}
                          {intervals.map((interval) => {
                            return (() => {
                              // Determine the starting and ending values for the interval.
                              const startDatum = displayChartData.find(d => d.time === interval.x1);
                              const endDatum = displayChartData.find(d => d.time === interval.x2);
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
                            <ToggleGroup
                              type="single"
                              value={selectedInterval ?? ""}
                              disabled={controlsDisabled}
                              className={controlsDisabled ? "opacity-50 cursor-not-allowed" : ""}
                              onValueChange={(value) => { 
                                // Update the selected interval without resetting the sliderValue.
                                setSelectedInterval(value);
                              }}
                            >
                              <ToggleGroupItem disabled={controlsDisabled} value="3Y" aria-label="3 Years">3Y</ToggleGroupItem>
                              <ToggleGroupItem disabled={controlsDisabled} value="1Y" aria-label="1 Year">1Y</ToggleGroupItem>
                              <ToggleGroupItem disabled={controlsDisabled} value="6M" aria-label="6 Months">6M</ToggleGroupItem>
                            </ToggleGroup>
                          </div>

                          <div className="w-[500px] space-y-3.5">
                            <Slider
                              disabled={controlsDisabled}
                              className={controlsDisabled ? "opacity-50 cursor-not-allowed" : ""}
                              value={[sliderValue]}
                              onValueChange={(value: number[]) => { 
                                setSliderValue(value[0]); 
                              }}
                            />
                            <div className={`flex justify-between items-center ${controlsDisabled ? "opacity-50" : ""}`}>
                              <span className="text-sm font-medium">
                                Date Range
                              </span>
                              <span className="text-sm font-medium text-muted-foreground">
                                {intervalStartDate && intervalEndDate 
                                  ? `${formatDate(intervalStartDate)} to ${formatDate(intervalEndDate)}`
                                  : "Loading..."}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button onClick={handleEventAnalyzerClick} disabled={eventAnalyzerDisabled}>
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
                        const lastItem = displayChartData[displayChartData.length - 1];
                        const prevItem = displayChartData[displayChartData.length - 2];
                        
                        if (!lastItem?.close_price || !prevItem?.close_price) {
                          return <span className="text-sm font-medium text-muted-foreground">N/A</span>;
                        }
                        
                        const pctChange = ((lastItem.close_price - prevItem.close_price) / prevItem.close_price) * 100;
                        const sign = pctChange > 0 ? "+" : "";
                        const colorClass = pctChange > 0 ? "text-green-600" : "text-red-600";
                        return (
                          <span className={`text-sm font-medium ${colorClass}`}>
                            {sign}{pctChange.toFixed(2)}%
                          </span>
                        );
                      })()}
                    </div>
                    {(() => {
                      const lastItem = displayChartData[displayChartData.length - 1];
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
                      const lastItem = displayChartData[displayChartData.length - 1];
                      if (!lastItem?.close_price || !lastItem?.volume) {
                        return <div className="text-3xl font-semibold text-muted-foreground">N/A</div>;
                      }
                      const marketCap = lastItem.close_price * lastItem.volume;
                      return (
                        <div className="text-3xl font-semibold">
                          {marketCap.toLocaleString("en-US", {
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
                      const lastTime = displayChartData[displayChartData.length - 1];
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
                      const lastItem = displayChartData[displayChartData.length - 1];
                      // Calculate TTM EPS using the last 4 quarters
                      const ttmEarnings = displayChartData
                        .slice(-252) // Approximate trading days in a year
                        .reduce((sum, item) => sum + (item.earnings || 0), 0);
                      
                      if (!lastItem?.close_price || ttmEarnings === 0) {
                        return <div className="text-3xl font-semibold text-muted-foreground">N/A</div>;
                      }
                      
                      const pe = lastItem.close_price / (ttmEarnings / lastItem.volume);
                      return (
                        <div className="text-3xl font-semibold">{pe.toFixed(2)}</div>
                      );
                    })()}
                  </div>
                  <Separator orientation="vertical" />
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">EPS (TTM)</div>
                    {(() => {
                      const lastItem = displayChartData[displayChartData.length - 1];
                      // Calculate TTM EPS
                      const ttmEarnings = displayChartData
                        .slice(-252) // Approximate trading days in a year
                        .reduce((sum, item) => sum + (item.earnings || 0), 0);
                      
                      if (!lastItem?.volume || ttmEarnings === 0) {
                        return <div className="text-3xl font-semibold text-muted-foreground">N/A</div>;
                      }
                      
                      const eps = ttmEarnings / lastItem.volume;
                      return (
                        <div className="text-3xl font-semibold">
                          {eps.toFixed(2)}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </Card>
            </div>

            {/* Conditionally render the NewsCard based on newsPanelActive */}
            {newsPanelActive && (
              <NewsCard
                onClose={() => setNewsPanelActive(false)}
                newsItems={newsData.newsItems}
                summary={newsData.summary}
                dateRange={newsPanelDateRange}
              />
            )}
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
                      data={displayChartData}
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
                      {showEventHighlights && eventHighlights.map((event) => {
                        const trend = calculatePriceTrend(chartData, event.start, event.end);
                        
                        let fillColor: string;
                        if (selectedEvent === event.id) {
                          fillColor = trend === "up" 
                            ? "url(#diagonalPatternGreen)" 
                            : "url(#diagonalPatternRed)";
                        } else if (hoveredEvent === event.id) {
                          fillColor = trend === "up" 
                            ? "#22c55e"  // Tailwind green-500
                            : "#ef4444"; // Tailwind red-500
                        } else {
                          fillColor = trend === "up" 
                            ? "#86efac"  // Tailwind green-300
                            : "#fca5a5"; // Tailwind red-300
                        }

                        return (
                          <ReferenceArea
                            key={event.id}
                            x1={event.start}
                            x2={event.end}
                            fill={fillColor}
                            fillOpacity={selectedEvent === event.id ? 1 : 0.5}
                            onClick={() => {
                              if (selectedEvent === event.id) {
                                setSelectedEvent(null);
                                setNewsPanelActive(false);
                              } else {
                                setSelectedEvent(event.id);
                                setNewsPanelActive(true);
                                setNewsPanelDateRange(`${event.start} - ${event.end}`);
                              }
                            }}
                            onMouseEnter={() => setHoveredEvent(event.id)}
                            onMouseLeave={() => setHoveredEvent(null)}
                            cursor="pointer"
                            label={
                              hoveredEvent === event.id && selectedEvent !== event.id
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
                      })}
                      {intervals.map((interval) => {
                        return (() => {
                          // Determine the starting and ending values for the interval.
                          const startDatum = displayChartData.find(d => d.time === interval.x1);
                          const endDatum = displayChartData.find(d => d.time === interval.x2);
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
                        <ToggleGroup
                          type="single"
                          value={selectedInterval ?? ""}
                          disabled={controlsDisabled}
                          className={controlsDisabled ? "opacity-50 cursor-not-allowed" : ""}
                          onValueChange={(value) => { 
                            // Update the selected interval without resetting the sliderValue.
                            setSelectedInterval(value);
                          }}
                        >
                          <ToggleGroupItem disabled={controlsDisabled} value="3Y" aria-label="3 Years">3Y</ToggleGroupItem>
                          <ToggleGroupItem disabled={controlsDisabled} value="1Y" aria-label="1 Year">1Y</ToggleGroupItem>
                          <ToggleGroupItem disabled={controlsDisabled} value="6M" aria-label="6 Months">6M</ToggleGroupItem>
                        </ToggleGroup>
                      </div>

                      <div className="w-[500px] space-y-3.5">
                        <Slider
                          disabled={controlsDisabled}
                          className={controlsDisabled ? "opacity-50 cursor-not-allowed" : ""}
                          value={[sliderValue]}
                          onValueChange={(value: number[]) => { 
                            setSliderValue(value[0]); 
                          }}
                        />
                        <div className={`flex justify-between items-center ${controlsDisabled ? "opacity-50" : ""}`}>
                          <span className="text-sm font-medium">
                            Date Range
                          </span>
                          <span className="text-sm font-medium text-muted-foreground">
                            {intervalStartDate && intervalEndDate 
                              ? `${formatDate(intervalStartDate)} to ${formatDate(intervalEndDate)}`
                              : "Loading..."}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button onClick={handleEventAnalyzerClick} disabled={eventAnalyzerDisabled}>
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
                    const lastItem = displayChartData[displayChartData.length - 1];
                    const prevItem = displayChartData[displayChartData.length - 2];
                    
                    if (!lastItem?.close_price || !prevItem?.close_price) {
                      return <span className="text-sm font-medium text-muted-foreground">N/A</span>;
                    }
                    
                    const pctChange = ((lastItem.close_price - prevItem.close_price) / prevItem.close_price) * 100;
                    const sign = pctChange > 0 ? "+" : "";
                    const colorClass = pctChange > 0 ? "text-green-600" : "text-red-600";
                    return (
                      <span className={`text-sm font-medium ${colorClass}`}>
                        {sign}{pctChange.toFixed(2)}%
                      </span>
                    );
                  })()}
                </div>
                {(() => {
                  const lastItem = displayChartData[displayChartData.length - 1];
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
                  const lastItem = displayChartData[displayChartData.length - 1];
                  if (!lastItem?.close_price || !lastItem?.volume) {
                    return <div className="text-3xl font-semibold text-muted-foreground">N/A</div>;
                  }
                  const marketCap = lastItem.close_price * lastItem.volume;
                  return (
                    <div className="text-3xl font-semibold">
                      {marketCap.toLocaleString("en-US", {
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
                  const lastTime = displayChartData[displayChartData.length - 1];
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
                  const lastItem = displayChartData[displayChartData.length - 1];
                  // Calculate TTM EPS using the last 4 quarters
                  const ttmEarnings = displayChartData
                    .slice(-252) // Approximate trading days in a year
                    .reduce((sum, item) => sum + (item.earnings || 0), 0);
                  
                  if (!lastItem?.close_price || ttmEarnings === 0) {
                    return <div className="text-3xl font-semibold text-muted-foreground">N/A</div>;
                  }
                  
                  const pe = lastItem.close_price / (ttmEarnings / lastItem.volume);
                  return (
                    <div className="text-3xl font-semibold">{pe.toFixed(2)}</div>
                  );
                })()}
              </div>
              <Separator orientation="vertical" />
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">EPS (TTM)</div>
                {(() => {
                  const lastItem = displayChartData[displayChartData.length - 1];
                  // Calculate TTM EPS
                  const ttmEarnings = displayChartData
                    .slice(-252) // Approximate trading days in a year
                    .reduce((sum, item) => sum + (item.earnings || 0), 0);
                  
                  if (!lastItem?.volume || ttmEarnings === 0) {
                    return <div className="text-3xl font-semibold text-muted-foreground">N/A</div>;
                  }
                  
                  const eps = ttmEarnings / lastItem.volume;
                  return (
                    <div className="text-3xl font-semibold">
                      {eps.toFixed(2)}
                    </div>
                  );
                })()}
              </div>
            </div>
            {intervalError && (
              <div className="mt-2 text-red-500 text-sm">
                {intervalError}
              </div>
            )}
          </Card>
        )}
      </main>
    </div>
  )
}

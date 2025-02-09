'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

const chartData = [
  { month: "January", value: 186 },
  { month: "February", value: 305 },
  { month: "March", value: 237 },
  { month: "April", value: 73 },
  { month: "May", value: 209 },
  { month: "June", value: 214 },
]

const chartConfig = {
  value: {
    label: "Stock Price",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export default function Chart() {
  return (
    <ChartContainer config={chartConfig}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={chartData}
          margin={{
            top: 10,
            right: 10,
            left: 10,
            bottom: 10,
          }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => value.slice(0, 3)}
          />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} />
          <Tooltip content={<ChartTooltipContent config={chartConfig} />} />
          <Area
            type="natural"
            dataKey="value"
            fill="var(--color-value)"
            fillOpacity={0.4}
            stroke="var(--color-value)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
} 
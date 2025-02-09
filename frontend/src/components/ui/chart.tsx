"use client"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export type ChartConfig = {
  [key: string]: {
    label: string
    color: string
  }
}

interface ChartContainerProps {
  config: ChartConfig
  children: React.ReactNode
}

export function ChartContainer({ config, children }: ChartContainerProps) {
  return (
    <div
      style={
        {
          ...Object.fromEntries(
            Object.entries(config).map(([key, value]) => [
              `--color-${key}`,
              value.color,
            ])
          ),
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  )
}

interface ChartTooltipProps {
  active?: boolean
  payload?: any[]
  config: ChartConfig
  indicator?: "line" | "bar"
}

export function ChartTooltipContent({
  active,
  payload,
  config,
  indicator = "line",
}: ChartTooltipProps) {
  if (!active || !payload) {
    return null
  }

  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        {payload.map((item: any) => (
          <div key={item.dataKey} className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {config[item.dataKey].label}
            </span>
            <span className="font-bold text-muted-foreground">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const ChartTooltip = Tooltip 
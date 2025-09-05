"use client"

import { useMemo, useState } from "react"
import { useInventory } from "@/lib/inventory-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

type Range = "day" | "week" | "month"

export function OverviewChart() {
  const { state } = useInventory()
  const [range, setRange] = useState<Range>("day")

  const data = useMemo(() => {
    const now = new Date()
    const buckets: { key: string; start: number; end: number }[] = []
    if (range === "day") {
      // last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(now.getDate() - i)
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
        const end = start + 24 * 60 * 60 * 1000
        buckets.push({ key: d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" }), start, end })
      }
    } else if (range === "week") {
      // last 8 weeks
      for (let i = 7; i >= 0; i--) {
        const start = new Date(now)
        start.setDate(now.getDate() - i * 7)
        const weekStart = new Date(start.getFullYear(), start.getMonth(), start.getDate())
        const end = weekStart.getTime() + 7 * 24 * 60 * 60 * 1000
        const k = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`
        buckets.push({ key: k, start: weekStart.getTime(), end })
      }
    } else {
      // last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const start = d.getTime()
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
        const k = d.toLocaleDateString(undefined, { month: "short" })
        buckets.push({ key: k, start, end })
      }
    }

    const rows = buckets.map((b) => {
      let inc = 0
      let dec = 0
      state.events.forEach((e) => {
        if (e.at >= b.start && e.at < b.end) {
          if (e.kind === "in") inc += e.qty
          else dec += e.qty
        }
      })
      return { period: b.key, increase: inc, decrease: dec }
    })
    return rows
  }, [state.events, range])

  return (
    <Card className="bg-neutral-900/60 border-neutral-800 overflow-hidden">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-xs tracking-wider text-neutral-400">DAILY / WEEKLY / MONTHLY</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={range === "day" ? "default" : "secondary"}
            className={
              range === "day" ? "bg-blue-600 hover:bg-blue-500" : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
            }
            onClick={() => setRange("day")}
          >
            Day
          </Button>
          <Button
            size="sm"
            variant={range === "week" ? "default" : "secondary"}
            className={
              range === "week"
                ? "bg-blue-600 hover:bg-blue-500"
                : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
            }
            onClick={() => setRange("week")}
          >
            Week
          </Button>
          <Button
            size="sm"
            variant={range === "month" ? "default" : "secondary"}
            className={
              range === "month"
                ? "bg-blue-600 hover:bg-blue-500"
                : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
            }
            onClick={() => setRange("month")}
          >
            Month
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 h-80 md:h-96 overflow-hidden">
        <ChartContainer
          className="h-full w-full aspect-auto chart-clip chart-soft"
          config={{
            increase: { label: "Stock In", color: "hsl(var(--chart-2))" },
            decrease: { label: "Stock Out", color: "hsl(var(--chart-3))" },
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 12, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2b30" />
              <XAxis dataKey="period" tick={{ fill: "#9ca3af", fontSize: 12 }} tickMargin={14} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend verticalAlign="bottom" height={24} wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
              <Line
                type="linear"
                dataKey="increase"
                stroke="#22c55e"
                name="Stock In"
                dot={false}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Line
                type="linear"
                dataKey="decrease"
                stroke="#fb923c"
                name="Stock Out"
                dot={false}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

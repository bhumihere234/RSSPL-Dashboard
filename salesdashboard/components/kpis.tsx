"use client"

import type React from "react"

import { AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMemo } from "react"
import { useInventory } from "@/lib/inventory-store"

function ArrowSolidUp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2l6 6h-4v12h-4V8H6l6-6z" />
    </svg>
  )
}
function ArrowSolidDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 22l-6-6h4V4h4v12h4l-6 6z" />
    </svg>
  )
}

export function KPIs() {
  const { state } = useInventory()

  const { pctIn, totalOut, emptyCount } = useMemo(() => {
    const totals = state.events.reduce(
      (acc, e) => {
        if (e.kind === "in") acc.in += e.qty
        else acc.out += e.qty
        return acc
      },
      { in: 0, out: 0 },
    )
    const denom = totals.in + totals.out
    const pctIn = denom ? Math.round((totals.in / denom) * 100) : 0

    let empty = 0
    Object.values(state.items).forEach((types) => {
      Object.values(types).forEach((q) => {
        if (q === 0) empty += 1
      })
    })

    return { pctIn, totalOut: totals.out, emptyCount: empty }
  }, [state.events, state.items])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-neutral-900/60 border-neutral-800 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs tracking-wider text-neutral-400">TOTAL % STOCK IN</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between">
          <div className="text-4xl font-extrabold text-white">{pctIn}%</div>
          <div className="kpi-arrow-stack text-green-500 shrink-0 overflow-hidden">
            <ArrowSolidUp className="kpi-icon kpi-arrow-up kpi-delay-0" />
            <ArrowSolidUp className="kpi-icon kpi-arrow-up kpi-delay-1" />
            <ArrowSolidUp className="kpi-icon kpi-arrow-up kpi-delay-2" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-neutral-900/60 border-neutral-800 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs tracking-wider text-neutral-400">TOTAL STOCK OUT</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between">
          <div className="text-4xl font-extrabold text-white">{totalOut}</div>
          <div className="kpi-arrow-stack text-orange-500 shrink-0 overflow-hidden">
            <ArrowSolidDown className="kpi-icon kpi-arrow-down kpi-delay-0" />
            <ArrowSolidDown className="kpi-icon kpi-arrow-down kpi-delay-1" />
            <ArrowSolidDown className="kpi-icon kpi-arrow-down kpi-delay-2" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-neutral-900/60 border-neutral-800 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs tracking-wider text-neutral-400">ITEM TYPES EMPTY</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between">
          <div className="text-4xl font-extrabold text-white">{emptyCount}</div>
          <div className="flex items-center gap-2 text-neutral-400">
            <AlertTriangle size={18} className="text-orange-400" />
            <span className="text-xs text-neutral-400">qty = 0</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

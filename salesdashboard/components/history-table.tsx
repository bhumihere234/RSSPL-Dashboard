"use client"

import React, { useMemo, useState } from "react"
import type { InventoryEvent } from "@/lib/inventory-store"
import { useInventory } from "@/lib/inventory-store"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Mode = "in" | "out" | "total"

export function HistoryTable({ mode }: { mode: Mode }) {
  const { state } = useInventory()
  const [search, setSearch] = useState("")

  const rows = useMemo(() => {
    if (mode === "total") {
      const lastIn = new Map<string, number>()
      const lastOut = new Map<string, number>()
      state.events.forEach((e) => {
        const key = `${e.item}__${e.type}`
        if (e.kind === "in") lastIn.set(key, Math.max(lastIn.get(key) ?? 0, e.at))
        else lastOut.set(key, Math.max(lastOut.get(key) ?? 0, e.at))
      })
      let list: { item: string; type: string; qty: number; lastIn?: number; lastOut?: number }[] = []
      Object.entries(state.items).forEach(([item, types]) => {
        Object.entries(types).forEach(([type, qty]) => {
          const key = `${item}__${type}`
          list.push({ item, type, qty, lastIn: lastIn.get(key), lastOut: lastOut.get(key) })
        })
      })
      // Sort by item name then type
      list = list.sort((a, b) => (a.item + a.type).localeCompare(b.item + b.type))
      if (search.trim()) {
        list = list.filter((r) => r.item.toLowerCase().includes(search.toLowerCase()))
      }
      return list
    } else {
      let filtered = state.events.filter((e) => e.kind === mode).sort((a, b) => b.at - a.at)
      if (search.trim()) {
        filtered = filtered.filter((e) => e.item.toLowerCase().includes(search.toLowerCase()))
      }
      return filtered
    }
  }, [state.items, state.events, mode, search])

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-md">
      <div className="p-3 flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search item name..."
          className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100 placeholder:text-neutral-500 w-64"
        />
      </div>
      <Table className="text-neutral-200">
        <TableHeader className="bg-neutral-900/80">
          <TableRow className="border-neutral-800">
            {mode === "total" ? (
              <>
                <TableHead className="text-neutral-400">Item</TableHead>
                <TableHead className="text-neutral-400">Type</TableHead>
                <TableHead className="text-neutral-400">Qty Available</TableHead>
                <TableHead className="text-neutral-400">Last In</TableHead>
                <TableHead className="text-neutral-400">Last Out</TableHead>
              </>
            ) : (
              <>
                <TableHead className="text-neutral-400">Date</TableHead>
                <TableHead className="text-neutral-400">Item</TableHead>
                <TableHead className="text-neutral-400">Type</TableHead>
                <TableHead className="text-neutral-400">Quantity</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {mode === "total"
            ? (rows as Array<{ item: string; type: string; qty: number; lastIn?: number; lastOut?: number }>).map((r) => (
                <TableRow key={`${r.item}-${r.type}`} className="border-neutral-800">
                  <TableCell className="text-neutral-100">{r.item}</TableCell>
                  <TableCell className="text-neutral-300">{r.type}</TableCell>
                  <TableCell className="text-neutral-100">{r.qty}</TableCell>
                  <TableCell className="text-neutral-400">
                    {r.lastIn ? new Date(r.lastIn).toLocaleString() : "-"}
                  </TableCell>
                  <TableCell className="text-neutral-400">
                    {r.lastOut ? new Date(r.lastOut).toLocaleString() : "-"}
                  </TableCell>
                </TableRow>
              ))
            : (rows as InventoryEvent[]).map((r) => (
                <TableRow key={r.id} className="border-neutral-800">
                  <TableCell className="text-neutral-300">{new Date(r.at).toLocaleString()}</TableCell>
                  <TableCell className="text-neutral-100">{r.item}</TableCell>
                  <TableCell className="text-neutral-300">{r.type}</TableCell>
                  <TableCell className={mode === "in" ? "text-green-400" : "text-orange-400"}>{r.qty}</TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  )
}

"use client"

import React, { useMemo, useState } from "react"
import type { InventoryEvent } from "@/lib/inventory-store"
import { useInventory } from "@/lib/inventory-store"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Mode = "in" | "out" | "total"

export function HistoryTable({ mode }: { mode: Mode }) {
  const inventory = useInventory()
  const [search, setSearch] = useState("")

  const rows = useMemo(() => {
    if (mode === "total") {
      // total view = calculate current stock per item/type
      const stockMap: Record<string, Record<string, number>> = {}
      
      inventory.events.forEach((e) => {
        if (!stockMap[e.item]) stockMap[e.item] = {}
        if (!stockMap[e.item][e.type]) stockMap[e.item][e.type] = 0
        
        stockMap[e.item][e.type] += e.kind === "IN" ? e.qty : -e.qty
      })
      
      const list: Array<{ item: string; type: string; qty: number }> = []
      Object.entries(stockMap).forEach(([item, types]) => {
        Object.entries(types).forEach(([type, qty]) => {
          if (qty > 0) { // Only show positive stock
            list.push({ item, type, qty })
          }
        })
      })
      
      let sortedList = list.sort((a, b) => (a.item + a.type).localeCompare(b.item + b.type))
      if (search.trim()) {
        sortedList = sortedList.filter((r) => r.item.toLowerCase().includes(search.toLowerCase()))
      }
      return sortedList
    } else {
      // in/out view = filter and sort events
      const kindFilter = mode === "in" ? "IN" : "OUT"
      let filtered = inventory.events
        .filter((e) => e.kind === kindFilter)
        .sort((a, b) => b.timestamp - a.timestamp)
      
      if (search.trim()) {
        filtered = filtered.filter((e) => e.item.toLowerCase().includes(search.toLowerCase()))
      }
      return filtered
    }
  }, [inventory.events, mode, search])

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
                <TableHead className="text-neutral-400">Current Stock</TableHead>
              </>
            ) : (
              <>
                <TableHead className="text-neutral-400">Item</TableHead>
                <TableHead className="text-neutral-400">Type</TableHead>
                <TableHead className="text-neutral-400">Quantity</TableHead>
                <TableHead className="text-neutral-400">Source</TableHead>
                <TableHead className="text-neutral-400">Supplier</TableHead>
                <TableHead className="text-neutral-400">Rate</TableHead>
                <TableHead className="text-neutral-400">Date</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={mode === "total" ? `${r.item}-${r.type}` : (r as InventoryEvent).id} className="border-neutral-800">
              <TableCell className="text-neutral-300">{r.item}</TableCell>
              <TableCell className="text-neutral-300">{r.type}</TableCell>
              {mode === "total" ? (
                <TableCell className="text-green-400">{r.qty}</TableCell>
              ) : (
                <>
                  <TableCell className={(r as InventoryEvent).kind === "IN" ? "text-green-400" : "text-orange-400"}>
                    {r.qty}
                  </TableCell>
                  <TableCell className="text-neutral-300">{(r as InventoryEvent).source}</TableCell>
                  <TableCell className="text-neutral-300">{(r as InventoryEvent).supplier}</TableCell>
                  <TableCell className="text-neutral-300">{(r as InventoryEvent).rate}</TableCell>
                  <TableCell className="text-neutral-300">
                    {new Date((r as InventoryEvent).timestamp).toLocaleString()}
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow className="border-neutral-800">
              <TableCell colSpan={mode === "total" ? 3 : 7} className="text-center text-neutral-500 py-8">
                No {mode === "total" ? "stock" : `${mode} events`} found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

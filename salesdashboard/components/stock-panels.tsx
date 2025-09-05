"use client"

import React from "react";
import { useState, useMemo } from "react"
import { useInventory } from "@/lib/inventory-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Plus, Trash2 } from "lucide-react"
import * as XLSX from "xlsx"

function ItemDropdown({
  selected,
  onSelect,
  onAdd,
  onRemove,
  options,
  label,
}: {
  selected?: string
  onSelect: (v: string) => void
  onAdd: (name: string) => void
  onRemove: (name: string) => void
  options: string[]
  label: string
}) {
  const [newName, setNewName] = useState("")
  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 text-neutral-200 px-3 py-2 rounded-md text-sm">
          <span className="text-neutral-400">{label}:</span>
          <span className="font-medium text-neutral-100">{selected ?? "Select"}</span>
          <ChevronDown size={14} className="text-neutral-500" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-56 bg-[#121317] border-neutral-800 text-neutral-100">
          <DropdownMenuLabel className="text-neutral-400">Choose</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.map((o) => (
            <DropdownMenuItem key={o} onClick={() => onSelect(o)} className="flex items-center justify-between">
              {o}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(o)
                }}
                className="p-1 rounded hover:bg-neutral-800"
                aria-label={`Remove ${o}`}
              >
                <Trash2 size={14} className="text-neutral-500" />
              </button>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <div className="px-2 py-2">
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`Add ${label.toLowerCase()}`}
                className="bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (newName.trim()) {
                    onAdd(newName.trim())
                    setNewName("")
                  }
                }}
                className="bg-blue-600 hover:bg-blue-500"
              >
                <Plus size={14} />
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function StockPanels() {
  // Inventory context
  const inv = useInventory();
  // Item selection
  const [item, setItem] = React.useState<string | undefined>(Object.keys(inv.state.items)[0]);
  // Type selection
  const [type, setType] = React.useState("");
  // Types for selected item
  const types: string[] = item ? Object.keys(inv.state.items[item] ?? {}) : [];
  // Quantity available
  const qty = item && type && inv.state.items[item] && inv.state.items[item][type] && typeof inv.state.items[item][type] === 'object'
    ? ((inv.state.items[item][type] as { qty: number }).qty ?? 0)
    : 0;
  // Quantity out
  const [qout, setQout] = React.useState(0);
  // Source selection
  const [source, setSource] = React.useState<string | null>(null);
  // Supplier report state
  const [reportResults, setReportResults] = React.useState<Array<{id: string; at: string | number; item: string; type: string; qty: number; price?: number}>>([]);
  const [reportSource, setReportSource] = React.useState("");
  const [reportFrom, setReportFrom] = React.useState("");
  const [reportTo, setReportTo] = React.useState("");
  // Search functionality
  const [searchIn, setSearchIn] = React.useState("");
  const [searchMenuOpen, setSearchMenuOpen] = React.useState(false);
  const filteredItems: string[] = Object.keys(inv.state.items).filter((name: string) =>
    name.toLowerCase().includes(searchIn.toLowerCase())
  );
  // Handler functions
  const handleGenerateReport = () => {
    // Dummy implementation
    setReportResults([]);
  };
  const handleDownloadExcel = () => {
    // Dummy implementation
    return;
  };
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* STOCK IN */}
        <Card className="bg-neutral-900/60 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-xs tracking-wider text-neutral-400">STOCK IN</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Search input for Stock In section */}
            <div className="flex items-center gap-2 mb-2 relative">
              <Input
                type="text"
                value={searchIn}
                onChange={(e) => setSearchIn(e.target.value)}
                placeholder="Search item name..."
                className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100 placeholder:text-neutral-500 w-64"
              />
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-500"
                onClick={() => setSearchMenuOpen(true)}
              >
                Search
              </Button>
              {searchMenuOpen && (
                <div className="absolute top-full left-0 mt-2 z-10 bg-[#121317] border border-neutral-800 rounded shadow-lg min-w-64">
                  {filteredItems.length === 0 ? (
                    <div className="p-3 text-neutral-400">No items found</div>
                  ) : (
                    <div>
                      {filteredItems.map((name) => (
                        <div
                          key={name}
                          className="px-4 py-2 cursor-pointer hover:bg-neutral-800 text-neutral-100"
                          onClick={() => {
                            setItem(name);
                            setSearchMenuOpen(false);
                          }}
                        >
                          {name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* ...rest of STOCK IN controls (dropdowns, inputs, etc.) ... */}
          </CardContent>
        </Card>
        {/* STOCK OUT */}
        <Card className="bg-neutral-900/60 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-xs tracking-wider text-neutral-400">STOCK OUT</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ItemDropdown
              label="Item"
              selected={item}
              onSelect={(v) => {
                setItem(v)
                const first = Object.keys(inv.state.items[v] ?? {})[0]
                setType(first)
              }}
              onAdd={(name) => inv.addItem(name)}
              onRemove={(name) => inv.removeItem(name)}
              options={Object.keys(inv.state.items)}
            />
            <ItemDropdown
              label="Type"
              selected={type}
              onSelect={(v: string) => setType(v)}
              onAdd={(name: string) => item && inv.addType(item, name)}
              onRemove={(name: string) => item && inv.removeType(item, name)}
              options={types}
            />
            <Input
              type="number"
              value={qout}
              onChange={(e) => setQout(Number(e.target.value))}
              placeholder="Quantity to remove"
              className="flex-1 bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
            />
            <Button
              className="bg-orange-500 hover:bg-orange-400"
              onClick={() => {
                if (item && type && qout > 0) {
                  inv.stockOut(item, type, qout)
                  setQout(0)
                }
              }}
            >
              Remove
            </Button>
            <div className="text-xs text-neutral-400">
              Selected available: <span className="text-neutral-100">{qty}</span>
            </div>
          </CardContent>
        </Card>
        {/* TOTAL STOCK */}
        <Card className="bg-neutral-900/60 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-xs tracking-wider text-neutral-400">TOTAL STOCK</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ItemDropdown
              label="Item"
              selected={item}
              onSelect={(v) => {
                setItem(v)
                const first = Object.keys(inv.state.items[v] ?? {})[0]
                setType(first)
              }}
              onAdd={(name) => inv.addItem(name)}
              onRemove={(name) => inv.removeItem(name)}
              options={Object.keys(inv.state.items)}
            />
            <ItemDropdown
              label="Type"
              selected={type}
              onSelect={(v: string) => setType(v)}
              onAdd={(name: string) => item && inv.addType(item, name)}
              onRemove={(name: string) => item && inv.removeType(item, name)}
              options={types}
            />
            <div className="bg-neutral-900 border border-neutral-800 rounded-md p-3">
              <div className="text-xs text-neutral-400">Quantity available</div>
              <div className="mt-1 text-3xl font-extrabold text-white">{qty}</div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Supplier Report Section */}
      <div className="mt-8 bg-neutral-900/60 border border-neutral-800 rounded-md p-6">
        <h2 className="text-xs tracking-wider text-neutral-400 mb-4">Supplier Report</h2>
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">From</label>
            <input
              type="date"
              value={reportFrom}
              onChange={(e) => setReportFrom(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">To</label>
            <input
              type="date"
              value={reportTo}
              onChange={(e) => setReportTo(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100"
            />
          </div>
        </div>
        {/* Source selection on a separate line */}
        <div className="mb-4">
          <label className="block text-xs text-neutral-400 mb-1">Supplier</label>
          <select
            value={reportSource}
            onChange={(e) => setReportSource(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100"
          >
            {inv.state.sources.map((src) => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-4 mb-4">
          <Button className="bg-blue-600 hover:bg-blue-500" onClick={handleGenerateReport}>
            Generate Report
          </Button>
          <Button className="bg-green-600 hover:bg-green-500" onClick={handleDownloadExcel}>
            Download Excel
          </Button>
        </div>
        {/* Report Table */}
        {/* Report Table Section - fix JSX conditional rendering */}
        {reportResults.length > 0 ? (
          <div className="mt-4">
            <h3 className="text-xs text-neutral-400 mb-2">Report for {reportSource} ({reportFrom} to {reportTo})</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-neutral-400">
                  <th className="px-2 py-1 text-left">Date</th>
                  <th className="px-2 py-1 text-left">Item</th>
                  <th className="px-2 py-1 text-left">Type</th>
                  <th className="px-2 py-1 text-left">Quantity</th>
                  <th className="px-2 py-1 text-left">Price</th>
                </tr>
              </thead>
              <tbody>
                {reportResults.map((e) => (
                  <tr key={e.id} className="border-b border-neutral-800">
                    <td className="px-2 py-1">{new Date(e.at).toLocaleString()}</td>
                    <td className="px-2 py-1">{e.item}</td>
                    <td className="px-2 py-1">{e.type}</td>
                    <td className="px-2 py-1">{e.qty}</td>
                    <td className="px-2 py-1">₹{e.price ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4">
            <h3 className="text-xs text-neutral-400 mb-2">Dummy Report Structure</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-neutral-400">
                  <th className="px-2 py-1 text-left">Date</th>
                  <th className="px-2 py-1 text-left">Item</th>
                  <th className="px-2 py-1 text-left">Type</th>
                  <th className="px-2 py-1 text-left">Quantity</th>
                  <th className="px-2 py-1 text-left">Price</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-neutral-800">
                  <td className="px-2 py-1">2025-09-05 10:00</td>
                  <td className="px-2 py-1">Boxes</td>
                  <td className="px-2 py-1">Small</td>
                  <td className="px-2 py-1">50</td>
                  <td className="px-2 py-1">₹1000</td>
                </tr>
                <tr className="border-b border-neutral-800">
                  <td className="px-2 py-1">2025-09-05 11:00</td>
                  <td className="px-2 py-1">Tape</td>
                  <td className="px-2 py-1">Large</td>
                  <td className="px-2 py-1">20</td>
                  <td className="px-2 py-1">₹400</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

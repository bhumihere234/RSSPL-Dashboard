"use client"

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
  const inv = useInventory()
  // State
  const [item, setItem] = useState<string | undefined>(Object.keys(inv.state.items)[0])
  const [type, setType] = useState<string | undefined>(item ? Object.keys(inv.state.items[item] ?? {})[0] : undefined)
  const types = useMemo(() => (item ? Object.keys(inv.state.items[item] ?? {}) : []), [item, inv.state.items, item])
  const qty = inv.getQty(item || "", type || "")
  const [source, setSource] = useState<string | undefined>(inv.state.sources[0])
  const [price, setPrice] = useState<number>(0)
  const [qin, setQin] = useState<number>(0)
  const [qout, setQout] = useState<number>(0)
  const [searchIn, setSearchIn] = useState("")
  const [searchMenuOpen, setSearchMenuOpen] = useState(false)
  const filteredItems = useMemo(() => {
    const allItems = Object.keys(inv.state.items)
    if (!searchIn.trim()) return allItems
    return allItems.filter((name) => name.toLowerCase().includes(searchIn.toLowerCase()))
  }, [inv.state.items, searchIn])
  // Supplier report state
  const [reportSource, setReportSource] = useState<string>(inv.state.sources[0] || "")
  const [reportFrom, setReportFrom] = useState<string>("")
  const [reportTo, setReportTo] = useState<string>("")
  const [reportResults, setReportResults] = useState<any[]>([])
  const handleGenerateReport = () => {
    if (!reportSource || !reportFrom || !reportTo) return
    const fromDate = new Date(reportFrom).getTime()
    const toDate = new Date(reportTo).getTime()
    const results = inv.state.events.filter(
      (e) =>
        e.kind === "in" &&
        e.source === reportSource &&
        e.at >= fromDate &&
        e.at <= toDate
    )
    setReportResults(results)
  }
  // Excel download handler
  const handleDownloadExcel = () => {
    // Prepare data
    const data = (reportResults.length > 0 ? reportResults : [
      { at: new Date("2025-09-05T10:00:00"), item: "Boxes", type: "Small", qty: 50, price: 1000 },
      { at: new Date("2025-09-05T11:00:00"), item: "Tape", type: "Large", qty: 20, price: 400 },
    ]).map((e) => ({
      Date: typeof e.at === "number" ? new Date(e.at).toLocaleString() : e.at.toLocaleString(),
      Item: e.item,
      Type: e.type,
      Quantity: e.qty,
      Price: e.price ? `₹${e.price}` : "-"
    }))
    // Create worksheet and workbook
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Supplier Report")
    // Download
    XLSX.writeFile(wb, `supplier_report_${reportSource}_${reportFrom}_${reportTo}.xlsx`)
  }

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
                    filteredItems.map((name) => (
                      <div
                        key={name}
                        className="px-4 py-2 cursor-pointer hover:bg-neutral-800 text-neutral-100"
                        onClick={() => {
                          setItem(name)
                          setSearchMenuOpen(false)
                        }}
                      >
                        {name}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <ItemDropdown
              label="Item"
              selected={item}
              onSelect={(v) => {
                setItem(v)
                const first = Object.keys(inv.state.items[v] ?? {})[0]
                setType(first)
              }}
              onAdd={(name) => {
                inv.addItem(name)
                setSearchIn("")
              }}
              onRemove={(name) => inv.removeItem(name)}
              options={Object.keys(inv.state.items)}
            />
            <ItemDropdown
              label="Type"
              selected={type}
              onSelect={setType}
              onAdd={(name) => item && inv.addType(item, name)}
              onRemove={(name) => item && inv.removeType(item, name)}
              options={types}
            />
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={qin}
                onChange={(e) => setQin(Number(e.target.value))}
                placeholder="Quantity to add"
                className="flex-1 bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
              />
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                placeholder="Price"
                className="flex-1 bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
              />
              <Button
                className="bg-green-600 hover:bg-green-500"
                onClick={() => {
                  if (item && type && qin > 0 && source && price > 0) {
                    inv.stockIn(item, type, qin, source, price)
                    setQin(0)
                    setPrice(0)
                  }
                }}
              >
                Add
              </Button>
            </div>
            {/* Source selection on a new line */}
            <div className="mt-2">
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 text-neutral-200 px-3 py-2 rounded-md text-sm">
                  <span className="text-neutral-400">Source:</span>
                  <span className="font-medium text-neutral-100">{source ?? "Select"}</span>
                  <ChevronDown size={14} className="text-neutral-500" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-56 bg-[#121317] border-neutral-800 text-neutral-100">
                  <DropdownMenuLabel className="text-neutral-400">Choose</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {inv.state.sources.map((src) => (
                    <DropdownMenuItem key={src} onClick={() => setSource(src)}>{src}</DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <div className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Add source"
                        className="bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.currentTarget.value.trim()) {
                            inv.addSource(e.currentTarget.value.trim())
                            e.currentTarget.value = ""
                          }
                        }}
                      />
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="text-xs text-neutral-400">
              Selected available: <span className="text-neutral-100">{qty}</span>
            </div>
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
              onSelect={setType}
              onAdd={(name) => item && inv.addType(item, name)}
              onRemove={(name) => item && inv.removeType(item, name)}
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
              onSelect={setType}
              onAdd={(name) => item && inv.addType(item, name)}
              onRemove={(name) => item && inv.removeType(item, name)}
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
        {(reportResults.length > 0) ? (
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
                    <td className="px-2 py-1">₹{e.price ?? '-'} </td>
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
  )
}

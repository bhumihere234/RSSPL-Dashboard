"use client";

import React from "react";
import { useState } from "react";
import { useInventory } from "@/lib/inventory-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, Trash2 } from "lucide-react";

/* ---------- small internal component ---------- */
function ItemDropdown({
  selected,
  onSelect,
  onAdd,
  onRemove,
  options,
  label,
}: {
  selected?: string;
  onSelect: (v: string) => void;
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  options: string[];
  label: string;
}) {
  const [newName, setNewName] = useState("");
  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 text-neutral-200 px-3 py-2 rounded-md text-sm">
          <span className="text-neutral-400">{label}:</span>
          <span className="font-medium text-neutral-100">
            {selected ?? "Select"}
          </span>
          <ChevronDown size={14} className="text-neutral-500" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-56 bg-[#121317] border-neutral-800 text-neutral-100">
          <DropdownMenuLabel className="text-neutral-400">Choose</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.map((o) => (
            <DropdownMenuItem
              key={o}
              onClick={() => onSelect(o)}
              className="flex items-center justify-between"
            >
              {o}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(o);
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
                    onAdd(newName.trim());
                    setNewName("");
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
  );
}

/* ======================= MAIN ======================= */
export default function StockPanels() {
  const inv = useInventory();

  // Shared selectors
  const [item, setItem] = useState<string | undefined>(
    Object.keys(inv.state.items)[0]
  );
  const [type, setType] = useState("");
  const types: string[] = item ? Object.keys(inv.state.items[item] ?? {}) : [];
  const qtyAvailable =
    item && type && inv.state.items[item] && inv.state.items[item][type] !== undefined
      ? inv.state.items[item][type]
      : 0;

  /* ---------- STOCK IN state ---------- */
  const [searchIn, setSearchIn] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const filteredItems: string[] = Object.keys(inv.state.items).filter((n) =>
    n.toLowerCase().includes(searchIn.toLowerCase())
  );

  const [inQty, setInQty] = useState<number>(0);
  const [inSource, setInSource] = useState<string>(inv.state.sources[0] ?? "");
  const [newSource, setNewSource] = useState<string>("");
  const [inPrice, setInPrice] = useState<number | "">("");

  const handleAddSource = () => {
    const name = newSource.trim();
    if (!name) return;
    inv.addSource(name);
    setInSource(name);
    setNewSource("");
  };

  const handleStockIn = () => {
    if (!item || !type || !inQty || inQty <= 0) return;
    inv.stockIn(
      item,
      type,
      inQty,
      inSource || undefined,
      typeof inPrice === "number" ? inPrice : undefined
    );
    setInQty(0);
    setInPrice("");
  };

  /* ---------- STOCK OUT state ---------- */
  const [qout, setQout] = useState(0);

  /* ---------- Supplier report: ALL events, supplier optional ---------- */
  const [reportResults, setReportResults] = useState<
    Array<{
      id: string;
      at: string | number;
      kind: "in" | "out";
      item: string;
      type: string;
      qty: number;
      price?: number;
      source?: string;
    }>
  >([]);
  const [reportSource, setReportSource] = useState<string>(""); // "" = All suppliers
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");

  const handleGenerateReport = () => {
    const fromMs =
      reportFrom && !Number.isNaN(new Date(reportFrom).getTime())
        ? new Date(reportFrom).setHours(0, 0, 0, 0)
        : -Infinity;
    const toMs =
      reportTo && !Number.isNaN(new Date(reportTo).getTime())
        ? new Date(reportTo).setHours(23, 59, 59, 999)
        : Infinity;

    const rows = inv.state.events
      // include BOTH "in" and "out"
      .filter((e) => e.at >= fromMs && e.at <= toMs)
      // only filter by supplier if one is selected; events without a source
      // are excluded when a supplier is selected
      .filter((e) => (reportSource ? e.source === reportSource : true))
      .sort((a, b) => a.at - b.at)
      .map((e) => ({
        id: e.id,
        at: e.at,
        kind: e.kind,
        item: e.item,
        type: e.type,
        qty: e.qty,
        price: e.price,
        source: e.source,
      }));

    setReportResults(rows);
  };

  const handleDownloadExcel = async () => {
    const XLSX = await import("xlsx");

    if (!reportResults.length) {
      alert("No report data available. Generate a report first.");
      return;
    }

    const reportRows = reportResults.map((r) => ({
      Date: new Date(r.at).toLocaleString(),
      Kind: r.kind,
      Supplier: r.source ?? "",
      Item: r.item,
      Type: r.type,
      Quantity: r.qty,
      Price: r.price ?? "",
    }));

    const wsReport = XLSX.utils.json_to_sheet(reportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsReport, "Report");

    const src = reportSource || "All";
    const filename = `report_${src}_${reportFrom || "start"}_${reportTo || "end"}.xlsx`;
    XLSX.writeFile(wb, filename, { compression: true });
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ================= STOCK IN ================= */}
        <Card className="bg-neutral-900/60 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-xs tracking-wider text-neutral-400">
              STOCK IN
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Quick item search */}
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
                onClick={() => setShowSearch(true)}
              >
                Search
              </Button>
              {showSearch && (
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
                            setShowSearch(false);
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

            {/* Actual Stock-In controls */}
            <ItemDropdown
              label="Item"
              selected={item}
              onSelect={(v) => {
                setItem(v);
                const first = Object.keys(inv.state.items[v] ?? {})[0] ?? "";
                setType(first);
              }}
              onAdd={(name) => inv.addItem(name)}
              onRemove={(name) => inv.removeItem(name)}
              options={Object.keys(inv.state.items)}
            />

            <ItemDropdown
              label="Type"
              selected={type}
              onSelect={(v) => setType(v)}
              onAdd={(name) => item && inv.addType(item, name)}
              onRemove={(name) => item && inv.removeType(item, name)}
              options={types}
            />

            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={inQty}
                onChange={(e) => setInQty(Number(e.target.value))}
                placeholder="Quantity to add"
                className="w-40 bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
              />
              <Input
                type="number"
                value={inPrice}
                onChange={(e) =>
                  setInPrice(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="Price (optional)"
                className="w-44 bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={inSource}
                onChange={(e) => setInSource(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100"
              >
                {inv.state.sources.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
                {!inv.state.sources.length && (
                  <option value="">No sources</option>
                )}
              </select>

              <Input
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                placeholder="Add new supplier"
                className="w-48 bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
              />
              <Button
                size="sm"
                className="bg-slate-700 hover:bg-slate-600"
                onClick={handleAddSource}
              >
                Add Supplier
              </Button>

              <Button
                className="ml-auto bg-green-600 hover:bg-green-500"
                onClick={handleStockIn}
              >
                Add Stock
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ================= STOCK OUT ================= */}
        <Card className="bg-neutral-900/60 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-xs tracking-wider text-neutral-400">
              STOCK OUT
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ItemDropdown
              label="Item"
              selected={item}
              onSelect={(v) => {
                setItem(v);
                const first = Object.keys(inv.state.items[v] ?? {})[0] ?? "";
                setType(first);
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
                  inv.stockOut(item, type, qout);
                  setQout(0);
                }
              }}
            >
              Remove
            </Button>
            <div className="text-xs text-neutral-400">
              Selected available:{" "}
              <span className="text-neutral-100">{qtyAvailable}</span>
            </div>
          </CardContent>
        </Card>

        {/* ================= TOTAL STOCK ================= */}
        <Card className="bg-neutral-900/60 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-xs tracking-wider text-neutral-400">
              TOTAL STOCK
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ItemDropdown
              label="Item"
              selected={item}
              onSelect={(v) => {
                setItem(v);
                const first = Object.keys(inv.state.items[v] ?? {})[0] ?? "";
                setType(first);
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
              <div className="mt-1 text-3xl font-extrabold text-white">
                {qtyAvailable}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================= Supplier Report ================= */}
      <div className="mt-8 bg-neutral-900/60 border border-neutral-800 rounded-md p-6">
        <h2 className="text-xs tracking-wider text-neutral-400 mb-4">
          Supplier Report
        </h2>
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">From</label>
            <input
              type="date"
              value={reportFrom}
              onChange={(e) => setReportFrom(e.target.value)}
              className="bg-neutral-900 border-neutral-800 rounded px-3 py-2 text-neutral-100"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">To</label>
            <input
              type="date"
              value={reportTo}
              onChange={(e) => setReportTo(e.target.value)}
              className="bg-neutral-900 border-neutral-800 rounded px-3 py-2 text-neutral-100"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs text-neutral-400 mb-1">Supplier</label>
          <select
            value={reportSource}
            onChange={(e) => setReportSource(e.target.value)}
            className="bg-neutral-900 border-neutral-800 rounded px-3 py-2 text-neutral-100"
          >
            <option value="">All suppliers</option>
            {inv.state.sources.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
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

        {reportResults.length > 0 ? (
          <div className="mt-4">
            <h3 className="text-xs text-neutral-400 mb-2">
              Report for {reportSource || "All suppliers"} ({reportFrom || "start"} to {reportTo || "end"})
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-neutral-400">
                  <th className="px-2 py-1 text-left">Date</th>
                  <th className="px-2 py-1 text-left">Kind</th>
                  <th className="px-2 py-1 text-left">Supplier</th>
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
                    <td className="px-2 py-1">{e.kind === "in" ? "Stock In" : "Stock Out"}</td>
                    <td className="px-2 py-1">{e.source ?? ""}</td>
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
          <div className="mt-4 text-neutral-400 text-sm">
            No report rows yet. Set dates/supplier (optional) and click <b>Generate Report</b>.
          </div>
        )}
      </div>
    </div>
  );
}

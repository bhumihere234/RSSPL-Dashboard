"use client";

import React from "react";
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
import * as XLSX from "xlsx";

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
  const [newName, setNewName] = React.useState("");
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

export default function StockPanels() {
  const inv = useInventory();

  const [item, setItem] = React.useState<string | undefined>(Object.keys(inv.state.items)[0]);
  const [type, setType] = React.useState("");
  const types = item ? Object.keys(inv.state.items[item] ?? {}) : [];

  const qtySelected =
    item && type && inv.state.items[item] && typeof inv.state.items[item][type] === "number"
      ? (inv.state.items[item][type] as number)
      : 0;

  // STOCK IN fields
  const [qin, setQin] = React.useState<number>(0);
  const [sourceIn, setSourceIn] = React.useState<string>(inv.state.sources[0] ?? "");
  const [priceIn, setPriceIn] = React.useState<string>("");
  const [dateIn, setDateIn] = React.useState<string>(new Date().toISOString().slice(0, 10)); // yyyy-mm-dd
  const [invoiceIn, setInvoiceIn] = React.useState<string>("");

  // STOCK OUT
  const [qout, setQout] = React.useState<number>(0);

  // Supplier Report
  const [reportResults, setReportResults] = React.useState<
    Array<{ id: string; at: number; item: string; type: string; qty: number; price?: number; source?: string; invoice?: string }>
  >([]);
  const [reportSource, setReportSource] = React.useState<string>("");
  const [reportFrom, setReportFrom] = React.useState<string>("");
  const [reportTo, setReportTo] = React.useState<string>("");

  const handleStockIn = () => {
    if (!item || !type || qin <= 0) return;
    const atMs = dateIn ? new Date(dateIn + "T00:00:00").getTime() : undefined;
    const priceNum = priceIn.trim() ? Number(priceIn) : undefined;
    inv.stockIn(item, type, qin, sourceIn || undefined, priceNum, atMs, invoiceIn || undefined);
    setQin(0);
    setInvoiceIn("");
  };

  const handleStockOut = () => {
    if (!item || !type || qout <= 0) return;
    inv.stockOut(item, type, qout);
    setQout(0);
  };

  const handleGenerateReport = () => {
    const fromMs = reportFrom ? new Date(reportFrom + "T00:00:00").getTime() : -Infinity;
    const toMs = reportTo ? new Date(reportTo + "T23:59:59").getTime() : Infinity;
    const src = reportSource.trim();

    const rows = inv.state.events
      .filter((e) => e.kind === "in")
      .filter((e) => (src ? e.source === src : true))
      .filter((e) => e.at >= fromMs && e.at <= toMs)
      .sort((a, b) => a.at - b.at)
      .map((e) => ({
        id: e.id,
        at: e.at,
        item: e.item,
        type: e.type,
        qty: e.qty,
        price: e.price,
        source: e.source,
        invoice: e.invoice,
      }));

    setReportResults(rows);
  };

  const handleDownloadExcel = () => {
    const aoa = [
      ["DATE (stock in)", "Invoice No.", "Item", "Type", "Quantity", "Price", "Supplier"],
      ...reportResults.map((r) => [
        new Date(r.at).toLocaleString(),
        r.invoice ?? "",
        r.item,
        r.type,
        r.qty,
        r.price ?? "",
        r.source ?? "",
      ]),
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, "Supplier Report");
    XLSX.writeFile(wb, `supplier-report${reportSource ? "-" + reportSource : ""}.xlsx`);
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
            <Input
              type="number"
              value={qin}
              onChange={(e) => setQin(Number(e.target.value))}
              placeholder="Quantity to add"
              className="bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
            />
            <div className="flex gap-2">
              <select
                value={sourceIn}
                onChange={(e) => setSourceIn(e.target.value)}
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100"
              >
                {inv.state.sources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <Input
                value={priceIn}
                onChange={(e) => setPriceIn(e.target.value)}
                placeholder="Price (optional)"
                className="flex-1 bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateIn}
                onChange={(e) => setDateIn(e.target.value)}
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100"
              />
              <Input
                value={invoiceIn}
                onChange={(e) => setInvoiceIn(e.target.value)}
                placeholder="Invoice No."
                className="flex-1 bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
              />
            </div>
            <div className="flex gap-2">
              <Button className="bg-blue-600 hover:bg-blue-500" onClick={handleStockIn}>
                Add Stock
              </Button>
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
            <Input
              type="number"
              value={qout}
              onChange={(e) => setQout(Number(e.target.value))}
              placeholder="Quantity to remove"
              className="bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
            />
            <Button className="bg-orange-500 hover:bg-orange-400" onClick={handleStockOut}>
              Remove
            </Button>
            <div className="text-xs text-neutral-400">
              Selected available: <span className="text-neutral-100">{qtySelected}</span>
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
            <div className="bg-neutral-900 border border-neutral-800 rounded-md p-3">
              <div className="text-xs text-neutral-400">Quantity available</div>
              <div className="mt-1 text-3xl font-extrabold text-white">{qtySelected}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supplier Report */}
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
          <div className="min-w-[220px]">
            <label className="block text-xs text-neutral-400 mb-1">Supplier</label>
            <select
              value={reportSource}
              onChange={(e) => setReportSource(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100"
            >
              <option value="">All</option>
              {inv.state.sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
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
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-neutral-400">
                  <th className="px-2 py-1 text-left">DATE (stock in)</th>
                  <th className="px-2 py-1 text-left">Invoice No.</th>
                  <th className="px-2 py-1 text-left">Item</th>
                  <th className="px-2 py-1 text-left">Type</th>
                  <th className="px-2 py-1 text-left">Quantity</th>
                  <th className="px-2 py-1 text-left">Price</th>
                  <th className="px-2 py-1 text-left">Supplier</th>
                </tr>
              </thead>
              <tbody>
                {reportResults.map((e) => (
                  <tr key={e.id} className="border-b border-neutral-800">
                    <td className="px-2 py-1">{new Date(e.at).toLocaleString()}</td>
                    <td className="px-2 py-1">{e.invoice ?? "-"}</td>
                    <td className="px-2 py-1">{e.item}</td>
                    <td className="px-2 py-1">{e.type}</td>
                    <td className="px-2 py-1">{e.qty}</td>
                    <td className="px-2 py-1">{e.price ?? "-"}</td>
                    <td className="px-2 py-1">{e.source ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 text-[13px] text-neutral-400">No results yet.</div>
        )}
      </div>
    </div>
  );
}

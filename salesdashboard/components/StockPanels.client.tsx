"use client";

import React from "react";

// If "@" alias isn't configured in tsconfig.json, switch these to relative paths
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

/* ------------------------------------------------------------------ */
/* Typed, reusable dropdown                                            */
/* ------------------------------------------------------------------ */
type GenericDropdownProps = {
  label: string;
  selected?: string;
  options: string[];
  onSelect: (v: string) => void;
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
};

function GenericDropdown({
  label,
  selected,
  options,
  onSelect,
  onAdd,
  onRemove,
}: GenericDropdownProps) {
  const [newName, setNewName] = React.useState("");

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 text-neutral-200 px-3 py-2 rounded-md text-sm"
          >
            <span className="text-neutral-400">{label}:</span>
            <span className="font-medium text-neutral-100">{selected ?? "Select"}</span>
            <ChevronDown size={14} className="text-neutral-500" />
          </button>
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
                  const trimmed = newName.trim();
                  if (trimmed) {
                    onAdd(trimmed);
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

const ItemDropdown = (props: Omit<GenericDropdownProps, "label">) => (
  <GenericDropdown label="Item" {...props} />
);
const TypeDropdown = (props: Omit<GenericDropdownProps, "label">) => (
  <GenericDropdown label="Type" {...props} />
);
const SupplierDropdown = (props: Omit<GenericDropdownProps, "label">) => (
  <GenericDropdown label="Supplier" {...props} />
);

/* --------------------------- Types for report --------------------------- */
type ReportRow = {
  id: string;
  at: number;          // ms since epoch
  item: string;
  type: string;
  qty: number;
  source?: string;
  invoice?: string;
  price?: number;
};

/* ------------------------------- Component ------------------------------ */
export default function StockPanels() {
  const inv = useInventory();

  // Selection
  const [item, setItem] = React.useState<string | undefined>(
    Object.keys(inv.state.items)[0]
  );
  const [type, setType] = React.useState<string>("");

  const types = item ? Object.keys(inv.state.items[item] ?? {}) : [];

  // Stock Out
  const [qout, setQout] = React.useState<number>(0);

  // Stock In
  const [qin, setQin] = React.useState<number>(0);
  const [stockInDate, setStockInDate] = React.useState<string>(""); // yyyy-mm-dd (kept for UI only)
  const [invoiceNo, setInvoiceNo] = React.useState<string>("");
  const [stockInSource, setStockInSource] = React.useState<string>(
    inv.state.sources[0] ?? ""
  );
  const [stockInPrice, setStockInPrice] = React.useState<string>("");

  // Report filters
  const [reportSource, setReportSource] = React.useState<string>("All");
  const [reportFrom, setReportFrom] = React.useState<string>("");
  const [reportTo, setReportTo] = React.useState<string>("");

  // Derived qty
  const qty =
    item && type && inv.state.items[item] && inv.state.items[item][type] !== undefined
      ? inv.state.items[item][type]
      : 0;

  /* ------------------------------ Actions -------------------------------- */

  const handleStockIn = () => {
    if (!item || !type || qin <= 0) return;

    inv.stockIn(
      item,
      type,
      qin,
      stockInSource || undefined,
      stockInPrice !== "" ? Number(stockInPrice) : undefined,
      invoiceNo.trim() || undefined
    );

    // Reset inputs
    setQin(0);
    setInvoiceNo("");
    setStockInPrice("");
  };

  const handleStockOut = () => {
    if (item && type && qout > 0) {
      inv.stockOut(item, type, qout);
      setQout(0);
    }
  };

  const buildReport = React.useCallback((): ReportRow[] => {
    const fromTs = reportFrom ? new Date(reportFrom).getTime() : -Infinity;
    const toTs   = reportTo   ? new Date(reportTo).getTime() + 24 * 60 * 60 * 1000 : Infinity;

    return inv.state.events
      .filter((e) => e.kind === "in")
      .filter((e) => e.at >= fromTs && e.at <= toTs)
      .filter((e) => (reportSource !== "All" ? e.source === reportSource : true))
      .map<ReportRow>((e) => ({
        id: e.id,
        at: e.at,
        item: e.item,
        type: e.type,
        qty: e.qty,
        source: e.source,
        invoice: e.invoice,
        price: e.price,
      }));
  }, [inv.state.events, reportFrom, reportTo, reportSource]);

  const reportResults = buildReport();

  const handleDownloadExcel = () => {
    const rows = reportResults.map((r) => ({
      "DATE (stock in)": new Date(r.at).toLocaleString(),
      "Invoice No.": r.invoice ?? "",
      Item: r.item,
      Type: r.type,
      Quantity: r.qty,
      Supplier: r.source ?? "",
      Price: typeof r.price === "number" ? r.price : "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Supplier Report");
    XLSX.writeFile(wb, "supplier_report.xlsx");
  };

  /* --------------------------------- UI ---------------------------------- */

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* STOCK IN */}
      <Card className="bg-neutral-900/60 border-neutral-800 md:col-span-2">
        <CardHeader>
          <CardTitle className="text-xs tracking-wider text-neutral-400">STOCK IN</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ItemDropdown
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

          <TypeDropdown
            selected={type}
            onSelect={(v) => setType(v)}
            onAdd={(name) => item && inv.addType(item, name)}
            onRemove={(name) => item && inv.removeType(item, name)}
            options={types}
          />

          <SupplierDropdown
            selected={stockInSource}
            onSelect={(v) => setStockInSource(v)}
            onAdd={(name) => inv.addSource(name)}
            onRemove={(name) => inv.removeSource(name)}
            options={inv.state.sources}
          />

          <div className="flex gap-2">
            <Input
              type="number"
              value={qin}
              onChange={(e) => setQin(Number(e.target.value))}
              placeholder="Quantity to add"
              className="bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
            />
            <Input
              type="date"
              value={stockInDate}
              onChange={(e) => setStockInDate(e.target.value)}
              className="bg-neutral-900 border-neutral-800 text-neutral-100"
            />
            <Input
              type="text"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="Invoice No."
              className="bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
            />
            <Input
              type="number"
              step="0.01"
              value={stockInPrice}
              onChange={(e) => setStockInPrice(e.target.value)}
              placeholder="Price"
              className="bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
            />
          </div>

          <Button className="bg-blue-600 hover:bg-blue-500" onClick={handleStockIn}>
            Add Stock
          </Button>
        </CardContent>
      </Card>

      {/* STOCK OUT */}
      <Card className="bg-neutral-900/60 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-xs tracking-wider text-neutral-400">STOCK OUT</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ItemDropdown
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
          <TypeDropdown
            selected={type}
            onSelect={(v) => setType(v)}
            onAdd={(name) => item && inv.addType(item, name)}
            onRemove={(name) => item && inv.removeType(item, name)}
            options={types}
          />
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              value={qout}
              onChange={(e) => setQout(Number(e.target.value))}
              placeholder="Quantity to remove"
              className="flex-1 bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
            />
            <Button className="bg-orange-500 hover:bg-orange-400" onClick={handleStockOut}>
              Remove
            </Button>
          </div>
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
          <TypeDropdown
            selected={type}
            onSelect={(v) => setType(v)}
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

      {/* Supplier Report */}
      <div className="md:col-span-3 mt-4 bg-neutral-900/60 border border-neutral-800 rounded-md p-6">
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
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Supplier</label>
            <select
              value={reportSource}
              onChange={(e) => setReportSource(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100"
            >
              <option value="All">All</option>
              {inv.state.sources.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>
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
                  <th className="px-2 py-1 text-left">Supplier</th>
                  <th className="px-2 py-1 text-left">Price</th>
                </tr>
              </thead>
              <tbody>
                {reportResults.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-800">
                    <td className="px-2 py-1">{new Date(r.at).toLocaleString()}</td>
                    <td className="px-2 py-1">{r.invoice ?? "-"}</td>
                    <td className="px-2 py-1">{r.item}</td>
                    <td className="px-2 py-1">{r.type}</td>
                    <td className="px-2 py-1">{r.qty}</td>
                    <td className="px-2 py-1">{r.source ?? "-"}</td>
                    <td className="px-2 py-1">{typeof r.price === "number" ? r.price.toFixed(2) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-neutral-400">No results for the selected filters.</div>
        )}

        <div className="flex gap-4 mt-4">
          <Button className="bg-blue-600 hover:bg-blue-500" onClick={() => { /* re-render only */ }}>
            Generate Report
          </Button>
          <Button className="bg-green-600 hover:bg-green-500" onClick={handleDownloadExcel}>
            Download Excel
          </Button>
        </div>
      </div>
    </div>
  );
}

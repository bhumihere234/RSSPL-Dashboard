"use client";

import React from "react";
import { useInventory } from "@/lib/inventory-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";

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
  const [search, setSearch] = React.useState("");
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  const filteredOptions = React.useMemo(
    () => options.filter((o) => o.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  );

  const handleDeleteClick = React.useCallback((itemToDelete: string) => {
    setDeleteConfirm(itemToDelete);
    setIsOpen(false); // Close dropdown immediately
  }, []);

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 text-neutral-200 px-3 py-2 rounded-md text-sm">
          <span className="text-neutral-400">{label}:</span>
          <span className="font-medium text-neutral-100">
            {selected ?? "Select"}
          </span>
          <ChevronDown size={14} className="text-neutral-500" />
        </DropdownMenuTrigger>

        <DropdownMenuContent className="min-w-56 bg-[#121317] border-neutral-800 text-neutral-100">
          <div className="px-2 pt-2 pb-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500 placeholder:opacity-60"
            />
          </div>

          <DropdownMenuLabel className="text-neutral-400">Choose</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {filteredOptions.map((o) => (
            <div key={o} className="flex items-center justify-between px-2 py-1 hover:bg-neutral-800 rounded-sm">
              <button
                onClick={() => {
                  onSelect(o);
                  setIsOpen(false);
                }}
                className="flex-1 text-left text-neutral-100"
              >
                {o}
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeleteClick(o);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="p-1 ml-2 rounded hover:bg-red-900 hover:text-red-300 text-neutral-500 flex-shrink-0"
                aria-label={`Delete ${o}`}
                title={`Delete ${o}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
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

      {/* Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              Confirm Deletion
            </h3>
            <p className="text-neutral-300 mb-6">
              Are you sure you want to delete &quot;{deleteConfirm}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-neutral-400 hover:text-neutral-200 border border-neutral-600 rounded hover:border-neutral-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onRemove(deleteConfirm);
                  setDeleteConfirm(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
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

type ReportRow = {
  id: string;
  at: number;
  item: string;
  type: string;
  qty: number;
  source?: string;
  invoice?: string;
  price?: number;
  gst?: number;
  supplier?: string;
  date?: number;
};

export default function StockPanels() {
  const inv = useInventory();

  // Selection
  const [item, setItem] = React.useState<string | undefined>(
    inv.items[0]
  );
  const [type, setType] = React.useState<string>("");

  const types = item ? inv.getTypesForItem(item) : [];

  // Stock Out
  const [qout, setQout] = React.useState<string>("");
  const [stockOutSupplier, setStockOutSupplier] = React.useState<string>("");
  const [stockOutDate, setStockOutDate] = React.useState<string>("");
  const [stockOutInvoice, setStockOutInvoice] = React.useState<string>("");
  const [stockOutPrice, setStockOutPrice] = React.useState<string>("");
  const [stockOutGST, setStockOutGST] = React.useState<string>("");

  // Stock In
  const [qin, setQin] = React.useState<string>("");
  const [stockInDate, setStockInDate] = React.useState<string>(""); // yyyy-mm-dd
  const [invoiceNo, setInvoiceNo] = React.useState<string>("");
  const [stockInSource, setStockInSource] = React.useState<string>(
    inv.sources[0] ?? ""
  );
  const [stockInPrice, setStockInPrice] = React.useState<string>("");
  const [stockInGST, setStockInGST] = React.useState<string>("");

  // Report filters
  const [reportSource, setReportSource] = React.useState<string>("All");
  const [reportFrom, setReportFrom] = React.useState<string>("");
  const [reportTo, setReportTo] = React.useState<string>("");

  // Calculate current quantity from events
  const qty = React.useMemo(() => {
    if (!item || !type) return 0;
    return inv.events
      .filter(e => e.item === item && e.type === type)
      .reduce((total, e) => total + (e.kind === "IN" ? e.qty : -e.qty), 0);
  }, [inv.events, item, type]);

  const handleStockIn = () => {
    if (!item || !type || !qin || Number(qin) <= 0) return;

    inv.addEvent({
      item,
      type,
      qty: Number(qin),
      rate: stockInPrice !== "" ? Number(stockInPrice) : 0,
      source: stockInSource || "Unknown",
      supplier: invoiceNo.trim() || "Unknown",
      kind: "IN"
    });

    setQin("");
    setInvoiceNo("");
    setStockInPrice("");
    setStockInGST("");
  };

  const buildReport = React.useCallback((): ReportRow[] => {
    const fromTs = reportFrom ? new Date(reportFrom).getTime() : -Infinity;
    const toTs = reportTo
      ? new Date(reportTo).getTime() + 24 * 60 * 60 * 1000
      : Infinity;

    return inv.events
      .filter((e) => e.timestamp >= fromTs && e.timestamp <= toTs)
      .filter((e) => (reportSource !== "All" ? e.source === reportSource : true))
      .map<ReportRow>((e) => ({
        id: e.id,
        at: e.timestamp,
        item: e.item,
        type: e.type,
        qty: e.qty,
        source: e.source,
        invoice: e.supplier, // Using supplier as invoice for now
        price: e.rate,
        gst: undefined, // Not in new structure
        supplier: e.supplier,
        date: e.timestamp,
      }));
  }, [inv.events, reportFrom, reportTo, reportSource]);

  const reportResults = buildReport();

  const handleDownloadExcel = () => {
    const rows = reportResults.map((r) => ({
      "Selected Date": r.date
        ? new Date(r.date).toLocaleDateString()
        : new Date(r.at).toLocaleDateString(),
      "Recorded At": new Date(r.at).toLocaleString(),
      "Invoice No.": r.invoice ?? "",
      Item: r.item,
      Type: r.type,
      Quantity: r.qty,
      Supplier: r.supplier ?? r.source ?? "",
      Price: typeof r.price === "number" ? r.price : "",
      GST: r.gst ?? "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Report");
    XLSX.writeFile(wb, "stock_report.xlsx");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* STOCK IN */}
      <Card className="bg-neutral-900/60 border-neutral-800 md:col-span-2">
        <CardHeader>
          <CardTitle className="text-xs tracking-wider text-neutral-400">
            STOCK IN
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ItemDropdown
            selected={item}
            onSelect={(v) => {
              setItem(v);
              const first = inv.getTypesForItem(v)[0] ?? "";
              setType(first);
            }}
            onAdd={(name) => inv.addItem(name)}
            onRemove={(name) => {
              // If the deleted item was currently selected, clear selection or select first available
              if (item === name) {
                const remainingItems = inv.items.filter(i => i !== name);
                const newItem = remainingItems[0];
                setItem(newItem);
                const newType = newItem ? inv.getTypesForItem(newItem)[0] ?? "" : "";
                setType(newType);
              }
              inv.removeItem(name);
            }}
            options={inv.items}
          />

          <TypeDropdown
            selected={type}
            onSelect={(v) => setType(v)}
            onAdd={(name) => item && inv.addType(item, name)}
            onRemove={(name) => {
              // If the deleted type was currently selected, clear selection or select first available
              if (type === name && item) {
                const remainingTypes = inv.getTypesForItem(item).filter(t => t !== name);
                setType(remainingTypes[0] ?? "");
              }
              if (item) {
                inv.removeType(item, name);
              }
            }}
            options={types}
          />

          <SupplierDropdown
            selected={stockInSource}
            onSelect={(v) => setStockInSource(v)}
            onAdd={(name) => inv.addSource(name)}
            onRemove={(name) => {
              // If the deleted source was currently selected, clear selection or select first available
              if (stockInSource === name) {
                const remainingSources = inv.sources.filter(s => s !== name);
                setStockInSource(remainingSources[0] ?? "");
              }
              inv.removeSource(name);
            }}
            options={inv.sources}
          />

          <div className="flex flex-wrap gap-2">
            <Input
              type="number"
              value={qin}
              onChange={(e) => setQin(e.target.value)}
              placeholder="Quantity..."
              className="bg-neutral-900 border-neutral-800 text-neutral-100"
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
              className="bg-neutral-900 border-neutral-800 text-neutral-100"
            />
            <Input
              type="number"
              step="0.01"
              value={stockInPrice}
              onChange={(e) => setStockInPrice(e.target.value)}
              placeholder="Price"
              className="bg-neutral-900 border-neutral-800 text-neutral-100"
            />
            <Input
              type="number"
              value={stockInGST}
              onChange={(e) => setStockInGST(e.target.value)}
              placeholder="GST (%)"
              className="bg-neutral-900 border-neutral-800 text-neutral-100"
            />
          </div>

          <Button
            className="bg-blue-600 hover:bg-blue-500"
            onClick={handleStockIn}
          >
            Add Stock
          </Button>
        </CardContent>
      </Card>

      {/* STOCK OUT */}
      {/* STOCK OUT */}
{/* STOCK OUT */}
{/* STOCK OUT */}
<Card className="bg-neutral-900/60 border-neutral-800">
  <CardHeader>
    <CardTitle className="text-xs tracking-wider text-neutral-400">
      STOCK OUT
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    <ItemDropdown
      selected={item}
      onSelect={(v) => {
        setItem(v)
        const first = inv.getTypesForItem(v)[0] ?? ""
        setType(first)
      }}
      onAdd={(name) => inv.addItem(name)}
      onRemove={(name) => {
        // If the deleted item was currently selected, clear selection or select first available
        if (item === name) {
          const remainingItems = inv.items.filter(i => i !== name);
          const newItem = remainingItems[0];
          setItem(newItem);
          const newType = newItem ? inv.getTypesForItem(newItem)[0] ?? "" : "";
          setType(newType);
        }
        inv.removeItem(name);
      }}
      options={inv.items}
    />

    <TypeDropdown
      selected={type}
      onSelect={(v) => setType(v)}
      onAdd={(name) => item && inv.addType(item, name)}
      onRemove={(name) => {
        // If the deleted type was currently selected, clear selection or select first available
        if (type === name && item) {
          const remainingTypes = inv.getTypesForItem(item).filter(t => t !== name);
          setType(remainingTypes[0] ?? "");
        }
        if (item) {
          inv.removeType(item, name);
        }
      }}
      options={types}
    />

    {/* ✅ Supplier Dropdown (shared with Stock In) */}
    <SupplierDropdown
      selected={stockOutSupplier}
      onSelect={(v) => setStockOutSupplier(v)}
      onAdd={(name) => inv.addSource(name)}
      onRemove={(name) => {
        // If the deleted source was currently selected, clear selection or select first available
        if (stockOutSupplier === name) {
          const remainingSources = inv.sources.filter(s => s !== name);
          setStockOutSupplier(remainingSources[0] ?? "");
        }
        inv.removeSource(name);
      }}
      options={inv.sources}
    />

    <div className="flex flex-col gap-2">
      <Input
        type="number"
        value={qout}
        onChange={(e) => setQout(e.target.value)}
        placeholder="Quantity..."
        className="bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
      />

      <Input
        type="date"
        value={stockOutDate}
        onChange={(e) => setStockOutDate(e.target.value)}
        className="bg-neutral-900 border-neutral-800 text-neutral-100"
      />

      <Input
        type="text"
        value={stockOutInvoice}
        onChange={(e) => setStockOutInvoice(e.target.value)}
        placeholder="Invoice No."
        className="bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
      />

      <Input
        type="number"
        step="0.01"
        value={stockOutPrice}
        onChange={(e) => setStockOutPrice(e.target.value)}
        placeholder="Price"
        className="bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
      />

      <Input
        type="number"
        step="0.01"
        value={stockOutGST}
        onChange={(e) => setStockOutGST(e.target.value)}
        placeholder="GST (%)"
        className="bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500"
      />
    </div>

    <Button
      className="bg-orange-500 hover:bg-orange-400"
      onClick={() => {
        if (item && type && qout && Number(qout) > 0) {
          inv.addEvent({
            item,
            type,
            qty: Number(qout),
            rate: Number(stockOutGST) || 0,
            source: "Manual Out",
            supplier: stockOutSupplier || "Unknown",
            kind: "OUT"
          })

          // Clear after save
          setQout("")
          setStockOutInvoice("")
          setStockOutPrice("")
          setStockOutGST("")
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


      {/* REPORT */}
      <Card className="bg-neutral-900/60 border-neutral-800 md:col-span-3">
        <CardHeader>
          <CardTitle className="text-xs tracking-wider text-neutral-400">
            REPORT & EXPORT
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input
              type="date"
              value={reportFrom}
              onChange={(e) => setReportFrom(e.target.value)}
              className="bg-neutral-900 border-neutral-800 text-neutral-100"
            />
            <Input
              type="date"
              value={reportTo}
              onChange={(e) => setReportTo(e.target.value)}
              className="bg-neutral-900 border-neutral-800 text-neutral-100"
            />
            <select
              value={reportSource}
              onChange={(e) => setReportSource(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-neutral-100"
            >
              <option value="All">All</option>
              {inv.sources.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>
          <Button
            className="bg-green-600 hover:bg-green-500"
            onClick={handleDownloadExcel}
          >
            Download Excel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

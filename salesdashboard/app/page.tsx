"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { RightSidebar } from "@/components/right-sidebar"
import { KPIs } from "@/components/kpis"
import { OverviewChart } from "@/components/overview-chart"
import StockPanels from "@/components/StockPanels.client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { HistoryTable } from "@/components/history-table"
import ClientOnly from "@/components/ClientOnly"
import { useInventory } from "@/lib/inventory-store"
import { exportAllEventsToExcel, exportCurrentStockToExcel } from "@/lib/exportExcel"

export default function Page() {
  const [openTable, setOpenTable] = useState<null | "in" | "out" | "total">(null)
  const [currentTime, setCurrentTime] = useState<string>("")
  const inventory = useInventory()

  useEffect(() => {
    // Update time on client side only to avoid hydration mismatch
    setCurrentTime(new Date().toLocaleTimeString())

    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-screen bg-[#0b0c10] text-neutral-200">
      {/* Header */}
      <header className="hidden md:flex items-center gap-3 px-6 h-12 border-b border-neutral-800 bg-[#0e0f12]">
        <div className="w-64 shrink-0" />
        <div className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">Overview</div>
      </header>

      {/* Main shell */}
      <div className="flex h-[calc(100vh-48px)] overflow-hidden">
        {/* Left sidebar */}
        <aside className="hidden md:block w-64 shrink-0 h-full border-r border-neutral-800 bg-[#0e0f12] overflow-y-auto">
          <Sidebar
            onSelect={(key) => {
              if (key === "home") setOpenTable(null)
              else setOpenTable(key)
            }}
          />
        </aside>

        {/* Central content */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto p-3 md:p-6">
          <div className="mb-3 md:mb-4">
            <h1 className="text-white font-extrabold tracking-[0.15em] uppercase text-xl md:text-2xl">Overview</h1>
            <div className="text-[11px] text-neutral-500">
              Last updated {currentTime || "Loading..."}
            </div>
          </div>

          {/* KPIs */}
          <KPIs />

          {/* Chart */}
          <div className="mt-3 md:mt-4">
            <OverviewChart />
          </div>

          {/* Stock Controls */}
          <section aria-labelledby="stock-section-title" className="mt-3 md:mt-4 space-y-3">
            <h2 id="stock-section-title" className="text-xs tracking-wider text-neutral-400">
              Stock Controls
            </h2>
            <StockPanels />
          </section>

          {/* Excel Export Buttons */}
          <section className="mt-6 space-x-4">
            <button
              onClick={() => exportAllEventsToExcel(inventory.events)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
            >
              Export Full History
            </button>
            <button
              onClick={() => exportCurrentStockToExcel(inventory.events)}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded"
            >
              Export Current Stock
            </button>
          </section>
        </main>

        {/* Right sidebar */}
        <aside className="hidden lg:block w-80 shrink-0 h-full border-l border-neutral-800 bg-[#0e0f12] overflow-y-auto">
          <ClientOnly fallback={<div className="p-4 text-neutral-500 text-sm">Loading sidebar...</div>}>
            <RightSidebar />
          </ClientOnly>
        </aside>
      </div>

      {/* Modal for history tables */}
      <Dialog open={openTable !== null} onOpenChange={(o) => !o && setOpenTable(null)}>
        <DialogContent className="max-w-5xl bg-[#0e0f12] border border-neutral-800 text-neutral-200">
          <DialogHeader>
            <DialogTitle className="text-xs tracking-wider text-neutral-400">
              {openTable === "in"
                ? "STOCK IN"
                : openTable === "out"
                ? "STOCK OUT"
                : "TOTAL STOCK AVAILABLE"}
            </DialogTitle>
          </DialogHeader>
          {openTable && <HistoryTable mode={openTable} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

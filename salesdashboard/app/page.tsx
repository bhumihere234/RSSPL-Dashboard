"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { RightSidebar } from "@/components/right-sidebar"
import { InventoryProvider } from "@/lib/inventory-store"
import { KPIs } from "@/components/kpis"
import { OverviewChart } from "@/components/overview-chart"
import { StockPanels } from "@/components/stock-panels"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { HistoryTable } from "@/components/history-table"

export default function Page() {
  const [openTable, setOpenTable] = useState<null | "in" | "out" | "total">(null)

  return (
    <InventoryProvider>
      <div className="h-screen bg-[#0b0c10] text-neutral-200">
        {/* Header */}
        <header className="hidden md:flex items-center gap-3 px-6 h-12 border-b border-neutral-800 bg-[#0e0f12]">
          {/* Reserve space for left sidebar title area so the heading centers visually */}
          <div className="w-64 shrink-0" />
          <div className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">Overview</div>
        </header>

        {/* Main shell under header with fixed height and clipped overflow */}
        <div className="flex h-[calc(100vh-48px)] overflow-hidden">
          {/* Left sidebar with fixed width and own scroll */}
          <aside className="hidden md:block w-64 shrink-0 h-full border-r border-neutral-800 bg-[#0e0f12] overflow-y-auto">
            <Sidebar
              onSelect={(key) => {
                if (key === "home") setOpenTable(null)
                else setOpenTable(key)
              }}
            />
          </aside>

          {/* Central content: independent scroll + compact spacing */}
          <main className="flex-1 min-w-0 h-full overflow-y-auto p-3 md:p-6">
            <div className="mb-3 md:mb-4">
              <h1 className="text-white font-extrabold tracking-[0.15em] uppercase text-xl md:text-2xl">Overview</h1>
              <div className="text-[11px] text-neutral-500">Last updated {new Date().toLocaleTimeString()}</div>
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

          </main>

          {/* Right sidebar with fixed width and own scroll */}
          <aside className="hidden lg:block w-80 shrink-0 h-full border-l border-neutral-800 bg-[#0e0f12] overflow-y-auto">
            <RightSidebar />
          </aside>
        </div>

        {/* Modal for history tables themed like the dashboard */}
        <Dialog open={openTable !== null} onOpenChange={(o) => !o && setOpenTable(null)}>
          <DialogContent className="max-w-5xl bg-[#0e0f12] border border-neutral-800 text-neutral-200">
            <DialogHeader>
              <DialogTitle className="text-xs tracking-wider text-neutral-400">
                {openTable === "in" ? "STOCK IN" : openTable === "out" ? "STOCK OUT" : "TOTAL STOCK AVAILABLE"}
              </DialogTitle>
            </DialogHeader>
            {openTable && <HistoryTable mode={openTable} />}
          </DialogContent>
        </Dialog>
      </div>
    </InventoryProvider>
  )
}

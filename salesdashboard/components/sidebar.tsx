"use client"

import { Home, ArrowDownLeft, ArrowUpRight, Boxes } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const nav = [
  { label: "Home", icon: Home },
  { label: "Stock In", icon: ArrowUpRight },
  { label: "Stock Out", icon: ArrowDownLeft },
  { label: "Total Stock Available", icon: Boxes },
]

export function Sidebar({ onSelect }: { onSelect?: (key: "home" | "in" | "out" | "total") => void }) {
  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#0e0f12] border-r border-neutral-800 text-neutral-200">
      <div className="px-5 py-4 border-b border-neutral-800">
        <div className="text-xs uppercase tracking-widest text-blue-400">Tools</div>
      </div>
      <nav className="flex-1 overflow-auto">
        <ul className="px-2 py-3 space-y-1">
          {nav.map((n) => (
            <li key={n.label}>
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (!onSelect) return
                  if (n.label === "Home") onSelect("home")
                  else if (n.label === "Stock In") onSelect("in")
                  else if (n.label === "Stock Out") onSelect("out")
                  else onSelect("total")
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-900 text-sm",
                  n.label === "Home" && "bg-neutral-900",
                )}
              >
                <n.icon size={16} className="text-neutral-400" />
                <span className="text-neutral-100">{n.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="px-3 py-4 text-[11px] text-neutral-500 border-t border-neutral-800">Admin Settings</div>
    </aside>
  )
}

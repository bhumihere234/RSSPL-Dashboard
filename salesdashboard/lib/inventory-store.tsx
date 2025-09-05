"use client"

import React from "react"

export type EventKind = "in" | "out"

export type InventoryEvent = {
  id: string
  item: string
  type: string
  qty: number
  kind: EventKind
  at: number
  source?: string
  price?: number
}

export type Notification = {
  id: string
  text: string
  kind: EventKind
  at: number
}

export type Message = {
  id: string
  text: string
  checked: boolean
  at: number
}

export type InventoryState = {
  // item -> type -> qty
  items: Record<string, Record<string, number>>
  events: InventoryEvent[]
  notifications: Notification[]
  messages: Message[]
  sources: string[]
}

type Ctx = {
  state: InventoryState
  addItem: (name: string) => void
  removeItem: (name: string) => void
  addType: (item: string, type: string) => void
  removeType: (item: string, type: string) => void
  addSource: (name: string) => void
  removeSource: (name: string) => void
  stockIn: (item: string, type: string, qty: number, source?: string, price?: number) => void
  stockOut: (item: string, type: string, qty: number) => void
  getQty: (item: string, type: string) => number
  clearNotifications: () => void
  resolveMessage: (id: string) => void
}

const defaultState: InventoryState = {
  items: {
    Boxes: { Small: 120, Medium: 80, Large: 30 },
    Tapes: { Clear: 60, Brown: 15 },
    Gloves: { Latex: 0, Nitrile: 25 },
  },
  events: [
    { id: "e1", item: "Boxes", type: "Small", qty: 20, kind: "in", at: Date.now() - 1000 * 60 * 60 * 24 * 5, source: "Warehouse", price: 100 },
    { id: "e2", item: "Boxes", type: "Small", qty: 10, kind: "out", at: Date.now() - 1000 * 60 * 60 * 24 * 4 },
    { id: "e3", item: "Tapes", type: "Clear", qty: 10, kind: "in", at: Date.now() - 1000 * 60 * 60 * 24 * 3, source: "Supplier", price: 50 },
    { id: "e4", item: "Gloves", type: "Latex", qty: 10, kind: "out", at: Date.now() - 1000 * 60 * 60 * 24 * 2 },
  ],
  notifications: [],
  messages: [],
  sources: ["Warehouse", "Supplier"],
}

const KEY = "inv-dashboard-state-v1"

function loadState(): InventoryState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultState
    const parsed = JSON.parse(raw) as InventoryState
    return parsed
  } catch {
    return defaultState
  }
}

function saveState(state: InventoryState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // ignore quota errors
  }
}

export const InventoryContext = React.createContext<Ctx | null>(null)

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<InventoryState>(defaultState)

  const addSource = (name: string) => {
    if (!name) return
    setState((s: InventoryState) => {
      if (s.sources && s.sources.includes(name)) return s
      return { ...s, sources: s.sources ? [...s.sources, name] : [name] }
    })
  }

  const removeSource = (name: string) => {
    setState((s: InventoryState) => ({ ...s, sources: s.sources ? s.sources.filter((sname: string) => sname !== name) : [] }))
  }
  React.useEffect(() => {
    setState(loadState())
  }, [])

  React.useEffect(() => {
    saveState(state)
  }, [state])

  const addItem = (name: string) => {
    if (!name) return
    setState((s) => {
      if (s.items[name]) return s
      return { ...s, items: { ...s.items, [name]: {} } }
    })
  }

  const removeItem = (name: string) => {
    setState((s) => {
      const { [name]: _, ...rest } = s.items
      return { ...s, items: rest }
    })
  }

  const addType = (item: string, type: string) => {
    if (!item || !type) return
    setState((s) => {
      const existingItem = s.items[item] || {}
      if (existingItem[type] != null) return s
      return { ...s, items: { ...s.items, [item]: { ...existingItem, [type]: 0 } } }
    })
  }

  const removeType = (item: string, type: string) => {
    setState((s) => {
      const existingItem = s.items[item]
      if (!existingItem) return s
      const { [type]: _, ...restTypes } = existingItem
      return { ...s, items: { ...s.items, [item]: restTypes } }
    })
  }

  const pushEventAndNotif = (item: string, type: string, qty: number, kind: EventKind) => {
    const at = Date.now()
    const id = `${at}-${Math.random().toString(36).slice(2, 7)}`
    setState((s) => ({
      ...s,
      events: [...s.events, { id, item, type, qty, kind, at }],
      notifications: [
        {
          id: `n-${id}`,
          text: `${kind === "in" ? "Stock In" : "Stock Out"} • ${item} • ${type} • ${qty}`,
          kind,
          at,
        },
        ...s.notifications,
      ].slice(0, 25),
    }))
  }

  const stockIn = (item: string, type: string, qty: number, source?: string, price?: number) => {
    if (!qty || qty <= 0) return
    setState((s: InventoryState) => {
      const itemMap = s.items[item] || {}
      const current = itemMap[type] ?? 0
      const nextItems = {
        ...s.items,
        [item]: { ...itemMap, [type]: current + qty },
      }
      return { ...s, items: nextItems }
    })
    // Add source and price to event
    const at = Date.now()
    const id = `${at}-${Math.random().toString(36).slice(2, 7)}`
    setState((s: InventoryState) => ({
      ...s,
      events: [
        ...s.events,
        { id, item, type, qty, kind: "in", at, source, price },
      ],
      notifications: [
        {
          id: `n-${id}`,
          text: `Stock In • ${item} • ${type} • ${qty} • ${source ?? ""} • ${price ?? ""}`,
          kind: "in" as EventKind,
          at,
        },
        ...s.notifications,
      ].slice(0, 25),
    }))
  }

  const stockOut = (item: string, type: string, qty: number) => {
    if (!qty || qty <= 0) return
    let hitZero = false
    setState((s) => {
      const itemMap = s.items[item] || {}
      const current = itemMap[type] ?? 0
      const newQty = Math.max(0, current - qty)
      hitZero = current > 0 && newQty === 0
      const nextItems = {
        ...s.items,
        [item]: { ...itemMap, [type]: newQty },
      }
      return { ...s, items: nextItems }
    })
    pushEventAndNotif(item, type, qty, "out")
    if (hitZero) {
      const at = Date.now()
      const id = `m-${at}-${Math.random().toString(36).slice(2, 7)}`
      setState((s) => ({
        ...s,
        messages: [{ id, text: `Out of stock: ${item} • ${type}`, checked: false, at }, ...s.messages].slice(0, 50),
      }))
    }
  }

  const getQty = (item: string, type: string) => {
    return state.items[item]?.[type] ?? 0
  }

  const clearNotifications = () => {
    setState((s) => ({ ...s, notifications: [] }))
  }

  const resolveMessage = (id: string) => {
    setState((s) => ({ ...s, messages: s.messages.filter((m) => m.id !== id) }))
  }

  const value: Ctx = {
    state,
    addItem,
    removeItem,
    addType,
    removeType,
    addSource,
    removeSource,
    stockIn,
    stockOut,
    getQty,
    clearNotifications,
    resolveMessage,
  }

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
}

export function useInventory() {
  const ctx = React.useContext(InventoryContext)
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider")
  return ctx
}

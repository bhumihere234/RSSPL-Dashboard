"use client";

import React from "react";
import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";

export type EventKind = "in" | "out";

export type InventoryEvent = {
  id: string;
  item: string;
  type: string;
  qty: number;
  kind: EventKind;
  at: number;          // ms since epoch
  source?: string;     // supplier
  price?: number;
  invoice?: string;
};

export type Notification = {
  id: string;
  text: string;
  kind: EventKind;
  at: number;
};

export type Message = {
  id: string;
  text: string;
  checked: boolean;
  at: number;
};

export type InventoryState = {
  items: Record<string, Record<string, number>>; // item -> type -> qty
  events: InventoryEvent[];
  notifications: Notification[];
  messages: Message[];
  sources: string[];
};

type Ctx = {
  state: InventoryState;
  addItem: (name: string) => void;
  removeItem: (name: string) => void;
  addType: (item: string, type: string) => void;
  removeType: (item: string, type: string) => void;
  addSource: (name: string) => void;
  removeSource: (name: string) => void;

  // ✅ Reordered to match the component usage:
  //    (item, type, qty, source?, price?, invoice?, atMs?)
  stockIn: (
    item: string,
    type: string,
    qty: number,
    source?: string,
    price?: number,
    invoice?: string,
    atMs?: number
  ) => void;

  stockOut: (item: string, type: string, qty: number) => void;
  getQty: (item: string, type: string) => number;
  clearNotifications: () => void;
  resolveMessage: (id: string) => void;
};

const defaultState: InventoryState = {
  items: {
    Boxes: { Small: 120, Medium: 80, Large: 30 },
    Tapes: { Clear: 60, Brown: 15 },
    Gloves: { Latex: 0, Nitrile: 25 },
  },
  events: [
    {
      id: "e1",
      item: "Boxes",
      type: "Small",
      qty: 20,
      kind: "in",
      at: Date.now() - 1000 * 60 * 60 * 24 * 5,
      source: "Warehouse",
      price: 100,
      invoice: "INV-1001",
    },
    { id: "e2", item: "Boxes", type: "Small", qty: 10, kind: "out", at: Date.now() - 1000 * 60 * 60 * 24 * 4 },
    {
      id: "e3",
      item: "Tapes",
      type: "Clear",
      qty: 10,
      kind: "in",
      at: Date.now() - 1000 * 60 * 60 * 24 * 3,
      source: "Supplier",
      price: 50,
      invoice: "INV-1002",
    },
    { id: "e4", item: "Gloves", type: "Latex", qty: 10, kind: "out", at: Date.now() - 1000 * 60 * 60 * 24 * 2 },
  ],
  notifications: [],
  messages: [],
  sources: ["Warehouse", "Supplier"],
};

const INVENTORY_DOC = "inventory-state";
const inventoryRef = doc(db, "inventory", INVENTORY_DOC);

async function saveStateFirestore(state: InventoryState) {
  try {
    await setDoc(inventoryRef, state);
  } catch {
    // ignore
  }
}

export const InventoryContext = React.createContext<Ctx | null>(null);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<InventoryState>(defaultState);

  // Listen for Firestore changes (real-time sync)
  React.useEffect(() => {
    const unsub = onSnapshot(inventoryRef, (snap) => {
      if (snap.exists()) {
        setState(snap.data() as InventoryState);
      }
    });
    return () => unsub();
  }, []);

  // Save to Firestore on state change
  React.useEffect(() => {
    saveStateFirestore(state);
  }, [state]);

  const addSource = (name: string) => {
    if (!name) return;
    setState((s) => {
      if (s.sources.includes(name)) return s;
      return { ...s, sources: [...s.sources, name] };
    });
  };

  const removeSource = (name: string) => {
    setState((s) => ({ ...s, sources: s.sources.filter((sname) => sname !== name) }));
  };

  const addItem = (name: string) => {
    if (!name) return;
    setState((s) => {
      if (s.items[name]) return s;
      // Add item with a default type
      return {
        ...s,
        items: { ...s.items, [name]: { Default: 0 } },
      };
    });
  };

  const removeItem = (name: string) => {
    setState((s) => {
      const rest = Object.fromEntries(Object.entries(s.items).filter(([k]) => k !== name));
      return { ...s, items: rest };
    });
  };

  const addType = (item: string, type: string) => {
    if (!item || !type) return;
    setState((s) => {
      const existing = s.items[item] || {};
      if (existing[type] != null) return s;
      return { ...s, items: { ...s.items, [item]: { ...existing, [type]: 0 } } };
    });
  };

  const removeType = (item: string, type: string) => {
    setState((s) => {
      const existing = s.items[item];
      if (!existing) return s;
      const restTypes = Object.fromEntries(Object.entries(existing).filter(([k]) => k !== type));
      return { ...s, items: { ...s.items, [item]: restTypes } };
    });
  };

  const pushEventAndNotif = (event: InventoryEvent) => {
    setState((s) => ({
      ...s,
      events: [...s.events, event],
      notifications: [
        {
          id: `n-${event.id}`,
          text:
            (event.kind === "in"
              ? `Stock In • ${event.item} • ${event.type} • ${event.qty}`
              : `Stock Out • ${event.item} • ${event.type} • ${event.qty}`) +
            (event.source ? ` • ${event.source}` : "") +
            (event.invoice ? ` • ${event.invoice}` : ""),
          kind: event.kind,
          at: event.at,
        },
        ...s.notifications,
      ].slice(0, 25),
    }));
  };

  // ✅ Reordered implementation to match signature above
  const stockIn = (
    item: string,
    type: string,
    qty: number,
    source?: string,
    price?: number,
    invoice?: string,
    atMs?: number
  ) => {
    if (!qty || qty <= 0) return;

    setState((s) => {
      const itemMap = s.items[item] || {};
      const current = itemMap[type] ?? 0;
      return { ...s, items: { ...s.items, [item]: { ...itemMap, [type]: current + qty } } };
    });

    const at = typeof atMs === "number" && !Number.isNaN(atMs) ? atMs : Date.now();
    const id = `${at}-${Math.random().toString(36).slice(2, 7)}`;

    pushEventAndNotif({
      id,
      item,
      type,
      qty,
      kind: "in",
      at,
      source,
      price,
      invoice,
    });
  };

  const stockOut = (item: string, type: string, qty: number) => {
    if (!qty || qty <= 0) return;

    let hitZero = false;
    setState((s) => {
      const itemMap = s.items[item] || {};
      const current = itemMap[type] ?? 0;
      const newQty = Math.max(0, current - qty);
      hitZero = current > 0 && newQty === 0;
      return { ...s, items: { ...s.items, [item]: { ...itemMap, [type]: newQty } } };
    });

    const at = Date.now();
    const id = `${at}-${Math.random().toString(36).slice(2, 7)}`;
    pushEventAndNotif({ id, item, type, qty, kind: "out", at });

    if (hitZero) {
      const mid = `m-${at}-${Math.random().toString(36).slice(2, 7)}`;
      setState((s) => ({
        ...s,
        messages: [{ id: mid, text: `Out of stock: ${item} • ${type}`, checked: false, at }, ...s.messages].slice(
          0,
          50
        ),
      }));
    }
  };

  const getQty = (item: string, type: string) => state.items[item]?.[type] ?? 0;

  const clearNotifications = () => {
    setState((s) => ({ ...s, notifications: [] }));
  };

  const resolveMessage = (id: string) => {
    setState((s) => ({ ...s, messages: s.messages.filter((m) => m.id !== id) }));
  };

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
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = React.useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}

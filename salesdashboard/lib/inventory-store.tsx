"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { db } from "@/lib/firebase/client";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

/* --------------------------- Types --------------------------- */

export type EventKind = "in" | "out";

export type InventoryEvent = {
  id: string; // Firestore doc id
  item: string;
  type: string;
  qty: number;
  kind: EventKind;
  at: number; // ms epoch (chosen date or created time)
  source?: string;
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
  items: Record<string, Record<string, number>>; // current stock levels
  events: InventoryEvent[];
  notifications: Notification[];
  messages: Message[];
  sources: string[];

  /** union of explicit + derived (from events) */
  catalogItems: string[];
  /** per-item union of explicit + derived types */
  catalogTypesByItem: Record<string, string[]>;
};

type Ctx = {
  state: InventoryState;

  // catalog mgmt
  addItem: (name: string) => void;
  removeItem: (name: string) => void;
  addType: (item: string, type: string) => void;
  removeType: (item: string, type: string) => void;
  addSource: (name: string) => void;
  removeSource: (name: string) => void;

  // stock movement
  stockIn: (
    item: string,
    type: string,
    qty: number,
    source?: string,
    price?: number,
    invoice?: string,
    atMs?: number
  ) => Promise<void>;
  stockOut: (item: string, type: string, qty: number) => Promise<void>;

  // notifications
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;

  // messages
  resolveMessage: (id: string) => void;
};

const InventoryContext = createContext<Ctx | null>(null);

/* --------------------------- Config --------------------------- */

// Use your EXISTING collection so current data appears
const COLLECTION = "inventory_events";

/* --------------------------- Provider --------------------------- */

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<InventoryEvent[]>([]);
  const [sources, setSources] = useState<string[]>([]);

  // explicit, user-maintained catalogs
  const [explicitItems, setExplicitItems] = useState<string[]>([]);
  const [explicitTypesByItem, setExplicitTypesByItem] = useState<Record<string, string[]>>({});

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [dismissedOutToday, setDismissedOutToday] = useState<Set<string>>(() => new Set());
  const dayKeyRef = useRef<string>("");

  // Track “today” for dismissing messages
  useEffect(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    dayKeyRef.current = d.toISOString().slice(0, 10);
  }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      const k = d.toISOString().slice(0, 10);
      if (k !== dayKeyRef.current) {
        dayKeyRef.current = k;
        setDismissedOutToday(new Set());
      }
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  // 🔥 Live Firestore subscription (guard until db is ready)
  useEffect(() => {
    if (!db) return; // wait for client hydration

    const q = query(collection(db, COLLECTION), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      type InventoryEventDoc = {
        item?: unknown;
        type?: unknown;
        qty?: unknown;
        kind?: unknown;
        at?: unknown;
        source?: unknown;
        price?: unknown;
        invoice?: unknown;
        createdAt?: unknown;
      };

      const rows: InventoryEvent[] = snap.docs.map((d) => {
        const data = d.data() as InventoryEventDoc;
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt : undefined;

        const atField =
          typeof data.at === "number"
            ? (data.at as number)
            : createdAt
            ? createdAt.toMillis()
            : Date.now();

        const kindVal: EventKind = data.kind === "out" ? "out" : "in";

        return {
          id: d.id,
          item: String(data.item ?? ""),
          type: String(data.type ?? ""),
          qty: Number(data.qty ?? 0) || 0,
          kind: kindVal,
          at: atField,
          source: typeof data.source === "string" && data.source.trim() !== "" ? data.source : undefined,
          price: typeof data.price === "number" ? data.price : undefined,
          invoice: typeof data.invoice === "string" && data.invoice.trim() !== "" ? data.invoice : undefined,
        };
      });

      setEvents(rows);

      // derive sources
      const srcSet = new Set<string>();
      rows.forEach((r) => r.source && srcSet.add(r.source));
      setSources(Array.from(srcSet).sort((a, b) => a.localeCompare(b)));
    });

    return () => unsub();
  }, [db]);

  // Build item -> type -> qty from events
  const items = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    // include explicit skeleton so empty items/types can be selected
    explicitItems.forEach((it) => {
      map[it] = map[it] || {};
      (explicitTypesByItem[it] || []).forEach((tt) => {
        map[it][tt] = map[it][tt] ?? 0;
      });
    });
    events.forEach((e) => {
      map[e.item] = map[e.item] || {};
      map[e.item][e.type] = map[e.item][e.type] || 0;
      map[e.item][e.type] += e.kind === "in" ? e.qty : -e.qty;
      if (map[e.item][e.type] < 0) map[e.item][e.type] = 0;
    });
    return map;
  }, [events, explicitItems, explicitTypesByItem]);

  // Union catalogs exposed to UI (this is the key fix)
  const catalogItems = useMemo(() => {
    const s = new Set<string>(explicitItems);
    Object.keys(items).forEach((k) => s.add(k));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [explicitItems, items]);

  const catalogTypesByItem = useMemo(() => {
    const out: Record<string, string[]> = {};
    // start with explicit
    Object.entries(explicitTypesByItem).forEach(([it, list]) => {
      out[it] = Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
    });
    // merge derived
    Object.entries(items).forEach(([it, byType]) => {
      const s = new Set<string>(out[it] ?? []);
      Object.keys(byType).forEach((t) => s.add(t));
      out[it] = Array.from(s).sort((a, b) => a.localeCompare(b));
    });
    return out;
  }, [explicitTypesByItem, items]);

  /* --------------------------- Mutations --------------------------- */

  const addItem = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setExplicitItems((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed].sort((a, b) => a.localeCompare(b))
    );
  };
  const removeItem = (name: string) => {
    const n = name.trim();
    if (!n) return;
    // Only removes from explicit catalog. If the item exists due to events, it will still appear (by design).
    setExplicitItems((prev) => prev.filter((x) => x !== n));
    setExplicitTypesByItem((prev) => {
      const next = { ...prev };
      delete next[n];
      return next;
    });
  };
  const addType = (item: string, type: string) => {
    const it = item.trim();
    const tp = type.trim();
    if (!it || !tp) return;
    setExplicitTypesByItem((prev) => {
      const cur = prev[it] || [];
      if (cur.includes(tp)) return prev;
      return { ...prev, [it]: [...cur, tp].sort((a, b) => a.localeCompare(b)) };
    });
  };
  const removeType = (item: string, type: string) => {
    const it = item.trim();
    const tp = type.trim();
    if (!it || !tp) return;
    setExplicitTypesByItem((prev) => {
      const cur = prev[it] || [];
      return { ...prev, [it]: cur.filter((t) => t !== tp) };
    });
  };
  const addSource = (name: string) => {
    const n = name.trim();
    if (!n) return;
    setSources((prev) => (prev.includes(n) ? prev : [...prev, n]));
  };
  const removeSource = (name: string) => {
    const n = name.trim();
    if (!n) return;
    setSources((prev) => prev.filter((s) => s !== n));
  };

  const pushNotification = (text: string, kind: EventKind) => {
    setNotifications((prev) => [
      ...prev,
      { id: `n-${crypto.randomUUID()}`, text, kind, at: Date.now() },
    ]);
  };

  const stockIn: Ctx["stockIn"] = async (item, type, qty, source, price, invoice, atMs) => {
    if (!db) return; // safety
    await addDoc(collection(db, COLLECTION), {
      item,
      type,
      qty,
      kind: "in",
      at: typeof atMs === "number" ? atMs : Date.now(),
      source: source ?? null,
      price: typeof price === "number" ? price : null,
      invoice: invoice ?? null,
      createdAt: serverTimestamp(),
    });
    if (source) addSource(source);
    pushNotification(`Stock IN • ${qty} of ${item} / ${type}`, "in");
  };

  const stockOut: Ctx["stockOut"] = async (item, type, qty) => {
    if (!db) return; // safety
    await addDoc(collection(db, COLLECTION), {
      item,
      type,
      qty,
      kind: "out",
      at: Date.now(),
      createdAt: serverTimestamp(),
    });
    pushNotification(`Stock OUT • ${qty} of ${item} / ${type}`, "out");
  };

  const clearNotification: Ctx["clearNotification"] = (id) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  const clearAllNotifications: Ctx["clearAllNotifications"] = () => setNotifications([]);
  const resolveMessage: Ctx["resolveMessage"] = (id) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setDismissedOutToday((prev) => new Set(prev).add(id));
  };

  const state: InventoryState = {
    items,
    events,
    notifications,
    messages,
    sources,
    catalogItems,
    catalogTypesByItem,
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
    clearNotification,
    clearAllNotifications,
    resolveMessage,
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

/* --------------------------- Hook --------------------------- */

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within <InventoryProvider />");
  return ctx;
}

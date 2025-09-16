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
  source?: string; // supplier
  price?: number;
  invoice?: string;
};

export type Notification = {
  id: string;
  text: string;
  kind: EventKind;
  at: number; // ms epoch
};

export type Message = {
  id: string; // "out-<item>-<type>"
  text: string; // "Out of stock: ..."
  checked: boolean; // user acknowledged
  at: number; // first time it hit zero
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
  resolveMessage: (id: string) => void; // remove & remember dismissal for today
};

const InventoryContext = createContext<Ctx | null>(null);

/* --------------------------- Provider --------------------------- */

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<InventoryEvent[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [explicitItems, setExplicitItems] = useState<string[]>([]);
  const [explicitTypesByItem, setExplicitTypesByItem] = useState<
    Record<string, string[]>
  >({});

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  // Track “dismissed today” out-of-stock pairs so they don’t pop back up
  const [dismissedOutToday, setDismissedOutToday] = useState<Set<string>>(
  () => new Set()
);
  const dayKeyRef = useRef<string>("");

useEffect(() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  dayKeyRef.current = d.toISOString().slice(0, 10);
}, []);

// Reset the dismissed set when the day changes
useEffect(() => {
  const timer = setInterval(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const k = d.toISOString().slice(0, 10);
    if (k !== dayKeyRef.current) {
      dayKeyRef.current = k;
      setDismissedOutToday(new Set());
    }
  }, 60_000); // check every minute
  return () => clearInterval(timer);
}, []);
  // Live subscription to Firestore events
  useEffect(() => {
    const q = query(
      collection(db, "inventory_events"),
      orderBy("createdAt", "asc")
    );
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

  const createdAt =
    data.createdAt instanceof Timestamp ? data.createdAt : undefined;

  const atField =
    typeof data.at === "number"
      ? (data.at as number)
      : createdAt
      ? createdAt.toMillis()
      : Date.now();

  const kindVal: EventKind =
    data.kind === "in" ? "in" : data.kind === "out" ? "out" : "in";

  return {
    id: d.id,
    item: String(data.item ?? ""),
    type: String(data.type ?? ""),
    qty: Number(data.qty ?? 0) || 0,
    kind: kindVal,
    at: atField,
    source:
      typeof data.source === "string" && data.source.trim() !== ""
        ? data.source
        : undefined,
    price: typeof data.price === "number" ? data.price : undefined,
    invoice:
      typeof data.invoice === "string" && data.invoice.trim() !== ""
        ? data.invoice
        : undefined,
  };
});

      setEvents(rows);

      // derive sources
      const srcSet = new Set<string>();
      rows.forEach((r) => r.source && srcSet.add(r.source));
      setSources((prev) => {
        const merged = new Set(prev);
        srcSet.forEach((s) => merged.add(s));
        return Array.from(merged).sort((a, b) => a.localeCompare(b));
      });
    });
    return () => unsub();
  }, []);

  // Build item -> type -> qty from events + explicit lists
  const items = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};

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

  /* --------------- Out-of-stock messages with “dismiss today” --------------- */

  useEffect(() => {
    // Which pairs are zero now?
    const zeroNow = new Set<string>();
    Object.entries(items).forEach(([it, byType]) => {
      Object.entries(byType).forEach(([tp, q]) => {
        if (q === 0) zeroNow.add(`${it}|||${tp}`);
      });
    });

    // Add missing out-of-stock messages (unless dismissed today)
    setMessages((prev) => {
      const next = [...prev];

      zeroNow.forEach((key) => {
        const [it, tp] = key.split("|||");
        const msgId = `out-${it}-${tp}`;
        if (dismissedOutToday.has(msgId)) return; // user dismissed today
        if (!next.some((m) => m.id === msgId)) {
          next.push({
            id: msgId,
            text: `Out of stock: ${it} / ${tp}`,
            checked: false,
            at: Date.now(),
          });
        }
      });

      // Remove out-of-stock messages for pairs that are no longer zero (refilled)
      const stillZeroIds = new Set<string>(
        Array.from(zeroNow).map((key) => {
          const [it, tp] = key.split("|||");
          return `out-${it}-${tp}`;
        })
      );
      return next.filter(
        (m) => !m.id.startsWith("out-") || stillZeroIds.has(m.id)
      );
    });
  }, [items, dismissedOutToday]);

  /* --------------------------- Mutations --------------------------- */

  const addItem = (name: string) => {
    setExplicitItems((prev) =>
      prev.includes(name) ? prev : [...prev, name].sort((a, b) => a.localeCompare(b))
    );
  };

  const removeItem = (name: string) => {
    setExplicitItems((prev) => prev.filter((x) => x !== name));
    setExplicitTypesByItem((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const addType = (item: string, type: string) => {
    setExplicitTypesByItem((prev) => {
      const cur = prev[item] || [];
      if (cur.includes(type)) return prev;
      return { ...prev, [item]: [...cur, type].sort((a, b) => a.localeCompare(b)) };
    });
  };

  const removeType = (item: string, type: string) => {
    setExplicitTypesByItem((prev) => {
      const cur = prev[item] || [];
      return { ...prev, [item]: cur.filter((t) => t !== type) };
    });
  };

  const addSource = (name: string) => {
    setSources((prev) => (prev.includes(name) ? prev : [...prev, name]));
  };

  const removeSource = (name: string) => {
    setSources((prev) => prev.filter((s) => s !== name));
  };

  // Helper: push a local notification (UI filters to today)
  const pushNotification = (text: string, kind: EventKind) => {
    setNotifications((prev) => [
      ...prev,
      { id: `n-${crypto.randomUUID()}`, text, kind, at: Date.now() },
    ]);
  };

  const stockIn: Ctx["stockIn"] = async (
    item,
    type,
    qty,
    source,
    price,
    invoice,
    atMs
  ) => {
    const body = {
      item,
      type,
      qty,
      kind: "in" as const,
      at: typeof atMs === "number" ? atMs : Date.now(),
      source: source ?? null,
      price: typeof price === "number" ? price : null,
      invoice: invoice ?? null,
      createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, "inventory_events"), body);
    if (source) addSource(source);
    pushNotification(`Stock IN • ${qty} of ${item} / ${type}`, "in");
  };

  const stockOut: Ctx["stockOut"] = async (item, type, qty) => {
    const body = {
      item,
      type,
      qty,
      kind: "out" as const,
      at: Date.now(),
      createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, "inventory_events"), body);
    pushNotification(`Stock OUT • ${qty} of ${item} / ${type}`, "out");
  };

  // Notifications: clear single / all
  const clearNotification: Ctx["clearNotification"] = (id) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  const clearAllNotifications: Ctx["clearAllNotifications"] = () =>
    setNotifications([]);

  // Messages: user checks to hide it for the day (until refilled then goes 0 again)
  const resolveMessage: Ctx["resolveMessage"] = (id) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setDismissedOutToday((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const state: InventoryState = {
    items,
    events,
    notifications,
    messages,
    sources,
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

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

/* --------------------------- Hook --------------------------- */

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within <InventoryProvider />");
  return ctx;
}

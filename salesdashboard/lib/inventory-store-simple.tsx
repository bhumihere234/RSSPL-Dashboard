"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

// Types
export interface InventoryEvent {
  id: string;
  timestamp: number;
  item: string;
  type: string;
  qty: number;
  rate: number;
  source: string;
  supplier: string;
  kind: "IN" | "OUT";
}

export interface InventoryContextType {
  events: InventoryEvent[];
  items: string[];
  types: string[];
  sources: string[];
  suppliers: string[];
  notifications: Array<{ id: string; text: string; kind: "in" | "out" }>;
  
  addEvent: (event: Omit<InventoryEvent, "id" | "timestamp">) => void;
  addItem: (name: string) => void;
  removeItem: (name: string) => void;
  addType: (item: string, type: string) => void;
  removeType: (item: string, type: string) => void;
  addSource: (name: string) => void;
  removeSource: (name: string) => void;
  addSupplier: (source: string, supplier: string) => void;
  removeSupplier: (name: string) => void;
  getTypesForItem: (item: string) => string[];
  getSuppliersForSource: (source: string) => string[];
  pushNotification: (text: string, kind: "in" | "out") => void;
  clearNotifications: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  DELETED_ITEMS: 'rsspl_deleted_items',
  DELETED_TYPES: 'rsspl_deleted_types',  
  DELETED_SOURCES: 'rsspl_deleted_sources',
  DELETED_SUPPLIERS: 'rsspl_deleted_suppliers'
};

// Helper functions for localStorage
const getDeletedFromStorage = (key: string): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(key);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
};

const saveDeletedToStorage = (key: string, deleted: Set<string>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify([...deleted]));
  } catch (e) {
    console.error('Failed to save deleted items:', e);
  }
};

export function InventoryProvider({ children }: { children: ReactNode }) {
  // State
  const [events, setEvents] = useState<InventoryEvent[]>([]);
  const [explicitItems, setExplicitItems] = useState<string[]>([]);
  const [explicitTypes, setExplicitTypes] = useState<Record<string, string[]>>({});
  const [explicitSources, setExplicitSources] = useState<string[]>([]);
  const [explicitSuppliers, setExplicitSuppliers] = useState<Record<string, string[]>>({});
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; kind: "in" | "out" }>>([]);
  
  // Deleted items tracking
  const [deletedItems, setDeletedItems] = useState<Set<string>>(new Set());
  const [deletedTypes, setDeletedTypes] = useState<Set<string>>(new Set());
  const [deletedSources, setDeletedSources] = useState<Set<string>>(new Set());
  const [deletedSuppliers, setDeletedSuppliers] = useState<Set<string>>(new Set());

  // Load deleted items from localStorage on mount
  useEffect(() => {
    setDeletedItems(getDeletedFromStorage(STORAGE_KEYS.DELETED_ITEMS));
    setDeletedTypes(getDeletedFromStorage(STORAGE_KEYS.DELETED_TYPES));
    setDeletedSources(getDeletedFromStorage(STORAGE_KEYS.DELETED_SOURCES));
    setDeletedSuppliers(getDeletedFromStorage(STORAGE_KEYS.DELETED_SUPPLIERS));
  }, []);

  // Sample data
  useEffect(() => {
    const sampleEvents: InventoryEvent[] = [
      {
        id: "1",
        timestamp: Date.now() - 86400000,
        item: "Laptop",
        type: "Electronics",
        qty: 10,
        rate: 50000,
        source: "Amazon",
        supplier: "Dell",
        kind: "IN"
      },
      {
        id: "2",
        timestamp: Date.now() - 43200000,
        item: "Chair",
        type: "Furniture", 
        qty: 5,
        rate: 5000,
        source: "Local Store",
        supplier: "IKEA",
        kind: "OUT"
      }
    ];
    setEvents(sampleEvents);
    
    setExplicitItems(["Laptop", "Chair", "Desk", "Monitor"]);
    setExplicitTypes({
      "Laptop": ["Electronics", "Computing"],
      "Chair": ["Furniture", "Office"],
      "Desk": ["Furniture", "Office"],
      "Monitor": ["Electronics", "Display"]
    });
    setExplicitSources(["Amazon", "Local Store", "Flipkart", "Office Depot"]);
    setExplicitSuppliers({
      "Amazon": ["Dell", "HP", "Lenovo"],
      "Local Store": ["IKEA", "Godrej"],
      "Flipkart": ["Samsung", "LG"],
      "Office Depot": ["Steelcase", "Herman Miller"]
    });
  }, []);

  // Computed values (filtered by deleted items)
  const items = [...new Set([
    ...explicitItems.filter(item => !deletedItems.has(item)),
    ...events.map(e => e.item).filter(item => !deletedItems.has(item))
  ])];

  const types = [...new Set([
    ...Object.values(explicitTypes).flat().filter(type => !deletedTypes.has(type)),
    ...events.map(e => e.type).filter(type => !deletedTypes.has(type))
  ])];

  const sources = [...new Set([
    ...explicitSources.filter(source => !deletedSources.has(source)),
    ...events.map(e => e.source).filter(source => !deletedSources.has(source))
  ])];

  const suppliers = [...new Set([
    ...Object.values(explicitSuppliers).flat().filter(supplier => !deletedSuppliers.has(supplier)),
    ...events.map(e => e.supplier).filter(supplier => !deletedSuppliers.has(supplier))
  ])];

  // Helper functions
  const pushNotification = (text: string, kind: "in" | "out") => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, text, kind }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  const clearNotifications = () => setNotifications([]);

  // CRUD operations
  const addEvent = (event: Omit<InventoryEvent, "id" | "timestamp">) => {
    const newEvent: InventoryEvent = {
      ...event,
      id: Date.now().toString(),
      timestamp: Date.now()
    };
    setEvents(prev => [...prev, newEvent]);
    pushNotification(`Added ${event.kind === "IN" ? "inward" : "outward"} entry for ${event.item}`, event.kind.toLowerCase() as "in" | "out");
  };

  const addItem = (name: string) => {
    const n = name.trim();
    if (!n || items.includes(n)) return;
    setExplicitItems(prev => [...prev, n]);
    pushNotification(`Added item "${n}"`, "in");
  };

  const removeItem = (name: string) => {
    const n = name.trim();
    if (!n) return;
    
    const newDeleted = new Set(deletedItems);
    newDeleted.add(n);
    setDeletedItems(newDeleted);
    saveDeletedToStorage(STORAGE_KEYS.DELETED_ITEMS, newDeleted);
    
    pushNotification(`Removed item "${n}" from catalog`, "out");
  };

  const addType = (item: string, type: string) => {
    const it = item.trim();
    const tp = type.trim();
    if (!it || !tp) return;
    
    setExplicitTypes(prev => {
      const current = prev[it] || [];
      if (current.includes(tp)) return prev;
      return { ...prev, [it]: [...current, tp] };
    });
    pushNotification(`Added type "${tp}" to "${it}"`, "in");
  };

  const removeType = (item: string, type: string) => {
    const it = item.trim();
    const tp = type.trim();
    if (!it || !tp) return;
    
    const newDeleted = new Set(deletedTypes);
    newDeleted.add(tp);
    setDeletedTypes(newDeleted);
    saveDeletedToStorage(STORAGE_KEYS.DELETED_TYPES, newDeleted);
    
    pushNotification(`Removed type "${tp}" from catalog`, "out");
  };

  const addSource = (name: string) => {
    const n = name.trim();
    if (!n || sources.includes(n)) return;
    setExplicitSources(prev => [...prev, n]);
    pushNotification(`Added source "${n}"`, "in");
  };

  const removeSource = (name: string) => {
    const n = name.trim();
    if (!n) return;
    
    const newDeleted = new Set(deletedSources);
    newDeleted.add(n);
    setDeletedSources(newDeleted);
    saveDeletedToStorage(STORAGE_KEYS.DELETED_SOURCES, newDeleted);
    
    pushNotification(`Removed source "${n}" from catalog`, "out");
  };

  const addSupplier = (source: string, supplier: string) => {
    const s = source.trim();
    const sup = supplier.trim();
    if (!s || !sup) return;
    
    setExplicitSuppliers(prev => {
      const current = prev[s] || [];
      if (current.includes(sup)) return prev;
      return { ...prev, [s]: [...current, sup] };
    });
    pushNotification(`Added supplier "${sup}" to "${s}"`, "in");
  };

  const removeSupplier = (supplier: string) => {
    const sup = supplier.trim();
    if (!sup) return;
    
    const newDeleted = new Set(deletedSuppliers);
    newDeleted.add(sup);
    setDeletedSuppliers(newDeleted);
    saveDeletedToStorage(STORAGE_KEYS.DELETED_SUPPLIERS, newDeleted);
    
    pushNotification(`Removed supplier "${sup}" from catalog`, "out");
  };

  const getTypesForItem = (item: string): string[] => {
    return [...new Set([
      ...(explicitTypes[item] || []).filter(type => !deletedTypes.has(type)),
      ...events.filter(e => e.item === item).map(e => e.type).filter(type => !deletedTypes.has(type))
    ])];
  };

  const getSuppliersForSource = (source: string): string[] => {
    return [...new Set([
      ...(explicitSuppliers[source] || []).filter(supplier => !deletedSuppliers.has(supplier)),
      ...events.filter(e => e.source === source).map(e => e.supplier).filter(supplier => !deletedSuppliers.has(supplier))
    ])];
  };

  const value: InventoryContextType = {
    events,
    items,
    types,
    sources,
    suppliers,
    notifications,
    addEvent,
    addItem,
    removeItem,
    addType,
    removeType,
    addSource,
    removeSource,
    addSupplier,
    removeSupplier,
    getTypesForItem,
    getSuppliersForSource,
    pushNotification,
    clearNotifications
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return context;
}

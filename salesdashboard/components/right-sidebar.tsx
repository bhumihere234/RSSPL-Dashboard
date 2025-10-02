"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  X as CloseIcon,
} from "lucide-react";
import { useInventory } from "@/lib/inventory-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  
  useEffect(() => {
    // Set initial time on client side only
    setNow(new Date());
    
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  
  return now;
}

function formatTime(d: Date) {
  const hours = d.getHours();
  const h12 = hours % 12 || 12;
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  return `${h12}:${m} ${ampm}`;
}

export function RightSidebar() {
  const now = useClock();
  const inventory = useInventory();

  const [locationText, setLocationText] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!mounted) return;
          const { latitude, longitude } = pos.coords;
          setLocationText(`Near ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        },
        () => {
          if (!mounted) return;
          setLocationText(Intl.DateTimeFormat().resolvedOptions().timeZone);
        },
        { enableHighAccuracy: false, maximumAge: 600_000, timeout: 5000 }
      );
    } else {
      setLocationText(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
    return () => {
      mounted = false;
    };
  }, []);

  // show only today's notifications
  const todaysNotifications = useMemo(() => {
    if (!now) return [];
    
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    // Filter notifications from today
    return inventory.notifications.filter(() => {
      const notificationDate = new Date();
      return notificationDate >= start && notificationDate < end;
    });
  }, [now, inventory.notifications]);

  return (
    <aside className="w-full md:w-80 bg-[#0e0f12] border-l border-neutral-800 text-neutral-200 flex flex-col">
      <div className="p-4 border-b border-neutral-800">
        <div className="text-[10px] uppercase tracking-widest text-neutral-400">
          {now ? now.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase() : "LOADING..."}
        </div>
        <div className="mt-2 text-4xl md:text-5xl font-extrabold tracking-tight text-white">
          {now ? formatTime(now) : "--:-- --"}
        </div>
        <div className="mt-1 text-xs text-neutral-400 flex items-center gap-2">
          {now ? now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Loading date..."}
          <span className="text-neutral-600">•</span>
          <span>{locationText || Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
        </div>
      </div>

      <div className="px-4 py-3 flex items-center justify-between border-b border-neutral-800">
        <div className="text-[11px] uppercase tracking-widest text-blue-400">
          Notifications
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={inventory.clearNotifications}
          className="bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
        >
          Clear All
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <ul className="p-3 space-y-2">
          {todaysNotifications.map((n) => (
            <li
              key={n.id}
              className="bg-neutral-900/60 border border-neutral-800 rounded-md p-3 flex items-center gap-3"
            >
              {n.kind === "in" ? (
                <ArrowUpRight size={16} className="text-green-400 shrink-0" />
              ) : (
                <ArrowDownRight size={16} className="text-orange-400 shrink-0" />
              )}
              <div className="flex-1">
                <div className="text-sm text-neutral-100">{n.text}</div>
                <div className="text-[11px] text-neutral-500">
                  {new Date().toLocaleString()}
                </div>
              </div>
              <button
                aria-label="Clear notification"
                onClick={() => {
                  // Individual clear not implemented in simple store
                  // You could enhance the store to support this
                }}
                className="p-1 rounded hover:bg-neutral-800 text-neutral-400"
                title="Clear"
              >
                <CloseIcon size={16} />
              </button>
            </li>
          ))}
          {todaysNotifications.length === 0 && (
            <li className="text-xs text-neutral-500 px-1">No notifications</li>
          )}
        </ul>
      </ScrollArea>

      <div className="px-4 py-3 border-t border-neutral-800">
        <div className="text-[11px] uppercase tracking-widest text-blue-400 mb-2">
          Messages
        </div>
        <ScrollArea className="max-h-48">
          <ul className="space-y-2">
            <li className="text-xs text-neutral-500">No messages</li>
          </ul>
        </ScrollArea>
      </div>
    </aside>
  );
}

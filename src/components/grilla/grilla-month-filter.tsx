"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import type { MonthOption } from "@/lib/utils";

interface GrillaMonthFilterProps {
  months: MonthOption[];
}

export function GrillaMonthFilter({ months }: GrillaMonthFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const month = searchParams.get("month") || "all";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const options = [
    { value: "all", label: "Todos", count: months.reduce((n, m) => n + m.count, 0) },
    ...months,
  ];

  const selected = options.find((o) => o.value === month) ?? options[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("month");
    else params.set("month", value);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setOpen(false);
  }

  if (months.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-surface text-xs text-foreground hover:bg-neutral-50 transition-colors"
      >
        <span>{selected.label}</span>
        <ChevronDown
          size={12}
          className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-md border border-border bg-surface py-1 shadow-sm">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => select(opt.value)}
              className="flex w-full items-center justify-between gap-3 px-2.5 py-1.5 text-left text-xs hover:bg-neutral-50 transition-colors"
            >
              <span className={month === opt.value ? "text-foreground" : "text-muted"}>
                {opt.label}
              </span>
              <span className="flex items-center gap-1.5 text-muted">
                <span className="text-[10px] tabular-nums">{opt.count}</span>
                {month === opt.value && <Check size={12} />}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

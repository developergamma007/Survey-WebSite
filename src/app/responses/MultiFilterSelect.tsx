"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Minus, Search } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  multiFilterTriggerLabel,
  optionAppearsSelected,
  toggleMultiAll,
  toggleMultiOption,
} from "@/lib/multiScopeFilter";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type MultiFilterOption = {
  value: string;
  label: string;
};

type Props = {
  options: MultiFilterOption[];
  selection: string[];
  onChange: (selection: string[]) => void;
  allLabel: string;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
};

const MENU_WIDTH = 360;
const MENU_MAX_HEIGHT = 320;

export default function MultiFilterSelect({
  options,
  selection,
  onChange,
  allLabel,
  disabled = false,
  className,
  searchable = true,
  searchPlaceholder = "Search…",
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const allValues = useMemo(() => options.map((o) => o.value), [options]);
  const allChecked = selection.length === 0;
  const partiallyChecked = selection.length > 0 && selection.length < allValues.length;

  const triggerLabel = multiFilterTriggerLabel(selection, allLabel, options);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(MENU_WIDTH, window.innerWidth - 16);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = window.innerWidth - width - 8;
    }
    left = Math.max(8, left);

    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const openUp = spaceBelow < 220 && rect.top > spaceBelow;

    setMenuStyle({
      position: "fixed",
      left,
      width,
      zIndex: 9999,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 6, maxHeight: MENU_MAX_HEIGHT }
        : { top: rect.bottom + 6, maxHeight: Math.min(MENU_MAX_HEIGHT, spaceBelow) }),
    });
  };

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onReflow = () => updateMenuPosition();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const menu = open ? (
    <div ref={menuRef} className="ps-ward-filter-menu ps-ward-filter-menu--portal" style={menuStyle} role="listbox">
      {searchable ? (
        <div className="ps-ward-filter-search">
          <Search size={14} className="shrink-0 text-slate-400" />
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="ps-ward-filter-search-input"
          />
        </div>
      ) : null}
      <div className="ps-ward-filter-list custom-scrollbar">
        <button
          type="button"
          role="option"
          aria-selected={allChecked}
          className={cn("ps-ward-filter-option", allChecked && "is-selected")}
          onClick={() => onChange(toggleMultiAll(selection, allValues))}
        >
          <span className="flex items-center gap-2">
            <span className="ps-multi-filter-checkbox" aria-hidden>
              {partiallyChecked ? <Minus size={12} /> : allChecked ? <Check size={12} /> : null}
            </span>
            <span>{allLabel}</span>
          </span>
          {allChecked ? <Check size={14} className="text-indigo-600" /> : null}
        </button>
        {filtered.map((option) => {
          const checked = optionAppearsSelected(selection, option.value);
          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={checked}
              className={cn("ps-ward-filter-option", checked && "is-selected")}
              onClick={() => onChange(toggleMultiOption(selection, option.value, allValues))}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="ps-multi-filter-checkbox" aria-hidden>
                  {checked ? <Check size={12} /> : null}
                </span>
                <span className="truncate">{option.label}</span>
              </span>
            </button>
          );
        })}
        {filtered.length === 0 ? (
          <p className="ps-ward-filter-empty">No matches.</p>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <div className={cn("ps-ward-filter", className)}>
      <button
        ref={triggerRef}
        type="button"
        className="ps-ward-filter-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown size={14} className={cn("shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
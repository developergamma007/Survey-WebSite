"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Ward = { id: number; ward_name_en: string };

type Props = {
  wards: Ward[];
  value: string;
  onChange: (wardName: string) => void;
};

const MENU_WIDTH = 360;
const MENU_MAX_HEIGHT = 320;

export default function WardFilterSelect({ wards, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedLabel = value || "All Wards";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return wards;
    return wards.filter((w) => w.ward_name_en.toLowerCase().includes(q));
  }, [wards, search]);

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
      <div className="ps-ward-filter-search">
        <Search size={14} className="shrink-0 text-slate-400" />
        <input
          autoFocus
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search wards…"
          className="ps-ward-filter-search-input"
        />
      </div>
      <div className="ps-ward-filter-list custom-scrollbar">
        <button
          type="button"
          role="option"
          aria-selected={!value}
          className={cn("ps-ward-filter-option", !value && "is-selected")}
          onClick={() => {
            onChange("");
            setOpen(false);
            setSearch("");
          }}
        >
          <span>All Wards</span>
          {!value ? <Check size={14} /> : null}
        </button>
        {filtered.map((ward) => (
          <button
            key={ward.id}
            type="button"
            role="option"
            aria-selected={value === ward.ward_name_en}
            className={cn("ps-ward-filter-option", value === ward.ward_name_en && "is-selected")}
            onClick={() => {
              onChange(ward.ward_name_en);
              setOpen(false);
              setSearch("");
            }}
          >
            <span className="truncate">{ward.ward_name_en}</span>
            {value === ward.ward_name_en ? <Check size={14} /> : null}
          </button>
        ))}
        {filtered.length === 0 ? (
          <p className="ps-ward-filter-empty">No wards match your search.</p>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <div className="ps-ward-filter">
      <button
        ref={triggerRef}
        type="button"
        className="ps-ward-filter-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown size={14} className={cn("shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}

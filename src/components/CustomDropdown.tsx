"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils"; // Assuming a lib/utils.ts exists or I will create it

interface Option {
    id: number | string;
    label: string;
    subLabel?: string;
}

interface CustomDropdownProps {
    options: Option[];
    value: number | string;
    onChange: (value: number | string) => void;
    placeholder: string;
    label?: string;
}

export default function CustomDropdown({
    options,
    value,
    onChange,
    placeholder,
    label,
}: CustomDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.id === value);

    const filteredOptions = options.filter((opt) =>
        opt?.label?.toLowerCase().includes(search?.toLowerCase()) ||
        (opt?.subLabel && opt?.subLabel?.toLowerCase().includes(search?.toLowerCase()))
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="space-y-1" ref={dropdownRef}>
            {label && <label className="text-[10px] font-black text-slate-500 uppercase ml-1">{label}</label>}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all flex items-center justify-between group"
                >
                    <span className={cn("truncate", !selectedOption && "text-slate-400")}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
                </button>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
                        <div className="p-2 border-b border-slate-50 flex items-center gap-2 bg-slate-50/50">
                            <Search className="w-4 h-4 text-slate-400 ml-2" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-transparent py-1.5 text-sm font-medium outline-none placeholder:text-slate-400"
                            />
                        </div>
                        <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt) => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => {
                                            onChange(opt.id);
                                            setIsOpen(false);
                                            setSearch("");
                                        }}
                                        className={cn(
                                            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors group",
                                            value === opt.id ? "bg-indigo-50 text-indigo-600" : "hover:bg-slate-50 text-slate-700"
                                        )}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold">{opt.label}</span>
                                            {opt.subLabel && <span className="text-[10px] text-slate-400 font-medium">{opt.subLabel}</span>}
                                        </div>
                                        {value === opt.id && <Check className="w-4 h-4" />}
                                    </button>
                                ))
                            ) : (
                                <div className="py-8 text-center">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No Results</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save, ChevronRight, Layout, ListPlus, Copy, Check } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { API_BASE_URL } from "@/lib/config";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Question {
    text: string;
    options: string[];
}

interface Ward {
    id: number;
    ward_name_en: string;
}

export default function WardManagementTab() {
    const [wards, setWards] = useState<Ward[]>([]);
    const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [newWardName, setNewWardName] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [copiedWardName, setCopiedWardName] = useState<string | null>(null);

    useEffect(() => {
        fetchWards();
    }, []);

    const fetchWards = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/wards`);
            const data = await res.json();
            if (res.ok && Array.isArray(data)) {
                setWards(data);
            } else {
                setWards([]);
            }
        } catch (err) {
            console.error("Failed to fetch wards", err);
        }
    };

    const fetchQuestions = async (wardName: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/wards/${encodeURIComponent(wardName)}/questions`);
            const data = await res.json();
            if (res.ok && Array.isArray(data)) {
                setQuestions(data.map((q: any) => ({
                    text: q.text,
                    options: q.options ? q.options.split(",") : []
                })));
            } else {
                setQuestions([]);
            }
        } catch (err) {
            console.error("Failed to fetch questions", err);
        } finally {
            setLoading(false);
        }
    };

    const createWard = async () => {
        if (!newWardName) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/wards`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ward_name_en: newWardName }),
            });
            if (res.ok) {
                setNewWardName("");
                fetchWards();
            }
        } catch (err) {
            console.error("Failed to create ward", err);
        }
    };

    const saveQuestions = async () => {
        if (!selectedWard) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/wards/${encodeURIComponent(selectedWard.ward_name_en)}/questions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(questions),
            });
            if (res.ok) {
                setMessage("Questions saved successfully!");
                setTimeout(() => setMessage(null), 3000);
            }
        } catch (err) {
            console.error("Failed to save questions", err);
        } finally {
            setLoading(false);
        }
    };

    const addQuestion = () => {
        setQuestions([...questions, { text: "", options: [""] }]);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const updateQuestionText = (index: number, text: string) => {
        const newQuestions = [...questions];
        newQuestions[index].text = text;
        setQuestions(newQuestions);
    };

    const addOption = (qIndex: number) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options.push("");
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex: number, oIndex: number, text: string) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = text;
        setQuestions(newQuestions);
    };

    const removeOption = (qIndex: number, oIndex: number) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, i) => i !== oIndex);
        setQuestions(newQuestions);
    };

    const copyToClipboard = (wardName: string) => {
        const url = `${window.location.origin}/w/${encodeURIComponent(wardName)}`;
        navigator.clipboard.writeText(url);
        setCopiedWardName(wardName);
        setTimeout(() => setCopiedWardName(null), 2000);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            {/* Sidebar: Ward Selection */}
            <aside className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
                    <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                        <ListPlus className="text-indigo-600" size={20} />
                        Wards
                    </h2>

                    <div className="space-y-2 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {wards.map((ward) => (
                            <div
                                key={ward.id}
                                onClick={() => {
                                    setSelectedWard(ward);
                                    fetchQuestions(ward.ward_name_en);
                                }}
                                className={cn(
                                    "w-full flex items-center justify-between p-4 rounded-2xl transition-all group cursor-pointer",
                                    selectedWard?.id === ward.id
                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                                        : "hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                                )}
                            >
                                <div className="text-left">
                                    <p className="font-bold">{ward.ward_name_en}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                copyToClipboard(ward.ward_name_en);
                                            }}
                                            className={cn(
                                                "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-[10px] font-black uppercase tracking-wider",
                                                selectedWard?.id === ward.id ? "bg-white/20 text-white hover:bg-white/30" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                            )}
                                        >
                                            {copiedWardName === ward.ward_name_en ? <Check size={10} /> : <Copy size={10} />}
                                            {copiedWardName === ward.ward_name_en ? "Copied" : "Copy Link"}
                                        </button>
                                    </div>
                                </div>
                                <ChevronRight size={18} className={cn("transition-transform", selectedWard?.id === ward.id ? "rotate-90" : "group-hover:translate-x-1")} />
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Add New Ward</h3>
                        <div className="space-y-3">
                            <input
                                placeholder="Ward Name (e.g. KR Puram)"
                                value={newWardName}
                                onChange={(e) => setNewWardName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                            />
                            <button
                                onClick={createWard}
                                className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-sm hover:bg-black transition-all"
                            >
                                Create Ward
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Area: Question Config */}
            <main className="lg:col-span-8 flex flex-col gap-6">
                {!selectedWard ? (
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-100/50 rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-100 mb-6">
                            <Layout className="text-indigo-400" size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">No Ward Selected</h3>
                        <p className="text-slate-500 max-w-sm font-medium">Select a ward from the sidebar to manage its specific survey questions.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-2xl font-black text-slate-900">
                                Questions for <span className="text-indigo-600">{selectedWard.ward_name_en}</span>
                            </h2>
                            <div className="flex items-center gap-3">
                                {message && <p className="text-sm font-bold text-green-600 animate-pulse">{message}</p>}
                                <button
                                    onClick={saveQuestions}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
                                >
                                    <Save size={18} />
                                    {loading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-6">
                            {questions.map((q, qIndex) => (
                                <div key={qIndex} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex-1">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Question {qIndex + 1}</label>
                                            <input
                                                value={q.text}
                                                onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                                                placeholder="Type your question here..."
                                                className="w-full text-lg font-bold text-slate-900 border-none p-0 focus:ring-0 outline-none placeholder:text-slate-300"
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeQuestion(qIndex)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1 block">Options</label>
                                        {q.options.map((opt, oIndex) => (
                                            <div key={oIndex} className="flex items-center gap-3 group">
                                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-xs font-black text-slate-400 border border-slate-100">
                                                    {String.fromCharCode(65 + oIndex)}
                                                </div>
                                                <input
                                                    value={opt}
                                                    onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                                    placeholder={`Option ${oIndex + 1}`}
                                                    className="flex-1 bg-slate-50 px-4 py-2.5 rounded-xl border border-transparent focus:border-indigo-500 focus:bg-white text-sm font-bold text-slate-700 outline-none transition-all"
                                                />
                                                <button
                                                    onClick={() => removeOption(qIndex, oIndex)}
                                                    className="p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => addOption(qIndex)}
                                            className="flex items-center gap-2 text-indigo-600 text-sm font-black hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all mt-4"
                                        >
                                            <Plus size={16} />
                                            Add Option
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={addQuestion}
                                className="w-full py-8 border-2 border-dashed border-indigo-200 rounded-3xl text-indigo-400 font-black flex flex-col items-center justify-center gap-3 hover:bg-white hover:border-indigo-500 hover:text-indigo-600 transition-all group"
                            >
                                <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Plus size={24} />
                                </div>
                                Add New Question
                            </button>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save, ChevronRight, Layout, ListPlus, Copy, Check, Download, ListChecks, TextCursorInput } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { API_BASE_URL } from "@/lib/config";
import {
    parseQuestionConfig,
    serializeChoiceQuestion,
    serializeTextQuestion,
    type QuestionFieldType,
} from "@/lib/surveyText";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface EditorQuestion {
    text: string;
    type: QuestionFieldType;
    options: string[];
    fieldLabels: string[];
}

function toEditorQuestion(raw: { text: string; options: string }): EditorQuestion {
    const config = parseQuestionConfig(raw.options);
    if (config.type === "text") {
        return {
            text: raw.text,
            type: "text",
            options: [],
            fieldLabels: config.fields.length ? config.fields : [],
        };
    }
    return {
        text: raw.text,
        type: "choice",
        options: config.options.length ? config.options : [""],
        fieldLabels: [],
    };
}

function toApiQuestion(question: EditorQuestion) {
    return {
        text: question.text,
        options:
            question.type === "text"
                ? serializeTextQuestion(question.fieldLabels.map((f) => f.trim()).filter(Boolean))
                : serializeChoiceQuestion(question.options.map((o) => o.trim()).filter(Boolean)),
    };
}

interface Ward {
    id: number;
    ward_name_en: string;
}

type SurveyResponseRow = {
    id: number;
    assembly: string | null;
    gba_ward: string | null;
    surveyor_name: string | null;
    surveyor_mobile: string | null;
    interviewer_name: string | null;
    interviewer_age: string | null;
    q1: string | null;
    created_at: string;
};

type Props = {
    responses?: SurveyResponseRow[];
};

function exportResponsesCsv(rows: SurveyResponseRow[], wardName?: string) {
    const filtered = wardName
        ? rows.filter((r) => r.gba_ward === wardName)
        : rows;
    const headers = ["ID", "Date", "Assembly", "Ward", "Surveyor", "Respondent", "Age", "Q1"];
    const lines = [
        headers.join(","),
        ...filtered.map((r) =>
            [
                r.id,
                new Date(r.created_at).toLocaleDateString(),
                r.assembly ?? "",
                r.gba_ward ?? "",
                r.surveyor_name ?? "",
                r.interviewer_name ?? "",
                r.interviewer_age ?? "",
                r.q1 ?? "",
            ]
                .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                .join(",")
        ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = wardName
        ? `responses-${wardName.replace(/\s+/g, "-")}.csv`
        : "survey-responses.csv";
    link.click();
    URL.revokeObjectURL(url);
}

export default function WardManagementTab({ responses = [] }: Props) {
    const [wards, setWards] = useState<Ward[]>([]);
    const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
    const [questions, setQuestions] = useState<EditorQuestion[]>([]);
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
                setQuestions(data.map((q: { text: string; options: string }) => toEditorQuestion(q)));
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
                body: JSON.stringify(questions.map(toApiQuestion)),
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
        setQuestions([
            ...questions,
            {
                text: "",
                type: "choice",
                options: [""],
                fieldLabels: [],
            },
        ]);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const updateQuestionText = (index: number, text: string) => {
        const newQuestions = [...questions];
        newQuestions[index].text = text;
        setQuestions(newQuestions);
    };

    const setQuestionType = (index: number, type: QuestionFieldType) => {
        const newQuestions = [...questions];
        const current = newQuestions[index];
        if (type === "text") {
            newQuestions[index] = {
                ...current,
                type: "text",
                options: [],
                fieldLabels: current.fieldLabels.length ? current.fieldLabels : [""],
            };
        } else {
            newQuestions[index] = {
                ...current,
                type: "choice",
                options: current.options.length ? current.options : [""],
                fieldLabels: [],
            };
        }
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

    const updateFieldLabel = (qIndex: number, fIndex: number, text: string) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].fieldLabels[fIndex] = text;
        setQuestions(newQuestions);
    };

    const addTextField = (qIndex: number) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].fieldLabels.push("");
        setQuestions(newQuestions);
    };

    const removeTextField = (qIndex: number, fIndex: number) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].fieldLabels = newQuestions[qIndex].fieldLabels.filter((_, i) => i !== fIndex);
        setQuestions(newQuestions);
    };

    const copyToClipboard = (wardName: string) => {
        const url = `${window.location.origin}/w/${encodeURIComponent(wardName)}`;
        navigator.clipboard.writeText(url);
        setCopiedWardName(wardName);
        setTimeout(() => setCopiedWardName(null), 2000);
    };

    return (
        <div className="ps-ward-editor grid grid-cols-1 lg:grid-cols-12 gap-3 animate-in fade-in duration-500">
            {/* Sidebar: Ward Selection */}
            <aside className="lg:col-span-3 space-y-3">
                <div className="bg-white rounded-xl p-3 border border-slate-200/80">
                    <h2 className="text-[11px] font-semibold text-slate-800 mb-2 flex items-center gap-1.5 tracking-tight">
                        <ListPlus className="text-indigo-500" size={14} />
                        Wards
                    </h2>

                    <div className="space-y-1 mb-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 custom-scrollbar">
                        {wards.map((ward) => (
                            <div
                                key={ward.id}
                                onClick={() => {
                                    setSelectedWard(ward);
                                    fetchQuestions(ward.ward_name_en);
                                }}
                                className={cn(
                                    "w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all group cursor-pointer",
                                    selectedWard?.id === ward.id
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                                )}
                            >
                                <div className="text-left min-w-0">
                                    <p className="text-xs font-semibold truncate">{ward.ward_name_en}</p>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                copyToClipboard(ward.ward_name_en);
                                            }}
                                            className={cn(
                                                "flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors text-[9px] font-bold uppercase tracking-wide",
                                                selectedWard?.id === ward.id ? "bg-white/20 text-white hover:bg-white/30" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                            )}
                                        >
                                            {copiedWardName === ward.ward_name_en ? <Check size={8} /> : <Copy size={8} />}
                                            {copiedWardName === ward.ward_name_en ? "Copied" : "Copy Link"}
                                        </button>
                                    </div>
                                </div>
                                <ChevronRight size={14} className={cn("shrink-0 transition-transform", selectedWard?.id === ward.id ? "rotate-90" : "group-hover:translate-x-0.5")} />
                            </div>
                        ))}
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Add New Ward</h3>
                        <div className="space-y-1.5">
                            <input
                                placeholder="Ward Name (e.g. KR Puram)"
                                value={newWardName}
                                onChange={(e) => setNewWardName(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                            />
                            <button
                                onClick={createWard}
                                className="w-full py-1.5 bg-slate-900 text-white rounded-md font-semibold text-xs hover:bg-black transition-all"
                            >
                                Create Ward
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Area: Question Config */}
            <main className="lg:col-span-9 flex flex-col gap-2">
                {!selectedWard ? (
                    <div className="h-full min-h-[280px] flex flex-col items-center justify-center bg-slate-100/50 rounded-lg border border-dashed border-slate-200 p-6 text-center">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-3">
                            <Layout className="text-indigo-400" size={20} />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-1">No Ward Selected</h3>
                        <p className="text-xs text-slate-500 max-w-sm">Select a ward from the sidebar to manage its survey questions.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-[13px] font-semibold text-slate-800 tracking-tight">
                                Questions for <span className="text-indigo-600">{selectedWard.ward_name_en}</span>
                            </h2>
                            <div className="flex items-center gap-2 shrink-0">
                                {message && <p className="text-[11px] font-medium text-emerald-600">{message}</p>}
                                <button
                                    type="button"
                                    onClick={() => exportResponsesCsv(responses, selectedWard.ward_name_en)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
                                >
                                    <Download size={14} />
                                    Export
                                </button>
                                <button
                                    onClick={saveQuestions}
                                    disabled={loading}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm shadow-indigo-200/50"
                                >
                                    <Save size={14} />
                                    {loading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            {questions.map((q, qIndex) => (
                                <div key={qIndex} className="ps-question-card">
                                    <div className="flex justify-between items-start mb-2 gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                                    Question {qIndex + 1}
                                                </label>
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                                    {q.type === "text" ? "Input Fields" : "Multiple Choice"}
                                                </span>
                                            </div>
                                            <input
                                                value={q.text}
                                                onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                                                placeholder="Kannada | English | field_key"
                                                className="w-full text-[13px] font-medium text-slate-900 border-none p-0 focus:ring-0 outline-none placeholder:text-slate-300 tracking-tight"
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeQuestion(qIndex)}
                                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all shrink-0"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2 mb-2">
                                        <button
                                            type="button"
                                            onClick={() => setQuestionType(qIndex, "choice")}
                                            className={cn("ps-type-pill", q.type === "choice" && "is-active")}
                                        >
                                            <ListChecks size={12} />
                                            Multiple Choice
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setQuestionType(qIndex, "text")}
                                            className={cn("ps-type-pill", q.type === "text" && "is-active")}
                                        >
                                            <TextCursorInput size={12} />
                                            Input Fields
                                        </button>
                                    </div>

                                    {q.type === "text" ? (
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 block">
                                                Field labels (respondent can click Add for more entries)
                                            </label>
                                            {q.fieldLabels.map((label, fIndex) => (
                                                <div key={fIndex} className="flex items-center gap-2 group">
                                                    <div className="w-5 h-5 rounded-md bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-500 shrink-0">
                                                        {fIndex + 1}
                                                    </div>
                                                    <input
                                                        value={label}
                                                        onChange={(e) => updateFieldLabel(qIndex, fIndex, e.target.value)}
                                                        placeholder="Field label (e.g. Candidate 1)"
                                                        className="flex-1 bg-slate-50 px-2.5 py-1.5 rounded-md border border-transparent focus:border-indigo-500 focus:bg-white text-xs font-medium text-slate-700 outline-none"
                                                    />
                                                    <button
                                                        onClick={() => removeTextField(qIndex, fIndex)}
                                                        className="p-1 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all shrink-0"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => addTextField(qIndex)}
                                                className="flex items-center gap-1 text-indigo-600 text-xs font-semibold hover:bg-indigo-50 px-2 py-1 rounded-md transition-all"
                                            >
                                                <Plus size={12} />
                                                Add Field
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 block">Options</label>
                                            {q.options.map((opt, oIndex) => (
                                                <div key={oIndex} className="flex items-center gap-2 group">
                                                    <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-100 shrink-0">
                                                        {String.fromCharCode(65 + oIndex)}
                                                    </div>
                                                    <input
                                                        value={opt}
                                                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                                        placeholder={`Option ${oIndex + 1}`}
                                                        className="flex-1 bg-slate-50 px-2.5 py-1.5 rounded-md border border-transparent focus:border-indigo-500 focus:bg-white text-xs font-medium text-slate-700 outline-none"
                                                    />
                                                    <button
                                                        onClick={() => removeOption(qIndex, oIndex)}
                                                        className="p-1 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all shrink-0"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => addOption(qIndex)}
                                                className="flex items-center gap-1 text-indigo-600 text-xs font-semibold hover:bg-indigo-50 px-2 py-1 rounded-md transition-all"
                                            >
                                                <Plus size={12} />
                                                Add Option
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addQuestion}
                                className="w-full py-3 border border-dashed border-indigo-200 rounded-xl text-indigo-500 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-indigo-50/40 hover:border-indigo-400 hover:text-indigo-600 transition-all"
                            >
                                <Plus size={14} />
                                Add New Question
                            </button>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, LayoutDashboard, List, MapPin, ChevronRight, Search, Download, Activity, Vote, Settings2 } from "lucide-react";
import AnalyticsCharts from "./AnalyticsCharts";
import WardManagementTab from "./WardManagementTab";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { API_BASE_URL } from "@/lib/config";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SurveyResponse {
    id: number;
    assembly: string | null;
    gba_ward: string | null;
    polling_station_name: string | null;
    polling_station_number: string | null;
    surveyor_name: string | null;
    surveyor_mobile: string | null;

    interviewer_name: string | null;
    interviewer_age: string | null;
    interviewer_gender: string | null;
    interviewer_caste: string | null;
    interviewer_community: string | null;
    interviewer_mobile: string | null;
    interviewer_education: string | null;
    interviewer_work: string | null;

    q1: string | null;
    q2: string | null;
    q3: string | null;
    q4: string | null;

    candidate_priority1: string | null;
    candidate_priority2: string | null;
    candidate_priority3: string | null;
    candidate_priority4: string | null;
    candidate_priority5: string | null;

    latitude: number | null;
    longitude: number | null;
    audio_base64: string | null;
    created_at: string;
}

export default function ResponsesPage() {
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'analytics' | 'list' | 'questions'>('analytics');
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        const fetchResponses = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/responses`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (res.status === 401) {
                    localStorage.removeItem("token");
                    router.push("/login");
                    return;
                }

                if (!res.ok) {
                    throw new Error("Failed to fetch responses");
                }

                const data = await res.json();
                setResponses(data);
            } catch (err) {
                setError("Error loading data");
            } finally {
                setLoading(false);
            }
        };

        fetchResponses();
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        router.push("/login");
    };

    const filteredResponses = responses.filter(r =>
        r.interviewer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.gba_ward?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.surveyor_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50/50 backdrop-blur-sm">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="mb-4 h-12 w-12 rounded-full border-4 border-indigo-100 border-t-indigo-600"
            />
            <div className="text-lg font-medium text-gray-600">Syncing survey intelligence...</div>
        </div>
    );

    if (error) return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="rounded-2xl bg-white p-8 shadow-xl">
                <div className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <Activity className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Data Fetch Failed</h3>
                    <p className="mt-2 text-gray-600">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 rounded-xl bg-gray-900 px-6 py-2 text-white transition-all hover:bg-gray-800"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans text-gray-900 selection:bg-indigo-100 selection:text-indigo-900">
            {/* Glossy Navbar */}
            <nav className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/80 backdrop-blur-md">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200">
                                <Vote className="h-6 w-6" />
                            </div>
                            <h1 className="text-xl font-black tracking-tight text-gray-900">
                                Survey<span className="text-indigo-600">Admin</span>
                            </h1>
                            <div className="flex items-center gap-1.5 ml-4 rounded-full bg-indigo-50 px-2.5 py-1 border border-indigo-100">
                                <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">Live</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleLogout}
                                className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign Out
                            </motion.button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Dashboard Header */}
                <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900">Electoral Intelligence</h2>
                        <p className="mt-1 text-gray-500">Real-time ground insights and field reporting dashboard</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search field data..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm shadow-sm transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 sm:w-64"
                            />
                        </div>
                        <button className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-gray-200 transition-all hover:bg-gray-800">
                            <Download className="mr-2 h-4 w-4" />
                            Export
                        </button>
                    </div>
                </div>

                {/* Modern Tabs */}
                <div className="mb-8 inline-flex rounded-2xl bg-gray-100 p-1.5 shadow-inner">
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={cn(
                            "inline-flex items-center rounded-xl px-5 py-2.5 text-sm font-bold transition-all",
                            activeTab === 'analytics'
                                ? "bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Insights
                    </button>
                    <button
                        onClick={() => setActiveTab('list')}
                        className={cn(
                            "inline-flex items-center rounded-xl px-5 py-2.5 text-sm font-bold transition-all",
                            activeTab === 'list'
                                ? "bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <List className="mr-2 h-4 w-4" />
                        Field Records
                    </button>
                    <button
                        onClick={() => setActiveTab('questions')}
                        className={cn(
                            "inline-flex items-center rounded-xl px-5 py-2.5 text-sm font-bold transition-all",
                            activeTab === 'questions'
                                ? "bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <Settings2 className="mr-2 h-4 w-4" />
                        Survey Flow
                    </button>
                </div>

                {/* Content Area with AnimatePresence */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        {activeTab === 'analytics' ? (
                            <AnalyticsCharts data={responses} />
                        ) : activeTab === 'list' ? (
                            <div className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-gray-200/50 ring-1 ring-gray-200">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-100">
                                        <thead className="bg-gray-50/50">
                                            <tr>
                                                <th scope="col" className="py-4 pl-6 pr-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Record Info</th>
                                                <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Audio Clip</th>
                                                <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Location Space</th>
                                                <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Respondent Profile</th>
                                                <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Political Sentiment</th>
                                                <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Field Agent</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 bg-white">
                                            {filteredResponses.map((row) => (
                                                <motion.tr
                                                    key={row.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="group transition-colors hover:bg-indigo-50/30"
                                                >
                                                    <td className="whitespace-nowrap py-5 pl-6 pr-3 text-sm">
                                                        <div className="font-bold text-gray-900">#{row.id}</div>
                                                        <div className="mt-1 text-xs text-gray-400 font-medium">
                                                            {new Date(row.created_at).toLocaleDateString()}
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-5 text-sm">
                                                        {row.audio_base64 ? (
                                                            <div className="flex items-center">
                                                                <audio controls src={row.audio_base64} className="h-8 w-40 opacity-80 transition-opacity hover:opacity-100" />
                                                            </div>
                                                        ) : (
                                                            <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-black uppercase text-gray-400">
                                                                Silent
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-5 text-sm">
                                                        <div className="font-bold text-gray-800">{row.assembly}</div>
                                                        <div className="text-gray-500 font-medium">{row.gba_ward}</div>
                                                        {row.latitude && (
                                                            <a
                                                                href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="mt-1.5 inline-flex items-center text-xs font-bold text-indigo-600 transition-colors hover:text-indigo-800"
                                                            >
                                                                <MapPin className="mr-1 h-3.5 w-3.5" />
                                                                Geotag
                                                            </a>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-5 text-sm">
                                                        <div className="font-bold text-gray-900">{row.interviewer_name} <span className="text-gray-400 font-normal">({row.interviewer_age}y)</span></div>
                                                        <div className="mt-0.5 text-[10px] font-medium text-gray-500 uppercase tracking-tight">
                                                            {row.interviewer_gender} • {row.interviewer_community} • {row.interviewer_caste}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400">{row.interviewer_education} • {row.interviewer_work}</div>
                                                    </td>
                                                    <td className="px-3 py-5 text-sm">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Trend:</span>
                                                                <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                                                                    {row.q1}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Prio 1-3:</span>
                                                                <span className="inline-flex flex-wrap gap-1">
                                                                    {[row.candidate_priority1, row.candidate_priority2, row.candidate_priority3].filter(Boolean).map((p, i) => (
                                                                        <span key={i} className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">{p}</span>
                                                                    ))}
                                                                </span>
                                                            </div>
                                                            {(row.candidate_priority4 || row.candidate_priority5) && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Prio 4-5:</span>
                                                                    <span className="inline-flex flex-wrap gap-1">
                                                                        {[row.candidate_priority4, row.candidate_priority5].filter(Boolean).map((p, i) => (
                                                                            <span key={i} className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">{p}</span>
                                                                        ))}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-5 text-sm">
                                                        <div className="font-bold text-gray-900">{row.surveyor_name}</div>
                                                        <div className="mt-0.5 text-xs font-medium text-gray-500">{row.surveyor_mobile}</div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <WardManagementTab />
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}


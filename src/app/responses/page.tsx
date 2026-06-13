"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogOut, LayoutDashboard, List, Activity, Vote, Settings2, Users } from "lucide-react";
import AnalyticsCharts from "./AnalyticsCharts";
import WardManagementTab from "./WardManagementTab";
import FormFieldsConfigTab from "./FormFieldsConfigTab";
import FieldRecordsTable from "./FieldRecordsTable";
import UsersTab from "./UsersTab";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { API_BASE_URL } from "@/lib/config";
import type { SurveyResponseRow } from "@/lib/surveyFieldKeys";
import { clearSurveyorSession, fetchSurveyorProfile } from "@/lib/surveyorSession";
import { isResponsesAdmin } from "@/lib/adminUsers";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type AdminTab = "analytics" | "list" | "questions" | "fields" | "users";

const VALID_TABS: AdminTab[] = ["analytics", "list", "questions", "fields", "users"];

function parseTab(value: string | null): AdminTab {
    if (value && VALID_TABS.includes(value as AdminTab)) {
        return value as AdminTab;
    }
    return "analytics";
}

function ResponsesPageInner() {
    const [responses, setResponses] = useState<SurveyResponseRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<AdminTab>(() => parseTab(searchParams.get("tab")));

    useEffect(() => {
        setActiveTab(parseTab(searchParams.get("tab")));
    }, [searchParams]);

    const changeTab = (tab: AdminTab) => {
        setActiveTab(tab);
        router.replace(`/responses?tab=${tab}`, { scroll: false });
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        const fetchResponses = async () => {
            try {
                const profile = await fetchSurveyorProfile(token);
                if (!isResponsesAdmin(profile.username)) {
                    router.push("/login");
                    return;
                }

                const res = await fetch(`${API_BASE_URL}/api/responses`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (res.status === 401 || res.status === 403) {
                    clearSurveyorSession();
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
        clearSurveyorSession();
        router.push("/login");
    };

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
        <div className="min-h-screen ps-admin-page text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
            <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
                <div className="ps-content-area w-full">
                    <div className="flex h-12 justify-between items-center">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                                <Vote className="h-4 w-4" />
                            </div>
                            <h1 className="text-[15px] text-slate-900">
                                PulseSync <span className="text-emerald-600">Admin</span>
                            </h1>
                            <div className="flex items-center gap-1.5 ml-1 rounded-full bg-emerald-50 px-2 py-0.5 border border-emerald-100/80">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-emerald-700">Live</span>
                            </div>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleLogout}
                            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:border-slate-300 hover:text-red-600"
                        >
                            <LogOut className="mr-1.5 h-3.5 w-3.5" />
                            Sign Out
                        </motion.button>
                    </div>
                </div>
            </nav>

            <main className="ps-content-area w-full py-3">
                <div className="ps-tab-shell">
                    <div className="ps-tab-bar" role="tablist">
                        <button
                            role="tab"
                            aria-selected={activeTab === 'analytics'}
                            onClick={() => changeTab("analytics")}
                            className={cn("ps-tab", activeTab === 'analytics' && "is-active")}
                        >
                            <LayoutDashboard className="h-3.5 w-3.5" />
                            Insights
                        </button>
                        <button
                            role="tab"
                            aria-selected={activeTab === 'list'}
                            onClick={() => changeTab("list")}
                            className={cn("ps-tab", activeTab === 'list' && "is-active")}
                        >
                            <List className="h-3.5 w-3.5" />
                            Field Records
                        </button>
                        <button
                            role="tab"
                            aria-selected={activeTab === 'questions'}
                            onClick={() => changeTab("questions")}
                            className={cn("ps-tab", activeTab === 'questions' && "is-active")}
                        >
                            <Settings2 className="h-3.5 w-3.5" />
                            Survey Flow
                        </button>
                        <button
                            role="tab"
                            aria-selected={activeTab === 'fields'}
                            onClick={() => changeTab("fields")}
                            className={cn("ps-tab", activeTab === 'fields' && "is-active")}
                        >
                            <Settings2 className="h-3.5 w-3.5" />
                            Form Fields
                        </button>
                        <button
                            role="tab"
                            aria-selected={activeTab === 'users'}
                            onClick={() => changeTab("users")}
                            className={cn("ps-tab", activeTab === 'users' && "is-active")}
                        >
                            <Users className="h-3.5 w-3.5" />
                            Users
                        </button>
                    </div>

                    <div className="ps-tab-panel">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                            >
                                {activeTab === 'analytics' ? (
                                    <AnalyticsCharts data={responses} />
                                ) : activeTab === 'list' ? (
                                    <FieldRecordsTable responses={responses} />
                                ) : activeTab === 'questions' ? (
                                    <WardManagementTab responses={responses} />
                                ) : activeTab === 'users' ? (
                                    <UsersTab />
                                ) : (
                                    <FormFieldsConfigTab />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function ResponsesPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50/50">
                    <div className="text-lg font-medium text-gray-600">Loading dashboard…</div>
                </div>
            }
        >
            <ResponsesPageInner />
        </Suspense>
    );
}


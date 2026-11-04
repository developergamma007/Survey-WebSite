"use client";

import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { Users, Vote, MapPin, Activity, ArrowUpRight, SlidersHorizontal, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import type { SurveyResponseRow } from "@/lib/surveyFieldKeys";
import {
    buildDistribution,
    buildFieldDistribution,
    discoverQuestionKeys,
    mergeLegacyQuestionKeys,
    questionsFromWardApi,
    shouldRenderQuestionChart,
    type AnalyticsQuestion,
    type DistributionSlice,
} from "@/lib/surveyAnalytics";
import { parseQuestionConfig } from "@/lib/surveyText";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
const ALL_SCOPE = "all";
const UNASSIGNED_SCOPE = "__unassigned__";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.06 },
    },
};

const itemVariants = {
    hidden: { y: 16, opacity: 0 },
    visible: { y: 0, opacity: 1 },
};

type WardQuestion = { id: number; text: string; options: string };

export default function AnalyticsCharts({ data }: { data: SurveyResponseRow[] }) {
    const [selectedAssembly, setSelectedAssembly] = useState(ALL_SCOPE);
    const [selectedWard, setSelectedWard] = useState(ALL_SCOPE);
    const [wardQuestions, setWardQuestions] = useState<WardQuestion[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    const assemblies = useMemo(() => {
        const values = Array.from(new Set(data.map((row) => row.assembly?.trim()).filter(Boolean))) as string[];
        return values.sort();
    }, [data]);

    const unassignedAssemblyCount = useMemo(
        () => data.filter((row) => !row.assembly?.trim()).length,
        [data]
    );

    const assemblyScopedData = useMemo(
        () =>
            data.filter((row) =>
                selectedAssembly === ALL_SCOPE
                    ? true
                    : selectedAssembly === UNASSIGNED_SCOPE
                      ? !row.assembly?.trim()
                      : row.assembly === selectedAssembly
            ),
        [data, selectedAssembly]
    );

    const wards = useMemo(() => {
        const values = assemblyScopedData.map((row) => row.gba_ward?.trim()).filter(Boolean);
        return (Array.from(new Set(values)) as string[]).sort();
    }, [assemblyScopedData]);

    const unassignedWardCount = useMemo(
        () => assemblyScopedData.filter((row) => !row.gba_ward?.trim()).length,
        [assemblyScopedData]
    );

    const filteredData = useMemo(
        () =>
            assemblyScopedData.filter((row) =>
                selectedWard === ALL_SCOPE
                    ? true
                    : selectedWard === UNASSIGNED_SCOPE
                      ? !row.gba_ward?.trim()
                      : row.gba_ward === selectedWard
            ),
        [assemblyScopedData, selectedWard]
    );

    const selectedScopeLabel =
        selectedWard !== ALL_SCOPE
            ? selectedWard === UNASSIGNED_SCOPE
                ? "Unassigned Ward"
                : `Ward: ${selectedWard}`
            : selectedAssembly !== ALL_SCOPE
              ? selectedAssembly === UNASSIGNED_SCOPE
                  ? "Unassigned Assembly"
                  : `Assembly: ${selectedAssembly}`
              : "All Assemblies";

    const wardForQuestions =
        selectedWard !== ALL_SCOPE && selectedWard !== UNASSIGNED_SCOPE ? selectedWard : "";

    useEffect(() => {
        if (!wardForQuestions) {
            setWardQuestions([]);
            return;
        }
        setLoadingQuestions(true);
        fetch(`${API_BASE_URL}/api/wards/${encodeURIComponent(wardForQuestions)}/questions`)
            .then((res) => res.json())
            .then((payload) => setWardQuestions(Array.isArray(payload) ? payload : []))
            .catch(() => setWardQuestions([]))
            .finally(() => setLoadingQuestions(false));
    }, [wardForQuestions]);

    const surveyQuestions = useMemo((): AnalyticsQuestion[] => {
        let list: AnalyticsQuestion[];
        if (wardQuestions.length > 0) {
            list = questionsFromWardApi(wardQuestions);
        } else {
            list = discoverQuestionKeys(filteredData).map((key) => ({
                key,
                label: key,
                config: parseQuestionConfig(""),
            }));
        }
        return mergeLegacyQuestionKeys(list, filteredData);
    }, [wardQuestions, filteredData]);

    const questionCharts = useMemo(() => {
        return surveyQuestions
            .map((question) => {
                const slices = buildDistribution(filteredData, question);
                return { question, slices };
            })
            .filter(({ question, slices }) => shouldRenderQuestionChart(question, slices));
    }, [surveyQuestions, filteredData]);

    const genderData = useMemo(
        () =>
            buildFieldDistribution(filteredData, (row) => row.interviewer_gender ?? null),
        [filteredData]
    );

    const casteData = useMemo(
        () => buildFieldDistribution(filteredData, (row) => row.interviewer_caste ?? null),
        [filteredData]
    );

    const educationData = useMemo(
        () => buildFieldDistribution(filteredData, (row) => row.interviewer_education ?? null),
        [filteredData]
    );

    const totalResponses = filteredData.length;
    const uniqueWards = new Set(filteredData.map((r) => r.gba_ward).filter(Boolean)).size;
    const uniqueSurveyors = new Set(filteredData.map((r) => r.surveyor_name).filter(Boolean)).size;
    const topAnswer = questionCharts[0]?.slices[0]?.name ?? "N/A";

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full min-w-0 space-y-3"
        >
            <motion.div
                variants={itemVariants}
                className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
                <div className="flex items-center gap-2">
                    <div className="rounded-md bg-indigo-50 p-1.5 text-indigo-600">
                        <SlidersHorizontal className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-900">Insights scope</p>
                        <p className="text-[10px] text-slate-500">Assembly and ward filters apply to every chart below.</p>
                    </div>
                </div>
                <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
                    <label className="sr-only" htmlFor="analytics-assembly">
                        Filter insights by assembly
                    </label>
                    <select
                        id="analytics-assembly"
                        value={selectedAssembly}
                        onChange={(event) => {
                            setSelectedAssembly(event.target.value);
                            setSelectedWard(ALL_SCOPE);
                        }}
                        className="min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                        <option value={ALL_SCOPE}>All Assemblies ({data.length})</option>
                        {assemblies.map((assembly) => (
                            <option key={assembly} value={assembly}>
                                {assembly} ({data.filter((row) => row.assembly === assembly).length})
                            </option>
                        ))}
                        {unassignedAssemblyCount > 0 && (
                            <option value={UNASSIGNED_SCOPE}>Unassigned Assembly ({unassignedAssemblyCount})</option>
                        )}
                    </select>
                    <label className="sr-only" htmlFor="analytics-ward">
                        Filter insights by ward
                    </label>
                    <select
                        id="analytics-ward"
                        value={selectedWard}
                        onChange={(event) => setSelectedWard(event.target.value)}
                        className="min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={wards.length === 0 && unassignedWardCount === 0}
                    >
                        <option value={ALL_SCOPE}>All Wards ({assemblyScopedData.length})</option>
                        {wards.map((ward) => (
                            <option key={ward} value={ward}>
                                {ward} ({assemblyScopedData.filter((row) => row.gba_ward === ward).length})
                            </option>
                        ))}
                        {unassignedWardCount > 0 && (
                            <option value={UNASSIGNED_SCOPE}>Unassigned Ward ({unassignedWardCount})</option>
                        )}
                    </select>
                </div>
            </motion.div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatCard icon={<Users className="h-4 w-4" />} label="Total Responses" value={totalResponses} color="blue" />
                <StatCard icon={<MapPin className="h-4 w-4" />} label="Unique Wards" value={uniqueWards} color="green" />
                <StatCard icon={<Activity className="h-4 w-4" />} label="Active Surveyors" value={uniqueSurveyors} color="amber" />
                <StatCard icon={<Vote className="h-4 w-4" />} label="Top Answer" value={topAnswer} color="purple" isText />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <PieChartCard title={`Gender (${selectedScopeLabel})`} data={genderData} icon={<Users className="h-4 w-4 text-emerald-500" />} />
                <PieChartCard title={`Caste (${selectedScopeLabel})`} data={casteData} icon={<Users className="h-4 w-4 text-violet-500" />} />
                <PieChartCard title={`Education (${selectedScopeLabel})`} data={educationData} icon={<Users className="h-4 w-4 text-sky-500" />} />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-indigo-500" />
                    <div>
                        <h3 className="text-xs font-semibold text-gray-900">Survey questions ({selectedScopeLabel})</h3>
                        <p className="text-[10px] text-slate-500">
                            {loadingQuestions && wardForQuestions
                                ? "Loading ward question list…"
                                : wardForQuestions
                                  ? "Charts follow this ward’s Survey Flow questions."
                                  : "Pick one ward for exact question labels, or browse combined answers across wards."}
                        </p>
                    </div>
                </div>

                {questionCharts.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                        No choice-style answers in this scope yet. Submit surveys or narrow the assembly / ward filter.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {questionCharts.map(({ question, slices }) => (
                            <PieChartCard
                                key={question.key}
                                title={question.label}
                                data={slices}
                                compact
                            />
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function PieChartCard({
    title,
    data,
    icon,
    compact = false,
}: {
    title: string;
    data: DistributionSlice[];
    icon?: React.ReactNode;
    compact?: boolean;
}) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
        <motion.div
            variants={itemVariants}
            className={`rounded-lg bg-white shadow-sm ring-1 ring-gray-100 ${compact ? "p-2.5" : "p-3"}`}
        >
            <div className="mb-2 flex items-start gap-1.5">
                {icon}
                <h3 className={`font-semibold text-gray-900 ${compact ? "text-[10px] leading-snug" : "text-xs"}`}>{title}</h3>
            </div>
            {total === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">No data</p>
            ) : (
                <div className={`w-full ${compact ? "h-44" : "h-48"}`}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={compact ? 32 : 40}
                                outerRadius={compact ? 52 : 65}
                                paddingAngle={3}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value, _name, item) => {
                                    const count = typeof value === "number" ? value : Number(value ?? 0);
                                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                    return [`${count} (${pct}%)`, item.payload?.name ?? "Count"];
                                }}
                                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                            />
                            <Legend verticalAlign="bottom" height={compact ? 36 : 28} iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}
        </motion.div>
    );
}

function StatCard({
    icon,
    label,
    value,
    color,
    isText = false,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: "blue" | "green" | "amber" | "purple";
    isText?: boolean;
}) {
    const colorClasses = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-emerald-50 text-emerald-600",
        amber: "bg-amber-50 text-amber-600",
        purple: "bg-purple-50 text-purple-600",
    };

    return (
        <motion.div variants={itemVariants} whileHover={{ y: -3 }} className="relative overflow-hidden rounded-lg bg-white p-2.5 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-[10px] font-medium text-gray-500">{label}</p>
                    <h3 className={`mt-0.5 truncate font-bold text-gray-900 ${isText ? "text-sm" : "text-lg"}`}>{value}</h3>
                </div>
                <div className={`shrink-0 rounded-md p-1.5 ${colorClasses[color]}`}>{icon}</div>
            </div>
            <div className="absolute -bottom-1 -right-1 h-8 w-8 opacity-[0.03]">{icon}</div>
        </motion.div>
    );
}

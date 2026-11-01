"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { Users, Vote, MapPin, Activity, ArrowUpRight, TrendingUp, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

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

    latitude: number | null;
    longitude: number | null;
    audio_url: string | null;
    has_audio?: boolean;
    created_at: string;
}

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const ALL_SCOPE = "all";
const UNASSIGNED_SCOPE = "__unassigned__";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1
    }
};

export default function AnalyticsCharts({ data }: { data: SurveyResponse[] }) {
    const [selectedAssembly, setSelectedAssembly] = useState(ALL_SCOPE);
    const [selectedWard, setSelectedWard] = useState(ALL_SCOPE);
    const assemblies = useMemo(() => {
        const values = Array.from(new Set(data.map((row) => row.assembly?.trim()).filter(Boolean))) as string[];
        return values.sort();
    }, [data]);
    const unassignedAssemblyCount = useMemo(
        () => data.filter((row) => !row.assembly?.trim()).length,
        [data]
    );
    const assemblyScopedData = useMemo(
        () => data.filter((row) =>
            selectedAssembly === ALL_SCOPE ||
            (selectedAssembly === UNASSIGNED_SCOPE
                ? !row.assembly?.trim()
                : row.assembly === selectedAssembly)
        ),
        [data, selectedAssembly]
    );
    const wards = useMemo(() => {
        const values = assemblyScopedData
            .map((row) => row.gba_ward?.trim())
            .filter(Boolean);
        return (Array.from(new Set(values)) as string[]).sort();
    }, [assemblyScopedData]);
    const unassignedWardCount = useMemo(
        () => assemblyScopedData.filter((row) => !row.gba_ward?.trim()).length,
        [assemblyScopedData]
    );

    const filteredData = useMemo(() => {
        return assemblyScopedData.filter((row) =>
            (selectedWard === ALL_SCOPE ||
                (selectedWard === UNASSIGNED_SCOPE
                    ? !row.gba_ward?.trim()
                    : row.gba_ward === selectedWard))
        );
    }, [assemblyScopedData, selectedWard]);

    const selectedScopeLabel = selectedWard !== ALL_SCOPE
        ? selectedWard === UNASSIGNED_SCOPE ? "Unassigned Ward" : "Ward: " + selectedWard
        : selectedAssembly !== ALL_SCOPE
            ? selectedAssembly === UNASSIGNED_SCOPE ? "Unassigned Assembly" : "Assembly: " + selectedAssembly
            : "All Assemblies";

    // --- Data Processing ---
    const partyCounts: Record<string, number> = {};
    filteredData.forEach((r) => {
        [r.q1, r.q2, r.q3, r.q4].forEach((party) => {
            if (party) {
                partyCounts[party] = (partyCounts[party] || 0) + 1;
            }
        });
    });
    const partyData = Object.entries(partyCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
    })).sort((a, b) => b.value - a.value);

    const genderCounts: Record<string, number> = {};
    filteredData.forEach((r) => {
        if (r.interviewer_gender) {
            const gender = r.interviewer_gender.toLowerCase();
            genderCounts[gender] = (genderCounts[gender] || 0) + 1;
        }
    });
    const genderData = Object.entries(genderCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
    }));

    const totalResponses = filteredData.length;
    const uniqueWards = new Set(filteredData.map((r) => r.gba_ward).filter(Boolean)).size;
    const uniqueSurveyors = new Set(filteredData.map((r) => r.surveyor_name).filter(Boolean)).size;
    const topParty = partyData[0]?.name || "N/A";

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full min-w-0 space-y-3"
        >
            <motion.div variants={itemVariants} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <div className="rounded-md bg-indigo-50 p-1.5 text-indigo-600">
                        <SlidersHorizontal className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-900">Insights scope</p>
                        <p className="text-[10px] text-slate-500">Compare full assembly data or one ward.</p>
                    </div>
                </div>
                <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
                    <label className="sr-only" htmlFor="analytics-assembly">Filter insights by assembly</label>
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
                    <label className="sr-only" htmlFor="analytics-ward">Filter insights by ward</label>
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

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatCard
                    icon={<Users className="h-4 w-4" />}
                    label="Total Responses"
                    value={totalResponses}
                    color="blue"
                    trend="+12% from last week"
                />
                <StatCard
                    icon={<MapPin className="h-4 w-4" />}
                    label="Unique Wards"
                    value={uniqueWards}
                    color="green"
                />
                <StatCard
                    icon={<Activity className="h-4 w-4" />}
                    label="Active Surveyors"
                    value={uniqueSurveyors}
                    color="amber"
                />
                <StatCard
                    icon={<Vote className="h-4 w-4" />}
                    label="Top Party Trend"
                    value={topParty}
                    color="purple"
                    isText
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <ChartContainer title={"Party Preferences (" + selectedScopeLabel + ")"} icon={<TrendingUp className="h-4 w-4 text-indigo-500" />}>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={partyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f3f4f6' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {partyData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartContainer>

                <ChartContainer title={"Respondent Gender (" + selectedScopeLabel + ")"} icon={<Users className="h-4 w-4 text-emerald-500" />}>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={genderData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={65}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {genderData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={24} iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </ChartContainer>
            </div>
        </motion.div>
    );
}

function StatCard({ icon, label, value, color, trend, isText = false }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: 'blue' | 'green' | 'amber' | 'purple';
    trend?: string;
    isText?: boolean;
}) {
    const colorClasses = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-emerald-50 text-emerald-600",
        amber: "bg-amber-50 text-amber-600",
        purple: "bg-purple-50 text-purple-600"
    };

    return (
        <motion.div
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="relative overflow-hidden rounded-lg bg-white p-2.5 shadow-sm ring-1 ring-gray-100"
        >
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[10px] font-medium text-gray-500 truncate">{label}</p>
                    <h3 className={`mt-0.5 font-bold text-gray-900 truncate ${isText ? 'text-sm' : 'text-lg'}`}>
                        {value}
                    </h3>
                </div>
                <div className={`rounded-md p-1.5 shrink-0 ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
            {trend && (
                <div className="mt-1.5 flex items-center text-[10px] font-medium text-emerald-600">
                    <ArrowUpRight className="mr-0.5 h-2.5 w-2.5" />
                    {trend}
                </div>
            )}
            <div className="absolute -bottom-1 -right-1 h-8 w-8 opacity-[0.03]">
                {icon}
            </div>
        </motion.div>
    );
}

function ChartContainer({ title, children, icon, className = "" }: { title: string; children: React.ReactNode; icon?: React.ReactNode; className?: string }) {
    return (
        <motion.div
            variants={itemVariants}
            className={`rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-100 ${className}`}
        >
            <div className="mb-2 flex items-center gap-1.5">
                {icon}
                <h3 className="text-xs font-semibold text-gray-900">{title}</h3>
            </div>
            {children}
        </motion.div>
    );
}


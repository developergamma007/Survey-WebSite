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
import { Users, Vote, MapPin, Activity, ArrowUpRight, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

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

    latitude: number | null;
    longitude: number | null;
    audio_base64: string | null;
    created_at: string;
}

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

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
    // --- Data Processing ---
    const partyCounts: Record<string, number> = {};
    data.forEach((r) => {
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
    data.forEach((r) => {
        if (r.interviewer_gender) {
            const gender = r.interviewer_gender.toLowerCase();
            genderCounts[gender] = (genderCounts[gender] || 0) + 1;
        }
    });
    const genderData = Object.entries(genderCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
    }));

    const candidateCounts: Record<string, number> = {};
    data.forEach((r) => {
        if (r.candidate_priority1) {
            candidateCounts[r.candidate_priority1] = (candidateCounts[r.candidate_priority1] || 0) + 1;
        }
    });
    const candidateData = Object.entries(candidateCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));

    const totalResponses = data.length;
    const uniqueWards = new Set(data.map((r) => r.gba_ward)).size;
    const uniqueSurveyors = new Set(data.map((r) => r.surveyor_name)).size;
    const topParty = partyData[0]?.name || "N/A";

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
        >
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    icon={<Users className="h-6 w-6" />}
                    label="Total Responses"
                    value={totalResponses}
                    color="blue"
                    trend="+12% from last week"
                />
                <StatCard
                    icon={<MapPin className="h-6 w-6" />}
                    label="Unique Wards"
                    value={uniqueWards}
                    color="green"
                />
                <StatCard
                    icon={<Activity className="h-6 w-6" />}
                    label="Active Surveyors"
                    value={uniqueSurveyors}
                    color="amber"
                />
                <StatCard
                    icon={<Vote className="h-6 w-6" />}
                    label="Top Party Trend"
                    value={topParty}
                    color="purple"
                    isText
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <ChartContainer title="Party Preferences (Cumulative)" icon={<TrendingUp className="h-5 w-5 text-indigo-500" />}>
                    <div className="h-72 w-full">
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

                <ChartContainer title="Respondent Gender Distribution" icon={<Users className="h-5 w-5 text-emerald-500" />}>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={genderData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {genderData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </ChartContainer>

                <ChartContainer title="Top Candidates (Priority 1)" icon={<Vote className="h-5 w-5 text-orange-500" />} className="lg:col-span-2">
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={candidateData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} width={120} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24} />
                            </BarChart>
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
            className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{label}</p>
                    <h3 className={`mt-1 font-bold text-gray-900 ${isText ? 'text-xl' : 'text-3xl'}`}>
                        {value}
                    </h3>
                </div>
                <div className={`rounded-xl p-3 ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
            {trend && (
                <div className="mt-4 flex items-center text-xs font-medium text-emerald-600">
                    <ArrowUpRight className="mr-1 h-3 w-3" />
                    {trend}
                </div>
            )}
            <div className="absolute -bottom-1 -right-1 h-12 w-12 opacity-[0.03]">
                {icon}
            </div>
        </motion.div>
    );
}

function ChartContainer({ title, children, icon, className = "" }: { title: string; children: React.ReactNode; icon?: React.ReactNode; className?: string }) {
    return (
        <motion.div
            variants={itemVariants}
            className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 ${className}`}
        >
            <div className="mb-6 flex items-center gap-2">
                {icon}
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            </div>
            {children}
        </motion.div>
    );
}


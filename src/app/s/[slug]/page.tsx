"use client";

import { useEffect, useRef, useState, use } from "react";
import { Mic, MapPin, CheckCircle2, AlertCircle, Play, Square, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { API_BASE_URL } from "@/lib/config";
import { finalizeMediaRecorder } from "@/lib/audioRecording";
import { buildStructuredDynamicAnswers } from "@/lib/surveyFieldKeys";
import SurveyDynamicQuestions from "@/components/SurveyDynamicQuestions";
import {
    buildVoterDetailLines,
    buildVoterFormPatch,
    pickVoterValue,
    type VoterSuggestion,
} from "@/lib/voterSearch";

interface Question {
    id: number;
    text: string;
    options: string;
}

interface Ward {
    id: number;
    ward_name_en: string;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const highlightMatch = (value: string, query: string) => {
    if (!query.trim()) return value;
    const safeQuery = escapeRegExp(query.trim());
    const regex = new RegExp(`(${safeQuery})`, "ig");
    const parts = value.split(regex);
    return parts.map((part, idx) =>
        idx % 2 === 1 ? (
            <mark key={idx} className="bg-yellow-200 text-slate-900 px-0.5 rounded">
                {part}
            </mark>
        ) : (
            <span key={idx}>{part}</span>
        )
    );
};

export default function WardSurvey({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const [ward, setWard] = useState<Ward | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isSurveyStarted, setIsSurveyStarted] = useState(false);
    const [surveyStartedAt, setSurveyStartedAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        interviewerName: "",
        interviewerMobile: "",
        interviewerAge: "",
        interviewerGender: "",
        interviewerCaste: "",
        interviewerCommunity: "",
        interviewerEducation: "",
        interviewerWork: "",
        interviewerHouseholdIncome: "",
        interviewerCurrentAddress: "",
        voterOfConstituency: "",
    });

    const [dynamicAnswers, setDynamicAnswers] = useState<Record<string, string>>({});
    const [audioRecording, setAudioRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioBase64, setAudioBase64] = useState<string | null>(null);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const audioChunksRef = useRef<BlobPart[]>([]);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [location, setLocation] = useState<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });
    const [submitting, setSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState<string | null>(null);
    const [respondentVerified, setRespondentVerified] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [voterSuggestions, setVoterSuggestions] = useState<VoterSuggestion[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [voterSearchQuery, setVoterSearchQuery] = useState("");
    const [voterSearchAttempted, setVoterSearchAttempted] = useState(false);
    const [voterSearchLoading, setVoterSearchLoading] = useState(false);
    const [selectedVoter, setSelectedVoter] = useState<VoterSuggestion | null>(null);
    const skipNextVoterSearchRef = useRef(false);

    useEffect(() => {
        fetchWardData();
    }, [slug]);

    const fetchWardData = async () => {
        try {
            const wardRes = await fetch(`${API_BASE_URL}/api/wards`);
            const allWards: Ward[] = await wardRes.json();
            const decodedName = decodeURIComponent(slug);
            const currentWard = allWards.find(w => w.ward_name_en === decodedName);

            if (currentWard) {
                setWard(currentWard);
                const qRes = await fetch(`${API_BASE_URL}/api/wards/${encodeURIComponent(currentWard.ward_name_en)}/questions`);
                const qs = await qRes.json();
                setQuestions(qs);
            }
        } catch (err) {
            console.error("Failed to fetch ward data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (skipNextVoterSearchRef.current) {
            skipNextVoterSearchRef.current = false;
            return;
        }

        const query = voterSearchQuery.trim();
        if (!query) {
            setVoterSuggestions([]);
            setShowDropdown(false);
            setVoterSearchAttempted(false);
            setVoterSearchLoading(false);
            return;
        }

        const fetchSuggestions = async () => {
            try {
                setVoterSearchLoading(true);
                const searchParams = new URLSearchParams({ q: query });
                if (ward?.id) {
                    searchParams.set("ward_id", String(ward.id));
                }
                const res = await fetch(`${API_BASE_URL}/api/voters/search?${searchParams.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setVoterSuggestions(data);
                    setShowDropdown(true);
                    setVoterSearchAttempted(true);
                }
            } catch (err) {
                console.error("Voter search failed", err);
            } finally {
                setVoterSearchLoading(false);
            }
        };

        const timer = setTimeout(fetchSuggestions, 150); // Faster debounce for "letter by letter" feel
        return () => clearTimeout(timer);
    }, [voterSearchQuery, ward?.id]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest(".voter-input-container")) {
                setShowDropdown(false);
            }
        };
        window.addEventListener("mousedown", handleClickOutside);
        return () => window.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectVoter = (voter: VoterSuggestion) => {
        skipNextVoterSearchRef.current = true;
        setSelectedVoter(voter);
        const patch = buildVoterFormPatch(voter);

        setForm({
            ...form,
            interviewerName: patch.interviewerName || form.interviewerName,
            interviewerAge: patch.interviewerAge || form.interviewerAge,
            interviewerGender: patch.interviewerGender || form.interviewerGender,
            interviewerCaste: patch.interviewerCaste || form.interviewerCaste,
            interviewerCommunity: patch.interviewerCommunity || form.interviewerCommunity,
            interviewerEducation: patch.interviewerEducation || form.interviewerEducation,
            interviewerMobile: patch.interviewerMobile || form.interviewerMobile,
            interviewerWork: patch.interviewerWork || form.interviewerWork,
            interviewerCurrentAddress: patch.interviewerCurrentAddress || form.interviewerCurrentAddress,
        });
        setVoterSearchQuery(String(voter.name_en ?? ""));
        setVoterSearchAttempted(false);
        setVoterSuggestions([]);
        setShowDropdown(false);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            audioChunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                if (blob.size > 0) {
                    setAudioUrl(URL.createObjectURL(blob));
                    const reader = new FileReader();
                    reader.onloadend = () => setAudioBase64(reader.result as string);
                    reader.readAsDataURL(blob);
                }
            };
            recorder.start(1000);
            setMediaRecorder(recorder);
            mediaRecorderRef.current = recorder;
            setAudioRecording(true);
        } catch {
            setSubmitMessage("Microphone access denied.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        setAudioRecording(false);
    };

    const fetchApproxLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
        try {
            const res = await fetch("https://ipapi.co/json/");
            if (res.ok) {
                const data = await res.json();
                const lat = Number(data?.latitude);
                const lon = Number(data?.longitude);
                if (Number.isFinite(lat) && Number.isFinite(lon)) {
                    return { latitude: lat, longitude: lon };
                }
            }
        } catch {
            // Try next provider.
        }

        try {
            const res = await fetch("https://ipwho.is/");
            if (res.ok) {
                const data = await res.json();
                const lat = Number(data?.latitude);
                const lon = Number(data?.longitude);
                if (Number.isFinite(lat) && Number.isFinite(lon)) {
                    return { latitude: lat, longitude: lon };
                }
            }
        } catch {
            return null;
        }

        return null;
    };

    const captureLocation = () => {
        if (!navigator.geolocation) {
            setSubmitMessage("Geolocation not supported. Survey will continue without GPS data.");
            return;
        }

        if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
            setSubmitMessage("Location unavailable: use HTTPS (or localhost) to allow GPS.");
            return;
        }

        const onSuccess = (pos: GeolocationPosition) => {
            setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            setSubmitMessage(null);
        };

        navigator.geolocation.getCurrentPosition(
            onSuccess,
            (error) => {
                if (error.code === 1) {
                    setSubmitMessage("Location permission denied. Survey will continue without GPS data.");
                    return;
                }

                navigator.geolocation.getCurrentPosition(
                    onSuccess,
                    (fallbackError) => {
                        const reasonByCode: { [key: number]: string } = {
                            1: "Permission denied",
                            2: "Position unavailable",
                            3: "Request timeout",
                        };
                        const reason = reasonByCode[fallbackError.code] || "Unknown error";
                        console.warn("Geolocation unavailable after fallback:", { code: fallbackError.code, reason });
                        void (async () => {
                            const approx = await fetchApproxLocation();
                            if (approx) {
                                setLocation(approx);
                                // setSubmitMessage("GPS unavailable; using approximate network location.");
                            } else {
                                setSubmitMessage(`Location unavailable (${fallbackError.code}: ${reason}). Survey will continue without GPS data.`);
                            }
                        })();
                    },
                    {
                        enableHighAccuracy: false,
                        timeout: 20000,
                        maximumAge: 120000,
                    }
                );
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    };

    const simulateVerify = () => {
        setVerifying(true);
        setTimeout(() => {
            setRespondentVerified(true);
            setVerifying(false);
        }, 1500);
    };

    const handleStartSurvey = () => {
        setSurveyStartedAt(new Date().toISOString());
        setIsSurveyStarted(true);
        captureLocation();
        startRecording();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const recordedAudio = await finalizeMediaRecorder(
                mediaRecorderRef.current,
                audioChunksRef.current,
                audioBase64
            );
            setAudioRecording(false);
            if (recordedAudio) setAudioBase64(recordedAudio);

            const voter = selectedVoter ?? ({} as VoterSuggestion);
            const structuredAnswers = buildStructuredDynamicAnswers({
                assembly: "Fixed (KR Puram)",
                gbaWard: ward?.ward_name_en || decodeURIComponent(slug),
                pollingStationName: "Dynamic Link",
                pollingStationNumber: "0",
                surveyorName: "Web User",
                surveyorMobile: "000000",
                interviewerName: form.interviewerName,
                interviewerAge: form.interviewerAge,
                interviewerGender: form.interviewerGender,
                interviewerCaste: form.interviewerCaste,
                interviewerCommunity: form.interviewerCommunity,
                interviewerMobile: form.interviewerMobile,
                interviewerEducation: form.interviewerEducation,
                interviewerWork: form.interviewerWork,
                interviewerHouseholdIncome: form.interviewerHouseholdIncome,
                interviewerCurrentAddress: form.interviewerCurrentAddress,
                voterOfConstituency: form.voterOfConstituency,
                dynamicAnswers,
                surveyStartedAt,
                surveyEndedAt: new Date().toISOString(),
            });

            const payload = {
                assembly: "Fixed (KR Puram)",
                gbaWard: ward?.ward_name_en || decodeURIComponent(slug),
                pollingStationName: "Dynamic Link",
                pollingStationNumber: "0",
                surveyorName: "Web User",
                surveyorMobile: "000000",
                ...form,
                q1: "", q2: "", q3: "", q4: "",
                dynamicAnswers: JSON.stringify(structuredAnswers),
                latitude: location.latitude,
                longitude: location.longitude,
                audio_base64: recordedAudio,
                voterNameEn: pickVoterValue(voter, ["name_en"]) || form.interviewerName || null,
                voterNameKannada: pickVoterValue(voter, ["name_kannada"]) || null,
                voterGender: pickVoterValue(voter, ["gender"]) || form.interviewerGender || null,
                voterAge: pickVoterValue(voter, ["age", "voter_age", "interviewer_age"]) || form.interviewerAge || null,
                voterWardCode: pickVoterValue(voter, ["ward_code", "ward_no"]) || null,
                voterBoothNo: pickVoterValue(voter, ["booth_no", "booth"]) || null,
                voterSlNo: pickVoterValue(voter, ["sl", "sl_no", "serial_no"]) || null,
                voterHouse: pickVoterValue(voter, ["house"]) || null,
                voterEpic: pickVoterValue(voter, ["epic"]) || null,
                voterRelEng: pickVoterValue(voter, ["rel_eng", "relation_name", "father_name", "mother_name", "guardian_name"]) || null,
                voterRelKannada: pickVoterValue(voter, ["rel_kannada", "relation_name_kannada"]) || null,
                voterRelType: pickVoterValue(voter, ["rel_type", "relation_type"]) || null,
            };

            const res = await fetch(`${API_BASE_URL}/surveys`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Submission failed");

            setSubmitMessage("Survey submitted successfully!");
            setVoterSearchQuery("");
            setVoterSearchAttempted(false);
            setVoterSuggestions([]);
            setShowDropdown(false);
            setSelectedVoter(null);
            setTimeout(() => {
                setIsSurveyStarted(false);
                setForm({
                    interviewerName: "", interviewerMobile: "", interviewerAge: "", interviewerGender: "",
                    interviewerCaste: "", interviewerCommunity: "", interviewerEducation: "", interviewerWork: "",
                    interviewerHouseholdIncome: "", interviewerCurrentAddress: "", voterOfConstituency: "",
                });
                setDynamicAnswers({});
                setAudioUrl(null);
                setAudioBase64(null);
                setSubmitMessage(null);
            }, 3000);
        } catch (err) {
            setSubmitMessage("Error submitting survey. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
        );
    }

    if (!ward) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-slate-100 max-w-sm">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-black text-slate-900 mb-2">Ward Not Found</h1>
                    <p className="text-slate-500 font-medium">The ward link you are using is invalid or has been deactivated.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <main className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                <div className="bg-gray-900 p-8 text-center">
                    <h1 className="text-3xl font-black text-white tracking-tight">{ward.ward_name_en}</h1>
                    <p className="text-gray-400 text-xs uppercase tracking-[0.3em] mt-3 font-bold">Field Intelligence Survey</p>
                </div>

                {!isSurveyStarted ? (
                    <div className="py-24 flex flex-col items-center px-8 text-center">
                        <div className="relative w-44 h-44 mb-8">
                            {/* Pulsing Animated Circles */}
                            <motion.div
                                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute inset-0 rounded-full bg-green-400/30 pointer-events-none"
                            />
                            <motion.div
                                animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                className="absolute inset-0 rounded-full bg-green-400/20 pointer-events-none"
                            />

                            <button
                                onClick={handleStartSurvey}
                                className="relative z-10 w-44 h-44 bg-green-600 text-white rounded-full font-black text-xl shadow-2xl hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center text-center leading-tight"
                            >
                                Start<br />Survey
                            </button>
                        </div>
                        <p className="text-slate-500 font-bold text-sm uppercase tracking-wider mb-2">Ready to collect data?</p>
                        <p className="text-slate-400 text-xs text-center border-t border-slate-100 pt-4 mt-2">
                            Audio recording and location will begin automatically
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-8 space-y-10 animate-in fade-in duration-700">
                        {/* Respondent Bio */}
                        <section className="bg-slate-50/80 rounded-3xl p-6 border border-slate-100 shadow-sm">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                Voter Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1 relative voter-input-container">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Search Voter</label>
                                    <input
                                        value={voterSearchQuery}
                                        onChange={(e) => {
                                            setVoterSearchQuery(e.target.value);
                                            setSelectedVoter(null);
                                        }}
                                        onFocus={() => (voterSearchQuery.trim() || voterSearchAttempted) && setShowDropdown(true)}
                                        placeholder="Type Name or EPIC"
                                        className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                                    />
                                    {showDropdown && (
                                        <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                            {voterSearchLoading && (
                                                <div className="px-4 py-3 text-[11px] font-semibold text-slate-500">Searching...</div>
                                            )}
                                            {!voterSearchLoading && voterSuggestions.length === 0 && voterSearchAttempted && (
                                                <div className="px-4 py-3 text-[11px] font-semibold text-slate-500">
                                                    No result found. Enter details manually below.
                                                </div>
                                            )}
                                            {!voterSearchLoading && voterSuggestions.map((v, i) => {
                                                const detailLines = buildVoterDetailLines(v);
                                                const name = String(v.name_en ?? "Unknown");
                                                const kannadaName = pickVoterValue(v, ["name_kannada"]);
                                                const epic = pickVoterValue(v, ["epic"]);
                                                const query = voterSearchQuery.trim();
                                                return (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => selectVoter(v)}
                                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between"
                                                >
                                                    <div>
                                                        <span className="block text-sm font-bold text-slate-900">
                                                            Name: {highlightMatch(name, query)}{kannadaName ? ` | ${kannadaName}` : ""}
                                                        </span>
                                                        {epic && (
                                                            <span className="block text-[10px] text-slate-500 font-semibold">
                                                                EPIC: {highlightMatch(epic, query)}
                                                            </span>
                                                        )}
                                                        {detailLines.map((line, idx) => (
                                                            <span key={idx} className="block text-[10px] text-slate-400 font-medium">{line}</span>
                                                        ))}
                                                    </div>
                                                    <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center">
                                                        <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                                                    </div>
                                                </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Full Name</label>
                                    <input
                                        required
                                        value={form.interviewerName}
                                        onChange={(e) => setForm({ ...form, interviewerName: e.target.value })}
                                        placeholder="Enter name"
                                        className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Age</label>
                                    <input
                                        type="number"
                                        value={form.interviewerAge}
                                        onChange={(e) => setForm({ ...form, interviewerAge: e.target.value })}
                                        className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Gender</label>
                                    <select
                                        value={form.interviewerGender}
                                        onChange={(e) => setForm({ ...form, interviewerGender: e.target.value })}
                                        className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none"
                                    >
                                        <option value="">Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Caste</label>
                                    <select
                                        value={form.interviewerCaste}
                                        onChange={(e) => setForm({ ...form, interviewerCaste: e.target.value })}
                                        className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none"
                                    >
                                        <option value="">Select</option>
                                        <option value="Brahma">Brahma</option>
                                        <option value="Lingayat">Lingayat</option>
                                        <option value="Vokkaliga">Vokkaliga</option>
                                        <option value="Kuruba">Kuruba</option>
                                        <option value="SC">SC</option>
                                        <option value="ST">ST</option>
                                        <option value="OBC">OBC</option>
                                        <option value="Others">Others</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Community</label>
                                    <select
                                        value={form.interviewerCommunity}
                                        onChange={(e) => setForm({ ...form, interviewerCommunity: e.target.value })}
                                        className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none"
                                    >
                                        <option value="">Select</option>
                                        <option value="Hindu">Hindu</option>
                                        <option value="Muslim">Muslim</option>
                                        <option value="Christian">Christian</option>
                                        <option value="Jain">Jain</option>
                                        <option value="Others">Others</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Education</label>
                                    <select
                                        value={form.interviewerEducation}
                                        onChange={(e) => setForm({ ...form, interviewerEducation: e.target.value })}
                                        className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none"
                                    >
                                        <option value="">Select</option>
                                        <option value="Illiterate">Illiterate</option>
                                        <option value="Primary">Primary</option>
                                        <option value="Secondary">Secondary</option>
                                        <option value="Graduate">Graduate</option>
                                        <option value="Post-Graduate">Post-Graduate</option>
                                        <option value="Others">Others</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Occupation</label>
                                    <input
                                        value={form.interviewerWork}
                                        onChange={(e) => setForm({ ...form, interviewerWork: e.target.value })}
                                        placeholder="What do you do for a living?"
                                        className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Voter of Constituency</label>
                                    <select
                                        value={form.voterOfConstituency}
                                        onChange={(e) => setForm({ ...form, voterOfConstituency: e.target.value })}
                                        className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none"
                                    >
                                        <option value="">Select</option>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Household Income</label>
                                    <select
                                        value={form.interviewerHouseholdIncome}
                                        onChange={(e) => setForm({ ...form, interviewerHouseholdIncome: e.target.value })}
                                        className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none"
                                    >
                                        <option value="">Select</option>
                                        <option value="Below 10,000">Below ₹10,000</option>
                                        <option value="10,000 - 20,000">₹10,000 - ₹20,000</option>
                                        <option value="20,000 - 50,000">₹20,000 - ₹50,000</option>
                                        <option value="50,000 - 1,00,000">₹50,000 - ₹1,00,000</option>
                                        <option value="Above 1,00,000">Above ₹1,00,000</option>
                                    </select>
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Current Address</label>
                                    <input
                                        value={form.interviewerCurrentAddress}
                                        onChange={(e) => setForm({ ...form, interviewerCurrentAddress: e.target.value })}
                                        placeholder="Enter current address"
                                        className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Mobile No</label>
                                    <div className="flex gap-2">
                                        <input
                                            value={form.interviewerMobile}
                                            onChange={(e) => setForm({ ...form, interviewerMobile: e.target.value })}
                                            placeholder="10-digit number"
                                            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={simulateVerify}
                                            disabled={respondentVerified || verifying}
                                            className={`px-4 rounded-xl text-[10px] font-black uppercase transition-all border ${respondentVerified ? 'bg-green-50 border-green-200 text-green-600' : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'}`}
                                        >
                                            {verifying ? "..." : respondentVerified ? "OK" : "Verify"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Dynamic Questions */}
                        {questions.length > 0 && (
                            <section className="survey-section survey-section--flush">
                                <SurveyDynamicQuestions
                                    questions={questions}
                                    answers={dynamicAnswers}
                                    onChange={(questionText, value) =>
                                        setDynamicAnswers({ ...dynamicAnswers, [questionText]: value })
                                    }
                                />
                            </section>
                        )}

                        {/* Status & Submit */}
                        <div className="pt-8 border-t border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${audioRecording ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                    <div className={`w-2 h-2 rounded-full ${audioRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">{audioRecording ? "Capturing Audio" : "Mic Standby"}</span>
                                </div>
                                {location.latitude && (
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600">
                                        <span className="text-[10px] font-black tracking-tighter">GPS: {location.latitude.toFixed(4)}, {location.longitude?.toFixed(4)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-4">
                                {submitMessage && (
                                    <p className={`text-sm font-black animate-in slide-in-from-right-4 ${submitMessage.includes("Error") ? 'text-red-600' : 'text-green-600'}`}>
                                        {submitMessage}
                                    </p>
                                )}
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-12 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all disabled:opacity-50 shadow-xl"
                                >
                                    {submitting ? "SUBMITTING..." : "COMPLETE SURVEY"}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </main>
            <p className="mt-8 text-center text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em]">Powered by GBA Field Intelligence</p>
        </div>
    );
}

"use client";

import { useEffect, useState, use } from "react";
import { Mic, MapPin, CheckCircle2, AlertCircle, Play, Square, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { API_BASE_URL } from "@/lib/config";

interface Question {
    id: number;
    text: string;
    options: string;
}

interface Ward {
    id: number;
    ward_name_en: string;
}

export default function WardSurvey({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const [ward, setWard] = useState<Ward | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isSurveyStarted, setIsSurveyStarted] = useState(false);
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
        candidatePriority1: "",
        candidatePriority2: "",
        candidatePriority3: "",
        candidatePriority4: "",
        candidatePriority5: "",
    });

    const [dynamicAnswers, setDynamicAnswers] = useState<Record<string, string>>({});
    const [audioRecording, setAudioRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioBase64, setAudioBase64] = useState<string | null>(null);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [location, setLocation] = useState<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });
    const [submitting, setSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState<string | null>(null);
    const [respondentVerified, setRespondentVerified] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [voterSuggestions, setVoterSuggestions] = useState<{ name_en: string, epic: string, house: string }[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        fetchWardData();
    }, [slug]);

    const fetchWardData = async () => {
        try {
            const wardRes = await fetch(`${API_BASE_URL}/wards`);
            const allWards: Ward[] = await wardRes.json();
            const decodedName = decodeURIComponent(slug);
            const currentWard = allWards.find(w => w.ward_name_en === decodedName);

            if (currentWard) {
                setWard(currentWard);
                const qRes = await fetch(`${API_BASE_URL}/wards/${encodeURIComponent(currentWard.ward_name_en)}/questions`);
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
        const query = form.interviewerName;
        if (!query || query.length < 1) {
            setVoterSuggestions([]);
            setShowDropdown(false);
            return;
        }

        const fetchSuggestions = async () => {
            try {
                // Pass ward_id parameter to search voters for selected ward
                const wardParam = ward?.id ? `&ward_id=${ward.id}` : "";
                const res = await fetch(`${API_BASE_URL}/voters/search?q=${encodeURIComponent(query)}${wardParam}`);
                if (res.ok) {
                    const data = await res.json();
                    setVoterSuggestions(data);
                    setShowDropdown(data.length > 0);
                }
            } catch (err) {
                console.error("Voter search failed", err);
            }
        };

        const timer = setTimeout(fetchSuggestions, 150); // Faster debounce for "letter by letter" feel
        return () => clearTimeout(timer);
    }, [form.interviewerName, ward?.id]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest(".relative")) {
                setShowDropdown(false);
            }
        };
        window.addEventListener("mousedown", handleClickOutside);
        return () => window.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectVoter = (voter: { name_en: string }) => {
        setForm({ ...form, interviewerName: voter.name_en });
        setVoterSuggestions([]);
        setShowDropdown(false);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: BlobPart[] = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: "audio/webm" });
                setAudioUrl(URL.createObjectURL(blob));
                const reader = new FileReader();
                reader.onloadend = () => setAudioBase64(reader.result as string);
                reader.readAsDataURL(blob);
            };
            recorder.start();
            setMediaRecorder(recorder);
            setAudioRecording(true);
        } catch {
            setSubmitMessage("Microphone access denied.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(t => t.stop());
        }
        setAudioRecording(false);
    };

    const captureLocation = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            () => setLocation({ latitude: null, longitude: null }),
            { enableHighAccuracy: true }
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
        setIsSurveyStarted(true);
        captureLocation();
        startRecording();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        stopRecording();

        try {
            const payload = {
                assembly: "Fixed (KR Puram)",
                gbaWard: ward?.ward_name_en || decodeURIComponent(slug),
                pollingStationName: "Dynamic Link",
                pollingStationNumber: "0",
                surveyorName: "Web User",
                surveyorMobile: "000000",
                ...form,
                q1: "", q2: "", q3: "", q4: "", // Placeholders for standard fields
                dynamicAnswers: JSON.stringify(dynamicAnswers),
                latitude: location.latitude,
                longitude: location.longitude,
                audio_base64: audioBase64,
            };

            const res = await fetch(`${API_BASE_URL}/surveys`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Submission failed");

            setSubmitMessage("Survey submitted successfully!");
            setTimeout(() => {
                setIsSurveyStarted(false);
                setForm({
                    interviewerName: "", interviewerMobile: "", interviewerAge: "", interviewerGender: "",
                    interviewerCaste: "", interviewerCommunity: "", interviewerEducation: "", interviewerWork: "",
                    candidatePriority1: "", candidatePriority2: "", candidatePriority3: "",
                    candidatePriority4: "", candidatePriority5: "",
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
                                <div className="space-y-1 relative">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Full Name</label>
                                    <input
                                        required
                                        value={form.interviewerName}
                                        onChange={(e) => setForm({ ...form, interviewerName: e.target.value })}
                                        onFocus={() => voterSuggestions.length > 0 && setShowDropdown(true)}
                                        placeholder="Enter name"
                                        className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                                    />
                                    {showDropdown && (
                                        <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                            {voterSuggestions.map((v, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => selectVoter(v)}
                                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between"
                                                >
                                                    <div>
                                                        <span className="block text-sm font-bold text-slate-900">{v.name_en}</span>
                                                        <span className="block text-[10px] text-slate-400 font-medium">House: {v.house} | EPIC: {v.epic}</span>
                                                    </div>
                                                    <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center">
                                                        <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
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
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Work</label>
                                    <input
                                        value={form.interviewerWork}
                                        onChange={(e) => setForm({ ...form, interviewerWork: e.target.value })}
                                        placeholder="Occupation"
                                        className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Mobile No</label>
                                    <div className="flex gap-2">
                                        <input
                                            value={form.interviewerMobile}
                                            onChange={(e) => setForm({ ...form, interviewerMobile: e.target.value })}
                                            placeholder="10-digit number"
                                            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
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
                            <section className="bg-slate-50/80 rounded-3xl p-6 border border-slate-100 shadow-sm">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                    Ward Specific Questions
                                </h2>
                                <div className="space-y-8">
                                    {questions.map((q) => (
                                        <div key={q.id} className="space-y-4">
                                            <p className="text-sm font-bold text-slate-900 leading-relaxed">{q.text}</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {q.options.split(",").map((opt, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => setDynamicAnswers({ ...dynamicAnswers, [q.text]: opt })}
                                                        className={`w-full text-left px-5 py-3 rounded-2xl font-bold text-sm transition-all border shadow-sm ${dynamicAnswers[q.text] === opt
                                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-indigo-100"
                                                            : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300"
                                                            }`}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Candidate Priority */}
                        <section className="bg-slate-50/80 rounded-3xl p-6 border border-slate-100 shadow-sm">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Corporator Preferences
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                {[1, 2, 3, 4, 5].map(num => (
                                    <div key={num} className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Priority {num}</label>
                                        <input
                                            placeholder="..."
                                            value={form[`candidatePriority${num}` as keyof typeof form]}
                                            onChange={(e) => setForm({ ...form, [`candidatePriority${num}`]: e.target.value })}
                                            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>

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

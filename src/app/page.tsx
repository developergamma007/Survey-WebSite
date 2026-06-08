"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import axios from "axios";
import { CheckCircle2 } from "lucide-react";
import CustomDropdown from "@/components/CustomDropdown";
import { API_BASE_URL } from "@/lib/config";

type PartyOption = "congress" | "bjp" | "jds" | "others" | "";

interface Assembly {
  assembly_no: number;
  assembly_name_en: string;
  assembly_name_local?: string | null;
}

interface Ward {
  id: number;
  ward_name_en: string;
  ward_name_local: string;
  assembly_no?: string | null;
}

interface DynamicQuestion {
  id: number;
  text: string;
  options: string;
}

interface Booth {
  id: number;
  booth_no: string;
  booth_add_en: string;
  booth_add_local: string;
  ward_id: number;
}

type VoterSuggestion = {
  name_en?: string;
  [key: string]: string | number | null | undefined;
};

const pickVoterValue = (voter: VoterSuggestion, keys: string[]): string => {
  for (const key of keys) {
    const value = voter[key];
    if (value !== null && value !== undefined) {
      const text = String(value).trim();
      if (text) return text;
    }
  }
  return "";
};

const normalizeOptionValue = (value: string, allowed: string[]): string => {
  if (!value) return "";
  const found = allowed.find((option) => option.toLowerCase() === value.toLowerCase());
  return found ?? "";
};

const formatRelationType = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "Relation";
  if (normalized === "father") return "Father";
  if (normalized === "mother") return "Mother";
  if (normalized === "husband") return "Husband";
  if (normalized === "wife") return "Wife";
  if (normalized === "guardian") return "Guardian";
  return value;
};

const buildVoterDetailLines = (voter: VoterSuggestion): string[] => {
  const lines: string[] = [];

  const ward = pickVoterValue(voter, ["ward_code", "ward_no"]);
  const booth = pickVoterValue(voter, ["booth_no", "booth"]);
  const serial = pickVoterValue(voter, ["sl", "sl_no", "serial_no"]);
  const house = pickVoterValue(voter, ["house"]);
  const epic = pickVoterValue(voter, ["epic"]);
  const kannadaName = pickVoterValue(voter, ["name_kannada"]);
  const gender = pickVoterValue(voter, ["gender"]);
  const age = pickVoterValue(voter, ["age", "voter_age", "interviewer_age"]);
  const relType = formatRelationType(pickVoterValue(voter, ["rel_type", "relation_type"]));
  const relEng = pickVoterValue(voter, ["rel_eng", "relation_name", "father_name", "mother_name", "guardian_name"]);
  const relKannada = pickVoterValue(voter, ["rel_kannada", "relation_name_kannada"]);
  const meta: string[] = [];

  if (relEng || relKannada) {
    lines.push(`${relType}: ${relEng || "-"} | ${relKannada || "-"}`);
  }

  if (ward) meta.push(`Ward ${ward}`);
  if (booth) meta.push(`Booth ${booth}`);
  if (serial) meta.push(`SL ${serial}`);
  if (house) meta.push(`House ${house}`);
  if (gender) meta.push(gender);
  if (age) meta.push(`Age ${age}`);
  if (meta.length) lines.push(meta.join(" | "));

  return lines;
};

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

interface SurveyFormState {
  assembly: string;
  assemblyNo: number;
  gbaWard: string;
  gbaWardId: number;
  pollingStationName: string;
  pollingStationId: number;
  pollingStationNumber: string;
  surveyorName: string;
  surveyorMobile: string;

  interviewerName: string;
  interviewerAge: string;
  interviewerGender: string;
  interviewerCaste: string;
  interviewerCommunity: string;
  interviewerMobile: string;
  interviewerEducation: string;
  interviewerWork: string;

  q1: PartyOption;
  q2: PartyOption;
  q3: PartyOption;
  q4: PartyOption;

  candidatePriority1: string;
  candidatePriority2: string;
  candidatePriority3: string;
  candidatePriority4: string;
  candidatePriority5: string;
  dynamicAnswers: Record<string, string>;
}

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export function Home() {
  const [username, setUsername] = useState<string | null>(null);
  const [form, setForm] = useState<SurveyFormState>({
    assembly: "",
    assemblyNo: 0,
    gbaWard: "",
    gbaWardId: 0,
    pollingStationName: "",
    pollingStationId: 0,
    pollingStationNumber: "",
    surveyorName: "Sai",
    surveyorMobile: "728229",

    interviewerName: "",
    interviewerAge: "",
    interviewerGender: "",
    interviewerCaste: "",
    interviewerCommunity: "",
    interviewerMobile: "",
    interviewerEducation: "",
    interviewerWork: "",

    q1: "",
    q2: "",
    q3: "",
    q4: "",

    candidatePriority1: "",
    candidatePriority2: "",
    candidatePriority3: "",
    candidatePriority4: "",
    candidatePriority5: "",
    dynamicAnswers: {},
  });

  const [audioRecording, setAudioRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [location, setLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({ latitude: null, longitude: null });
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [isSurveyStarted, setIsSurveyStarted] = useState(false);
  const [surveyorVerified, setSurveyorVerified] = useState(false);
  const [respondentVerified, setRespondentVerified] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [dynamicQuestions, setDynamicQuestions] = useState<DynamicQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [voterSuggestions, setVoterSuggestions] = useState<VoterSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [voterSearchQuery, setVoterSearchQuery] = useState("");
  const [voterSearchAttempted, setVoterSearchAttempted] = useState(false);
  const [voterSearchLoading, setVoterSearchLoading] = useState(false);
  const [selectedVoter, setSelectedVoter] = useState<VoterSuggestion | null>(null);
  const skipNextVoterSearchRef = useRef(false);

  const searchParams = useSearchParams();

  useEffect(() => {
    fetchAssemblies();
  }, []);

  useEffect(() => {
    const wardName = searchParams.get("ward");
    if (wardName && wards.length > 0) {
      const ward = wards.find(w => w.ward_name_en === wardName);
      if (ward) {
        setForm(prev => ({
          ...prev,
          gbaWard: ward.ward_name_en,
          gbaWardId: ward.id
        }));
      }
    }
  }, [searchParams, wards]);
  // Check for user session
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const decoded = JSON.parse(jsonPayload);
        setUsername(decoded.sub || "User");
      } catch (e) {
        console.error("Error decoding token:", e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.reload();
  };

  useEffect(() => {
    if (form.gbaWardId > 0) {
      fetchBooths(form.gbaWardId);
    }
  }, [form.gbaWardId]);

  useEffect(() => {
    if (form.gbaWardId > 0 && wards.length > 0) {
      const selectedWard = wards.find(w => w.id === form.gbaWardId);
      if (selectedWard?.ward_name_en) {
        fetchDynamicQuestions(selectedWard.ward_name_en);
      }
    }
  }, [form.gbaWardId, wards]);

  const fetchDynamicQuestions = async (wardName: string) => {
    try {
      const res = await axiosInstance.get(`/api/wards/${encodeURIComponent(wardName)}/questions`);
      setDynamicQuestions(res.data);
    } catch (err) {
      console.error("Error fetching dynamic questions", err);
    }
  };

  const fetchAssemblies = async () => {
    try {
      const response = await axiosInstance.get<Assembly[]>("/api/assemblies");
      setAssemblies(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching assemblies:", error);
      setSubmitMessage("Failed to load assemblies. Please try again.");
      setLoading(false);
    }
  };

  const fetchWards = async (assemblyNo: number) => {
    if (!assemblyNo) {
      setWards([]);
      return;
    }
    try {
      const response = await axiosInstance.get<Ward[]>("/api/wards", {
        params: { assembly_no: assemblyNo },
      });
      setWards(response.data);
    } catch (error) {
      console.error("Error fetching wards:", error);
      setSubmitMessage("Failed to load wards. Please try again.");
    }
  };

  const fetchBooths = async (wardId: number) => {
    try {
      const response = await axiosInstance.get("/api/booths", {
        params: { ward_id: wardId },
      });
      setBooths(response.data);
    } catch (error) {
      console.error("Error fetching booths:", error);
      setSubmitMessage("Failed to load polling stations.");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    if (name === "gbaWard") {
      const selectedWard = wards.find(w => w.id === parseInt(value));
      setForm((prev) => ({
        ...prev,
        [name]: selectedWard?.ward_name_en || value,
        gbaWardId: parseInt(value),
      }));
    } else if (name === "pollingStationName") {
      const selectedBooth = booths.find(b => b.id === parseInt(value));
      setForm((prev) => ({
        ...prev,
        pollingStationName: selectedBooth?.booth_add_en || value,
        pollingStationId: parseInt(value),
        pollingStationNumber: selectedBooth?.booth_no || prev.pollingStationNumber,
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const updateField = (key: keyof SurveyFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioRecording(true);
    } catch (error) {
      console.error("Error starting audio recording:", error);
      setSubmitMessage("Microphone access denied. Some features may not work.");
    }
  };

  const simulateVerify = (field: 'surveyor' | 'respondent') => {
    setVerifying(field);
    setTimeout(() => {
      if (field === 'surveyor') setSurveyorVerified(true);
      else setRespondentVerified(true);
      setVerifying(null);
    }, 1500);
  };

  const handleStartSurvey = () => {
    setIsSurveyStarted(true);
    captureLocation();
    startRecording();
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
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
    if (!("geolocation" in navigator)) {
      setSubmitMessage("Geolocation not supported. Survey will continue without GPS data.");
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      setSubmitMessage("Location unavailable: use HTTPS (or localhost) to allow GPS.");
      return;
    }

    const onSuccess = (position: GeolocationPosition) => {
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setSubmitMessage(null);
    };

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (error) => {
        if (error.code === 1) {
          setSubmitMessage("Location permission denied. Survey will continue without GPS data.");
          return;
        }

        // Fallback: relaxed settings often work better on slower devices/network conditions.
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
          },
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
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
        if (form.gbaWardId > 0) {
          searchParams.set("ward_id", String(form.gbaWardId));
        }
        const res = await axiosInstance.get(`/api/voters/search?${searchParams.toString()}`);
        if (res.status === 200) {
          setVoterSuggestions(res.data);
          setShowDropdown(true);
          setVoterSearchAttempted(true);
        }
      } catch (err) {
        console.error("Voter search failed", err);
      } finally {
        setVoterSearchLoading(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 150);
    return () => clearTimeout(timer);
  }, [voterSearchQuery, form.gbaWardId]);

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

    const age = pickVoterValue(voter, ["age", "voter_age", "interviewer_age"]);
    const gender = normalizeOptionValue(
      pickVoterValue(voter, ["gender", "sex", "interviewer_gender"]),
      ["Male", "Female", "Other"]
    );
    const caste = normalizeOptionValue(
      pickVoterValue(voter, ["caste", "interviewer_caste"]),
      ["Brahma", "Lingayat", "Vokkaliga", "Kuruba", "SC", "ST", "OBC", "Others"]
    );
    const community = normalizeOptionValue(
      pickVoterValue(voter, ["community", "religion", "interviewer_community"]),
      ["Hindu", "Muslim", "Christian", "Jain", "Others"]
    );
    const education = normalizeOptionValue(
      pickVoterValue(voter, ["education", "qualification", "interviewer_education"]),
      ["Illiterate", "Primary", "Secondary", "Graduate", "Post-Graduate", "Others"]
    );
    const mobile = pickVoterValue(voter, ["mobile", "phone", "mobile_no", "voter_mobile", "interviewer_mobile"]);

    setForm((prev) => ({
      ...prev,
      interviewerName: String(voter.name_en ?? ""),
      interviewerAge: age || prev.interviewerAge,
      interviewerGender: gender || prev.interviewerGender,
      interviewerCaste: caste || prev.interviewerCaste,
      interviewerCommunity: community || prev.interviewerCommunity,
      interviewerEducation: education || prev.interviewerEducation,
      interviewerMobile: mobile || prev.interviewerMobile,
    }));
    setVoterSearchQuery(String(voter.name_en ?? ""));
    setVoterSearchAttempted(false);
    setVoterSuggestions([]);
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    stopRecording();

    try {
      const voter = selectedVoter ?? ({} as VoterSuggestion);
      const payload = {
        ...form,
        latitude: location.latitude,
        longitude: location.longitude,
        audio_base64: audioBase64 || null,
        dynamicAnswers: JSON.stringify(form.dynamicAnswers),
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

      const res = await axiosInstance.post("/surveys", payload);

      if (res.status === 200) {
        setSubmitMessage("Survey submitted successfully!");
        setVoterSearchQuery("");
        setVoterSearchAttempted(false);
        setVoterSuggestions([]);
        setShowDropdown(false);
        setSelectedVoter(null);
        setWards([]);
        setBooths([]);
        setForm({
          assembly: "",
          assemblyNo: 0,
          gbaWard: "",
          gbaWardId: 0,
          pollingStationName: "",
          pollingStationId: 0,
          pollingStationNumber: "",
          surveyorName: form.surveyorName,
          surveyorMobile: form.surveyorMobile,
          interviewerName: "",
          interviewerAge: "",
          interviewerGender: "",
          interviewerCaste: "",
          interviewerCommunity: "",
          interviewerMobile: "",
          interviewerEducation: "",
          interviewerWork: "",
          q1: "",
          q2: "",
          q3: "",
          q4: "",
          candidatePriority1: "",
          candidatePriority2: "",
          candidatePriority3: "",
          candidatePriority4: "",
          candidatePriority5: "",
          dynamicAnswers: {},
        });
        setAudioUrl(null);
        setAudioBase64(null);
        setTimeout(() => {
          setSubmitMessage(null);
          setIsSurveyStarted(false);
        }, 3000);
      }
    } catch (error) {
      console.error("Error submitting survey:", error);
      if (axios.isAxiosError(error)) {
        setSubmitMessage(`Error: ${error.response?.data?.message || error.message}`);
      } else {
        setSubmitMessage("Error connecting to the server.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="survey-page px-4 sm:px-6 lg:px-8">
      <div className="survey-card">
        <div className="survey-header flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <h1>
              PulseSync <span className="survey-brand-accent">Intelligence</span>
            </h1>
            <p className="survey-tagline">Real-time Field Survey Portal</p>
          </div>

          {username && (
            <div className="relative z-[1] flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
              <div className="text-right">
                <p className="text-xs font-bold text-white">Hello, {username}</p>
                <button type="button" onClick={handleLogout} className="survey-logout-btn">
                  Sign Out
                </button>
              </div>
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-green-400 to-emerald-600 flex items-center justify-center text-white text-sm font-black shadow-lg">
                {username.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>

        <div className="survey-body">
          {!isSurveyStarted ? (
            <div className="survey-hero">
              <div className="survey-start-wrap">
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full bg-emerald-400/35 pointer-events-none"
                />
                <motion.div
                  animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute inset-0 rounded-full bg-emerald-400/20 pointer-events-none"
                />

                <button type="button" onClick={handleStartSurvey} className="survey-start-btn">
                  Start<br />Survey
                </button>
              </div>
              <p className="survey-hero-title">Ready to collect data?</p>
              <p className="survey-hero-sub">Audio recording and GPS tracking will activate on start</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-10 animate-in fade-in duration-700">
              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-8">
                  <section className="survey-section">
                    <h2 className="survey-section-title">
                      <span className="survey-section-dot"></span>
                      Surveyor Information
                    </h2>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1 sm:col-span-2">
                          <CustomDropdown
                            label="Assembly Name"
                            placeholder="Select Assembly"
                            options={assemblies.map((a) => ({
                              id: a.assembly_no,
                              label: a.assembly_name_en,
                              subLabel: a.assembly_name_local || undefined,
                            }))}
                            value={form.assemblyNo}
                            onChange={(val: number | string) => {
                              const assemblyNo = Number(val);
                              const selected = assemblies.find((a) => a.assembly_no === assemblyNo);
                              setBooths([]);
                              setForm((prev) => ({
                                ...prev,
                                assemblyNo,
                                assembly: selected?.assembly_name_en || "",
                                gbaWard: "",
                                gbaWardId: 0,
                                pollingStationName: "",
                                pollingStationId: 0,
                                pollingStationNumber: "",
                              }));
                              fetchWards(assemblyNo);
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <CustomDropdown
                            label="Ward Name"
                            placeholder={form.assemblyNo ? "Select Ward" : "Select assembly first"}
                            options={wards.map((ward) => ({
                              id: ward.id,
                              label: ward.ward_name_en,
                              subLabel: ward.ward_name_local,
                            }))}
                            value={form.gbaWardId}
                            disabled={!form.assemblyNo}
                            onChange={(val: number | string) => {
                              const selectedWard = wards.find((w) => w.id === val);
                              setForm((prev) => ({
                                ...prev,
                                gbaWard: selectedWard?.ward_name_en || "",
                                gbaWardId: val as number,
                                pollingStationName: "",
                                pollingStationId: 0,
                                pollingStationNumber: "",
                              }));
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <CustomDropdown
                            label="Polling Station"
                            placeholder="Select Polling Station"
                            options={booths.map((booth) => ({
                              id: booth.id,
                              label: booth.booth_add_en || `Booth No: ${booth.booth_no}`,
                              subLabel: booth.booth_add_local || `Booth ${booth.booth_no}`,
                            }))}
                            value={form.pollingStationId}
                            onChange={(val: number | string) => {
                              const selectedBooth = booths.find((b) => b.id === val);
                              setForm((prev) => ({
                                ...prev,
                                pollingStationName: selectedBooth?.booth_add_en || `Booth ${selectedBooth?.booth_no}`,
                                pollingStationId: val as number,
                                pollingStationNumber: selectedBooth?.booth_no || prev.pollingStationNumber,
                              }));
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Booth No</label>
                          <input
                            name="pollingStationNumber"
                            value={form.pollingStationNumber}
                            readOnly
                            className="w-full bg-slate-100 px-4 py-3 rounded-xl border border-transparent text-sm font-bold text-slate-600"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Surveyor Name</label>
                          <input
                            name="surveyorName"
                            value={form.surveyorName}
                            onChange={handleChange}
                            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="survey-section">
                    <h2 className="survey-section-title">
                      <span className="survey-section-dot survey-section-dot--green"></span>
                      Voter Demographics
                    </h2>
                    <div className="space-y-5">
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
                          className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                        />
                        {showDropdown && (
                          <div className="survey-dropdown-panel absolute z-50 left-0 right-0 top-full mt-2 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
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
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Voter Name</label>
                        <input
                          name="interviewerName"
                          value={form.interviewerName}
                          onChange={handleChange}
                          placeholder="Full Name"
                          className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Age</label>
                          <input
                            type="number"
                            name="interviewerAge"
                            value={form.interviewerAge}
                            onChange={handleChange}
                            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <CustomDropdown
                            label="Gender"
                            placeholder="Select Gender"
                            options={[
                              { id: "Male", label: "Male" },
                              { id: "Female", label: "Female" },
                              { id: "Other", label: "Other" },
                            ]}
                            value={form.interviewerGender}
                            onChange={(val: number | string) => updateField("interviewerGender", val as string)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <CustomDropdown
                            label="Caste"
                            placeholder="Select Caste"
                            options={[
                              { id: "Brahma", label: "Brahma" },
                              { id: "Lingayat", label: "Lingayat" },
                              { id: "Vokkaliga", label: "Vokkaliga" },
                              { id: "Kuruba", label: "Kuruba" },
                              { id: "SC", label: "SC" },
                              { id: "ST", label: "ST" },
                              { id: "OBC", label: "OBC" },
                              { id: "Others", label: "Others" },
                            ]}
                            value={form.interviewerCaste}
                            onChange={(val: number | string) => updateField("interviewerCaste", val as string)}
                          />
                        </div>
                        <div className="space-y-1">
                          <CustomDropdown
                            label="Community"
                            placeholder="Select Community"
                            options={[
                              { id: "Hindu", label: "Hindu" },
                              { id: "Muslim", label: "Muslim" },
                              { id: "Christian", label: "Christian" },
                              { id: "Jain", label: "Jain" },
                              { id: "Others", label: "Others" },
                            ]}
                            value={form.interviewerCommunity}
                            onChange={(val: number | string) => updateField("interviewerCommunity", val as string)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <CustomDropdown
                            label="Education"
                            placeholder="Select Education"
                            options={[
                              { id: "Illiterate", label: "Illiterate" },
                              { id: "Primary", label: "Primary" },
                              { id: "Secondary", label: "Secondary" },
                              { id: "Graduate", label: "Graduate" },
                              { id: "Post-Graduate", label: "Post-Graduate" },
                              { id: "Others", label: "Others" },
                            ]}
                            value={form.interviewerEducation}
                            onChange={(val: number | string) => updateField("interviewerEducation", val as string)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Voter Mobile</label>
                          <div className="flex gap-2">
                            <input
                              name="interviewerMobile"
                              value={form.interviewerMobile}
                              onChange={handleChange}
                              className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => simulateVerify("respondent")}
                              disabled={respondentVerified || verifying === "respondent"}
                              className={`survey-verify-btn ${respondentVerified ? "is-verified" : ""}`}
                            >
                              {verifying === "respondent" ? "..." : respondentVerified ? "OK" : "Verify"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Right Column: Dynamic Info */}
                <div className="space-y-8">
                  <section className="survey-section h-full">
                    <div className="space-y-6">

                      {/* Dynamic Questions */}
                      {dynamicQuestions.length > 0 && (
                        <div className="pt-4 border-t border-slate-200 space-y-6">
                          <label className="text-xs font-black text-indigo-400 uppercase tracking-widest block mb-4">Ward Specific Questions</label>
                          {dynamicQuestions.map((dq) => (
                            <div key={dq.id} className="space-y-3">
                              <label className="text-xs font-bold text-slate-700 ml-1">{dq.text}</label>
                              <div className="grid grid-cols-2 gap-2">
                                {dq.options.split(",").map((opt) => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setForm(prev => ({
                                      ...prev,
                                      dynamicAnswers: { ...prev.dynamicAnswers, [dq.text]: opt }
                                    }))}
                                    className={`survey-option-btn ${form.dynamicAnswers?.[dq.text] === opt ? "is-selected" : ""}`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-4 border-t border-slate-200">
                        <label className="text-xs font-bold text-slate-700 mb-4 block">Candidate Priorities</label>
                        <div className="space-y-3">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <input
                              key={num}
                              placeholder={`Priority ${num}`}
                              name={`candidatePriority${num}`}
                              value={form[`candidatePriority${num}` as keyof SurveyFormState] as string}
                              onChange={handleChange}
                              className="w-full bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              {/* Form Footer */}
              <div className="pt-8 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                
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
                  <button type="submit" disabled={submitting} className="survey-submit-btn">
                    {submitting ? "SUBMITTING..." : "COMPLETE SURVEY"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div >
      <p className="survey-footer">Proprietary Intelligence Platform • GBA</p>

      <style jsx global>{`
        @keyframes soft-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .pulse-soft {
          animation: soft-pulse 2s infinite ease-in-out;
        }
        select {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
        }
        select::-ms-expand {
          display: none;
        }
        @media (max-width: 640px) {
          select {
            font-size: 16px;
          }
        }
      `}</style>
    </div >
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Home />
    </Suspense>
  );
}

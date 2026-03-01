"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import axios from "axios";
import CustomDropdown from "@/components/CustomDropdown";
import { API_BASE_URL } from "@/lib/config";

type PartyOption = "congress" | "bjp" | "jds" | "others" | "";

interface Ward {
  id: number;
  ward_name_en: string;
  ward_name_local: string;
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

interface SurveyFormState {
  assembly: string;
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
    assembly: "KR Puram",
    gbaWard: "KR Puram",
    gbaWardId: 0,
    pollingStationName: "Gvt High School, Devasandra",
    pollingStationId: 0,
    pollingStationNumber: "9",
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
  const [wards, setWards] = useState<Ward[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [dynamicQuestions, setDynamicQuestions] = useState<DynamicQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();

  useEffect(() => {
    fetchWards();
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
      const res = await axiosInstance.get(`/wards/${encodeURIComponent(wardName)}/questions`);
      setDynamicQuestions(res.data);
    } catch (err) {
      console.error("Error fetching dynamic questions", err);
    }
  };

  const fetchWards = async () => {
    try {
      const response = await axiosInstance.get("/wards");
      setWards(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching wards:", error);
      setSubmitMessage("Failed to load wards. Please try again.");
      setLoading(false);
    }
  };

  const fetchBooths = async (wardId: number) => {
    try {
      const response = await axiosInstance.get("/booths", {
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

  const captureLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          const errorMessages: { [key: number]: string } = {
            1: "Permission denied. Please enable location access in browser settings.",
            2: "Position unavailable. Ensure location services are enabled on your device.",
            3: "Request timeout. Location service took too long. Retrying...",
          };
          const message = errorMessages[error.code] || "Unknown geolocation error";
          console.error("Error capturing placement:", message, error);
          setSubmitMessage(`Location unavailable (${error.code}). Survey will continue without GPS data.`);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    } else {
      setSubmitMessage("Geolocation not supported. Survey will continue without GPS data.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    stopRecording();

    try {
      const payload = {
        ...form,
        latitude: location.latitude,
        longitude: location.longitude,
        audio_base64: audioBase64 || null,
        dynamicAnswers: JSON.stringify(form.dynamicAnswers),
      };

      const res = await axiosInstance.post("/surveys", payload);

      if (res.status === 200) {
        setSubmitMessage("Survey submitted successfully!");
        setForm({
          assembly: "KR Puram",
          gbaWard: "KR Puram",
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-gray-900 px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-black text-white tracking-tight">
              PulseSync <span className="text-green-500">Intelligence</span>
            </h1>
            <p className="text-gray-400 text-[10px] uppercase tracking-[0.2em] mt-1 font-bold">
              Real-time Field Survey Portal
            </p>
          </div>

          {username && (
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
              <div className="text-right">
                <p className="text-xs font-bold text-white">Hello, {username}</p>
                <button
                  onClick={handleLogout}
                  className="text-[10px] font-bold text-gray-500 hover:text-red-400 transition-colors uppercase tracking-wider"
                >
                  Sign Out
                </button>
              </div>
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-green-400 to-emerald-600 flex items-center justify-center text-white text-sm font-black shadow-lg">
                {username.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>

        <div className="p-8">
          {!isSurveyStarted ? (
            <div className="py-24 flex flex-col items-center text-center">
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
              <p className="text-slate-400 text-xs">Audio recording and GPS tracking will activate on start</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-10 animate-in fade-in duration-700">
              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-8">
                  <section className="bg-slate-50/80 rounded-3xl p-6 border border-slate-100 shadow-sm">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      Surveyor Information
                    </h2>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <CustomDropdown
                            label="Ward Name"
                            placeholder="Select Ward"
                            options={wards.map((ward) => ({
                              id: ward.id,
                              label: ward.ward_name_en,
                              subLabel: ward.ward_name_local,
                            }))}
                            value={form.gbaWardId}
                            onChange={(val: number | string) => {
                              const selectedWard = wards.find((w) => w.id === val);
                              setForm((prev) => ({
                                ...prev,
                                gbaWard: selectedWard?.ward_name_en || "",
                                gbaWardId: val as number,
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

                  <section className="bg-slate-50/80 rounded-3xl p-6 border border-slate-100 shadow-sm">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Voter Demographics
                    </h2>
                    <div className="space-y-5">
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
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Gender</label>
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
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Caste</label>
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
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Community</label>
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
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Education</label>
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
                              className={`px-4 rounded-xl text-[10px] font-black uppercase transition-all border ${respondentVerified
                                ? "bg-green-50 border-green-200 text-green-600"
                                : "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700"
                                }`}
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
                  <section className="bg-slate-50/80 rounded-3xl p-6 border border-slate-100 shadow-sm h-full">
                    <div className="space-y-6">
                      {["q1", "q2", "q3", "q4"].map((q, idx) => (
                        <div key={q} className="space-y-3">
                          <label className="text-xs font-bold text-slate-700 ml-1">
                            {idx === 0 && "Current Preference"}
                            {idx === 1 && "2023 Vote"}
                            {idx === 2 && "2018 Vote"}
                            {idx === 3 && "Family Preference"}
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {["Congress", "BJP", "JDS", "Others"].map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setForm((prev) => ({ ...prev, [q]: opt.toLowerCase() }))}
                                className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase transition-all border ${form[q as keyof SurveyFormState] === opt.toLowerCase()
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-lg"
                                  : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300"
                                  }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}

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
                                    className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase transition-all border ${form.dynamicAnswers?.[dq.text] === opt
                                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg"
                                      : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300"
                                      }`}
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
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${audioRecording ? 'bg-red-50 border-red-200 text-red-600 pulse-soft' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${audioRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`}></div>
                    <span className="text-[10px] font-black uppercase tracking-widest">{audioRecording ? "Recording Live" : "Mic Standby"}</span>
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
                    className="px-12 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all disabled:opacity-50 shadow-xl hover:shadow-2xl active:scale-95"
                  >
                    {submitting ? "SUBMITTING..." : "COMPLETE SURVEY"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div >
      <p className="mt-8 text-center text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em]">
        Proprietary Intelligence Platform • GBA
      </p>

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

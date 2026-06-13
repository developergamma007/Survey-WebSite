"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import axios from "axios";
import { CheckCircle2, Lock } from "lucide-react";
import CustomDropdown from "@/components/CustomDropdown";
import SurveyDynamicQuestions from "@/components/SurveyDynamicQuestions";
import PulseSyncLoginScreen from "@/components/PulseSyncLoginScreen";
import { API_BASE_URL } from "@/lib/config";
import { isAdminSubmitter } from "@/lib/adminUsers";
import { finalizeMediaRecorder } from "@/lib/audioRecording";
import { MAX_SURVEY_AUDIO_MS } from "@/lib/audioLimits";
import { buildStructuredDynamicAnswers } from "@/lib/surveyFieldKeys";
import {
  digitsOnly,
  validateMobileOptional,
  resolveOthersValue,
  isOthersSelection,
} from "@/lib/mobileValidation";
import { uploadSurveyAudio } from "@/lib/surveyAudioUpload";
import {
  DEFAULT_SURVEY_FIELD_CONFIG,
  mergeFieldConfig,
  type SurveyFieldConfig,
} from "@/lib/surveyFieldConfig";
import {
  buildVoterDetailLines,
  buildVoterFormPatch,
  pickVoterValue,
  type VoterSuggestion,
} from "@/lib/voterSearch";
import {
  clearSurveyorSession,
  getStoredToken,
  isSurveyorAccount,
  restoreSurveyorSession,
  surveyorDefaults,
  type SurveyorProfile,
} from "@/lib/surveyorSession";

type PartyOption = "congress" | "bjp" | "jds" | "others" | "";

interface Ward {
  id: number;
  ward_name_en: string;
  ward_name_local: string;
  assembly_no?: number | null;
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
  interviewerCasteOther: string;
  interviewerCommunity: string;
  interviewerCommunityOther: string;
  interviewerMobile: string;
  interviewerEducation: string;
  interviewerEducationOther: string;
  interviewerWork: string;
  interviewerHouseholdIncome: string;
  interviewerCurrentAddress: string;
  voterOfConstituency: string;

  q1: PartyOption;
  q2: PartyOption;
  q3: PartyOption;
  q4: PartyOption;

  dynamicAnswers: Record<string, string>;
}

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export function Home() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [surveyorProfile, setSurveyorProfile] = useState<SurveyorProfile | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [form, setForm] = useState<SurveyFormState>({
    assembly: "",
    assemblyNo: 0,
    gbaWard: "",
    gbaWardId: 0,
    pollingStationName: "",
    pollingStationId: 0,
    pollingStationNumber: "",
    surveyorName: "",
    surveyorMobile: "",

    interviewerName: "",
    interviewerAge: "",
    interviewerGender: "",
    interviewerCaste: "",
    interviewerCasteOther: "",
    interviewerCommunity: "",
    interviewerCommunityOther: "",
    interviewerMobile: "",
    interviewerEducation: "",
    interviewerEducationOther: "",
    interviewerWork: "",
    interviewerHouseholdIncome: "",
    interviewerCurrentAddress: "",
    voterOfConstituency: "",

    q1: "",
    q2: "",
    q3: "",
    q4: "",

    dynamicAnswers: {},
  });

  const [audioRecording, setAudioRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingLimitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSurveyStartedRef = useRef(false);
  const [location, setLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({ latitude: null, longitude: null });
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [isSurveyStarted, setIsSurveyStarted] = useState(false);
  const [surveyStartedAt, setSurveyStartedAt] = useState<string | null>(null);

  useEffect(() => {
    isSurveyStartedRef.current = isSurveyStarted;
  }, [isSurveyStarted]);

  useEffect(() => {
    return () => {
      if (recordingLimitRef.current) {
        clearTimeout(recordingLimitRef.current);
        recordingLimitRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);
  const [surveyorVerified, setSurveyorVerified] = useState(false);
  const [respondentVerified, setRespondentVerified] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
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
  const [fieldConfig, setFieldConfig] = useState<SurveyFieldConfig>(DEFAULT_SURVEY_FIELD_CONFIG);

  const searchParams = useSearchParams();
  const linkedWardName = decodeURIComponent(searchParams.get("ward") || "").trim();
  const useManualBooth = fieldConfig.manualEntryWhenApiEmpty && booths.length === 0;
  const showVoterSearch = fieldConfig.enableVoterSearch && form.gbaWardId > 0;
  const sf = fieldConfig.surveyorFields;
  const vf = fieldConfig.voterFields;

  useEffect(() => {
    if (!linkedWardName) {
      router.replace("/responses");
    }
  }, [linkedWardName, router]);

  useEffect(() => {
    const boot = async () => {
      await Promise.all([fetchAllWards(), fetchFieldConfig()]);
    };
    boot();
  }, []);

  const fetchFieldConfig = async () => {
    try {
      const res = await axiosInstance.get<SurveyFieldConfig>("/api/survey-form-config");
      setFieldConfig(mergeFieldConfig(res.data));
    } catch {
      setFieldConfig(DEFAULT_SURVEY_FIELD_CONFIG);
    }
  };

  useEffect(() => {
    if (!linkedWardName || wards.length === 0) return;

    const ward = wards.find((w) => w.ward_name_en === linkedWardName);
    if (!ward) return;

    setForm((prev) => ({
      ...prev,
      gbaWard: ward.ward_name_en,
      gbaWardId: ward.id,
    }));

    fetchDynamicQuestions(ward.ward_name_en);
    fetchBooths(ward.id);
  }, [linkedWardName, wards]);
  // Restore surveyor session and auto-fill surveyor fields
  useEffect(() => {
    const initSession = async () => {
      try {
        const profile = await restoreSurveyorSession();
        if (!profile) return;

        setUsername(profile.username);
        setSurveyorProfile(profile);

        const defaults = surveyorDefaults(profile);
        if (defaults.surveyorName || defaults.surveyorMobile) {
          setForm((prev) => ({
            ...prev,
            surveyorName: prev.surveyorName.trim() || defaults.surveyorName,
            surveyorMobile: prev.surveyorMobile.trim() || defaults.surveyorMobile,
          }));
        }
      } finally {
        setSessionLoading(false);
      }
    };

    initSession();
  }, []);

  const applySurveyorProfile = (profile: SurveyorProfile) => {
    setUsername(profile.username);
    setSurveyorProfile(profile);
    const defaults = surveyorDefaults(profile);
    setForm((prev) => ({
      ...prev,
      surveyorName: defaults.surveyorName,
      surveyorMobile: defaults.surveyorMobile,
    }));
  };

  const isSurveyorLoggedIn = !!username && isSurveyorAccount(surveyorProfile);

  const handleLogout = () => {
    clearSurveyorSession();
    setUsername(null);
    setSurveyorProfile(null);
    setIsSurveyStarted(false);
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

  const fetchAllWards = async () => {
    try {
      const response = await axiosInstance.get<Ward[]>("/api/wards");
      setWards(response.data);
    } catch (error) {
      console.error("Error fetching wards:", error);
      setSubmitMessage("Failed to load wards. Please try again.");
    } finally {
      setLoading(false);
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
    if (name === "pollingStationName") {
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
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) {
          setAudioUrl(URL.createObjectURL(blob));
          const reader = new FileReader();
          reader.onloadend = () => {
            setAudioBase64(reader.result as string);
          };
          reader.readAsDataURL(blob);
        }
      };

      recorder.start(1000);
      setMediaRecorder(recorder);
      mediaRecorderRef.current = recorder;
      setAudioRecording(true);

      if (recordingLimitRef.current) clearTimeout(recordingLimitRef.current);
      recordingLimitRef.current = setTimeout(() => {
        if (!isSurveyStartedRef.current) return;
        stopRecording();
        setSubmitMessage("Audio recording stopped at 5 minutes. Only the first 5 minutes are saved.");
      }, MAX_SURVEY_AUDIO_MS);
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
    setSurveyStartedAt(new Date().toISOString());
    setIsSurveyStarted(true);
    captureLocation();
    startRecording();
  };

  const stopRecording = () => {
    if (recordingLimitRef.current) {
      clearTimeout(recordingLimitRef.current);
      recordingLimitRef.current = null;
    }
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
    const patch = buildVoterFormPatch(voter);

    setForm((prev) => ({
      ...prev,
      interviewerName: patch.interviewerName || prev.interviewerName,
      interviewerAge: patch.interviewerAge || prev.interviewerAge,
      interviewerGender: patch.interviewerGender || prev.interviewerGender,
      interviewerCaste: patch.interviewerCaste || prev.interviewerCaste,
      interviewerCommunity: patch.interviewerCommunity || prev.interviewerCommunity,
      interviewerEducation: patch.interviewerEducation || prev.interviewerEducation,
      interviewerMobile: patch.interviewerMobile || prev.interviewerMobile,
      interviewerWork: patch.interviewerWork || prev.interviewerWork,
      interviewerCurrentAddress: patch.interviewerCurrentAddress || prev.interviewerCurrentAddress,
    }));
    setVoterSearchQuery(String(voter.name_en ?? ""));
    setVoterSearchAttempted(false);
    setVoterSuggestions([]);
    setShowDropdown(false);
  };

  const refreshLocation = (): Promise<{ latitude: number | null; longitude: number | null }> =>
    new Promise((resolve) => {
      if (!("geolocation" in navigator)) {
        resolve(location);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setLocation(coords);
          resolve(coords);
        },
        () => resolve(location),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdminSubmitter(username)) {
      setSubmitMessage("Admin accounts cannot submit surveys. Use the responses dashboard only.");
      return;
    }
    if (!form.surveyorName.trim()) {
      setSubmitMessage("Surveyor name is required before submitting.");
      return;
    }
    const mobileErr =
      validateMobileOptional(form.surveyorMobile, "Surveyor mobile") ||
      validateMobileOptional(form.interviewerMobile, "Voter mobile");
    if (mobileErr) {
      setSubmitMessage(mobileErr);
      return;
    }
    const wardName = form.gbaWard;
    if ((sf.ward ?? true) && !wardName) {
      setSubmitMessage("Ward is required. Open your ward survey link to continue.");
      return;
    }
    setSubmitting(true);

    try {
      const recordedAudio = await finalizeMediaRecorder(
        mediaRecorderRef.current,
        audioChunksRef.current,
        audioBase64
      );
      setAudioRecording(false);
      if (recordedAudio) {
        setAudioBase64(recordedAudio);
      }

      const coords = await refreshLocation();
      const token = getStoredToken();
      const audioUpload = await uploadSurveyAudio(recordedAudio, token);

      const voter = selectedVoter ?? ({} as VoterSuggestion);
      const structuredAnswers = buildStructuredDynamicAnswers({
        assembly: form.assembly,
        gbaWard: wardName,
        pollingStationName: form.pollingStationName,
        pollingStationNumber: form.pollingStationNumber,
        surveyorName: form.surveyorName,
        surveyorMobile: digitsOnly(form.surveyorMobile),
        interviewerName: form.interviewerName,
        interviewerAge: form.interviewerAge,
        interviewerGender: form.interviewerGender,
        interviewerCaste: resolveOthersValue(form.interviewerCaste, form.interviewerCasteOther),
        interviewerCommunity: resolveOthersValue(form.interviewerCommunity, form.interviewerCommunityOther),
        interviewerMobile: digitsOnly(form.interviewerMobile),
        interviewerEducation: resolveOthersValue(form.interviewerEducation, form.interviewerEducationOther),
        interviewerWork: form.interviewerWork,
        interviewerHouseholdIncome: form.interviewerHouseholdIncome,
        interviewerCurrentAddress: form.interviewerCurrentAddress,
        voterOfConstituency: form.voterOfConstituency,
        dynamicAnswers: form.dynamicAnswers,
        surveyStartedAt,
        surveyEndedAt: new Date().toISOString(),
      });

      const payload = {
        ...form,
        gbaWard: wardName,
        surveyorMobile: digitsOnly(form.surveyorMobile),
        interviewerMobile: digitsOnly(form.interviewerMobile),
        interviewerCaste: resolveOthersValue(form.interviewerCaste, form.interviewerCasteOther),
        interviewerCommunity: resolveOthersValue(form.interviewerCommunity, form.interviewerCommunityOther),
        interviewerEducation: resolveOthersValue(form.interviewerEducation, form.interviewerEducationOther),
        latitude: coords.latitude,
        longitude: coords.longitude,
        audioKey: audioUpload.audioKey ?? null,
        audio_base64: audioUpload.audio_base64 ?? null,
        dynamicAnswers: JSON.stringify(structuredAnswers),
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

      const res = await axiosInstance.post("/surveys", payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

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
          interviewerCasteOther: "",
          interviewerCommunity: "",
          interviewerCommunityOther: "",
          interviewerMobile: "",
          interviewerEducation: "",
          interviewerEducationOther: "",
          interviewerWork: "",
          interviewerHouseholdIncome: "",
          interviewerCurrentAddress: "",
          voterOfConstituency: "",
          q1: "",
          q2: "",
          q3: "",
          q4: "",
          dynamicAnswers: {},
        });
        setAudioUrl(null);
        setAudioBase64(null);
        setSurveyStartedAt(null);
        setTimeout(() => {
          setSubmitMessage(null);
          setIsSurveyStarted(false);
        }, 3000);
      }
    } catch (error) {
      console.error("Error submitting survey:", error);
      if (axios.isAxiosError(error)) {
        const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
        if (error.response?.status === 403) {
          setSubmitMessage(detail || "Admin accounts cannot submit surveys.");
        } else {
          setSubmitMessage(`Error: ${detail || error.message}`);
        }
      } else {
        setSubmitMessage("Error connecting to the server.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!linkedWardName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="survey-session-loading">
          <div className="survey-session-spinner" aria-hidden />
          <span>Opening admin console…</span>
        </div>
      </div>
    );
  }

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="survey-session-loading">
          <div className="survey-session-spinner" aria-hidden />
          <span>Checking session…</span>
        </div>
      </div>
    );
  }

  if (!isSurveyorLoggedIn && !isAdminSubmitter(username)) {
    return <PulseSyncLoginScreen variant="surveyor" onSurveyorLoggedIn={applySurveyorProfile} />;
  }

  return (
    <div className="survey-page px-2 sm:px-6 lg:px-8">
      <div className="survey-card">
        <div className="survey-header flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <h1>
              PulseSync <span className="survey-brand-accent">Intelligence</span>
            </h1>
            <p className="survey-tagline">Real-time Field Survey Portal</p>
          </div>

          {(isSurveyorLoggedIn || isAdminSubmitter(username)) && username ? (
            <div className="relative z-[1] flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
              <div className="text-right">
                <p className="text-xs font-bold text-white">
                  Hello, {surveyorProfile?.display_name || username}
                </p>
                <button type="button" onClick={handleLogout} className="survey-logout-btn">
                  Sign Out
                </button>
              </div>
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-green-400 to-emerald-600 flex items-center justify-center text-white text-sm font-black shadow-lg">
                {(surveyorProfile?.display_name || username || "?").charAt(0).toUpperCase()}
              </div>
            </div>
          ) : null}
        </div>

        <div className="survey-body">
          {isAdminSubmitter(username) ? (
            <div className="survey-hero">
              <p className="survey-hero-title">Admin access only</p>
              <p className="survey-hero-sub">
                Signed-in admin accounts cannot submit field surveys. Open the responses dashboard to review data and manage survey flow.
              </p>
              <a href="/responses" className="survey-submit-btn inline-flex items-center justify-center no-underline mt-4">
                Open Responses Dashboard
              </a>
              <button type="button" onClick={handleLogout} className="survey-admin-signout-btn">
                Sign Out
              </button>
            </div>
          ) : !isSurveyStarted ? (
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
            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-700">
              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-5">
                  <section className="survey-section">
                    <h2 className="survey-section-title">
                      <span className="survey-section-dot"></span>
                      Surveyor Information
                    </h2>
                    <div className="space-y-4">
                      {(sf.ward ?? true) && (
                        <div className="space-y-1">
                          <label className="survey-field-readonly-label text-[10px] font-black uppercase ml-1">Ward Name</label>
                          <div className="survey-field-readonly-wrap">
                            <input
                              value={form.gbaWard}
                              readOnly
                              tabIndex={-1}
                              placeholder={linkedWardName ? "Loading ward…" : "Open your ward survey link"}
                              className="survey-field-readonly w-full px-4 py-3 rounded-xl border text-sm font-bold"
                            />
                            <Lock className="survey-field-readonly-icon" size={16} aria-hidden />
                          </div>
                        </div>
                      )}
                      {(sf.pollingStation ?? true) && (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {useManualBooth ? (
                            <div className="space-y-1 xl:col-span-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Polling Station</label>
                              <input
                                name="pollingStationName"
                                value={form.pollingStationName}
                                onChange={(e) => {
                                  updateField("pollingStationName", e.target.value);
                                  updateField("pollingStationNumber", "");
                                }}
                                placeholder="Enter polling station"
                                className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
                              />
                            </div>
                          ) : (
                            <div className="space-y-1 xl:col-span-2">
                              <CustomDropdown
                                label="Polling Station"
                                placeholder="Select Polling Station"
                                options={booths.map((booth) => ({
                                  id: booth.id,
                                  label: booth.booth_add_en || `Booth No: ${booth.booth_no}`,
                                  subLabel: booth.booth_add_local || `Booth ${booth.booth_no}`,
                                }))}
                                value={form.pollingStationId}
                                disabled={!form.gbaWardId}
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
                          )}
                        </div>
                      )}
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {(sf.surveyorName ?? true) && (
                          <div className="space-y-1">
                            <label className="survey-field-readonly-label text-[10px] font-black uppercase ml-1">
                              Surveyor Name
                            </label>
                            <div className="survey-field-readonly-wrap">
                              <input
                                value={form.surveyorName}
                                readOnly
                                tabIndex={-1}
                                placeholder="Sign in to fill"
                                className="survey-field-readonly w-full px-4 py-3 rounded-xl border text-sm font-bold"
                              />
                              <Lock className="survey-field-readonly-icon" size={16} aria-hidden />
                            </div>
                          </div>
                        )}
                        {(sf.surveyorMobile ?? true) && (
                          <div className="space-y-1">
                            <label className="survey-field-readonly-label text-[10px] font-black uppercase ml-1">
                              Surveyor Phone Number
                            </label>
                            <div className="survey-field-readonly-wrap">
                              <input
                                value={form.surveyorMobile}
                                readOnly
                                tabIndex={-1}
                                placeholder="Sign in to fill"
                                className="survey-field-readonly w-full px-4 py-3 rounded-xl border text-sm font-bold"
                              />
                              <Lock className="survey-field-readonly-icon" size={16} aria-hidden />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="survey-section">
                    <h2 className="survey-section-title">
                      <span className="survey-section-dot survey-section-dot--green"></span>
                      Voter Demographics
                    </h2>
                    <div className="space-y-5">
                      {showVoterSearch ? (
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
                      ) : (
                        <p className="text-[11px] font-semibold text-slate-500">
                          Enter voter details manually below.
                        </p>
                      )}
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
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
                          {isOthersSelection(form.interviewerCaste) && (
                            <input
                              value={form.interviewerCasteOther}
                              onChange={(e) => updateField("interviewerCasteOther", e.target.value)}
                              placeholder="Please specify caste"
                              className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
                            />
                          )}
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
                          {isOthersSelection(form.interviewerCommunity) && (
                            <input
                              value={form.interviewerCommunityOther}
                              onChange={(e) => updateField("interviewerCommunityOther", e.target.value)}
                              placeholder="Please specify community"
                              className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
                            />
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
                          {isOthersSelection(form.interviewerEducation) && (
                            <input
                              value={form.interviewerEducationOther}
                              onChange={(e) => updateField("interviewerEducationOther", e.target.value)}
                              placeholder="Please specify education"
                              className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
                            />
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Voter Mobile</label>
                          <div className="flex gap-2">
                            <input
                              name="interviewerMobile"
                              value={form.interviewerMobile}
                              onChange={(e) => updateField("interviewerMobile", digitsOnly(e.target.value))}
                              inputMode="numeric"
                              maxLength={10}
                              placeholder="10-digit mobile"
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
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <CustomDropdown
                            label="Voter of Constituency"
                            placeholder="Are you a voter here?"
                            options={[
                              { id: "Yes", label: "Yes" },
                              { id: "No", label: "No" },
                            ]}
                            value={form.voterOfConstituency}
                            onChange={(val: number | string) => updateField("voterOfConstituency", val as string)}
                          />
                        </div>
                        <div className="space-y-1">
                          <CustomDropdown
                            label="Household Income"
                            placeholder="Select income range"
                            options={[
                              { id: "Below 10,000", label: "Below ₹10,000" },
                              { id: "10,000 - 20,000", label: "₹10,000 - ₹20,000" },
                              { id: "20,000 - 50,000", label: "₹20,000 - ₹50,000" },
                              { id: "50,000 - 1,00,000", label: "₹50,000 - ₹1,00,000" },
                              { id: "Above 1,00,000", label: "Above ₹1,00,000" },
                            ]}
                            value={form.interviewerHouseholdIncome}
                            onChange={(val: number | string) => updateField("interviewerHouseholdIncome", val as string)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Occupation</label>
                          <input
                            name="interviewerWork"
                            value={form.interviewerWork}
                            onChange={handleChange}
                            placeholder="What do you do for a living?"
                            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Current Address</label>
                          <input
                            name="interviewerCurrentAddress"
                            value={form.interviewerCurrentAddress}
                            onChange={handleChange}
                            placeholder="Enter current address"
                            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                      {form.gbaWard ? (
                        <p className="text-[10px] font-semibold text-slate-400">
                          Village / Ward for this record: <span className="text-slate-600">{form.gbaWard}</span>
                        </p>
                      ) : null}
                    </div>
                  </section>
                </div>

                {/* Right Column: Dynamic Info */}
                <div className="space-y-8">
                  <section className="survey-section survey-section--flush h-full">
                    <div className="space-y-6">

                      <SurveyDynamicQuestions
                        questions={dynamicQuestions}
                        answers={form.dynamicAnswers}
                        onChange={(questionText, value) =>
                          setForm((prev) => ({
                            ...prev,
                            dynamicAnswers: { ...prev.dynamicAnswers, [questionText]: value },
                          }))
                        }
                      />
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

"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SurveyorProfile } from "@/lib/surveyorSession";

const AdminDashboardContext = createContext<SurveyorProfile | null>(null);

export function AdminDashboardProvider({
  profile,
  children,
}: {
  profile: SurveyorProfile | null;
  children: ReactNode;
}) {
  return (
    <AdminDashboardContext.Provider value={profile}>{children}</AdminDashboardContext.Provider>
  );
}

export function useAdminDashboardProfile(): SurveyorProfile | null {
  return useContext(AdminDashboardContext);
}
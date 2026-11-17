"use client";

import { useMemo } from "react";
import {
  FIELD_RECORDS_UNASSIGNED_ASSEMBLY,
  FIELD_RECORDS_UNASSIGNED_WARD,
} from "@/lib/fieldRecordsFilter";
import MultiFilterSelect, { type MultiFilterOption } from "./MultiFilterSelect";

type Ward = { id: number; ward_name_en: string };

type Props = {
  wards: Ward[];
  selection: string[];
  onChange: (selection: string[]) => void;
  unassignedAssemblyCount?: number;
  unassignedWardCount?: number;
  totalCount?: number;
};

export default function WardFilterSelect({
  wards,
  selection,
  onChange,
  unassignedAssemblyCount = 0,
  unassignedWardCount = 0,
  totalCount,
}: Props) {
  const options = useMemo((): MultiFilterOption[] => {
    const items: MultiFilterOption[] = [];
    if (unassignedAssemblyCount > 0) {
      items.push({
        value: FIELD_RECORDS_UNASSIGNED_ASSEMBLY,
        label: `Unassigned assembly (${unassignedAssemblyCount})`,
      });
    }
    if (unassignedWardCount > 0) {
      items.push({
        value: FIELD_RECORDS_UNASSIGNED_WARD,
        label: `Unassigned ward (${unassignedWardCount})`,
      });
    }
    for (const ward of wards) {
      items.push({ value: ward.ward_name_en, label: ward.ward_name_en });
    }
    return items;
  }, [wards, unassignedAssemblyCount, unassignedWardCount]);

  const allLabel =
    totalCount != null ? `All Wards (${totalCount})` : "All Wards";

  return (
    <MultiFilterSelect
      options={options}
      selection={selection}
      onChange={onChange}
      allLabel={allLabel}
      searchPlaceholder="Search wards…"
    />
  );
}
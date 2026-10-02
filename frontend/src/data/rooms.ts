import type { Room, WardRate, WardType } from "@/types/rooms";

export const WARD_LABELS: Record<WardType, string> = {
  general: "General Ward",
  private: "Private Ward",
  emergency: "Emergency",
  icu: "ICU",
};

/** Tailwind class sets per ward (kept as full literal strings so Tailwind can detect them). */
export const WARD_STYLES: Record<
  WardType,
  { badge: string; bar: string; label: string; tile: string }
> = {
  general: {
    badge: "border-[#e3e6ef] bg-[#f1f3f9] text-[#465166]",
    bar: "bg-[#007d72]",
    label: "text-[#5b6578]",
    tile: "bg-[#f1f3f9] text-[#465166]",
  },
  private: {
    badge: "border-[#e6d3ff] bg-[#f6edff] text-[#7c3aed]",
    bar: "bg-[#8b3dff]",
    label: "text-[#8b3dff]",
    tile: "bg-[#f6edff] text-[#7c3aed]",
  },
  emergency: {
    badge: "border-[#ffd0d3] bg-[#fff0f1] text-[#e4393d]",
    bar: "bg-[#e4393d]",
    label: "text-[#e4393d]",
    tile: "bg-[#fff0f1] text-[#e4393d]",
  },
  icu: {
    badge: "border-[#bfeadf] bg-[#e6f8f4] text-[#007d72]",
    bar: "bg-[#007d72]",
    label: "text-[#007d72]",
    tile: "bg-[#e6f8f4] text-[#007d72]",
  },
};

export const wardRates: WardRate[] = [
  { ward: "general", label: "GENERAL WARD", short: "GEN", perDay: 1500 },
  { ward: "private", label: "PRIVATE WARD", short: "PVT", perDay: 3500 },
  { ward: "emergency", label: "EMERGENCY", short: "EMG", perDay: 5000 },
  { ward: "icu", label: "ICU", short: "ICU", perDay: 7500 },
];

/** Room layout only — no patients are pre-assigned. Every bed starts as available. */
const room = (
  number: string,
  ward: WardType,
  floor: string,
  area: string,
  capacity = 5,
): Room => ({
  id: `room-${number}`,
  number,
  ward,
  floor,
  area,
  capacity,
  beds: Array.from({ length: capacity }, () => null),
});

export const rooms: Room[] = [
  room("101", "general", "Ground Floor", "East Wing"),
  room("102", "general", "Ground Floor", "East Wing"),
  room("103", "general", "Ground Floor", "West Wing"),
  room("104", "private", "2nd Floor", "Executive Suite"),
  room("105", "private", "2nd Floor", "Executive Suite"),
  room("106", "emergency", "Ground Floor", "Trauma Wing"),
  room("107", "icu", "3rd Floor", "Critical Care Unit"),
  room("108", "general", "1st Floor", "North Wing"),
];
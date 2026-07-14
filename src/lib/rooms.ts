import roomDeluxe from "@/assets/room-deluxe.jpg";
import roomFamily from "@/assets/room-family.jpg";
import roomTwin from "@/assets/room-twin.jpg";
import roomSingle from "@/assets/room-single.jpg";

export type RoomCategory = {
  id: "deluxe" | "family" | "twin" | "single";
  name: string;
  tagline: string;
  description: string;
  rate: number;
  capacity: number;
  totalUnits: number;
  image: string;
  amenities: string[];
};

export const rooms: RoomCategory[] = [
  {
    id: "deluxe",
    name: "Deluxe Room",
    tagline: "Our signature suite, opening onto the acacia grove.",
    description:
      "The Deluxe is our most requested category — a king bed under a hand-stitched mosquito canopy, a private balcony framing the highlands, and a rain shower drawn in local stone. Warm terracotta accents and mahogany finishes throughout.",
    rate: 320,
    capacity: 2,
    totalUnits: 8,
    image: roomDeluxe,
    amenities: ["King bed", "Private balcony", "Rain shower", "Air conditioning", "Coffee station"],
  },
  {
    id: "family",
    name: "Family Villa",
    tagline: "Two interconnected rooms for parties of up to four.",
    description:
      "Designed for families or small groups travelling together. Two bedrooms open onto a shared lounge, with garden access and a private outdoor sitting area. Sleeps four comfortably; extra bed on request.",
    rate: 550,
    capacity: 4,
    totalUnits: 6,
    image: roomFamily,
    amenities: ["Two bedrooms", "Shared lounge", "Garden access", "Sleeps 4", "Extra bed available"],
  },
  {
    id: "twin",
    name: "Twin Suite",
    tagline: "Two beds, one shared window on the savannah.",
    description:
      "Two full-size beds under separate mosquito nets, joined by a warm reading nook. Brass lamps, local textiles, and a generous en-suite bath. Ideal for friends or colleagues sharing on safari.",
    rate: 280,
    capacity: 2,
    totalUnits: 10,
    image: roomTwin,
    amenities: ["Two twin beds", "En-suite bath", "Reading nook", "Air conditioning", "Local textiles"],
  },
  {
    id: "single",
    name: "Garden Single",
    tagline: "A quiet room for the solo traveller.",
    description:
      "Our garden-facing single opens directly onto the courtyard and its resident weaver birds. A writing desk by the window, a comfortable single bed, and every amenity of the larger suites — sized for one.",
    rate: 180,
    capacity: 1,
    totalUnits: 6,
    image: roomSingle,
    amenities: ["Single bed", "Writing desk", "Garden view", "En-suite bath", "Complimentary Wi-Fi"],
  },
];

export function findRoom(id: string): RoomCategory | undefined {
  return rooms.find((r) => r.id === id);
}

// Deterministic pseudo-availability so the UI feels alive without a backend.
// Given check-in/check-out dates and a room, return the number of units still available.
export function availabilityFor(
  roomId: string,
  checkIn: string,
  checkOut: string,
): { available: number; total: number } {
  const room = findRoom(roomId);
  if (!room) return { available: 0, total: 0 };
  const seed = hashString(`${roomId}|${checkIn}|${checkOut}`);
  const held = seed % (room.totalUnits + 1);
  const booked = getLocalHoldsFor(roomId, checkIn, checkOut);
  const available = Math.max(0, room.totalUnits - held - booked);
  return { available, total: room.totalUnits };
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function getLocalHoldsFor(roomId: string, checkIn: string, checkOut: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem("arv-bookings");
    if (!raw) return 0;
    const list = JSON.parse(raw) as Array<{ roomId: string; checkIn: string; checkOut: string }>;
    return list.filter(
      (b) => b.roomId === roomId && overlaps(b.checkIn, b.checkOut, checkIn, checkOut),
    ).length;
  } catch {
    return 0;
  }
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}
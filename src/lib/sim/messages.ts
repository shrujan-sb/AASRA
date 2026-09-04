import type { InboxMessage, Lang } from "@/lib/types";

type Scripted = { delayMs: number; source: string; languageHint?: Lang; rawText: string };

export const FEED_SCRIPT: Scripted[] = [
  { delayMs: 400, source: "WhatsApp · Ward volunteer", rawText: "need 200 blankets in Ward 7, families on first floors" },
  { delayMs: 2800, source: "NGO AshaNet", rawText: "have 3 trucks free near Autonagar, can move rations" },
  { delayMs: 5200, source: "GGH duty desk", rawText: "medical camp needs 2 nurses at GGH, trauma load rising" },
  { delayMs: 7400, source: "Citizen · Krishnalanka", rawText: "Prakasam barrage road blocked, water over the carriageway" },
  { delayMs: 9600, source: "Shelter B warden", rawText: "Shelter B needs drinking water, tanker empty, 340 people" },
  { delayMs: 11800, source: "Municipal control", rawText: "Prakasam barrage road open, light vehicles can pass" },
  { delayMs: 14200, source: "NDRF Team 4", rawText: "flood-rescue gear standing by in Ward 12, 6 personnel" },
  { delayMs: 16800, source: "Ward 19 resident", rawText: "need boat evac 20 people trapped Ward 19 Autonagar rooftops NOW" },
  { delayMs: 19200, source: "Hindi desk", languageHint: "hi", rawText: "वार्ड 5 में 80 कंबल चाहिए, बारिश जारी है" },
  { delayMs: 21800, source: "Telugu desk", languageHint: "te", rawText: "వార్డ్ 11 లో నీటి ట్యాంకర్ అవసరం, పంపులు ఆగిపోయాయి" },
  { delayMs: 25000, source: "AP TRANSCO", rawText: "33kV substation Patamata feeder unstable, hospital backup requested" },
  { delayMs: 28500, source: "Police traffic", rawText: "NH-16 corridor blocked at Autonagar underpass, trucks cannot pass" },
  { delayMs: 32000, source: "Volunteer pool", rawText: "have 12 medical staff available Ward 9, can deploy" },
  { delayMs: 35500, source: "Shelter B warden", rawText: "water shortage worsening at Shelter B, 2 hours of stock left" },
  { delayMs: 39000, source: "Fire service", rawText: "need generator at GGH ICU, mains flicker after substation event" },
  { delayMs: 43000, source: "Citizen · barrage", rawText: "Prakasam barrage road blocked again, current stronger" },
  { delayMs: 48000, source: "Logistics NGO", rawText: "offering 400 food kits from Ward 14 Gunadala warehouse" },
  { delayMs: 53000, source: "Control room", rawText: "need ambulance + nurse for evac from Ward 5 to GGH immediate" },
  { delayMs: 60000, source: "NDRF recon", rawText: "Kanakadurga flyover open, hospital access from Governorpet clear" },
];

export function toInbox(row: Scripted, now: number): InboxMessage {
  return {
    id: `IN-${now}-${Math.random().toString(36).slice(2, 6)}`,
    rawText: row.rawText,
    source: row.source,
    timestamp: now,
    languageHint: row.languageHint,
    processed: false,
  };
}

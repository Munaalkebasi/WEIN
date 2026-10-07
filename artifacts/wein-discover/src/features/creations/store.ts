import { z } from "zod";

export const categories = [
  "Social",
  "Music",
  "Sports",
  "Food",
  "Outdoors",
  "Art",
  "Learn",
] as const;
export type CreationKind = "activity" | "event";
const text = (max: number) => z.string().trim().min(1).max(max);
const date = z.string().datetime({ offset: true });
function safeLink(value: string) {
  if (!value) return true;
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
const schema = z
  .object({
    id: z.string().uuid(),
    kind: z.enum(["activity", "event"]),
    title: text(120),
    description: z.string().max(2000),
    place: text(200),
    category: z.enum(categories),
    start: date,
    end: date.optional(),
    cost: z.number().finite().min(0).max(100000),
    capacity: z.number().int().min(1).max(100000).optional(),
    organizer: z.string().max(120),
    ticketUrl: z.string().max(2000).refine(safeLink),
    updatedAt: date,
  })
  .refine((value) => !value.end || new Date(value.end) > new Date(value.start));
export type Creation = z.infer<typeof schema>;
export type CreationFields = Omit<
  Creation,
  "id" | "updatedAt" | "cost" | "capacity" | "start" | "end"
> & {
  start: string;
  end: string;
  cost: string;
  capacity: string;
};
const KEY = "wein-creations-v1";

export function readCreations(): Creation[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  const parsed = z.array(schema).safeParse(JSON.parse(raw));
  if (!parsed.success)
    throw new Error(
      "Your saved hangouts and events could not be read. Your stored data has been kept.",
    );
  return parsed.data.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function buildCreation(
  fields: CreationFields,
  existing?: Creation,
): Creation {
  const start = new Date(fields.start);
  const end = fields.end ? new Date(fields.end) : undefined;
  if (!fields.title.trim() || !fields.place.trim())
    throw new Error("Add a title and a place.");
  const originalStart = existing
    ? new Date(existing.start).getTime()
    : undefined;
  if (
    !Number.isFinite(start.getTime()) ||
    (start.getTime() !== originalStart && start.getTime() <= Date.now())
  )
    throw new Error("Choose a start date and time in the future.");
  if (end && (!Number.isFinite(end.getTime()) || end <= start))
    throw new Error("The end must be after the start.");
  if (
    !fields.cost.trim() ||
    !Number.isFinite(Number(fields.cost)) ||
    Number(fields.cost) < 0
  )
    throw new Error("Enter a valid cost, or 0 for free.");
  if (fields.kind === "event" && !fields.organizer.trim())
    throw new Error("Add the event organizer.");
  const ticketUrl = fields.ticketUrl.trim();
  if (!safeLink(ticketUrl))
    throw new Error("Use a complete http or https ticket link.");
  const result = schema.safeParse({
    ...fields,
    title: fields.title.trim(),
    description: fields.description.trim(),
    place: fields.place.trim(),
    organizer: fields.organizer.trim(),
    ticketUrl,
    start: start.toISOString(),
    end: end?.toISOString(),
    cost: Number(fields.cost),
    capacity: fields.capacity.trim() ? Number(fields.capacity) : undefined,
    id: existing?.id ?? crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
  });
  if (!result.success)
    throw new Error(
      "Check your details. Capacity must be a whole number from 1 to 100,000 and cost must be at most 100,000.",
    );
  return result.data;
}

export function saveCreation(creation: Creation) {
  const current = readCreations();
  localStorage.setItem(
    KEY,
    JSON.stringify([
      creation,
      ...current.filter((item) => item.id !== creation.id),
    ]),
  );
}

export function creationPlanUrl(item: Creation) {
  const details = [
    item.description,
    `Place: ${item.place}`,
    `When: ${new Date(item.start).toLocaleString()}`,
    `Cost: ${item.cost === 0 ? "Free" : `CAD ${item.cost}`}`,
    item.ticketUrl,
  ]
    .filter(Boolean)
    .join("\n");
  return `/plans/new?${new URLSearchParams({ name: item.title, description: details.slice(0, 2000) })}`;
}

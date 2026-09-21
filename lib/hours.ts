/**
 * Operating-hours engine.
 *
 * Pure functions, no dependencies, safe to run on the server (SSR/ISR) or in a
 * test script. Handles:
 *   - midnight-wrapping shifts (Fri 09:00 → 01:00 Sat),
 *   - multiple shifts per day (lunch breaks),
 *   - any IANA timezone via `Intl.DateTimeFormat` (no manual offset math),
 *   - Albanian copy for the "Hapur Tani" / "Mbyllur" UI.
 */
import {
  STORE_TIMEZONE,
  WEEKLY_SCHEDULE,
  type DayHours,
  type WeeklySchedule,
} from "./restaurant";

export const DAY_LABELS_SQ = [
  "E diel",
  "E hënë",
  "E martë",
  "E mërkurë",
  "E enjte",
  "E premte",
  "E shtunë",
] as const;

export const DAY_LABELS_SHORT_SQ = [
  "Die",
  "Hën",
  "Mar",
  "Mër",
  "Enj",
  "Pre",
  "Sht",
] as const;

/** Locative form used in "Hapet të hënën në 09:00". */
export const DAY_LABELS_LOCATIVE_SQ = [
  "të dielën",
  "të hënën",
  "të martën",
  "të mërkurën",
  "të enjten",
  "të premten",
  "të shtunën",
] as const;

const MINUTES_PER_DAY = 24 * 60;
const LOOKAHEAD_DAYS = 8;

export interface OpeningStatus {
  isOpen: boolean;
  /** Badge copy: `"Hapur Tani"` or `"Mbyllur"`. */
  label: string;
  /** Support line: `"Mbyllet në 23:00"` / `"Hapet nesër në 09:00"`. */
  detail: string;
  /** `"23:00"` when open, otherwise the next opening time. */
  time: string;
  /** Day index of the next opening (0 = Sunday) — undefined while open. */
  nextOpenWeekday?: number;
  /** True when closed today and the next opening is tomorrow. */
  opensTomorrow?: boolean;
  /** Today's shifts, for the banner / footer table. */
  todayShifts: readonly DayHours[];
}

interface ZonedNow {
  weekday: number;
  minutes: number;
}

/** Parse `"HH:MM"` into minutes since midnight. Invalid input → `NaN`. */
export function timeToMinutes(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return Number.NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return Number.NaN;
  return hours * 60 + minutes;
}

export function minutesToTime(total: number): string {
  const wrapped =
    ((total % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getZonedNow(now: Date, timeZone: string): ZonedNow {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const weekdayName = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");

  // `hour12: false` can yield "24" for midnight in some ICU builds.
  const safeHour = hour === 24 ? 0 : hour;

  return {
    weekday: WEEKDAY_INDEX[weekdayName] ?? 1,
    minutes: safeHour * 60 + minute,
  };
}

function shiftsFor(
  schedule: WeeklySchedule,
  weekday: number,
): readonly DayHours[] {
  return schedule[weekday] ?? [];
}

interface ShiftWindow {
  /** Minutes since midnight of the opening day. */
  start: number;
  /** Absolute end in minutes, unwrapped past midnight when needed. */
  end: number;
}

/** Normalise a day's shifts, unwrapping shifts that cross midnight. */
function toWindows(shifts: readonly DayHours[]): ShiftWindow[] {
  return shifts
    .map((raw) => {
      const start = timeToMinutes(raw.open);
      const close = timeToMinutes(raw.close);
      if (Number.isNaN(start) || Number.isNaN(close) || start === close) {
        return null;
      }
      const end = close < start ? close + MINUTES_PER_DAY : close;
      return { start, end };
    })
    .filter((window): window is ShiftWindow => window !== null);
}

/**
 * Resolve the current opening status.
 *
 * @param now       Injectable clock (defaults to `new Date()`).
 * @param timeZone  IANA timezone of the store.
 * @param schedule  Weekly schedule, defaults to the restaurant config.
 */
export function getOpeningStatus(
  now: Date = new Date(),
  timeZone: string = STORE_TIMEZONE,
  schedule: WeeklySchedule = WEEKLY_SCHEDULE,
): OpeningStatus {
  const zoned = getZonedNow(now, timeZone);
  const todayShifts = shiftsFor(schedule, zoned.weekday);

  // 1) Inside a shift that started today.
  for (const window of toWindows(todayShifts)) {
    if (zoned.minutes >= window.start && zoned.minutes < window.end) {
      return {
        isOpen: true,
        label: "Hapur Tani",
        detail: `Mbyllet në ${minutesToTime(window.end)}`,
        time: minutesToTime(window.end),
        todayShifts,
      };
    }
  }

  // 2) Inside yesterday's shift that wrapped past midnight.
  const yesterday = (zoned.weekday + 6) % 7;
  for (const window of toWindows(shiftsFor(schedule, yesterday))) {
    if (window.end <= MINUTES_PER_DAY) continue; // did not wrap
    const spillOverEnd = window.end - MINUTES_PER_DAY;
    if (zoned.minutes < spillOverEnd) {
      return {
        isOpen: true,
        label: "Hapur Tani",
        detail: `Mbyllet në ${minutesToTime(spillOverEnd)}`,
        time: minutesToTime(spillOverEnd),
        todayShifts,
      };
    }
  }

  // 3) Closed — locate the next opening inside the lookahead window.
  const next = findNextOpening(zoned, schedule);

  return {
    isOpen: false,
    label: "Mbyllur",
    detail: next
      ? `Hapet ${next.dayLabel} në ${next.open}`
      : "Orari i hapjes përditësohet së shpejti",
    time: next?.open ?? "",
    nextOpenWeekday: next?.weekday,
    opensTomorrow: next?.dayOffset === 1,
    todayShifts,
  };
}

interface NextOpening {
  weekday: number;
  dayOffset: number;
  dayLabel: string;
  open: string;
}

function findNextOpening(
  zoned: ZonedNow,
  schedule: WeeklySchedule,
): NextOpening | null {
  for (let dayOffset = 0; dayOffset <= LOOKAHEAD_DAYS; dayOffset += 1) {
    const weekday = (zoned.weekday + dayOffset) % 7;
    const windows = toWindows(shiftsFor(schedule, weekday)).sort(
      (a, b) => a.start - b.start,
    );

    for (const window of windows) {
      // Today: only openings later than the current minute count.
      if (dayOffset === 0 && window.start <= zoned.minutes) continue;

      return {
        weekday,
        dayOffset,
        dayLabel:
          dayOffset === 0
            ? "sot"
            : dayOffset === 1
              ? "nesër"
              : DAY_LABELS_LOCATIVE_SQ[weekday],
        open: minutesToTime(window.start),
      };
    }
  }

  return null;
}

/** `[{open, close}]` → `"09:00 – 23:00"` (or `"Mbyllur"` when empty). */
export function describeShifts(
  shifts: readonly DayHours[] | undefined,
): string {
  if (!shifts || shifts.length === 0) return "Mbyllur";
  return shifts.map((shift) => `${shift.open} – ${shift.close}`).join(" · ");
}

export interface HoursRow {
  weekday: number;
  label: string;
  labelShort: string;
  hoursLabel: string;
  isToday: boolean;
}

/** Weekly table for the footer / opening-hours section. */
export function getWeeklyHoursRows(
  now: Date = new Date(),
  timeZone: string = STORE_TIMEZONE,
  schedule: WeeklySchedule = WEEKLY_SCHEDULE,
): HoursRow[] {
  const today = getZonedNow(now, timeZone).weekday;
  return DAY_LABELS_SQ.map((label, weekday) => ({
    weekday,
    label,
    labelShort: DAY_LABELS_SHORT_SQ[weekday],
    hoursLabel: describeShifts(shiftsFor(schedule, weekday)),
    isToday: weekday === today,
  }));
}

const SCHEMA_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Schema.org `OpeningHoursSpecification` entries (one per weekday shift). */
export function getOpeningHoursSpecification(
  schedule: WeeklySchedule = WEEKLY_SCHEDULE,
) {
  return SCHEMA_DAYS.flatMap((dayName, weekday) =>
    shiftsFor(schedule, weekday).map((shift) => ({
      "@type": "OpeningHoursSpecification" as const,
      dayOfWeek: `https://schema.org/${dayName}`,
      opens: shift.open,
      closes: shift.close,
    })),
  );
}
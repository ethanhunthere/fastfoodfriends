/**
 * ntfy.sh push notification dispatcher — **server only**.
 *
 * When a customer confirms an order we push an *urgent* notification straight to
 * the store manager's phone. The notification carries native action buttons so
 * the manager can call the customer back with one tap:
 *
 *   Actions: view, Telefono Klientin, tel:+38344123456, clear=true
 *   Click:   tel:+38344123456
 *
 * Reference: https://docs.ntfy.sh/publish/#action-buttons
 *
 * Header hygiene: HTTP headers are ISO-8859-1, so `Title`/`Actions` are kept
 * ASCII-safe (emoji only in `Tags`), while the UTF-8 *body* renders the full
 * Albanian text with ë/ç.
 */
import { formatPrice, formatPriceMachine } from "./format";
import { telHref } from "./phone";
import { RESTAURANT, getFormattedAddress } from "./restaurant";
import type { OrderReceipt } from "../types/order";

const NTFY_SERVER = (process.env.NTFY_SERVER ?? "https://ntfy.sh").replace(/\/+$/, "");
const NTFY_TOPIC = process.env.NTFY_TOPIC ?? "";
const NTFY_TOKEN = process.env.NTFY_TOKEN ?? "";
const NTFY_PRIORITY = 5; // Always urgent for incoming orders.
const NTFY_TAGS =
  process.env.NTFY_TAGS ?? "rotating_light,hamburger,phone,heavy_check_mark";
const REQUEST_TIMEOUT_MS = Number(process.env.NTFY_TIMEOUT_MS ?? "8000");

export interface NtfyPayload {
  title: string;
  body: string;
  priority: number;
  tags: string;
  click: string;
  actions: string;
}

export function isNotificationConfigured(): boolean {
  return NTFY_TOPIC.trim().length > 0;
}

/** ASCII-safe: strips anything outside ISO-8859-1 for use inside headers. */
function toHeaderSafe(value: string): string {
  return value.replace(/[^\x20-\x7E\xA0-\xFF]/g, "").trim();
}

/**
 * Build the notification content for an order.
 * Kept separate from the transport so it can be unit-tested and reused
 * (e.g. by a future WhatsApp/SMS layer).
 */
export function buildOrderNotification(receipt: OrderReceipt): NtfyPayload {
  const { customer, pricing, lines, mode, orderNumber } = receipt;

  const modeLabel = mode === "delivery" ? "DORËZIM" : "MARRJE NË LOKAL";

  const itemLines = lines.map((line) => {
    const variant = line.variantLabel ? ` (${line.variantLabel})` : "";
    const modifiers = line.modifierLabels.length
      ? `\n      • ${line.modifierLabels.join(", ")}`
      : "";
    return `  ${line.quantity}x ${line.name}${variant} — ${formatPrice(
      line.lineTotalCents,
    )}${modifiers}`;
  });

  const rows: (string | null)[] = [
    `POROSI E RE: ${orderNumber} · ${modeLabel}`,
    "",
    `👤 Emri: ${customer.fullName}`,
    `📞 Telefoni: ${customer.phoneE164} (${customer.phoneRaw.trim()})`,
    mode === "delivery"
      ? `📍 Adresa: ${customer.address}`
      : `🏬 Marrje në lokal: ${getFormattedAddress()}`,
    "",
    "🧾 Porosia:",
    ...itemLines,
    "",
    `Nënshuma: ${formatPrice(pricing.subtotalCents)}`,
    `Dorëzimi: ${
      pricing.deliveryFeeCents === 0 ? "Falas" : formatPrice(pricing.deliveryFeeCents)
    }`,
    `TOTALI: ${formatPrice(pricing.totalCents)}`,
    customer.notes.trim() ? "" : null,
    customer.notes.trim() ? `📝 Shënime: ${customer.notes.trim()}` : null,
    "",
    `⏱ Koha e pritshme: ${receipt.etaLabel}`,
    "☎️ Konfirmo porosinë me telefon.",
  ];

  const body = rows.filter((row): row is string => row !== null).join("\n");

  const customerTel = telHref(customer.phoneE164 || customer.phoneRaw);

  // ntfy action buttons: `action, label, url, [clear=true]`, joined with ";".
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    customer.address || getFormattedAddress(),
  )}`;

  const actions = [
    `view, Telefono Klientin, ${customerTel}, clear=true`,
    `view, Harta, ${mapsUrl}`,
  ].join("; ");

  return {
    title: toHeaderSafe(
      `POROSI E RE ${orderNumber} - ${formatPriceMachine(pricing.totalCents)} EUR - ${customer.phoneE164}`,
    ),
    body,
    priority: Number.isFinite(NTFY_PRIORITY) ? NTFY_PRIORITY : 5,
    tags: toHeaderSafe(NTFY_TAGS),
    click: customerTel,
    actions: toHeaderSafe(actions),
  };
}

export interface DispatchResult {
  delivered: boolean;
  /** Albanian explanation shown in the UI when `delivered` is false. */
  note: string;
}

/**
 * POST the notification to ntfy.sh.
 *
 * Never throws: an order must never be lost because a push failed. The caller
 * surfaces `delivered: false` and the UI shows the "call the store now" fallback
 * CTA instead.
 */
export async function dispatchOrderNotification(
  receipt: OrderReceipt,
): Promise<DispatchResult> {
  const payload = buildOrderNotification(receipt);
  const topic = NTFY_TOPIC.trim();

  if (!topic) {
    console.info(
      `[ntfy] NTFY_TOPIC nuk është konfiguruar — njoftimi nuk u dërgua (${receipt.orderNumber}).`,
    );
    return {
      delivered: false,
      note: "Njoftimi push nuk është aktivizuar. Porosia nuk iu dërgua pikës — të lutem telefono për të porositur.",
    };
  }

  try {
    const response = await fetch(`${NTFY_SERVER}/${encodeURIComponent(topic)}`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        Title: payload.title,
        Priority: String(payload.priority),
        Tags: payload.tags,
        Click: payload.click,
        Actions: payload.actions,
        ...(NTFY_TOKEN ? { Authorization: `Bearer ${NTFY_TOKEN}` } : {}),
      },
      body: payload.body,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        `[ntfy] Dërgimi dështoi (${response.status}): ${detail.slice(0, 200)}`,
      );
      return {
        delivered: false,
        note: `Njoftimi push dështoi (status ${response.status}). Telefono pikën për konfirmim.`,
      };
    }

    return { delivered: true, note: "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "gabim i panjohur";
    console.error(`[ntfy] Gabim rrjeti: ${message}`);
    return {
      delivered: false,
      note: "Nuk mundëm të konfirmojmë dërgimin e njoftimit. Telefono pikën për të verifikuar porosinë.",
    };
  }
}

/** Exposed for diagnostics (`/api/health`). */
export function getNotificationConfig() {
  return {
    server: NTFY_SERVER,
    topicConfigured: isNotificationConfigured(),
    priority: NTFY_PRIORITY,
    storePhone: RESTAURANT.phoneE164,
  };
}
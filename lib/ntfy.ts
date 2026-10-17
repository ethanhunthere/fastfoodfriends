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
import { formatPrice } from "./format";
import { telHref } from "./phone";
import { RESTAURANT, getFormattedAddress } from "./restaurant";
import type { OrderReceipt } from "../types/order";

const NTFY_SERVER = (process.env.NTFY_SERVER ?? "https://ntfy.sh").replace(/\/+$/, "");
const NTFY_TOPIC = process.env.NTFY_TOPIC ?? "";
const NTFY_TOKEN = process.env.NTFY_TOKEN ?? "";
const NTFY_PRIORITY = 5; // Always urgent for incoming orders.
const NTFY_TAGS = process.env.NTFY_TAGS ?? "";
const REQUEST_TIMEOUT_MS = Number(process.env.NTFY_TIMEOUT_MS ?? "8000");

export interface NtfyAction {
  action: "view";
  label: string;
  url: string;
  clear?: boolean;
}

export interface NtfyPayload {
  title: string;
  message: string;
  body: string;
  priority: number;
  tags?: string[];
  markdown: boolean;
  actions: NtfyAction[];
}

export function isNotificationConfigured(): boolean {
  return NTFY_TOPIC.trim().length > 0;
}

/**
 * Build the notification content for an order.
 * Kept separate from the transport so it can be unit-tested and reused.
 */
export function buildOrderNotification(receipt: OrderReceipt): NtfyPayload {
  const { customer, pricing, lines, mode, orderNumber } = receipt;

  const modeTitle = mode === "delivery" ? "Dërgesë në Adresë" : "Marrje në Lokal";
  const customerTel = telHref(customer.phoneE164 || customer.phoneRaw);
  const prettyPhone = customer.phoneRaw.trim();
  const phoneDisplay =
    prettyPhone && prettyPhone !== customer.phoneE164
      ? `${prettyPhone} (${customer.phoneE164})`
      : customer.phoneE164 || prettyPhone;

  const itemBlocks = lines
    .map((line) => {
      const variant = line.variantLabel ? ` (${line.variantLabel})` : "";
      const modifiers = line.modifierLabels.length
        ? `\n   (${line.modifierLabels.join(", ")})`
        : "";
      return `${line.quantity}x ${line.name}${variant} — ${formatPrice(
        line.lineTotalCents,
      )}${modifiers}`;
    })
    .join("\n\n");

  const rows: (string | null)[] = [
    `POROSI E RE: #${orderNumber}`,
    `Lloji: ${modeTitle}`,
    "",
    "KLIENTI",
    `Emri: ${customer.fullName}`,
    `Telefoni: ${phoneDisplay}`,
    mode === "delivery"
      ? `Adresa: ${customer.address}`
      : `Marrje në lokal: ${RESTAURANT.name}`,
    customer.notes.trim() ? `Shënime: ${customer.notes.trim()}` : null,
    "",
    "ARTIKUJT:",
    itemBlocks,
    "",
    `TOTALI: ${formatPrice(pricing.totalCents)}`,
    "",
    `Koha e përafërt: ${receipt.etaLabel}`,
  ];

  const message = rows.filter((row): row is string => row !== null).join("\n");

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    customer.address || getFormattedAddress(),
  )}`;

  const actions: NtfyAction[] = [
    {
      action: "view",
      label: `Telefono: ${prettyPhone || customer.phoneE164}`,
      url: customerTel,
      clear: false,
    },
  ];

  if (mode === "delivery" && customer.address.trim()) {
    actions.push({
      action: "view",
      label: "Hap Hartën",
      url: mapsUrl,
      clear: false,
    });
  }

  const tagsList = NTFY_TAGS.trim()
    ? NTFY_TAGS.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return {
    title: `Porosi e Re: #${orderNumber} (${formatPrice(pricing.totalCents)})`,
    message,
    body: message,
    priority: Number.isFinite(NTFY_PRIORITY) ? NTFY_PRIORITY : 5,
    tags: tagsList,
    markdown: false,
    actions,
  };
}

export interface DispatchResult {
  delivered: boolean;
  /** Albanian explanation shown in the UI when `delivered` is false. */
  note: string;
}

/**
 * POST the notification to ntfy.sh using the clean JSON publishing API.
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
    const response = await fetch(NTFY_SERVER, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...(NTFY_TOKEN ? { Authorization: `Bearer ${NTFY_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        topic,
        title: payload.title,
        message: payload.message,
        priority: payload.priority,
        markdown: payload.markdown,
        ...(payload.tags && payload.tags.length > 0 ? { tags: payload.tags } : {}),
        actions: payload.actions,
      }),
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
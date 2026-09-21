"use server";

/**
 * Order submission — Next.js Server Action.
 *
 * Flow:
 *   1. Validate every field on the server (never trust the browser).
 *   2. Re-resolve each cart line against `lib/menu.ts` and recompute the total.
 *   3. Push an urgent, action-tagged notification to ntfy.sh.
 *   4. Return a serialisable state object to `useActionState` on the client.
 */
import { revalidatePath } from "next/cache";
import { calculateTotals, parseCartPayload } from "@/lib/cart";
import { createOrderNumber, formatEtaRange } from "@/lib/format";
import { getItemById, resolveLine } from "@/lib/menu";
import { dispatchOrderNotification } from "@/lib/ntfy";
import { prettyPhone, validateKosovoMobile } from "@/lib/phone";
import { ORDER_CONFIG } from "@/lib/restaurant";
import {
  CART_PAYLOAD_FIELD,
  INITIAL_ORDER_STATE,
  type OrderFieldErrors,
  type OrderFormState,
  type OrderLine,
  type OrderMode,
  type OrderReceipt,
} from "@/types/order";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readMode(formData: FormData): OrderMode {
  return readField(formData, "mode") === "pickup" ? "pickup" : "delivery";
}

export async function submitOrder(
  previousState: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  void previousState;

  const mode = readMode(formData);
  const fullName = readField(formData, "fullName");
  const phoneRaw = readField(formData, "phone");
  const address = readField(formData, "address");
  const notes = readField(formData, "notes");
  const cartPayload = readField(formData, CART_PAYLOAD_FIELD);

  const values: OrderFormState["values"] = {
    fullName,
    phone: phoneRaw,
    address,
    notes,
    mode,
  };

  const fieldErrors: OrderFieldErrors = {};

  /* ------------------------------------------------------------------ *
   *  1. Field validation
   * ------------------------------------------------------------------ */
  if (fullName.length < 2) {
    fieldErrors.fullName = "Shkruaj emrin dhe mbiemrin (min. 2 karaktere).";
  } else if (fullName.length > ORDER_CONFIG.maxNameLength) {
    fieldErrors.fullName = `Emri është shumë i gjatë (max. ${ORDER_CONFIG.maxNameLength} karaktere).`;
  }

  const phone = validateKosovoMobile(phoneRaw);
  if (!phone.ok) {
    fieldErrors.phone = phone.error;
  }

  if (mode === "delivery") {
    if (address.length < 6) {
      fieldErrors.address =
        "Shkruaj adresën e saktë (rruga, numri, kati/hyrja) që dorëzuesi të të gjejë shpejt.";
    } else if (address.length > ORDER_CONFIG.maxAddressLength) {
      fieldErrors.address = `Adresa është shumë e gjatë (max. ${ORDER_CONFIG.maxAddressLength} karaktere).`;
    }
  }

  if (notes.length > ORDER_CONFIG.maxNotesLength) {
    fieldErrors.notes = `Shënimet janë shumë të gjata (max. ${ORDER_CONFIG.maxNotesLength} karaktere).`;
  }

  /* ------------------------------------------------------------------ *
   *  2. Cart re-pricing against the server-side menu
   * ------------------------------------------------------------------ */
  const parsedLines = parseCartPayload(cartPayload);
  const lines: OrderLine[] = [];

  for (const input of parsedLines) {
    const item = getItemById(input.itemId);
    if (!item) continue; // unknown or removed item — silently dropped

    const resolved = resolveLine(item, input.variantId, input.modifierIds);
    if (!resolved) continue; // sold out or invalid variant

    lines.push({
      itemId: resolved.itemId,
      slug: resolved.slug,
      name: resolved.name,
      variantLabel: resolved.variant?.label ?? null,
      modifierLabels: resolved.modifiers.map((modifier) => modifier.label),
      quantity: input.quantity,
      unitPriceCents: resolved.unitPriceCents,
      lineTotalCents: resolved.unitPriceCents * input.quantity,
    });
  }

  if (lines.length === 0) {
    fieldErrors.items = "Shporta është bosh. Zgjidh të paktën një artikull nga menuja.";
  }

  const pricing = calculateTotals(
    lines.map((line) => ({
      unitPriceCents: line.unitPriceCents,
      quantity: line.quantity,
    })),
    mode,
  );

  if (
    lines.length > 0 &&
    mode === "delivery" &&
    pricing.subtotalCents < ORDER_CONFIG.minimumOrderCents
  ) {
    const minimum = (ORDER_CONFIG.minimumOrderCents / 100)
      .toFixed(2)
      .replace(".", ",");
    fieldErrors.items = `Porosia minimale për dorëzim është ${minimum} €. Shto edhe një artikull ose zgjidh "Marrje në lokal".`;
  }

  /* ------------------------------------------------------------------ *
   *  3. Fail fast — never ping ntfy.sh for an invalid order
   * ------------------------------------------------------------------ */
  if (Object.keys(fieldErrors).length > 0) {
    return {
      ...INITIAL_ORDER_STATE,
      status: "error",
      fieldErrors,
      formError: "Kontrollo fushat e shënuara dhe provo përsëri.",
      values,
    };
  }

  const receipt: OrderReceipt = {
    orderNumber: createOrderNumber(),
    receivedAtIso: new Date().toISOString(),
    mode,
    lines,
    pricing,
    customer: {
      fullName,
      phoneRaw: prettyPhone(phoneRaw),
      phoneE164: phone.e164,
      address: mode === "delivery" ? address : "",
      notes,
    },
    etaLabel: formatEtaRange(
      ORDER_CONFIG.etaMinutes.min,
      ORDER_CONFIG.etaMinutes.max,
    ),
  };

  /* ------------------------------------------------------------------ *
   *  4. Notify the manager's device (urgent + click-to-dial actions)
   * ------------------------------------------------------------------ */
  const notification = await dispatchOrderNotification(receipt);

  // No durable order store exists: only acknowledge an accepted notification.
  // Preserve the basket and customer fields if transport fails.
  if (!notification.delivered) {
    return {
      ...INITIAL_ORDER_STATE,
      status: "error",
      formError: notification.note,
      notificationNote: notification.note,
      values,
    };
  }

  // Keeps the thank-you route fresh if it is ever cached.
  revalidatePath("/faleminderit");

  return {
    status: "success",
    fieldErrors: {},
    formError: "",
    orderNumber: receipt.orderNumber,
    totalCents: receipt.pricing.totalCents,
    notificationDelivered: notification.delivered,
    notificationNote: notification.note,
    values: {
      fullName: "",
      phone: "",
      address: "",
      notes: "",
      mode,
    },
  };
}
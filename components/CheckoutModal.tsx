"use client";

/**
 * Checkout modal — the Direct Call-to-Confirm flow.
 *
 * The form posts to the `submitOrder` Server Action via `useActionState`
 * (React 19), so there is no API route, no fetch plumbing and no client-side
 * price maths: the hidden `cartPayload` field carries only item ids and the
 * server resolves everything else.
 */
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import {
  CircleCheckBig,
  LoaderCircle,
  MapPin,
  Navigation,
  NotebookPen,
  Phone,
  Store,
  TriangleAlert,
  User,
} from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { Modal } from "@/components/Modal";
import { UpsellSuggestions } from "@/components/UpsellSuggestions";
import { getUpsellGroups } from "@/lib/upsell";
import { submitOrder } from "@/lib/actions/order";
import { describeCartLine, serialiseCartPayload } from "@/lib/cart";
import { estimateQuickEta } from "@/lib/eta";
import { formatOrderTime, formatPrice, stripTimeSuffix } from "@/lib/format";
import { validateKosovoMobile } from "@/lib/phone";
import { MAPS_URL, ORDER_CONFIG, RESTAURANT, getRestaurantPhoneHref } from "@/lib/restaurant";
import {
  CART_PAYLOAD_FIELD,
  INITIAL_ORDER_STATE,
  type CartLine,
  type OrderFormState,
  type OrderMode,
} from "@/types/order";

export const CART_FORM_ID = "checkout-form";

export function CheckoutModal() {
  const { isCheckoutOpen, closeCheckout } = useCart();
  // Mount only when opened: recommendations snapshot the current basket, not
  // the empty pre-hydration cart. One dialog owns focus throughout both steps.
  if (!isCheckoutOpen) return null;
  return <CheckoutSession open onClose={closeCheckout} />;
}

function CheckoutSession({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lines, totalsFor, clearCart } = useCart();
  const [groups] = useState(() => getUpsellGroups(lines));
  const [step, setStep] = useState<"extras" | "details">(() => groups.length ? "extras" : "details");
  const showUpsell = step === "extras";
  const detailsHeading = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (open && step === "details") {
      const resetScroll = () => {
        const modalContent = detailsHeading.current?.closest(".modal-content") || document.querySelector(".modal-content");
        if (modalContent) modalContent.scrollTop = 0;
        const dialog = detailsHeading.current?.closest(".express-dialog") || document.querySelector(".express-dialog");
        if (dialog) dialog.scrollTop = 0;
      };
      resetScroll();
      const rId = requestAnimationFrame(resetScroll);
      const timer = setTimeout(resetScroll, 60);
      return () => {
        cancelAnimationFrame(rId);
        clearTimeout(timer);
      };
    }
  }, [step, open]);
  const [mode, setMode] = useState<OrderMode>("delivery");
  const [phoneValue, setPhoneValue] = useState("");
  const cleared = useRef(false);

  const [state, formAction, isPending] = useActionState<OrderFormState, FormData>(
    submitOrder,
    INITIAL_ORDER_STATE,
  );

  const totals = totalsFor(mode);
  const phoneHint = validateKosovoMobile(phoneValue);

  /* Empty the basket exactly once and persist active order after a successful server round-trip. */
  useEffect(() => {
    if (state.status === "success" && state.orderNumber) {
      if (!cleared.current) {
        cleared.current = true;
        clearCart();
        const orderedAt = stripTimeSuffix(
          state.orderedAtTime || formatOrderTime(new Date()),
        );
        const eta = state.etaMinutes || "10–20 min";
        try {
          window.localStorage.setItem(
            "fff_active_order",
            JSON.stringify({
              code: state.orderNumber,
              time: orderedAt,
              eta,
              clockTarget: state.etaClockTarget,
              totalCents: state.totalCents,
              timestamp: Date.now(),
            }),
          );
          window.dispatchEvent(new Event("fff_order_placed"));
        } catch {
          // storage disabled or quota full
        }
      }
      return;
    }
    cleared.current = false;
  }, [
    state.status,
    state.orderNumber,
    state.orderedAtTime,
    state.etaMinutes,
    state.etaClockTarget,
    state.totalCents,
    clearCart,
  ]);

  const isSuccess = state.status === "success";

  return (
    <Modal
      open={open}
      onClose={isPending ? () => {} : onClose}
      title={isSuccess ? "Porosia u pranua!" : showUpsell ? "Dëshiron të shtosh ndonjë gjë tjetër?" : "Të dhënat e porosisë"}
      titleId="checkout-title"
      variant="center"
      footer={
        showUpsell ? (
          <div className="upsell-footer">
            <div><span>Nënshuma · {totals.itemCount} artikuj</span><strong className="tnum">{formatPrice(totals.subtotalCents)}</strong></div>
            <p>Dorëzimi llogaritet në hapin tjetër. Shtesat janë opsionale.</p>
            <button type="button" className="express-primary" onClick={() => setStep("details")}>Vazhdo te Pagesa</button>
          </div>
        ) : isSuccess ? (
          state.notificationDelivered ? (
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-12 w-full items-center justify-center rounded-md border border-charcoal-700 px-5 font-semibold text-cream-100 transition-colors hover:border-flame-500 hover:text-flame-700"
            >
              Mbyll
            </button>
          ) : (
            <a
              href={getRestaurantPhoneHref()}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-flame-500 px-5 font-semibold text-cream-50 transition-colors hover:bg-flame-700"
            >
              <Phone aria-hidden="true" className="h-4.5 w-4.5" />
              Telefono {RESTAURANT.phoneE164}
            </a>
          )
        ) : (
          <div className="express-checkout-footer">
            <p className="express-fee">{mode === "pickup" ? "Marrje në lokal · pa tarifë" : `Dorëzimi: ${formatPrice(totals.deliveryFeeCents)}`} · Pagesa në pranim</p>
            <button type="submit" form={CART_FORM_ID} disabled={isPending} className="express-primary">
              {isPending ? <><LoaderCircle size={18} className="animate-spin" aria-hidden="true" />Duke dërguar…</> : <>Konfirmo Porosinë <span className="tnum">{formatPrice(totals.totalCents)}</span></>}
            </button>
          </div>
        )
      }
    >
      {showUpsell ? (
        <UpsellSuggestions groups={groups} />
      ) : isSuccess ? (
        <SuccessPanel state={state} />
      ) : (
        <>
        <p ref={detailsHeading} tabIndex={-1} className="upsell-details-heading">Ku ta sjellim porosinë?</p>
        <CheckoutForm
          formAction={formAction}
          state={state}
          mode={mode}
          onModeChange={setMode}
          totals={totals}
          serialisedCart={serialiseCartPayload(lines)}
          lines={lines}
          phoneValue={phoneValue}
          onPhoneChange={setPhoneValue}
          phoneHint={phoneHint}
        />
        </>
      )}
        </Modal>
  );
}

interface CheckoutFormProps {
  formAction: (payload: FormData) => void;
  state: OrderFormState;
  mode: OrderMode;
  onModeChange: (mode: OrderMode) => void;
  totals: ReturnType<ReturnType<typeof useCart>["totalsFor"]>;
  serialisedCart: string;
  lines: CartLine[];
  phoneValue: string;
  onPhoneChange: (value: string) => void;
  phoneHint: ReturnType<typeof validateKosovoMobile>;
}

function CheckoutForm({
  formAction,
  state,
  mode,
  onModeChange,
  totals,
  serialisedCart,
  lines,
  phoneValue,
  onPhoneChange,
  phoneHint,
}: CheckoutFormProps) {
  const errors = state.fieldErrors;
  const [addressValue, setAddressValue] = useState(state.values.address);

  const quickEta = estimateQuickEta(
    mode,
    addressValue,
    lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
  );

  return (
    <form id={CART_FORM_ID} action={formAction} className="express-checkout-form" noValidate>
      {/* Only item ids + quantities travel to the server; prices are recomputed there. */}
      <input type="hidden" name={CART_PAYLOAD_FIELD} value={serialisedCart} />
      <input type="hidden" name="mode" value={mode} />

      {/* Order summary — mirrors what the Server Action will re-price. */}
      <section
        aria-label="Përmbledhja e porosisë"
        className="express-order-summary"
      >
        <ul className="space-y-1.5 text-sm">
          {lines.map((line) => (
            <li key={line.key} className="flex items-center justify-between gap-3">
              <span className="min-w-0 font-bold text-cream-50">
                <span className="tnum font-black text-flame-700">{line.quantity}×</span>{" "}
                {describeCartLine(line)}
              </span>
              <span className="tnum shrink-0 font-extrabold text-cream-100">
                {formatPrice(line.unitPriceCents * line.quantity)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {state.formError ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border-2 border-flame-600 bg-flame-500/10 px-3 py-2 text-sm font-bold text-flame-600"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {state.formError}
        </p>
      ) : null}

      <fieldset>
        <legend className="mb-2 text-sm font-bold text-cream-50 uppercase tracking-wide">
          Si e dëshiron porosinë?
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <ModeOption
            value="delivery"
            checked={mode === "delivery"}
            onChange={onModeChange}
            icon={<MapPin aria-hidden="true" className="h-4 w-4 text-flame-700" />}
            label="Dorëzim në adresë"
            hint={
              totals.deliveryFeeCents === 0
                ? "Dorëzim falas"
                : `${formatPrice(ORDER_CONFIG.deliveryFeeCents)} dorëzimi`
            }
          />
          <ModeOption
            value="pickup"
            checked={mode === "pickup"}
            onChange={onModeChange}
            icon={<Store aria-hidden="true" className="h-4 w-4 text-flame-700" />}
            label="Marrje në lokal"
            hint="Pa tarifë dorëzimi"
          />
        </div>
      </fieldset>

      <Field
        id="fullName"
        label="Emri dhe Mbiemri"
        icon={<User aria-hidden="true" className="h-4 w-4 text-flame-700" />}
        error={errors.fullName}
        required
      >
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          autoComplete="name"
          enterKeyHint="next"
          defaultValue={state.values.fullName}
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? "fullName-error" : undefined}
          placeholder="P.sh. Ardit Krasniqi"
          className={inputClass(Boolean(errors.fullName))}
        />
      </Field>

      <Field
        id="phone"
        label="Numri i Telefonit"
        icon={<Phone aria-hidden="true" className="h-4 w-4 text-flame-700" />}
        hint="044 · 045 · 049 · 043 · 048"
        error={errors.phone}
        required
      >
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          enterKeyHint="next"
          value={phoneValue}
          onChange={(event) => onPhoneChange(event.target.value)}
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={[
            "phone-hint",
            errors.phone ? "phone-error" : "",
            phoneValue && phoneHint.ok ? "phone-ok" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          placeholder="044 123 456"
          className={`${inputClass(Boolean(errors.phone))} tnum`}
        />
        {phoneValue && phoneHint.ok ? (
          <p id="phone-ok" className="mt-1.5 text-xs text-open-400">
            Numri u verifikua: {phoneHint.pretty} ({phoneHint.e164})
          </p>
        ) : null}
      </Field>

      {mode === "delivery" ? (
        <Field
          id="address"
          label="Adresa e dorëzimit (Rruga / Lagjja)"
          icon={<MapPin aria-hidden="true" className="h-4 w-4 text-flame-700" />}
          hint={`Shkruaj rrugën ose lagjen — p.sh. afër ${RESTAURANT.landmarkShort.toLowerCase()}. Kur të arrijë motori, ju telefonojmë për hyrjen/banesën.`}
          error={errors.address}
          required
        >
          <textarea
            id="address"
            name="address"
            required
            rows={2}
            autoComplete="street-address"
            enterKeyHint="next"
            value={addressValue}
            onChange={(e) => setAddressValue(e.target.value)}
            aria-invalid={Boolean(errors.address)}
            aria-describedby="address-hint address-error"
            placeholder="P.sh. Rruga Mbretëresha Teutë, ose Dardania, afër shkollës…"
            className={`${inputClass(Boolean(errors.address))} resize-y`}
          />
          {/* Live Smart ETA Pill */}
          <div className="mt-2 flex items-center justify-between rounded-lg border border-charcoal-700 bg-charcoal-850 px-3 py-2 text-xs shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-flame-500/15 text-xs" aria-hidden="true">
                🏍️
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold text-cream-50 text-[11px] sm:text-xs">
                  {quickEta.placeName
                    ? `Destinacioni: ${quickEta.placeName}`
                    : "Dërgesë me motor në Pejë"}
                </p>
                <p className="text-[10px] text-cream-200">
                  Zgara: ~{quickEta.prepMinutes} min · Motori: ~{quickEta.rideMinutes} min
                  {quickEta.distanceKm ? ` (${quickEta.distanceKm} km)` : ""}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0 pl-2">
              <span className="block text-[10px] font-semibold text-cream-200">Koha e arritjes</span>
              <span className="tnum font-extrabold text-open-400 text-xs sm:text-sm">
                ~{quickEta.label}
              </span>
            </div>
          </div>
        </Field>
      ) : (
        <div className="rounded-lg border border-charcoal-800 bg-charcoal-850 p-3 text-sm text-cream-200 space-y-2">
          <div className="flex items-start gap-2">
            <Store aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-flame-700" />
            <div>
              <p className="font-bold text-cream-50">
                Marrje në lokal: {RESTAURANT.address.street}, {RESTAURANT.address.city}
              </p>
              <p className="text-xs text-cream-200">
                {RESTAURANT.landmarkShort}. Të telefonojmë kur porosia të jetë gati.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-charcoal-800 pt-2 text-xs">
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-flame-700 underline underline-offset-4"
            >
              Navigo me hartë <Navigation aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
            <div className="text-right">
              <span className="text-cream-200">Gati në lokal për: </span>
              <strong className="tnum font-extrabold text-open-400">~{quickEta.label}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Kitchen notes — always visible, never collapsed. This is where guests
          say what they want or don't want on their food. */}
      <div className="express-notes-panel">
        <Field
          id="notes"
          label="Çka do / nuk do në ushqim?"
          icon={<NotebookPen aria-hidden="true" className="h-4 w-4 text-flame-700" />}
          hint="Shkruaj lirshëm për kuzhinën — p.sh. pa qepë, ekstra majonez, pa pikante."
          error={errors.notes}
        >
          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={ORDER_CONFIG.maxNotesLength}
            enterKeyHint="done"
            defaultValue={state.values.notes}
            aria-invalid={Boolean(errors.notes)}
            aria-describedby="notes-hint notes-error"
            placeholder="P.sh. pa domate, ekstra salcë, pa krip…"
            className={`${inputClass(Boolean(errors.notes))} resize-y`}
          />
        </Field>
      </div>

      {errors.items ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-flame-500/40 bg-flame-500/10 px-3 py-2 text-sm text-flame-300"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {errors.items}
        </p>
      ) : null}
    </form>
  );
}

/** Shared input styling: 44px+ hit area, visible error state, no CLS on focus. */
export function inputClass(hasError: boolean): string {
  return [
    "mt-1 w-full min-h-12 rounded-lg border bg-charcoal-850 px-3.5 py-2.5 text-base text-cream-50",
    "placeholder:text-cream-200/45 transition-colors",
    hasError
      ? "border-flame-500 focus:border-flame-400"
      : "border-charcoal-700 focus:border-flame-500",
  ].join(" ");
}

interface FieldProps {
  id: string;
  label: string;
  icon?: ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

/** Label + hint + error wrapper that wires up `aria-describedby`/`role="alert"`. */
function Field({ id, label, icon, hint, error, required, children }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-center gap-2 text-sm font-bold text-cream-50"
      >
        {icon}
        {label}
        {required ? (
          <span className="text-flame-600 font-extrabold" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="text-xs font-semibold text-cream-100">(opsionale)</span>
        )}
      </label>

      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs font-semibold text-cream-100">
          {hint}
        </p>
      ) : null}

      {children}

      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-bold text-flame-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface ModeOptionProps {
  value: OrderMode;
  checked: boolean;
  onChange: (value: OrderMode) => void;
  icon: ReactNode;
  label: string;
  hint: string;
}

/** Radio card — native `<input type="radio">` so keyboard/AT behaviour is free. */
function ModeOption({ value, checked, onChange, icon, label, hint }: ModeOptionProps) {
  const inputId = `mode-${value}`;

  return (
    <label
      htmlFor={inputId}
      className={`flex min-h-14 cursor-pointer items-center gap-2 sm:gap-3 rounded-lg border px-2.5 sm:px-3.5 py-2.5 transition-colors ${
        checked
          ? "border-flame-500 bg-flame-500/10"
          : "border-charcoal-700 bg-charcoal-850 hover:border-charcoal-600"
      }`}
    >
      <input
        id={inputId}
        type="radio"
        name="mode-ui"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="h-4 w-4 shrink-0 accent-flame-500"
      />
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-cream-50 leading-tight">
          <span className="shrink-0">{icon}</span>
          <span>{label}</span>
        </span>
        <span className="tnum text-[11px] sm:text-xs font-semibold text-cream-100 mt-0.5">{hint}</span>
      </span>
    </label>
  );
}

/** Post-submit confirmation: order code, order time, estimated minutes, total. */
function SuccessPanel({ state }: { state: OrderFormState }) {
  const orderedAt = stripTimeSuffix(
    state.orderedAtTime || formatOrderTime(new Date()),
  );
  const eta = state.etaMinutes || "10–20 min";
  const clockTarget = state.etaClockTarget;
  const breakdown = state.etaBreakdown;

  return (
    <div className="space-y-4">
      {/* Primary Order Status Banner */}
      <div className="overflow-hidden rounded-card border-2 border-open-400 bg-charcoal-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-charcoal-800 bg-open-500/15 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-open-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-open-400"></span>
            </span>
            <p className="font-display text-base sm:text-lg font-bold text-cream-50">
              Porosia u pranua me sukses!
            </p>
          </div>
          <span className="rounded bg-open-400/20 px-2 py-0.5 text-[11px] sm:text-xs font-bold text-open-400 shrink-0">
            Aktiv
          </span>
        </div>

        <div className="grid grid-cols-3 divide-x divide-charcoal-800 p-2.5 sm:p-3.5 text-center">
          <div className="px-1">
            <span className="block text-[11px] sm:text-xs font-semibold text-cream-200">Kodi</span>
            <span className="mt-1 block tnum font-display text-lg sm:text-xl font-black text-flame-700">
              #{state.orderNumber}
            </span>
          </div>
          <div className="px-1">
            <span className="block text-[11px] sm:text-xs font-semibold text-cream-200">Ora e porosisë</span>
            <span className="mt-1 block tnum font-bold text-cream-50 text-sm sm:text-base">
              {orderedAt}
            </span>
          </div>
          <div className="px-1">
            <span className="block text-[11px] sm:text-xs font-semibold text-cream-200">Koha e arritjes</span>
            <span className="mt-1 block tnum font-bold text-open-400 text-sm sm:text-base">
              ~{eta}
            </span>
            {clockTarget ? (
              <span className="mt-0.5 block text-[10px] sm:text-[11px] font-semibold text-cream-200">
                ({clockTarget})
              </span>
            ) : null}
          </div>
        </div>

        {/* Live Delivery Progress Tracker */}
        <div className="border-t border-charcoal-800 bg-charcoal-850/60 p-3 sm:p-3.5 text-left">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg border border-open-500/30 bg-open-500/10 p-2">
              <span className="block text-base mb-0.5">📋</span>
              <strong className="block font-bold text-cream-50 text-[11px] sm:text-xs">U regjistrua</strong>
              <span className="text-[10px] text-open-400 font-semibold">{orderedAt}</span>
            </div>
            <div className="rounded-lg border border-flame-500/40 bg-flame-500/10 p-2 animate-pulse">
              <span className="block text-base mb-0.5">👨‍🍳</span>
              <strong className="block font-bold text-cream-50 text-[11px] sm:text-xs">Në zgarë</strong>
              <span className="text-[10px] text-cream-200 font-medium">
                {breakdown ? `~${breakdown.prepMinutes} min` : "E freskët"}
              </span>
            </div>
            <div className="rounded-lg border border-charcoal-700 bg-charcoal-900/90 p-2">
              <span className="block text-base mb-0.5">🏍️</span>
              <strong className="block font-bold text-cream-100 text-[11px] sm:text-xs">
                {state.values.mode === "pickup" ? "Në lokal" : "Me motor"}
              </strong>
              <span className="text-[10px] text-cream-200 font-medium">
                {state.values.mode === "pickup"
                  ? "Gati"
                  : breakdown
                    ? `~${breakdown.rideMinutes} min`
                    : "Nisja"}
              </span>
            </div>
          </div>
          <p className="mt-2 text-center sm:text-left text-[11px] text-cream-200">
            📞 Motoristi ju merr në telefon sapo të arrijë në adresën tuaj.
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-charcoal-800 bg-charcoal-850 px-4 py-2.5 text-sm">
          <span className="font-bold text-cream-100">Totali për pagesë:</span>
          <span className="tnum font-display text-lg font-black text-cream-50">
            {formatPrice(state.totalCents)}
          </span>
        </div>
      </div>

      {!state.notificationDelivered && state.notificationNote ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-mustard-500/45 bg-flame-500/10 px-3 py-2 text-sm font-bold text-flame-700"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {state.notificationNote}
        </p>
      ) : null}

      <div className="rounded-card border border-charcoal-800 bg-charcoal-850 p-4 text-sm text-cream-100">
        <p className="text-base font-bold text-cream-50">Hapi tjetër</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm font-medium text-cream-100">
          <li>Ju telefonojmë brenda 2 minutave për ta konfirmuar.</li>
          <li>Porosia përgatitet dhe niset për dërgesë.</li>
          <li>Pagesa bëhet me para në dorë (cash).</li>
        </ol>
      </div>
    </div>
  );
}

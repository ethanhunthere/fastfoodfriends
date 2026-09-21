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
import { formatPrice } from "@/lib/format";
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
    if (step === "details") {
      detailsHeading.current?.closest(".modal-content")?.scrollTo({ top: 0 });
      detailsHeading.current?.focus({ preventScroll: true });
    }
  }, [step]);
  const [mode, setMode] = useState<OrderMode>("delivery");
  const [phoneValue, setPhoneValue] = useState("");
  const cleared = useRef(false);

  const [state, formAction, isPending] = useActionState<OrderFormState, FormData>(
    submitOrder,
    INITIAL_ORDER_STATE,
  );

  const totals = totalsFor(mode);
  const phoneHint = validateKosovoMobile(phoneValue);

  /* Empty the basket exactly once, after a successful server round-trip. */
  useEffect(() => {
    if (state.status === "success") {
      if (!cleared.current) {
        cleared.current = true;
        clearCart();
      }
      return;
    }
    cleared.current = false;
  }, [state.status, clearCart]);

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
              <span className="min-w-0 text-cream-100">
                <span className="tnum font-semibold text-flame-700">{line.quantity}×</span>{" "}
                {describeCartLine(line)}
              </span>
              <span className="tnum shrink-0 text-cream-200">
                {formatPrice(line.unitPriceCents * line.quantity)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {state.formError ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-flame-500/40 bg-flame-500/10 px-3 py-2 text-sm text-flame-300"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {state.formError}
        </p>
      ) : null}

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-cream-100">
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
          label="Adresa e saktë / Lagjja"
          icon={<MapPin aria-hidden="true" className="h-4 w-4 text-flame-700" />}
          hint={`Rruga, numri dhe hyrja — p.sh. afër ${RESTAURANT.landmarkShort.toLowerCase()}.`}
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
            defaultValue={state.values.address}
            aria-invalid={Boolean(errors.address)}
            aria-describedby="address-hint address-error"
            placeholder={`P.sh. Rr. Fadil Hoxha, hyrja B, kati 2, afër ${RESTAURANT.landmarkShort.toLowerCase()}`}
            className={`${inputClass(Boolean(errors.address))} resize-y`}
          />
        </Field>
      ) : (
        <p className="rounded-lg border border-charcoal-800 bg-charcoal-850 px-3 py-2.5 text-sm text-cream-200">
          <Store aria-hidden="true" className="mr-2 inline h-4 w-4 text-flame-700" />
          Marrje në lokal: {RESTAURANT.address.street}, {RESTAURANT.address.city} —{" "}
          {RESTAURANT.landmarkShort}. Të telefonojmë kur porosia të jetë gati.{" "}
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-flame-700 underline underline-offset-4"
          >
            Navigo <Navigation aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        </p>
      )}

      <details className="express-notes" open={errors.notes ? true : undefined}>
        <summary>+ Shënime Shtesë <span>opsionale</span></summary>
      <Field
        id="notes"
        label="Shënime Shtesë"
        icon={<NotebookPen aria-hidden="true" className="h-4 w-4 text-flame-700" />}
        hint="P.sh. kodi i hyrjes, pa krip, ndaj porosinë në dy pjata…"
        error={errors.notes}
      >
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={ORDER_CONFIG.maxNotesLength}
          enterKeyHint="done"
          defaultValue={state.values.notes}
          aria-invalid={Boolean(errors.notes)}
          aria-describedby="notes-hint notes-error"
          placeholder="Shënime për kuzhinën ose dorëzuesin"
          className={`${inputClass(Boolean(errors.notes))} resize-y`}
        />
      </Field>

      </details>

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
        className="flex items-center gap-2 text-sm font-semibold text-cream-100"
      >
        {icon}
        {label}
        {required ? (
          <span className="text-flame-300" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="text-xs font-normal text-cream-200">(opsionale)</span>
        )}
      </label>

      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-cream-200">
          {hint}
        </p>
      ) : null}

      {children}

      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-flame-300">
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
      className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-colors ${
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
        className="h-4 w-4 accent-flame-500"
      />
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-2 text-sm font-semibold text-cream-50">
          {icon}
          {label}
        </span>
        <span className="tnum text-xs text-cream-200">{hint}</span>
      </span>
    </label>
  );
}

/** Post-submit confirmation: order number, total and the push-delivery status. */
function SuccessPanel({ state }: { state: OrderFormState }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-card border border-open-500/40 bg-open-500/10 p-4">
        <CircleCheckBig aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-open-400" />
        <div>
          <p className="font-display text-lg font-semibold text-cream-50">
            Porosia u pranua me sukses!
          </p>
          <p className="mt-1 text-sm text-cream-200">
            Ju telefonojmë brenda 2 minutave për ta konfirmuar.
          </p>
        </div>
      </div>

      <dl className="rounded-card border border-charcoal-800 bg-charcoal-850 p-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-cream-200">Numri i porosisë</dt>
          <dd className="tnum font-display text-base font-bold text-flame-700">
            {state.orderNumber}
          </dd>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <dt className="text-cream-200">Totali</dt>
          <dd className="tnum text-cream-50">{formatPrice(state.totalCents)}</dd>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <dt className="text-cream-200">Njoftimi push</dt>
          <dd className={state.notificationDelivered ? "text-open-400" : "text-flame-700"}>
            {state.notificationDelivered ? "U dërgua" : "Nuk u konfirmua"}
          </dd>
        </div>
      </dl>

      {!state.notificationDelivered && state.notificationNote ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-mustard-500/45 bg-flame-500/10 px-3 py-2 text-sm text-flame-700"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {state.notificationNote}
        </p>
      ) : null}

      <div className="rounded-card border border-charcoal-800 bg-charcoal-850 p-4 text-sm text-cream-200">
        <p className="font-medium text-cream-100">Hapi tjetër</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Telefonojmë numrin që dhatë për të konfirmuar adresën dhe kohën.</li>
          <li>Porosia përgatitet dhe niset brenda {RESTAURANT.address.city}.</li>
          <li>Pagesa bëhet cash ose me kartelë në dorëzim.</li>
              </ol>
      </div>
    </div>
  );
}

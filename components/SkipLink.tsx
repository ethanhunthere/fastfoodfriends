/**
 * Skip link — the first interactive element in the DOM so keyboard users can
 * bypass the repeated nav and jump straight to the main content.
 */
export function SkipLink({ target = "#permbajtja", label = "Kalo te permbajtja" }: {
  target?: string;
  label?: string;
}) {
  return (
    <a
      href={target}
      className="sr-only focus:not-sr-only fixed top-3 left-3 z-[100] rounded-md bg-flame-500 px-4 py-2 text-sm font-semibold text-charcoal-900 focus:outline-2 focus:outline-offset-2"
    >
      {label}
    </a>
  );
}
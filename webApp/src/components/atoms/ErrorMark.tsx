/** El error no se dice sólo con color: el signo acompaña al texto. */
export default function ErrorMark() {
  return (
    <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 flex-none" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.5v4M8 11v.01" />
    </svg>
  );
}

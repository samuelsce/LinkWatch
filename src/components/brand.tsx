import localFont from "next/font/local";

const wordmark = localFont({
  src: "../assets/fonts/bricolage-linkwatch.woff2",
  weight: "750",
  style: "normal",
  display: "swap",
  fallback: ["Arial"],
});

export function Brand() {
  return <span className="brand">
    <svg className="brand-mark" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <path d="M22 20l6-6a6 6 0 0 0-8-8l-6 6M14 16l-6 6a6 6 0 0 0 8 8l6-6M13.5 23.5l10-10" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span className={`brand-wordmark ${wordmark.className}`}>LinkWatch</span>
  </span>;
}

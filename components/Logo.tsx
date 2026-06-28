import { cn } from "@/lib/utils";

export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn("shrink-0", className)}
      aria-label="Aegis"
    >
      <defs>
        <linearGradient id="aegis-g" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <path
        d="M24 3.5 7 9.2v13.1c0 10.4 7.1 18.9 17 22.2 9.9-3.3 17-11.8 17-22.2V9.2L24 3.5Z"
        fill="url(#aegis-g)"
        fillOpacity="0.16"
        stroke="url(#aegis-g)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* prism split */}
      <path d="M24 11 13 36h4.4L24 19.2 30.6 36H35L24 11Z" fill="url(#aegis-g)" />
      <path d="M24 22v9" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Logo size={26} />
      <span className="font-display text-[17px] font-semibold tracking-tight">
        Aegis
      </span>
    </div>
  );
}

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Coins, Star, Trophy } from "lucide-react";
import { cn } from "@/utils/cn";
import type { ScoreEntry } from "@/game/storage";
import { fmtTime } from "@/game/storage";

/* --------------------------------------------------------------- tween */
export function useTween(target: number, speed = 10) {
  const [v, setV] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const d = target - cur.current;
      if (Math.abs(d) < 0.75) {
        cur.current = target;
        setV(target);
        return;
      }
      cur.current += d * Math.min(1, dt * speed);
      setV(Math.round(cur.current));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, speed]);
  return v;
}

/* -------------------------------------------------------------- buttons */
export function Button({
  children,
  onClick,
  tone = "gold",
  size = "md",
  className,
  icon,
  hint,
  type = "button",
}: {
  children: ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  tone?: "gold" | "red" | "teal" | "ghost" | "green";
  size?: "lg" | "md" | "sm";
  className?: string;
  icon?: ReactNode;
  hint?: string;
}) {
  const tones: Record<string, string> = {
    gold: "bg-coin text-[#40280a] border-[#8a5b00] shadow-[0_6px_0_#8a5b00]",
    red: "bg-cherry text-white border-[#8a1424] shadow-[0_6px_0_#8a1424]",
    green: "bg-pipe text-[#04321f] border-[#0c7a4c] shadow-[0_6px_0_#0c7a4c]",
    teal: "bg-[#1d5d7f] text-cream border-[#0a2334] shadow-[0_6px_0_#0a2334]",
    ghost: "bg-[#0e2c3e]/70 text-cream border-white/15 shadow-[0_5px_0_rgba(4,20,32,.6)]",
  };
  const sizes: Record<string, string> = {
    lg: "px-7 py-3.5 text-xl md:text-2xl gap-3 rounded-2xl",
    md: "px-5 py-2.5 text-base md:text-lg gap-2 rounded-xl",
    sm: "px-3 py-1.5 text-xs gap-1.5 rounded-lg",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "btn-3d font-display inline-flex select-none items-center justify-center border-2 tracking-wide uppercase",
        "active:shadow-[0_1px_0_inset] focus:outline-none focus-visible:ring-3 focus-visible:ring-white/60",
        tones[tone],
        sizes[size],
        className
      )}
    >
      {icon}
      <span>{children}</span>
      {hint && (
        <span className="ml-1 rounded-md bg-black/20 px-1.5 py-0.5 font-body text-[10px] font-black tracking-normal opacity-80">
          {hint}
        </span>
      )}
    </button>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="font-display inline-flex min-w-7 items-center justify-center rounded-lg border-2 border-white/20 bg-[#0a2334] px-2 py-1 text-[11px] leading-none text-cream shadow-[0_3px_0_rgba(0,0,0,.45)]">
      {children}
    </kbd>
  );
}

export function CoinDot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full border-2 border-[#a86b00] bg-gradient-to-br from-[#ffe27a] to-[#f0a800]",
        className ?? "h-4 w-4"
      )}
    />
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("panel rounded-3xl", className)}>{children}</div>;
}

/* --------------------------------------------------------- score table */
export function ScoreTable({
  scores,
  highlight,
  compact,
}: {
  scores: ScoreEntry[];
  highlight?: number;
  compact?: boolean;
}) {
  const medals = ["#ffd34d", "#dfe7ef", "#e8a35f"];
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center gap-2 px-1">
        <Trophy className="h-4 w-4 text-coin" />
        <h3 className="font-display text-sm tracking-widest text-cream/90 uppercase">Local Top {compact ? "" : "Runs"}</h3>
        <div className="ml-auto h-px flex-1 bg-gradient-to-r from-white/25 to-transparent" />
      </div>
      {scores.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-white/15 bg-black/20 px-3 py-6 text-center text-sm text-cream/60">
          No runs logged yet — the board is yours.
        </p>
      ) : (
        <ol className="space-y-1.5">
          {scores.map((s, i) => (
            <li
              key={`${s.date}-${i}`}
              className={cn(
                "grid grid-cols-[26px_1fr_auto] items-center gap-2 rounded-xl border px-2 py-1.5 transition-colors md:gap-3",
                highlight === i
                  ? "border-coin/70 bg-coin/15 shadow-[0_0_0_1px_rgba(255,198,26,.25)]"
                  : "border-white/10 bg-black/25 hover:bg-black/15"
              )}
              style={{ animation: `slide-down 260ms ${i * 45}ms cubic-bezier(.2,1.2,.4,1) both` }}
            >
              <span
                className="font-display text-center text-sm"
                style={{ color: medals[i] ?? "rgba(255,244,220,.5)" }}
              >
                {i + 1}
              </span>
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="font-display truncate text-[13px] tracking-wide text-cream uppercase">{s.name}</span>
                {!compact && (
                  <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-cream/55">
                    <Coins className="h-3 w-3 text-coin" />
                    {s.coins}
                    {s.cleared && <Star className="h-3 w-3 fill-violet-shroom text-violet-shroom" />}
                  </span>
                )}
              </span>
              <span className="text-right">
                <span className="font-display block text-sm text-coin tabular-nums">{s.score.toLocaleString()}</span>
                {!compact && <span className="block text-[10px] font-bold text-cream/45">{fmtTime(s.timeMs)}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

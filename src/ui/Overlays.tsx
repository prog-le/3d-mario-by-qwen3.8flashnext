import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Coins,
  Flag,
  Fingerprint,
  Heart,
  Home,
  Play,
  RotateCcw,
  ScrollText,
  Shuffle,
  Skull,
  Sparkles,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button, Kbd, ScoreTable } from "./bits";
import { fmtTime, type ScoreEntry } from "@/game/storage";
import type { RunResult } from "@/game/engine";
import { cn } from "@/utils/cn";

/* ------------------------------------------------------------------ pause */

export function PauseScreen({
  onResume,
  onRetry,
  onNewCourse,
  onQuit,
  muted,
  onToggleMute,
  score,
  coins,
  progress,
}: {
  onResume: () => void;
  onRetry: () => void;
  onNewCourse: () => void;
  onQuit: () => void;
  muted: boolean;
  onToggleMute: () => void;
  score: number;
  coins: number;
  progress: number;
}) {
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-[#061a28]/70 p-4 backdrop-blur-[3px]">
      <div className="panel anim-pop w-full max-w-md rounded-3xl p-5 md:p-6">
        <div className="flex items-center gap-3">
          <span className="font-display grid h-10 w-10 place-items-center rounded-2xl bg-coin text-[#40280a] shadow-[0_4px_0_#8a5b00]">
            <Play className="h-5 w-5 fill-current" />
          </span>
          <div>
            <h2 className="font-display text-3xl leading-none tracking-wide text-cream">PAUSED</h2>
            <p className="font-body text-[11px] font-black tracking-[0.2em] text-cream/50 uppercase">
              {Math.round(progress * 100)}% of the course done
            </p>
          </div>
          <button
            onClick={onToggleMute}
            className="ml-auto rounded-xl border-2 border-white/15 bg-black/30 p-2 text-cream/75 transition hover:bg-[#123a52]"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border-2 border-white/10 bg-black/30 px-3 py-2">
            <div className="font-body text-[10px] font-black tracking-widest text-cream/45 uppercase">Score</div>
            <div className="font-display text-xl text-coin tabular-nums">{score.toLocaleString()}</div>
          </div>
          <div className="rounded-2xl border-2 border-white/10 bg-black/30 px-3 py-2">
            <div className="font-body text-[10px] font-black tracking-widest text-cream/45 uppercase">Coins</div>
            <div className="font-display flex items-center gap-1.5 text-xl text-cream tabular-nums">
              <Coins className="h-4 w-4 text-coin" />
              {coins}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <Button size="lg" tone="green" onClick={onResume} icon={<Play className="h-5 w-5" />} hint="P">
            Resume
          </Button>
          <div className="grid grid-cols-2 gap-2.5">
            <Button tone="teal" onClick={onRetry} icon={<RotateCcw className="h-4 w-4" />} hint="R">
              Retry course
            </Button>
            <Button tone="teal" onClick={onNewCourse} icon={<Shuffle className="h-4 w-4" />}>
              New course
            </Button>
          </div>
          <Button tone="ghost" size="sm" onClick={onQuit} icon={<ArrowLeft className="h-3.5 w-3.5" />}>
            Quit to menu
          </Button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-dashed border-white/10 pt-3 font-body text-[11px] font-bold text-cream/55">
          <span className="flex items-center gap-1.5">
            <Kbd>A</Kbd>
            <Kbd>W</Kbd>
            <Kbd>S</Kbd>
            <Kbd>D</Kbd> move
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Space</Kbd> jump
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Shift</Kbd> spin
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>C</Kbd> camera
          </span>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- result */

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border-2 border-white/10 bg-black/30 px-3 py-2">
      <span className={cn("shrink-0", tone ?? "text-cream/60")}>{icon}</span>
      <span className="min-w-0">
        <span className="block font-body text-[9.5px] font-black tracking-[0.18em] text-cream/45 uppercase">{label}</span>
        <span className="font-display block truncate text-[15px] text-cream tabular-nums">{value}</span>
      </span>
    </div>
  );
}

export function ResultScreen({
  result,
  scores,
  rank,
  name,
  onName,
  onSubmit,
  onAgain,
  onRetry,
  onMenu,
  submitted,
}: {
  result: RunResult;
  scores: ScoreEntry[];
  rank: number | null;
  name: string;
  onName: (n: string) => void;
  onSubmit: () => void;
  onAgain: () => void;
  onRetry: () => void;
  onMenu: () => void;
  submitted: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tally, setTally] = useState(0);
  const cleared = result.cleared;
  const lines = [
    { label: "Base run", value: result.score - result.clearBonus - result.timeBonus - result.coinBonus },
    ...(cleared ? [{ label: "Course clear", value: result.clearBonus }] : []),
    ...(cleared ? [{ label: "Time bonus", value: result.timeBonus }] : []),
    ...(cleared ? [{ label: "Coin bonus", value: result.coinBonus }] : []),
  ];

  useEffect(() => {
    if (!cleared) {
      setTally(99);
      return;
    }
    setTally(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTally(i);
      if (i >= lines.length) window.clearInterval(id);
    }, 320);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleared]);

  useEffect(() => {
    // don't pop the virtual keyboard over the result screen on touch devices
    if (!submitted && !matchMedia("(pointer: coarse)").matches) inputRef.current?.focus();
  }, [submitted]);

  const newRecord = rank !== null && rank > 0 && rank <= 3 && result.score > 0;

  return (
    <div className="pointer-events-auto absolute inset-0 overflow-y-auto bg-[#061a28]/78 p-3 backdrop-blur-[3px] md:flex md:items-center md:justify-center md:p-6">
      <div className="mx-auto grid w-full max-w-4xl gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="panel anim-pop rounded-3xl p-4 md:p-6">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-2xl shadow-[0_5px_0_rgba(0,0,0,.35)]",
                cleared ? "bg-coin text-[#40280a]" : "bg-cherry text-white"
              )}
            >
              {cleared ? <Flag className="h-6 w-6" /> : <Skull className="h-6 w-6" />}
            </span>
            <div className="min-w-0">
              <h2
                className={cn(
                  "font-display text-4xl leading-none tracking-wide md:text-5xl",
                  cleared ? "text-coin [text-shadow:0_4px_0_#8a5b00]" : "text-cream text-shadow-hard"
                )}
              >
                {cleared ? "COURSE CLEAR!" : "RUN OVER"}
              </h2>
              <p className="font-body mt-1 text-[11px] font-black tracking-[0.2em] text-cream/55 uppercase">
                {cleared
                  ? `Flag grabbed in ${fmtTime(result.timeMs)} · ${result.livesLeft} lives left`
                  : `You made it ${Math.round(result.progress * 100)}% of the way · seed ${result.seedLabel}`}
              </p>
            </div>
            {newRecord && (
              <div className="shine font-display ml-auto hidden shrink-0 rotate-3 rounded-xl border-2 border-[#8a5b00] bg-coin px-2.5 py-1 text-[11px] tracking-widest text-[#40280a] sm:block">
                TOP {rank}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border-2 border-white/12 bg-gradient-to-b from-black/40 to-transparent p-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="font-body text-[10px] font-black tracking-[0.24em] text-cream/45 uppercase">Final score</div>
                <div className="font-display text-5xl leading-none text-coin text-shadow-hard tabular-nums md:text-6xl">
                  {result.score.toLocaleString()}
                </div>
              </div>
              <Trophy className="h-9 w-9 shrink-0 text-coin/70 anim-floaty" />
            </div>
            {cleared && (
              <ul className="mt-3 space-y-1 border-t-2 border-dashed border-white/10 pt-2">
                {lines.map((l, i) => (
                  <li
                    key={l.label}
                    className={cn(
                      "flex justify-between font-body text-[12.5px] font-bold transition-all duration-300",
                      tally > i ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                    )}
                  >
                    <span className="text-cream/60">{l.label}</span>
                    <span className="text-cream tabular-nums">+{Math.max(0, l.value).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat icon={<Coins className="h-4 w-4" />} label="Coins" value={`${result.coins}/${result.coinTotal}`} tone="text-coin" />
            <Stat icon={<Sparkles className="h-4 w-4" />} label="Stomps" value={String(result.kills)} tone="text-pipe" />
            <Stat icon={<Fingerprint className="h-4 w-4" />} label="Best combo" value={`x${Math.max(1, result.maxCombo)}`} />
            <Stat icon={<Timer className="h-4 w-4" />} label="Time" value={fmtTime(result.timeMs)} />
            <Stat icon={<Heart className="h-4 w-4" />} label="Lives left" value={String(result.livesLeft)} tone="text-cherry" />
            <Stat icon={<Fingerprint className="h-4 w-4" />} label="Seed" value={result.seedLabel} />
          </div>

          {!submitted ? (
            <form
              className="mt-4 flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
              }}
            >
              <label className="flex flex-1 items-center gap-2 rounded-2xl border-2 border-white/20 bg-black/40 px-3 py-2 focus-within:border-coin">
                <ScrollText className="h-4 w-4 shrink-0 text-cream/50" />
                <input
                  ref={inputRef}
                  value={name}
                  onChange={(e) => onName(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="NAME FOR THE BOARD"
                  className="font-display w-full min-w-0 bg-transparent text-sm tracking-widest text-cream outline-none placeholder:text-cream/30"
                />
              </label>
              <Button tone="gold" type="submit" icon={<Trophy className="h-4 w-4" />}>
                Log it
              </Button>
            </form>
          ) : (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border-2 border-coin/40 bg-coin/12 px-3 py-2">
              <Trophy className="h-4 w-4 text-coin" />
              <span className="font-body text-[12px] font-black tracking-wide text-cream/85">
                {rank && rank > 0 ? `Saved at local rank #${rank}` : "Saved to the local board"}
              </span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button tone="gold" onClick={onAgain} icon={<Play className="h-4 w-4" />} hint="Enter">
              Run it again
            </Button>
            <Button tone="teal" onClick={onRetry} icon={<RotateCcw className="h-4 w-4" />} hint="R">
              Retry seed
            </Button>
            <Button tone="ghost" onClick={onMenu} icon={<Home className="h-4 w-4" />}>
              Menu
            </Button>
          </div>
        </div>

        <div className="panel anim-pop rounded-3xl p-4 md:p-5" style={{ animationDelay: "90ms" }}>
          <ScoreTable scores={scores} highlight={rank && rank > 0 ? rank - 1 : undefined} />
          <p className="mt-3 border-t-2 border-dashed border-white/10 pt-2.5 font-body text-[11px] font-bold text-cream/50">
            Board lives in this browser only. Every run rolls a new course — chase the cleanest line, not the same one.
          </p>
        </div>
      </div>
    </div>
  );
}

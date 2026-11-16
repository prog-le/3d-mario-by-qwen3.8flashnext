import { ArrowRight, Coins, Flag, Keyboard, RotateCcw, Smartphone, Sparkles, Star, Volume2, VolumeX } from "lucide-react";
import { Button, CoinDot, Kbd, ScoreTable } from "./bits";
import type { ScoreEntry } from "@/game/storage";

export default function StartScreen({
  scores,
  seedLabel,
  onPlay,
  onShuffle,
  muted,
  onToggleMute,
}: {
  scores: ScoreEntry[];
  seedLabel: string;
  onPlay: () => void;
  onShuffle: () => void;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const best = scores[0]?.score ?? 0;
  return (
    <div className="pointer-events-auto absolute inset-0 overflow-y-auto">
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_15%_0%,rgba(9,36,54,.35),rgba(6,26,40,.9))] mix-blend-multiply" />
      <div className="relative mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 rounded-full border-2 border-white/15 bg-[#092334]/80 px-3 py-1.5 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-coin" />
            <span className="font-body text-[11px] font-black tracking-[0.22em] text-cream/75 uppercase">
              Course seed {seedLabel}
            </span>
            <button
              onClick={onShuffle}
              className="ml-1 rounded-full border border-white/20 bg-white/10 p-1 text-cream/80 transition hover:rotate-180 hover:bg-white/20"
              title="Shuffle the course"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
          <button
            onClick={onToggleMute}
            className="rounded-full border-2 border-white/15 bg-[#092334]/80 p-2 text-cream/80 transition hover:bg-[#123a52]"
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 animate-pulse" />}
          </button>
        </header>

        <div className="grid flex-1 items-center gap-6 lg:grid-cols-[1.15fr_.85fr]">
          {/* ---------- title block ---------- */}
          <div className="anim-slide max-w-xl">
            <div className="flex items-center gap-3">
              <span className="font-display bg-cherry px-2.5 py-1 text-xs tracking-[0.3em] text-white shadow-[0_4px_0_#8a1424]">
                3D
              </span>
              <span className="h-[3px] w-10 bg-coin" />
              <span className="font-body text-xs font-black tracking-[0.3em] text-cream/70 uppercase">
                Sixty-frame platformer
              </span>
            </div>
            <h1 className="font-display mt-3 text-[13vw] leading-[0.82] tracking-tight text-cream text-shadow-hard sm:text-6xl md:text-7xl lg:text-[5.4rem]">
              <span className="block">SUPER</span>
              <span className="block text-coin [text-shadow:0_4px_0_#8a5b00,0_0_34px_rgba(255,198,26,.35)]">
                MUSHROOM
              </span>
              <span className="-mt-1 block">SPRINT</span>
            </h1>
            <p className="mt-4 max-w-md font-body text-[15px] leading-relaxed text-cream/80 md:text-base">
              A fresh floating course every run. Bank coins, chain stomps for combo multipliers, jackhammer
              <span className="font-black text-coin"> ? blocks</span> for stars, then dive for the flag before the clock eats
              your bonus.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button size="lg" tone="gold" onClick={onPlay} icon={<ArrowRight className="h-6 w-6" />} hint="Enter">
                Start Run
              </Button>
              <div className="flex items-center gap-2 rounded-2xl border-2 border-white/15 bg-black/35 px-3 py-2">
                <CoinDot className="h-5 w-5 animate-[coin-spin_1.4s_linear_infinite]" />
                <div className="leading-tight">
                  <div className="font-body text-[10px] font-black tracking-widest text-cream/55 uppercase">Best</div>
                  <div className="font-display text-lg text-coin tabular-nums">{best.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* ---------- control guides ---------- */}
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="panel rounded-2xl p-3.5">
                <div className="mb-2.5 flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-pipe" />
                  <span className="font-display text-[11px] tracking-[0.2em] text-cream/80 uppercase">Keyboard</span>
                </div>
                <ul className="space-y-1.5 font-body text-[13px] text-cream/80">
                  <li className="flex items-center gap-2">
                    <span className="flex gap-1">
                      <Kbd>A</Kbd>
                      <Kbd>W</Kbd>
                      <Kbd>S</Kbd>
                      <Kbd>D</Kbd>
                    </span>
                    run / 360° strafe
                  </li>
                  <li className="flex items-center gap-2">
                    <Kbd>Space</Kbd> jump — hold for height
                  </li>
                  <li className="flex items-center gap-2">
                    <Kbd>Shift</Kbd> spin · dive → shockwave
                  </li>
                  <li className="flex items-center gap-2">
                    <Kbd>C</Kbd> first / third person camera
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex gap-1">
                      <Kbd>P</Kbd>
                      <Kbd>R</Kbd>
                    </span>
                    pause · instant retry
                  </li>
                </ul>
              </div>
              <div className="panel rounded-2xl p-3.5">
                <div className="mb-2.5 flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-brick" />
                  <span className="font-display text-[11px] tracking-[0.2em] text-cream/80 uppercase">Touch</span>
                </div>
                <ul className="space-y-1.5 font-body text-[13px] text-cream/80">
                  <li>Left pad = analog run stick</li>
                  <li>Big <span className="font-black text-coin">JUMP</span> button — release early to hop</li>
                  <li>
                    <span className="font-black text-cherry">SPIN</span> mid-air to slam down
                  </li>
                  <li>Pause button lives top-right</li>
                </ul>
              </div>
            </div>
          </div>

          {/* ---------- leaderboard + rules ---------- */}
          <div className="anim-pop flex flex-col gap-4" style={{ animationDelay: "120ms" }}>
            <div className="panel rounded-3xl p-4 md:p-5">
              <ScoreTable scores={scores.slice(0, 6)} />
            </div>
            <div className="panel-light rounded-3xl p-4 text-[#123a52]">
              <h3 className="font-display mb-2 text-sm tracking-[0.18em] uppercase">Scoring</h3>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-body text-[12.5px] font-bold">
                <li className="flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-[#c98a00]" /> coin
                  <span className="ml-auto">100</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded-sm bg-[#a5682f]" /> stomp
                  <span className="ml-auto">200</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-[#8a5b00]" /> star
                  <span className="ml-auto">500</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Flag className="h-3.5 w-3.5 text-[#b23b2f]" /> flag
                  <span className="ml-auto">3000</span>
                </li>
              </ul>
              <p className="mt-2.5 border-t-2 border-dashed border-[#123a52]/20 pt-2 text-[12px] font-bold text-[#123a52]/70">
                Airborne stomps stack a ×2 ×3 ×5 ×8 ×12 combo. Clear the course for time + unused-life bonuses.
              </p>
            </div>
          </div>
        </div>

        <div className="stripes h-2 rounded-full opacity-70" />
      </div>
    </div>
  );
}

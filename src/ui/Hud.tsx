import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Coins, Eye, Flag, Heart, Pause, Sparkles, Star, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/utils/cn";
import { fmtTime } from "@/game/storage";
import { useTween } from "./bits";
import type { Hud as HudState } from "@/game/engine";

/* ------------------------------------------------------------------ HUD */

export function Hud({
  hud,
  onPause,
  muted,
  onToggleMute,
  onCamera,
}: {
  hud: HudState;
  onPause: () => void;
  muted: boolean;
  onToggleMute: () => void;
  onCamera: () => void;
}) {
  const score = useTween(hud.score, 14);
  const playing = hud.phase === "playing" || hud.phase === "paused";
  const lowTime = hud.timeMs > 90000;

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* top rail */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5 transition-transform duration-300 md:p-4",
          playing ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0"
        )}
      >
        {/* score + coins */}
        <div className="flex flex-col gap-1.5">
          <div className="panel flex items-baseline gap-2 rounded-2xl px-3 py-1.5 md:px-4 md:py-2">
            <span className="font-body text-[9px] font-black tracking-[0.24em] text-cream/50 uppercase">Score</span>
            <span
              className={cn(
                "font-display text-2xl leading-none text-cream tabular-nums md:text-[32px]",
                hud.score > 0 && "text-shadow-hard"
              )}
              key={hud.score >= 0 ? undefined : undefined}
            >
              {score.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full border-2 border-white/12 bg-[#092334]/85 px-2.5 py-1">
            <Coins className="h-4 w-4 animate-[coin-spin_1.6s_linear_infinite] text-coin" />
            <span className="font-display text-sm text-coin tabular-nums">{hud.coins}</span>
            <span className="font-body text-[10px] font-black text-cream/45">/ {hud.coinTotal}</span>
          </div>
          {hud.starT > 0 && (
            <div className="anim-pop flex items-center gap-1.5 self-start rounded-full border-2 border-coin/60 bg-coin/20 px-2 py-0.5">
              <Star className="h-3.5 w-3.5 fill-coin text-coin" />
              <span className="font-display text-[11px] text-coin tabular-nums">{hud.starT.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* progress */}
        <div className="hidden min-w-0 flex-1 flex-col items-center gap-1 pt-1 sm:flex">
          <div className="relative h-2.5 w-full max-w-sm overflow-hidden rounded-full border-2 border-white/15 bg-black/45">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pipe via-[#7fe0a5] to-coin transition-[width] duration-150"
              style={{ width: `${Math.round(hud.progress * 100)}%` }}
            />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-cream shadow"
              style={{ left: `${hud.progress * 100}%` }}
            />
            <Flag className="absolute -top-0.5 right-0.5 h-3.5 w-3.5 text-cream/70" />
          </div>
          <span className="font-body text-[9px] font-black tracking-[0.28em] text-cream/45 uppercase">
            {Math.round(hud.progress * 100)}% to flag
          </span>
        </div>

        {/* lives + timer + pause */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onCamera}
              className="pointer-events-auto rounded-xl border-2 border-white/15 bg-[#092334]/85 p-2 text-cream/75 transition hover:bg-[#123a52] active:scale-95"
              title={hud.camMode === "fp" ? "Switch to third person (C)" : "Switch to first person (C)"}
            >
              {hud.camMode === "fp" ? <Camera className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <div className="panel flex items-center gap-1 rounded-2xl px-2.5 py-1.5">
              {Array.from({ length: Math.max(0, Math.min(5, hud.lives)) }).map((_, i) => (
                <Heart key={i} className="h-4 w-4 fill-cherry text-cherry drop-shadow-[0_1px_0_rgba(0,0,0,.4)]" />
              ))}
              {hud.lives > 5 && <span className="font-display text-xs text-cream">+{hud.lives - 5}</span>}
              {hud.lives <= 1 && <span className="anim-blink font-display text-[10px] text-cherry">LOW</span>}
            </div>
            <button
              onClick={onToggleMute}
              className="pointer-events-auto rounded-xl border-2 border-white/15 bg-[#092334]/85 p-2 text-cream/75 transition hover:bg-[#123a52] active:scale-95"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              onClick={onPause}
              className="pointer-events-auto rounded-xl border-2 border-white/15 bg-[#092334]/85 p-2 text-cream/85 transition hover:bg-[#123a52] active:scale-95"
            >
              <Pause className="h-4 w-4" />
            </button>
          </div>
          <div
            className={cn(
              "flex items-center gap-2 rounded-full border-2 px-2.5 py-1 font-display tabular-nums",
              lowTime ? "border-cherry/70 bg-cherry/20 text-cherry" : "border-white/12 bg-[#092334]/85 text-cream/85"
            )}
          >
            <span className="text-sm">{fmtTime(hud.timeMs)}</span>
          </div>
          {hud.combo >= 2 && (
            <div className="anim-pop flex items-center gap-1 rounded-full bg-coin px-2 py-0.5 font-display text-[11px] text-[#40280a] shadow-[0_3px_0_#8a5b00]">
              <Sparkles className="h-3 w-3" /> COMBO x{hud.combo}
            </div>
          )}
        </div>
      </div>

      {/* center shout */}
      {hud.message && (
        <div key={hud.message} className="anim-pop absolute inset-x-0 top-[26%] flex justify-center">
          <div className="font-display text-4xl tracking-wide text-cream text-shadow-hard md:text-5xl" style={{ opacity: Math.min(1, hud.messageT * 2) }}>
            {hud.message}
          </div>
        </div>
      )}

      {/* first-run hint */}
      {hud.timeMs < 6200 && hud.phase === "playing" && (
        <div className="absolute inset-x-0 bottom-24 flex justify-center px-4">
          <div className="anim-slide rounded-2xl border-2 border-white/15 bg-[#092334]/85 px-3 py-1.5 text-center font-body text-[11px] font-black tracking-wide text-cream/75 uppercase md:bottom-16">
            Coins are free points — jump through the <span className="text-coin">?</span> block, stomp the brown guy
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------- touch inputs */

const R = 58;

export function TouchControls({
  onMove,
  onJumpDown,
  onJumpUp,
  onSpin,
  onCamera,
  active,
}: {
  onMove: (x: number, z: number) => void;
  onJumpDown: () => void;
  onJumpUp: () => void;
  onSpin: () => void;
  onCamera: () => void;
  active: boolean;
}) {
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ dx: 0, dy: 0 });
  const pid = useRef<number | null>(null);
  const jumpPid = useRef<number | null>(null);
  const [jumpHeld, setJumpHeld] = useState(false);
  const [spinHeld, setSpinHeld] = useState(false);

  const reset = useCallback(() => {
    pid.current = null;
    setOrigin(null);
    setKnob({ dx: 0, dy: 0 });
    onMove(0, 0);
  }, [onMove]);

  useEffect(() => {
    if (!active) reset();
  }, [active, reset]);

  const handleMove = (cx: number, cy: number) => {
    if (!origin) return;
    let dx = cx - origin.x;
    let dy = cy - origin.y;
    const m = Math.hypot(dx, dy);
    if (m > R) {
      dx = (dx / m) * R;
      dy = (dy / m) * R;
    }
    setKnob({ dx, dy });
    onMove(dx / R, -dy / R);
  };

  return (
    <div className={cn("pointer-events-none absolute inset-0 z-20 transition-opacity", active ? "opacity-100" : "opacity-0")}>
      {/* stick zone */}
      <div
        className="pointer-events-auto absolute bottom-0 left-0 h-[46%] w-[46%] max-h-[320px] max-w-[320px] touch-none"
        onPointerDown={(e) => {
          if (pid.current !== null) return;
          pid.current = e.pointerId;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin({ x: e.clientX, y: e.clientY });
          setKnob({ dx: 0, dy: 0 });
          void r;
        }}
        onPointerMove={(e) => {
          if (pid.current !== e.pointerId) return;
          handleMove(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (pid.current === e.pointerId) reset();
        }}
        onPointerCancel={(e) => {
          if (pid.current === e.pointerId) reset();
        }}
      >
        <div
          className={cn(
            "absolute rounded-full border-2 border-white/25 bg-[#0a2334]/45 backdrop-blur-[2px] transition-opacity duration-150",
            origin ? "opacity-100" : "opacity-45"
          )}
          style={{
            left: (origin?.x ?? 0) - R,
            top: (origin?.y ?? 0) - R,
            width: R * 2,
            height: R * 2,
            position: origin ? "absolute" : "absolute",
          }}
        >
          {!origin && (
            <div className="absolute inset-0 flex items-center justify-center font-body text-[10px] font-black tracking-widest text-cream/50 uppercase">
              drag
            </div>
          )}
          <div
            className="absolute rounded-full border-2 border-white/60 bg-gradient-to-b from-cream/90 to-cream/50 shadow-[0_4px_10px_rgba(0,0,0,.4)]"
            style={{
              left: R + knob.dx - 24,
              top: R + knob.dy - 24,
              width: 48,
              height: 48,
              transition: pid.current === null ? "left 90ms, top 90ms" : "none",
            }}
          />
        </div>
      </div>

      {/* camera toggle */}
      <button
        className="pointer-events-auto absolute top-20 right-3 grid h-11 w-11 place-items-center rounded-full border-2 border-white/25 bg-[#0a2334]/60 font-display text-[9px] tracking-wider text-cream/85 backdrop-blur-[2px] touch-none md:right-6"
        onPointerDown={(e) => {
          e.preventDefault();
          onCamera();
        }}
      >
        <Camera className="h-4 w-4" />
      </button>

      {/* action buttons */}
      <div className="pointer-events-auto absolute right-3 bottom-4 flex items-end gap-3 touch-none md:right-6 md:bottom-6">
        <button
          className={cn(
            "font-display flex h-16 w-16 flex-col items-center justify-center rounded-full border-2 border-[#8a1424] text-[11px] tracking-wider text-white transition-transform",
            spinHeld ? "scale-90 bg-[#c0293c]" : "bg-cherry shadow-[0_6px_0_#8a1424]"
          )}
          onPointerDown={(e) => {
            e.preventDefault();
            setSpinHeld(true);
            onSpin();
            window.setTimeout(() => setSpinHeld(false), 130);
          }}
        >
          <Sparkles className="h-5 w-5" />
          SPIN
        </button>
        <button
          className={cn(
            "font-display flex h-24 w-24 flex-col items-center justify-center rounded-full border-2 border-[#8a5b00] text-sm tracking-wider text-[#40280a] transition-transform",
            jumpHeld ? "scale-90 bg-[#ffdb70]" : "bg-coin shadow-[0_8px_0_#8a5b00]"
          )}
          onPointerDown={(e) => {
            e.preventDefault();
            jumpPid.current = e.pointerId;
            setJumpHeld(true);
            onJumpDown();
          }}
          onPointerUp={(e) => {
            if (jumpPid.current === e.pointerId) {
              jumpPid.current = null;
              setJumpHeld(false);
              onJumpUp();
            }
          }}
          onPointerCancel={() => {
            jumpPid.current = null;
            setJumpHeld(false);
            onJumpUp();
          }}
        >
          <span className="text-lg leading-none">JUMP</span>
          <span className="mt-0.5 h-1.5 w-8 rounded-full bg-[#8a5b00]/40" />
        </button>
      </div>
    </div>
  );
}

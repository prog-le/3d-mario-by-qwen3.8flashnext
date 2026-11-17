import { useCallback, useEffect, useRef, useState } from "react";
import { Game, type Hud as HudState, type RunResult } from "@/game/engine";
import { sound } from "@/game/audio";
import { loadName, loadScores, saveName, saveScore, type ScoreEntry } from "@/game/storage";
import StartScreen from "@/ui/StartScreen";
import { Hud, TouchControls } from "@/ui/Hud";
import { PauseScreen, ResultScreen } from "@/ui/Overlays";

const EMPTY_HUD: HudState = {
  phase: "menu",
  camMode: "follow",
  score: 0,
  coins: 0,
  coinTotal: 0,
  lives: 3,
  timeMs: 0,
  combo: 0,
  progress: 0,
  starT: 0,
  kills: 0,
  seedLabel: "0000",
  message: "",
  messageT: 0,
};

export default function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<HudState>(EMPTY_HUD);
  const [result, setResult] = useState<RunResult | null>(null);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [rank, setRank] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("PLUMBER");
  const [muted, setMuted] = useState(false);
  const [touch, setTouch] = useState(false);
  const stateRef = useRef({ submitted, result, name });
  stateRef.current = { submitted, result, name };

  /* ---------------------------------------------------------- boot game */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setScores(loadScores());
    setName(loadName());
    setTouch(matchMedia("(pointer: coarse)").matches);
    const g = new Game(host, setHud, (r) => {
      setResult(r);
      setRank(null);
      setSubmitted(false);
    });
    gameRef.current = g;
    if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = g;
    const onTouch = () => setTouch(true);
    window.addEventListener("touchstart", onTouch, { once: true, passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouch);
      g.dispose();
      if (import.meta.env.DEV) delete (window as unknown as { __game?: Game }).__game;
      gameRef.current = null;
    };
  }, []);

  const submit = useCallback(() => {
    const { result: r, submitted: done, name: n } = stateRef.current;
    if (!r || done) return;
    const finalName = (n || "PLUMBER").trim().toUpperCase().slice(0, 10) || "PLUMBER";
    saveName(finalName);
    const res = saveScore({
      name: finalName,
      score: r.score,
      coins: r.coins,
      timeMs: r.timeMs,
      cleared: r.cleared,
      seedLabel: r.seedLabel,
      date: Date.now(),
    });
    setScores(res.scores);
    setRank(res.rank);
    setSubmitted(true);
  }, []);

  const start = useCallback(() => {
    submit();
    gameRef.current?.startRun();
  }, [submit]);

  const again = useCallback(() => {
    submit();
    gameRef.current?.restart(false);
  }, [submit]);

  const retrySeed = useCallback(() => {
    submit();
    gameRef.current?.restart(true);
  }, [submit]);

  const toMenu = useCallback(() => {
    submit();
    gameRef.current?.toMenu();
    setResult(null);
  }, [submit]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      sound.setMuted(!m);
      return !m;
    });
  }, []);

  /* global shortcuts for the meta screens (so scores always get logged) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
        return;
      }
      const p = gameRef.current?.phase;
      if (e.key === "Enter") {
        e.preventDefault();
        if (p === "menu") start();
        else if (p === "dead" || p === "clear") again();
        else if (p === "paused") gameRef.current?.resume();
      } else if (e.key.toLowerCase() === "r") {
        if (p === "dead" || p === "clear" || p === "paused") (e.shiftKey ? again : retrySeed)();
      } else if (e.key === "m" || e.key === "M") {
        toggleMute();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [start, again, retrySeed, toggleMute, submit]);

  /* keep the canvas sized with the visual viewport (mobile URL bar) */
  useEffect(() => {
    const fix = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      if (hostRef.current) hostRef.current.style.height = `${h}px`;
      gameRef.current?.resize();
    };
    fix();
    window.addEventListener("resize", fix);
    window.visualViewport?.addEventListener("resize", fix);
    return () => {
      window.removeEventListener("resize", fix);
      window.visualViewport?.removeEventListener("resize", fix);
    };
  }, []);

  const playing = hud.phase === "playing" || hud.phase === "paused" || hud.phase === "dying" || hud.phase === "clearing";
  const setMove = useCallback((x: number, z: number) => gameRef.current?.setMove(x, z), []);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-abyss font-body">
      <div ref={hostRef} className="absolute inset-0 h-full w-full" />

      {/* atmosphere */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(115%_75%_at_50%_45%,transparent_40%,rgba(4,18,28,.6)_100%)]" />
      <div className="checker pointer-events-none absolute inset-0 opacity-[0.05]" />

      {playing && (
        <div className="absolute inset-0" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <Hud hud={hud} onPause={() => gameRef.current?.togglePause()} muted={muted} onToggleMute={toggleMute} onCamera={() => gameRef.current?.toggleCamera()} />
          {touch && hud.phase === "playing" && (
            <TouchControls
              active
              onMove={setMove}
              onJumpDown={() => gameRef.current?.jumpDown()}
              onJumpUp={() => gameRef.current?.jumpUp()}
              onSpin={() => gameRef.current?.spin()}
              onCamera={() => gameRef.current?.toggleCamera()}
            />
          )}
        </div>
      )}

      {hud.phase === "menu" && (
        <StartScreen
          scores={scores}
          seedLabel={hud.seedLabel}
          onPlay={start}
          onShuffle={() => gameRef.current?.shuffleMenu()}
          muted={muted}
          onToggleMute={toggleMute}
        />
      )}

      {hud.phase === "paused" && (
        <PauseScreen
          score={hud.score}
          coins={hud.coins}
          progress={hud.progress}
          onResume={() => gameRef.current?.resume()}
          onRetry={retrySeed}
          onNewCourse={again}
          onQuit={toMenu}
          muted={muted}
          onToggleMute={toggleMute}
        />
      )}

      {(hud.phase === "dead" || hud.phase === "clear") && result && (
        <ResultScreen
          result={result}
          scores={scores}
          rank={rank}
          name={name}
          onName={setName}
          onSubmit={submit}
          onAgain={again}
          onRetry={retrySeed}
          onMenu={toMenu}
          submitted={submitted}
        />
      )}
    </div>
  );
}

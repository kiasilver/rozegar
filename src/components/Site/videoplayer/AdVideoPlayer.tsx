// AdVideoPlayer.tsx (single‑ad policy)
// React video player with ad support; includes maxAdsPerPlayback to cap ads per content.
// ESLint/TS clean as before.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Source = { src: string; type?: string };

type AdMedia =
  | { kind: "image"; src: string }
  | { kind: "video"; src: string };

type AdItem = {
  id: string;
  position: "preroll" | "midroll" | "postroll";
  at?: number; // midroll trigger (sec)
  media: AdMedia;
  clickThroughUrl?: string;
  skipAfter?: number; // sec until skippable (default 5)
  duration?: number; // sec (default 10 img / 5 video)
};

type PlayerEvents = {
  onAdStart?: (ad: AdItem) => void;
  onAdSkip?: (ad: AdItem) => void;
  onAdClick?: (ad: AdItem) => void;
  onAdComplete?: (ad: AdItem) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
};

type Props = PlayerEvents & {
  className?: string;
  poster?: string;
  sources: Source[];
  ads?: AdItem[];
  autoPlay?: boolean;
  controls?: boolean;
  /** Limit how many ads can show during this playback. e.g., 1 = only one ad (pre OR mid OR post). */
  maxAdsPerPlayback?: number;
};

function formatTime(t: number) {
  const s = Math.max(0, Math.floor(t));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function AdVideoPlayer({
  className,
  poster,
  sources,
  ads = [],
  autoPlay = false,
  controls = false,
  maxAdsPerPlayback = Infinity,
  onAdStart,
  onAdSkip,
  onAdComplete,
  onAdClick,
  onPlay,
  onPause,
  onEnded,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [muted, setMuted] = useState(false);

  // Ad state
  const [activeAd, setActiveAd] = useState<AdItem | null>(null);
  const [adRemaining, setAdRemaining] = useState<number>(0);
  const [adSkippableIn, setAdSkippableIn] = useState<number>(0);
  const adTimerRef = useRef<number | null>(null);
  const [adsShownCount, setAdsShownCount] = useState(0);

  const prerolls = useMemo(() => ads.filter((a) => a.position === "preroll"), [ads]);
  const postrolls = useMemo(() => ads.filter((a) => a.position === "postroll"), [ads]);
  const midrolls = useMemo(() => ads.filter((a) => a.position === "midroll" && typeof a.at === "number"), [ads]);

  const play = useCallback(async () => {
    try {
      await videoRef.current?.play();
      setIsPlaying(true);
      onPlay?.();
    } catch {
      /* ignore */
    }
  }, [onPlay]);

  const pause = useCallback(() => {
    videoRef.current?.pause();
    setIsPlaying(false);
    onPause?.();
  }, [onPause]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      void play();
    }
  }, [isPlaying, pause, play]);

  const seekTo = useCallback(
    (t: number) => {
      if (!videoRef.current) return;
      const d = duration || 0;
      videoRef.current.currentTime = Math.max(0, Math.min(d, t));
    },
    [duration]
  );

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setMuted(videoRef.current.muted);
  }, []);

  const requestFs = useCallback(async () => {
    const el = containerRef.current as (HTMLElement & { requestFullscreen?: () => Promise<void> }) | null;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
    } else {
      await el.requestFullscreen?.();
    }
  }, []);

  // ====== Ad Engine ======
  const clearAdTimer = useCallback(() => {
    if (adTimerRef.current) {
      window.clearInterval(adTimerRef.current);
      adTimerRef.current = null;
    }
  }, []);

  const completeAd = useCallback(() => {
    if (!activeAd) return;
    clearAdTimer();
    onAdComplete?.(activeAd);
    setActiveAd(null);
    setAdsShownCount((c) => c + 1);
    void play();
  }, [activeAd, clearAdTimer, onAdComplete, play]);

  const startAd = useCallback(
    (ad: AdItem) => {
      if (adsShownCount >= maxAdsPerPlayback) {
        void play();
        return;
      }
      pause();
      setActiveAd(ad);
      onAdStart?.(ad);
      const total = ad.media.kind === "image" ? ad.duration ?? 10 : ad.duration ?? 5;
      const skipAfter = ad.skipAfter ?? 5;
      setAdRemaining(total);
      setAdSkippableIn(skipAfter);

      clearAdTimer();
      adTimerRef.current = window.setInterval(() => {
        setAdRemaining((r) => {
          if (r <= 1) {
            completeAd();
            return 0;
          }
          return r - 1;
        });
        setAdSkippableIn((s) => Math.max(0, s - 1));
      }, 1000);
    },
    [adsShownCount, maxAdsPerPlayback, pause, onAdStart, clearAdTimer, completeAd, play]
  );

  const skipAd = useCallback(() => {
    if (!activeAd) return;
    clearAdTimer();
    onAdSkip?.(activeAd);
    setActiveAd(null);
    setAdsShownCount((c) => c + 1);
    void play();
  }, [activeAd, clearAdTimer, onAdSkip, play]);

  const handleAdClick = useCallback(() => {
    if (!activeAd?.clickThroughUrl) return;
    onAdClick?.(activeAd);
    window.open(activeAd.clickThroughUrl, "_blank");
  }, [activeAd, onAdClick]);

  // metadata/time/ended
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onLoaded = () => setDuration(el.duration || 0);
    const onTime = () => setCurrentTime(el.currentTime || 0);
    const onEnd = () => {
      if (postrolls.length > 0 && adsShownCount < maxAdsPerPlayback) {
        startAd(postrolls[0]);
      }
      onEnded?.();
    };

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);
    setMuted(el.muted);

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnd);
    };
  }, [postrolls, startAd, onEnded, adsShownCount, maxAdsPerPlayback]);

  // midroll watcher
  useEffect(() => {
    if (!duration || !midrolls.length || activeAd) return;
    if (adsShownCount >= maxAdsPerPlayback) return;
    const next = midrolls.find((a) => typeof a.at === "number" && currentTime >= (a.at as number) && currentTime < (a.at as number) + 1);
    if (next) startAd(next);
  }, [currentTime, duration, midrolls, activeAd, startAd, adsShownCount, maxAdsPerPlayback]);

  // preroll/autoplay
  const prerollToPlay = useMemo(() => prerolls[0], [prerolls]);
  useEffect(() => {
    if (!videoRef.current) return;
    if (prerollToPlay && adsShownCount < maxAdsPerPlayback) {
      const unlock = () => {
        startAd(prerollToPlay);
        window.removeEventListener("click", unlock);
        window.removeEventListener("keydown", unlock);
      };
      window.addEventListener("click", unlock, { once: true });
      window.addEventListener("keydown", unlock, { once: true });
      return () => {
        window.removeEventListener("click", unlock);
        window.removeEventListener("keydown", unlock);
      };
    }
    if (autoPlay) {
      void play();
    }
  }, [prerollToPlay, startAd, autoPlay, play, adsShownCount, maxAdsPerPlayback]);

  useEffect(() => () => clearAdTimer(), [clearAdTimer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      if (e.code === "KeyM") toggleMute();
      if (e.code === "ArrowRight") seekTo(currentTime + 5);
      if (e.code === "ArrowLeft") seekTo(currentTime - 5);
      if (e.code === "KeyF") { void requestFs(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentTime, togglePlay, toggleMute, seekTo, requestFs]);

  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div ref={containerRef} className={`relative w-full bg-black rounded-xl overflow-hidden ${className ?? ""}`}>
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-auto max-h-[70vh]"
        controls={controls}
        preload="metadata"
        onClick={togglePlay}
      >
        {sources.map((s, i) => (
          <source key={i} src={s.src} type={s.type} />
        ))}
      </video>

      {/* Center Play Button (only when paused & no ad) */}
      {!activeAd && !isPlaying && (
        <button
          onClick={togglePlay}
          aria-label="Play"
          className="absolute z-20 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid place-content-center rounded-full bg-white/90 hover:bg-white shadow-lg transition-transform active:scale-95"
        >
          <span className="text-2xl leading-none px-5 py-5">▶</span>
        </button>
      )}

   {!controls && (
  <div
    className={`absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent text-white
                transition-opacity duration-300
                ${isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
  >
    {/* timeline */}
    <div
      className="h-1.5 bg-white/25 rounded cursor-pointer mb-2"
      onClick={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        seekTo(ratio * duration);
      }}
    >
      <div className="h-full bg-white rounded" style={{ width: `${progressPct}%` }} />
    </div>

    {/* controls row */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button onClick={togglePlay} className="px-3 py-1.5 rounded bg-white/15 hover:bg-white/25">
          {isPlaying ? "II" : "▶"}
        </button>
        <button onClick={toggleMute} className="px-3 py-1.5 rounded bg-white/15 hover:bg-white/25">
          {muted ? "🔇" : "🔊"}
        </button>
        <span className="text-xs tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
      <div className="flex items-center gap-2">
       
        <button onClick={() => void requestFs()} className="px-3 py-1.5 rounded bg-white/15 hover:bg-white/25">⤢</button>
      </div>
    </div>
  </div>
)}

      {activeAd && (
        <div className="absolute inset-0 bg-black/90 text-white grid place-items-center">
          <div className="relative w-full h-full">
            {activeAd.media.kind === "image" ? (
              <button onClick={handleAdClick} className="w-full h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activeAd.media.src} alt="ad" className="w-full h-full object-contain" />
              </button>
            ) : (
              <video
                src={activeAd.media.src}
                className="w-full h-full object-contain"
                autoPlay
                muted
                playsInline
                onEnded={completeAd}
                onClick={handleAdClick}
              />
            )}

            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="text-xs bg-white/15 px-2 py-1 rounded">تبلیغ · {Math.max(0, Math.ceil(adRemaining))}s</span>
              <button
                disabled={adSkippableIn > 0}
                onClick={skipAd}
                className={`text-xs px-2 py-1 rounded ${adSkippableIn > 0 ? "bg-white/10 cursor-not-allowed" : "bg-white/20 hover:bg-white/30"}`}
                aria-disabled={adSkippableIn > 0}
              >
                {adSkippableIn > 0 ? `رد کردن (${adSkippableIn})` : "رد کردن"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

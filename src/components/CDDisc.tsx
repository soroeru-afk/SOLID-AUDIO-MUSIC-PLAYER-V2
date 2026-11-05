import React, { useRef, useEffect, useState } from 'react';
import { Disc } from 'lucide-react';

export type CDHubStyle = 'black' | 'clear';

interface CDDiscProps {
  coverUrl?: string;
  title?: string;
  artist?: string;
  album?: string;
  isPlaying?: boolean;
  className?: string;
  /**
   * If true, interactive hover or click stops/starts or shows detail.
   */
  interactive?: boolean;
  /**
   * Center clamping hub style: 'black' (opaque dark clamp) or 'clear' (transparent acrylic polycarbonate)
   */
  hubStyle?: CDHubStyle;
  /**
   * Scale factor for hub diameter (0.0: shrink to center hole ~8%, 1.0: standard full hub 22%)
   */
  hubScale?: number;
  /**
   * Callback to toggle hub style between black and clear
   */
  onToggleHubStyle?: () => void;
}

export const CDDisc: React.FC<CDDiscProps> = ({
  coverUrl,
  title = '',
  artist = '',
  album = '',
  isPlaying = false,
  className = '',
  hubStyle = 'black',
  hubScale = 1.0,
  onToggleHubStyle,
}) => {
  const currentAngleRef = useRef<number>(0);
  const currentSpeedRef = useRef<number>(0); // degrees per second
  const animFrameRef = useRef<number | null>(null);
  const discElementRef = useRef<HTMLDivElement | null>(null);

  // Target speed when playing: ~45 RPM feel (~270 deg/sec) or graceful ~180 deg/sec
  const TARGET_SPEED = 160; // deg per sec
  const ACCELERATION = 240; // deg per sec^2 (spins up in ~0.7s)
  const DECELERATION = 140; // deg per sec^2 (glides to a halt gracefully)

  useEffect(() => {
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      if (isPlaying) {
        // Accelerate smoothly to target speed
        if (currentSpeedRef.current < TARGET_SPEED) {
          currentSpeedRef.current = Math.min(TARGET_SPEED, currentSpeedRef.current + ACCELERATION * delta);
        }
      } else {
        // Decelerate smoothly to a stop with realistic physical inertia
        if (currentSpeedRef.current > 0) {
          currentSpeedRef.current = Math.max(0, currentSpeedRef.current - DECELERATION * delta);
        }
      }

      if (currentSpeedRef.current > 0) {
        currentAngleRef.current += currentSpeedRef.current * delta;
        if (currentAngleRef.current >= 360000) {
          currentAngleRef.current -= 360000;
        }
        if (discElementRef.current) {
          discElementRef.current.style.transform = `rotate(${currentAngleRef.current}deg)`;
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <div
      className={`w-full h-full relative select-none flex items-center justify-center overflow-hidden p-2 ${className}`}
      style={{
        backgroundColor: 'var(--theme-list-bg, #0B0C0D)',
      }}
    >
      {/* Background CD Drive Tray / Chassis (Recessed Circular Bay with Industrial Screws & Grille) */}
      <div
        className="w-full h-full max-w-full max-h-full aspect-square rounded-full relative flex items-center justify-center shadow-inner"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          border: '1px solid var(--theme-border, #252932)',
          boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.85), 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Subtle chassis concentric tracks & laser optic guide rail marks */}
        <div
          className="absolute inset-[6%] rounded-full border border-dashed pointer-events-none"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        />
        <div
          className="absolute inset-[15%] rounded-full border pointer-events-none"
          style={{ borderColor: 'rgba(255,255,255,0.03)' }}
        />

        {/* 4 Corner optical chassis alignment dots */}
        <div className="absolute top-[8%] left-[8%] w-1.5 h-1.5 rounded-full bg-black/60 border border-white/10" />
        <div className="absolute top-[8%] right-[8%] w-1.5 h-1.5 rounded-full bg-black/60 border border-white/10" />
        <div className="absolute bottom-[8%] left-[8%] w-1.5 h-1.5 rounded-full bg-black/60 border border-white/10" />
        <div className="absolute bottom-[8%] right-[8%] w-1.5 h-1.5 rounded-full bg-black/60 border border-white/10" />

        {/* THE ROTATING COMPACT DISC */}
        <div
          ref={discElementRef}
          className="w-[94%] h-[94%] rounded-full relative overflow-hidden shadow-2xl"
          style={{
            willChange: 'transform',
            boxShadow: '0 8px 24px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.18)',
          }}
        >
          {/* Layer 1: Disc Outer Polycarbonate Rim (Transparent Acrylic Bevel Edge) */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none z-20"
            style={{
              boxShadow: 'inset 0 0 0 3px rgba(255,255,255,0.35), inset 0 0 0 6px rgba(0,0,0,0.35)',
            }}
          />

          {/* Layer 2: Disc Artwork (Picture Label Disc Surface) */}
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={title || album || 'CD Disc'}
              className="w-full h-full object-cover pointer-events-none"
              draggable={false}
            />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center p-4 text-center select-none"
              style={{
                background: 'radial-gradient(circle, #2a313d 0%, #151921 70%, #0d1017 100%)',
              }}
            >
              <Disc size={48} className="opacity-30 mb-2" style={{ color: 'var(--theme-textMain)' }} />
              <span className="text-[10px] font-mono tracking-widest font-bold opacity-60 uppercase" style={{ color: 'var(--theme-textMain)' }}>
                COMPACT DISC
              </span>
              <span className="text-[7.5px] font-mono tracking-wider opacity-40 uppercase mt-0.5" style={{ color: 'var(--theme-textMuted)' }}>
                DIGITAL AUDIO
              </span>
            </div>
          )}

          {/* Disc surface: pure clean cover art cropped to circle without rainbow glare */}

          {/* Layer 5: Inner Clear Polycarbonate Ring (Optical Lead-in Ring without print - High Transparency) */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34%] h-[34%] rounded-full pointer-events-none z-15 flex items-center justify-center shadow-inner"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1.5px solid rgba(255,255,255,0.35)',
              boxShadow: 'inset 0 0 3px rgba(0,0,0,0.3), 0 0 3px rgba(0,0,0,0.25)',
            }}
          >
            {/* Fine laser data mirror track mark */}
            <div
              className="w-[82%] h-[82%] rounded-full border border-dashed pointer-events-none"
              style={{ borderColor: 'rgba(255,255,255,0.25)' }}
            />
          </div>

          {/* Layer 6: Center Clamping Spindle / Hub (Switchable: Black Opaque vs Clear Acrylic Plastic, Scalable via Slider) */}
          {(() => {
            const clampedScale = typeof hubScale === 'number' ? Math.max(0, Math.min(1, hubScale)) : 1.0;
            // Scale between center black spindle hole (8%) and full hub clamp (22%)
            const minHubPct = 8;
            const maxHubPct = 22;
            const hubDiameterPct = minHubPct + clampedScale * (maxHubPct - minHubPct);
            // Center spindle hole maintains consistent physical diameter relative to disc
            const holeSizePct = Math.min(100, Math.max(32, (minHubPct / hubDiameterPct) * 100));
            const innerRingPct = Math.min(100, Math.max(holeSizePct + 8, 72));
            const showDetails = clampedScale > 0.15;

            return (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleHubStyle?.();
                }}
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full z-30 flex items-center justify-center transition-all ${
                  onToggleHubStyle ? 'cursor-pointer hover:opacity-90 active:scale-95' : 'pointer-events-none'
                }`}
                title="CDセンターハブ切替：黒 ⇄ 透明プラスチック (クリックで切替)"
                style={{
                  width: `${hubDiameterPct}%`,
                  height: `${hubDiameterPct}%`,
                  ...(hubStyle === 'clear'
                    ? {
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        border: clampedScale > 0.05 ? '1px solid rgba(255, 255, 255, 0.45)' : 'none',
                        boxShadow: clampedScale > 0.05
                          ? 'inset 0 1px 2px rgba(255,255,255,0.65), inset 0 -1px 2px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.3)'
                          : 'none',
                      }
                    : {
                        background: clampedScale > 0.05
                          ? 'radial-gradient(circle at 40% 40%, #3a424e 0%, #181d24 60%, #0b0d11 100%)'
                          : '#05070a',
                        border: clampedScale > 0.05 ? '1.5px solid #4a5568' : 'none',
                        boxShadow: clampedScale > 0.05
                          ? '0 2px 8px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.9)'
                          : 'none',
                      }),
                }}
              >
                {/* Inner Ring / Grip Notch Border (Visible when hub is scaled up) */}
                <div
                  className="rounded-full flex items-center justify-center transition-all"
                  style={{
                    width: `${innerRingPct}%`,
                    height: `${innerRingPct}%`,
                    ...(hubStyle === 'clear'
                      ? {
                          border: clampedScale > 0.25 ? '1px solid rgba(255, 255, 255, 0.35)' : 'none',
                          backgroundColor: clampedScale > 0.25 ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                          boxShadow: clampedScale > 0.25 ? 'inset 0 1px 1px rgba(255,255,255,0.4), 0 0 2px rgba(0,0,0,0.2)' : 'none',
                        }
                      : {
                          border: clampedScale > 0.25 ? '1px solid #11141a' : 'none',
                          backgroundColor: clampedScale > 0.25 ? '#1b2028' : 'transparent',
                          boxShadow: clampedScale > 0.25 ? 'inset 0 1px 3px rgba(0,0,0,0.8)' : 'none',
                        }),
                  }}
                >
                  {/* Innermost Spindle Hole (Retained as dark motor spindle pin hole in all modes/sizes) */}
                  <div
                    className="rounded-full shadow-inner"
                    style={{
                      width: `${holeSizePct}%`,
                      height: `${holeSizePct}%`,
                      backgroundColor: '#05070a',
                      border: hubStyle === 'clear' ? '1px solid rgba(255,255,255,0.4)' : '1px solid #2d3748',
                      boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.95), 0 0 1px rgba(0,0,0,0.5)',
                    }}
                  />
                </div>

                {/* 3 Chuck Notch Marks (Fades out when scaled down towards center hole) */}
                {showDetails && (
                  <>
                    <div
                      className={`absolute top-[12%] w-[2px] h-[3px] rounded-full transition-opacity ${
                        hubStyle === 'clear' ? 'bg-white/50 shadow-inner' : 'bg-black/80'
                      }`}
                      style={{ opacity: clampedScale }}
                    />
                    <div
                      className={`absolute bottom-[12%] left-[24%] w-[2px] h-[3px] rounded-full rotate-45 transition-opacity ${
                        hubStyle === 'clear' ? 'bg-white/50 shadow-inner' : 'bg-black/80'
                      }`}
                      style={{ opacity: clampedScale }}
                    />
                    <div
                      className={`absolute bottom-[12%] right-[24%] w-[2px] h-[3px] rounded-full -rotate-45 transition-opacity ${
                        hubStyle === 'clear' ? 'bg-white/50 shadow-inner' : 'bg-black/80'
                      }`}
                      style={{ opacity: clampedScale }}
                    />
                  </>
                )}
              </div>
            );
          })()}
        </div>

        {/* Ambient Top Light Reflection on the outer bezel window */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 40%)',
          }}
        />
      </div>
    </div>
  );
};

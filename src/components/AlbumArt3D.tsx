import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Activity, Box, RotateCw, Pause, Play, Image as ImageIcon, Upload, RotateCcw } from 'lucide-react';

interface AlbumArt3DProps {
  coverUrl?: string;
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  fileName?: string;
  isPlaying?: boolean;
  onDropImage?: (file: File) => Promise<number | void> | void;
  onResetArtwork?: () => Promise<number | boolean | void> | void;
}

export const AlbumArt3D: React.FC<AlbumArt3DProps> = ({
  coverUrl,
  title = 'Unknown Title',
  artist = 'Unknown Artist',
  album = 'Unknown Album',
  duration = 0,
  isPlaying = false,
  onDropImage,
  onResetArtwork,
}) => {
  // Mode state: 3D mode vs flat 2D mode
  const [is3D, setIs3D] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('v2_cover_3d_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [badgeMessage, setBadgeMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounterRef = useRef<number>(0);
  const badgeTimerRef = useRef<number | null>(null);

  const triggerBadge = useCallback((msg: string) => {
    if (badgeTimerRef.current) {
      window.clearTimeout(badgeTimerRef.current);
    }
    setBadgeMessage(msg);
    badgeTimerRef.current = window.setTimeout(() => {
      setBadgeMessage(null);
    }, 2800);
  }, []);

  // 3D angles & zoom scale
  const angleYRef = useRef<number>(0); // default正面 (0 degrees)
  const angleXRef = useRef<number>((() => {
    try {
      const saved = localStorage.getItem('v2_cover_3d_pitch');
      if (saved !== null) {
        const val = parseFloat(saved);
        if (!isNaN(val)) return Math.max(-60, Math.min(60, val));
      }
    } catch {}
    return 0; // default 0deg (正面)
  })());
  const scaleRef = useRef<number>((() => {
    try {
      const saved = localStorage.getItem('v2_cover_3d_scale');
      if (saved !== null) {
        const val = parseFloat(saved);
        if (!isNaN(val)) return Math.max(0.5, Math.min(2.2, val));
      }
    } catch {}
    return 1.0;
  })());

  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const slabRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Persist 3D preference
  const toggle3D = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIs3D((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('v2_cover_3d_enabled', String(next));
      } catch {}
      return next;
    });
  }, []);

  const toggleAutoRotate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setAutoRotate((prev) => !prev);
  }, []);

  // Update transform on DOM element directly for 60fps buttery smoothness without React re-render
  const updateTransform = useCallback(() => {
    if (slabRef.current) {
      slabRef.current.style.transform = `scale3d(${scaleRef.current}, ${scaleRef.current}, ${scaleRef.current}) rotateX(${angleXRef.current}deg) rotateY(${angleYRef.current}deg)`;
    }
    if (shadowRef.current) {
      shadowRef.current.style.transform = `scaleY(0.6) scale(${scaleRef.current})`;
    }
  }, []);

  // Initialize transform on mount
  useEffect(() => {
    updateTransform();
  }, [updateTransform]);

  // Mouse wheel zoom handling (passive: false for clean preventDefault)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!is3D) return;
      e.preventDefault();
      e.stopPropagation();

      // Zoom in on scroll up (deltaY < 0), zoom out on scroll down (deltaY > 0)
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const nextScale = Math.max(0.5, Math.min(2.2, scaleRef.current * zoomFactor));
      scaleRef.current = Math.round(nextScale * 100) / 100;
      updateTransform();

      try {
        localStorage.setItem('v2_cover_3d_scale', String(scaleRef.current));
      } catch {}
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [is3D, updateTransform]);

  // Continuous animation loop for slow, elegant 3D rotation (active when music is playing)
  useEffect(() => {
    if (!is3D) return;

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Rotate only while music is playing and autoRotate is enabled
      // When paused, stays still at the current angle
      if (isPlaying && autoRotate && !isDragging) {
        const speed = isHovered ? 10 : 18; // degrees per second
        angleYRef.current = (angleYRef.current + speed * delta) % 360;
        updateTransform();
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [is3D, isPlaying, autoRotate, isDragging, isHovered, updateTransform]);

  // Pointer drag to interactively rotate in 3D
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!is3D) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !lastPointerRef.current) return;

    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    // Update rotation angles
    angleYRef.current = (angleYRef.current + dx * 0.8) % 360;
    // Allow generous pitch angle between -60 and 60 degrees
    angleXRef.current = Math.max(-60, Math.min(60, angleXRef.current - dy * 0.6));

    updateTransform();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    setIsDragging(false);
    lastPointerRef.current = null;

    // Persist user-chosen tilt angle in localStorage so it stays across tracks & reloads
    try {
      localStorage.setItem('v2_cover_3d_pitch', String(angleXRef.current));
    } catch {}
    // angleX is maintained permanently: auto-rotation continues at this exact tilt angle!
  };

  // Double click resets to perfect front-facing position (0deg, 0deg) and standard 1.0x scale
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    angleXRef.current = 0;
    angleYRef.current = 0;
    scaleRef.current = 1.0;
    try {
      localStorage.setItem('v2_cover_3d_pitch', '0');
      localStorage.setItem('v2_cover_3d_scale', '1');
    } catch {}
    updateTransform();
  };

  // Drag and drop image file handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(file.name)) {
        if (onDropImage) {
          const result = await onDropImage(file);
          if (typeof result === 'number' && result > 1) {
            triggerBadge(`ARTWORK SET (${result} TRACKS)`);
          } else {
            triggerBadge('ARTWORK UPDATED');
          }
        }
      }
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onDropImage) {
      const result = await onDropImage(file);
      if (typeof result === 'number' && result > 1) {
        triggerBadge(`ARTWORK SET (${result} TRACKS)`);
      } else {
        triggerBadge('ARTWORK UPDATED');
      }
    }
    // Reset input so selecting the same file triggers change
    if (e.target) e.target.value = '';
  };

  // Dimensions of 3D Canvas Box
  // Width: 104px, Height: 104px, Depth (Thickness): 14px
  const W = 104;
  const H = 104;
  const D = 14;
  const halfW = W / 2;
  const halfH = H / 2;
  const halfD = D / 2;

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden flex items-center justify-center select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ backgroundColor: 'var(--theme-bg)' }}
    >
      {/* Hidden File Input for Image Selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* 2D Flat Mode */}
      {!is3D && (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt="Album Art"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Activity size={24} style={{ color: 'var(--theme-textDim)' }} />
            </div>
          )}
        </div>
      )}

      {/* 3D Mode */}
      {is3D && (
        <div
          className="w-full h-full relative flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{
            perspective: '650px',
            perspectiveOrigin: 'center center',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          title="ドラッグで角度調整・ホイールで拡大縮小・ダブルクリックで正面リセット"
        >
          {/* Subtle Ambient Ground Shadow */}
          <div
            ref={shadowRef}
            className="absolute pointer-events-none transition-opacity duration-300"
            style={{
              bottom: '10px',
              width: '100px',
              height: '18px',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 45%, transparent 75%)',
              filter: 'blur(3px)',
              transform: `scaleY(0.6) scale(${scaleRef.current})`,
              opacity: isDragging ? 0.9 : 0.75,
            }}
          />

          {/* 3D Canvas Slab Container */}
          <div
            ref={slabRef}
            className="relative"
            style={{
              width: `${W}px`,
              height: `${H}px`,
              transformStyle: 'preserve-3d',
              transform: `scale3d(${scaleRef.current}, ${scaleRef.current}, ${scaleRef.current}) rotateX(${angleXRef.current}deg) rotateY(${angleYRef.current}deg)`,
              willChange: 'transform',
              transition: isDragging ? 'none' : 'box-shadow 0.2s',
            }}
          >
            {/* FRONT FACE: The Album Artwork */}
            <div
              className="absolute inset-0 overflow-hidden border"
              style={{
                width: `${W}px`,
                height: `${H}px`,
                transform: `translateZ(${halfD}px)`,
                backfaceVisibility: 'hidden',
                borderColor: 'rgba(255,255,255,0.25)',
                backgroundColor: 'var(--theme-surface)',
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.4)',
              }}
            >
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={title}
                  className="w-full h-full object-cover pointer-events-none"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center" style={{ backgroundColor: 'var(--theme-surface)' }}>
                  <Activity size={28} style={{ color: 'var(--theme-textDim)' }} />
                  <span className="text-[8px] font-mono tracking-widest mt-1 uppercase" style={{ color: 'var(--theme-textMuted)' }}>
                    NO ARTWORK
                  </span>
                </div>
              )}

              {/* Subtle Gloss Reflection Overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(130deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 35%, transparent 60%)',
                }}
              />
            </div>

            {/* BACK FACE: Industrial Vinyl / Technical Specification Backplate */}
            <div
              className="absolute inset-0 overflow-hidden border flex flex-col justify-between p-2 select-none"
              style={{
                width: `${W}px`,
                height: `${H}px`,
                transform: `rotateY(180deg) translateZ(${halfD}px)`,
                backfaceVisibility: 'hidden',
                backgroundColor: 'var(--theme-surfaceLighter, #1c2026)',
                borderColor: 'var(--theme-borderActive, #4a648c)',
                boxShadow: 'inset 0 0 16px rgba(0,0,0,0.7)',
              }}
            >
              {/* Top spec header */}
              <div className="flex justify-between items-center z-10">
                <span className="text-[7px] font-mono tracking-widest font-bold" style={{ color: 'var(--theme-accent)' }}>
                  SIDE B // LP
                </span>
                <span className="text-[6px] font-mono" style={{ color: 'var(--theme-textDim)' }}>
                  HI-RES 24B
                </span>
              </div>

              {/* Center Vinyl Grooves Motif */}
              <div className="relative my-auto flex items-center justify-center">
                <div
                  className="w-14 h-14 rounded-full border border-dashed flex items-center justify-center"
                  style={{ borderColor: 'var(--theme-border)', backgroundColor: 'rgba(0,0,0,0.3)' }}
                >
                  <div
                    className="w-9 h-9 rounded-full border flex items-center justify-center"
                    style={{ borderColor: 'var(--theme-borderActive)', backgroundColor: 'var(--theme-bg)' }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--theme-accent)' }} />
                  </div>
                </div>
              </div>

              {/* Bottom metadata */}
              <div className="flex flex-col z-10">
                <div className="text-[7.5px] font-bold truncate leading-tight" style={{ color: 'var(--theme-textMain)' }}>
                  {title}
                </div>
                <div className="text-[6.5px] truncate font-mono" style={{ color: 'var(--theme-textMuted)' }}>
                  {artist}
                </div>
              </div>
            </div>

            {/* LEFT FACE (Thickness Edge - Left Spine) */}
            <div
              className="absolute overflow-hidden flex items-center justify-center border-t border-b"
              style={{
                width: `${D}px`,
                height: `${H}px`,
                top: 0,
                left: '50%',
                marginLeft: `-${halfD}px`,
                transform: `rotateY(-90deg) translateZ(${halfW}px)`,
                background: 'linear-gradient(to right, #b4bcc8 0%, #edf1f6 50%, #9aa5b5 100%)',
                borderColor: '#788698',
                boxShadow: 'inset 0 0 3px rgba(0,0,0,0.3)',
              }}
            >
              {/* Canvas texture line */}
              <div className="w-[1px] h-full bg-black/20" />
            </div>

            {/* RIGHT FACE (Thickness Edge - Right) */}
            <div
              className="absolute overflow-hidden flex items-center justify-center border-t border-b"
              style={{
                width: `${D}px`,
                height: `${H}px`,
                top: 0,
                left: '50%',
                marginLeft: `-${halfD}px`,
                transform: `rotateY(90deg) translateZ(${halfW}px)`,
                background: 'linear-gradient(to right, #9aa5b5 0%, #edf1f6 50%, #b4bcc8 100%)',
                borderColor: '#788698',
                boxShadow: 'inset 0 0 3px rgba(0,0,0,0.3)',
              }}
            >
              <div className="w-[1px] h-full bg-black/20" />
            </div>

            {/* TOP FACE (Thickness Edge - Top Illuminated Canvas Edge) */}
            <div
              className="absolute overflow-hidden border-l border-r"
              style={{
                width: `${W}px`,
                height: `${D}px`,
                top: '50%',
                left: 0,
                marginTop: `-${halfD}px`,
                transform: `rotateX(90deg) translateZ(${halfH}px)`,
                background: 'linear-gradient(to bottom, #ffffff 0%, #e2e8f0 100%)',
                borderColor: '#94a3b8',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8)',
              }}
            />

            {/* BOTTOM FACE (Thickness Edge - Bottom Shadowed Canvas Edge) */}
            <div
              className="absolute overflow-hidden border-l border-r"
              style={{
                width: `${W}px`,
                height: `${D}px`,
                top: '50%',
                left: 0,
                marginTop: `-${halfD}px`,
                transform: `rotateX(-90deg) translateZ(${halfH}px)`,
                background: '#505a69',
                borderColor: '#3a4350',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6)',
              }}
            />
          </div>
        </div>
      )}

      {/* Drag & Drop File Hover Target Overlay (Theme Adaptive) */}
      {isDragOver && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center p-2 text-center pointer-events-none transition-all shadow-xl"
          style={{
            backgroundColor: 'var(--theme-surfaceLighter)',
            border: '2px dashed var(--theme-accent, #5da0ea)',
            opacity: 0.95,
          }}
        >
          <Upload size={22} style={{ color: 'var(--theme-accent)' }} className="mb-1 animate-bounce" />
          <span className="text-[9.5px] font-mono tracking-wider font-bold" style={{ color: 'var(--theme-textMain)' }}>
            DROP IMAGE HERE
          </span>
          <span className="text-[7.5px] font-mono tracking-widest mt-0.5 uppercase font-medium" style={{ color: 'var(--theme-textMuted)' }}>
            SET ALBUM / LIST ARTWORK
          </span>
        </div>
      )}

      {/* Flash Badge when artwork updated or restored (Theme Adaptive & High-Contrast) */}
      {badgeMessage && (
        <div
          className="absolute top-1.5 inset-x-2 z-40 py-1 text-center font-mono text-[7.5px] font-bold tracking-widest uppercase border rounded-[1px] shadow-lg backdrop-blur-sm"
          style={{
            backgroundColor: 'var(--theme-surfaceLighter)',
            borderColor: 'var(--theme-accent)',
            color: 'var(--theme-textMain)',
          }}
        >
          {badgeMessage}
        </div>
      )}

      {/* Industrial Floating Overlay Controls (Mode, Rotation, and Upload / Restore) */}
      <div
        className={`absolute bottom-1 right-1 flex items-center gap-1 z-30 transition-opacity duration-200 ${
          isHovered ? 'opacity-100' : 'opacity-40 hover:opacity-100'
        }`}
      >
        {/* Upload Custom Image Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="p-1 border rounded-[1px] transition-all hover:opacity-90 shadow-sm"
          style={{
            backgroundColor: 'var(--theme-surfaceLighter)',
            borderColor: 'var(--theme-border)',
            color: 'var(--theme-textMain)',
          }}
          title="画像ファイルを選択してアルバム/リスト全体に設定（ドラッグ＆ドロップでも可能）"
        >
          <Upload size={9} />
        </button>

        {/* Restore Original Artwork Button (Restores embedded audio file cover for the list) */}
        {onResetArtwork && (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              const result = await onResetArtwork();
              if (result === false) {
                triggerBadge('NO EMBEDDED ART');
              } else if (typeof result === 'number' && result > 1) {
                triggerBadge(`ORIGINAL ART RESTORED (${result} TRACKS)`);
              } else {
                triggerBadge('ORIGINAL ART RESTORED');
              }
            }}
            className="p-1 border rounded-[1px] transition-all hover:opacity-90 shadow-sm"
            style={{
              backgroundColor: 'var(--theme-surfaceLighter)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-textMain)',
            }}
            title="元の曲データに埋め込まれているオリジナルアートワークに復元（リスト全体を一括復元）"
          >
            <RotateCcw size={9} />
          </button>
        )}

        {/* Toggle 3D / 2D Button */}
        <button
          onClick={toggle3D}
          className="px-1.5 py-0.5 text-[8px] font-mono tracking-wider font-semibold border flex items-center gap-1 rounded-[1px] transition-all shadow-sm"
          style={{
            backgroundColor: is3D ? 'var(--theme-surfaceLighter)' : 'var(--theme-surface)',
            borderColor: is3D ? 'var(--theme-accent)' : 'var(--theme-border)',
            color: is3D ? 'var(--theme-accent)' : 'var(--theme-textMain)',
          }}
          title={is3D ? '2Dフラット表示に切替' : '3Dキャンバス表示に切替'}
        >
          {is3D ? <Box size={9} /> : <ImageIcon size={9} />}
          <span>{is3D ? '3D' : '2D'}</span>
        </button>

        {/* Toggle Auto Spin Button (only in 3D mode) */}
        {is3D && (
          <button
            onClick={toggleAutoRotate}
            className="p-1 border rounded-[1px] transition-all shadow-sm"
            style={{
              backgroundColor: 'var(--theme-surfaceLighter)',
              borderColor: autoRotate ? 'var(--theme-accent)' : 'var(--theme-border)',
              color: autoRotate ? 'var(--theme-accent)' : 'var(--theme-textMain)',
            }}
            title={autoRotate ? (isPlaying ? '自動回転をOFF' : '再生時に回転（現在一時停止中）') : '自動回転をON'}
          >
            {autoRotate ? <RotateCw size={9} className={isPlaying ? "animate-spin-slow" : ""} /> : <Play size={9} />}
          </button>
        )}
      </div>

      {/* Industrial Guide Indicator shown on hover (Fixed for Light & Dark Theme Contrast) */}
      {is3D && isHovered && !isDragOver && (
        <div
          className="absolute top-1 left-1 px-1.5 py-0.5 text-[7.5px] font-mono font-bold tracking-widest uppercase border pointer-events-none rounded-[1px] shadow-sm z-30 backdrop-blur-sm"
          style={{
            backgroundColor: 'var(--theme-surfaceLighter)',
            borderColor: 'var(--theme-borderActive)',
            color: 'var(--theme-textMain)',
          }}
        >
          DRAG 3D / WHEEL ZOOM
        </div>
      )}
    </div>
  );
};

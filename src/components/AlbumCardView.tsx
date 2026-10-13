import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Disc, User, ChevronRight, ChevronDown, ChevronUp, ChevronsUp, ChevronsDown, GripVertical, ListMusic, Music, ArrowLeft, Folder, List, Maximize2, Minimize2, Trash2, X, Edit2, Check } from 'lucide-react';

export interface AlbumGroup {
  id: string;
  album: string;
  artist: string;
  coverUrl?: string;
  tracks: any[];
  totalDuration: number;
}

export interface ArtistGroup {
  artist: string;
  albums: AlbumGroup[];
  totalTracks: number;
  totalDuration: number;
  coverUrl?: string;
}

interface AlbumCardViewProps {
  activePlaylistId?: string;
  albums: AlbumGroup[];
  artists: ArtistGroup[];
  cardSize?: 'sm' | 'md' | 'lg' | 'xl';
  cardScale?: number;
  displayMode: 'card' | 'list' | 'album';
  groupByArtist: boolean;
  onPlayAlbum: (album: AlbumGroup) => void;
  onPlayTrack?: (track: any, album: AlbumGroup) => void;
  onOpenAlbum?: (album: AlbumGroup) => void;
  onPlayArtist?: (artist: ArtistGroup) => void;
  onMoveAlbum?: (albumId: string, direction: 'top' | 'up' | 'down' | 'bottom') => void;
  onReorderAlbums?: (draggedAlbumId: string, targetAlbumId: string) => void;
  onReorderAlbum?: (draggedAlbumId: string, targetAlbumId: string) => void;
  onMoveTracksToAlbum?: (trackIds: string[], targetAlbum: AlbumGroup) => void;
  onDeleteAlbum?: (album: AlbumGroup) => void;
  onDeleteAlbums?: (albums: AlbumGroup[]) => void;
  onRenameAlbum?: (album: AlbumGroup, newName: string) => void;
  focusedAlbumId?: string | null;
  currentTrackId?: string;
  isPlaying?: boolean;
}

const formatDuration = (seconds: number): string => {
  if (isNaN(seconds) || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const AlbumCardView: React.FC<AlbumCardViewProps> = ({
  activePlaylistId,
  albums,
  artists,
  cardSize = 'md',
  cardScale = 190,
  displayMode,
  groupByArtist,
  onPlayAlbum,
  onPlayTrack,
  onOpenAlbum,
  onPlayArtist,
  onMoveAlbum,
  onReorderAlbums,
  onReorderAlbum,
  onMoveTracksToAlbum,
  onDeleteAlbum,
  onDeleteAlbums,
  onRenameAlbum,
  focusedAlbumId,
  currentTrackId,
  isPlaying,
}) => {
  const reorderHandler = onReorderAlbum || onReorderAlbums;
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());
  const [expandedListIds, setExpandedListIds] = useState<Set<string>>(new Set());
  // Tracks explicit user jacket click (`string`: zoomed album id, `'__NONE__'`: explicitly unzoomed, `null`: default)
  const [zoomedAlbumId, setZoomedAlbumId] = useState<string | null>(null);
  const [draggedAlbumId, setDraggedAlbumId] = useState<string | null>(null);
  const [dragOverAlbumId, setDragOverAlbumId] = useState<string | null>(null);
  const [confirmDeleteAlbumId, setConfirmDeleteAlbumId] = useState<string | null>(null);
  const [renamingAlbumId, setRenamingAlbumId] = useState<string | null>(null);
  const [renamingAlbumValue, setRenamingAlbumValue] = useState<string>('');
  // Multi-selection state for batch album actions
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<Set<string>>(new Set());
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState<boolean>(false);

  // Modal state for moving 1 track or an entire separated album into another album (no clipping!)
  const [moveTargetModal, setMoveTargetModal] = useState<{
    trackIds: string[];
    sourceAlbumId: string;
    label: string;
  } | null>(null);

  // Reset manual zoom override and selection when switching sidebar playlists or display modes
  const firstAlbumId = albums[0]?.id || null;
  useEffect(() => {
    setZoomedAlbumId(focusedAlbumId || null);
    setConfirmDeleteAlbumId(null);
    setRenamingAlbumId(null);
    setSelectedAlbumIds(new Set());
    setConfirmDeleteSelected(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activePlaylistId, displayMode, firstAlbumId, focusedAlbumId]);

  const toggleSelectAlbum = (albumId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedAlbumIds(prev => {
      const next = new Set(prev);
      if (next.has(albumId)) next.delete(albumId);
      else next.add(albumId);
      return next;
    });
  };

  const selectAllAlbums = () => {
    setSelectedAlbumIds(new Set(albums.map(a => a.id)));
  };

  const clearSelectedAlbums = () => {
    setSelectedAlbumIds(new Set());
    setConfirmDeleteSelected(false);
  };

  const handleDeleteSelectedAlbums = () => {
    const albumsToDelete = albums.filter(a => selectedAlbumIds.has(a.id));
    if (albumsToDelete.length === 0) return;
    if (onDeleteAlbums) {
      onDeleteAlbums(albumsToDelete);
    } else if (onDeleteAlbum) {
      albumsToDelete.forEach(a => onDeleteAlbum(a));
    }
    setSelectedAlbumIds(new Set());
    setConfirmDeleteSelected(false);
  };

  const renderSelectionBanner = () => {
    if (selectedAlbumIds.size === 0) return null;
    const selectedAlbums = albums.filter(a => selectedAlbumIds.has(a.id));
    const totalSelectedTracks = selectedAlbums.reduce((sum, a) => sum + (a.tracks?.length || 0), 0);

    return (
      <div 
        className="mb-3 px-3 py-2 border rounded-[2px] flex items-center justify-between gap-3 animate-fade-in shadow-md flex-wrap"
        style={{
          backgroundColor: 'var(--theme-list-surfaceLighter)',
          borderColor: 'var(--theme-accent)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[var(--theme-accent)] animate-pulse" />
          <span className="text-[10px] font-mono font-bold tracking-wider" style={{ color: 'var(--theme-list-textMain)' }}>
            {selectedAlbumIds.size} 件のアルバムを選択中
          </span>
          <span className="text-[9px] font-mono" style={{ color: 'var(--theme-list-textDim)' }}>
            (計 {totalSelectedTracks} 曲)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectAllAlbums}
            className="px-2 py-1 text-[9px] font-mono font-bold border rounded-[1px] transition-colors hover:opacity-80 cursor-pointer"
            style={{
              backgroundColor: 'var(--theme-list-bg)',
              borderColor: 'var(--theme-list-border)',
              color: 'var(--theme-list-textMain)',
            }}
          >
            全選択 ({albums.length})
          </button>
          <button
            type="button"
            onClick={clearSelectedAlbums}
            className="px-2 py-1 text-[9px] font-mono font-bold border rounded-[1px] transition-colors hover:opacity-80 cursor-pointer"
            style={{
              backgroundColor: 'var(--theme-list-bg)',
              borderColor: 'var(--theme-list-border)',
              color: 'var(--theme-list-textDim)',
            }}
          >
            選択解除
          </button>

          {confirmDeleteSelected ? (
            <div 
              className="flex items-center gap-1.5 px-2 py-0.5 border rounded-[1px]"
              style={{
                backgroundColor: 'var(--theme-list-bg)',
                borderColor: 'var(--theme-accent)',
              }}
            >
              <span className="text-[9px] font-mono font-bold" style={{ color: 'var(--theme-accent)' }}>
                選択した{selectedAlbumIds.size}件を削除しますか？
              </span>
              <button
                type="button"
                onClick={handleDeleteSelectedAlbums}
                className="px-2 py-0.5 text-[9px] font-mono font-bold rounded-[1px] hover:opacity-90 transition-opacity cursor-pointer"
                style={{
                  backgroundColor: 'var(--theme-accent)',
                  color: '#ffffff',
                }}
              >
                削除を実行
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteSelected(false)}
                className="px-1.5 py-0.5 text-[9px] font-mono hover:opacity-80 cursor-pointer"
                style={{ color: 'var(--theme-list-textDim)' }}
              >
                キャンセル
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDeleteSelected(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-mono font-bold border rounded-[1px] transition-colors hover:opacity-90 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: 'var(--theme-accentMuted)',
                borderColor: 'var(--theme-accent)',
                color: 'var(--theme-accent)',
              }}
              title="選択したアルバムを一括削除"
            >
              <Trash2 size={11} />
              <span>選択したアルバムを削除 ({selectedAlbumIds.size})</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const startRenameAlbum = (e: React.MouseEvent, album: AlbumGroup) => {
    e.stopPropagation();
    if (!onRenameAlbum) return;
    setRenamingAlbumId(album.id);
    setRenamingAlbumValue(album.album);
  };

  const commitRenameAlbum = (album: AlbumGroup) => {
    const trimmed = renamingAlbumValue.trim();
    setRenamingAlbumId(null);
    if (trimmed && trimmed !== album.album && onRenameAlbum) {
      onRenameAlbum(album, trimmed);
    }
  };

  const renderInlineAlbumTitleInput = (album: AlbumGroup, isLarge: boolean = false) => (
    <div
      className="flex items-center gap-1 w-full min-w-0"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        type="text"
        value={renamingAlbumValue}
        onChange={(e) => setRenamingAlbumValue(e.target.value)}
        onBlur={() => commitRenameAlbum(album)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commitRenameAlbum(album);
          } else if (e.key === 'Escape') {
            setRenamingAlbumId(null);
          }
        }}
        className={`w-full px-1.5 py-0.5 border outline-none font-mono font-bold rounded-[1px] ${
          isLarge ? 'text-[14px]' : 'text-[10.5px]'
        }`}
        style={{
          backgroundColor: 'var(--theme-list-bg)',
          borderColor: 'var(--theme-accent)',
          color: 'var(--theme-list-textMain)',
        }}
      />
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          commitRenameAlbum(album);
        }}
        className="p-0.5 border rounded-[1px] hover:opacity-80 shrink-0"
        style={{
          backgroundColor: 'var(--theme-list-bg)',
          borderColor: 'var(--theme-accent)',
          color: 'var(--theme-accent)',
        }}
        title="タイトル変更を確定"
      >
        <Check size={isLarge ? 12 : 9} />
      </button>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setRenamingAlbumId(null);
        }}
        className="p-0.5 border rounded-[1px] hover:opacity-80 shrink-0"
        style={{
          backgroundColor: 'var(--theme-list-bg)',
          borderColor: 'var(--theme-list-border)',
          color: 'var(--theme-list-textDim)',
        }}
        title="キャンセル"
      >
        <X size={isLarge ? 12 : 9} />
      </button>
    </div>
  );

  const matchedFocusedAlbum = focusedAlbumId
    ? albums.find((a) => a.id === focusedAlbumId || a.album.toLowerCase() === focusedAlbumId.toLowerCase())
    : null;

  const effectiveZoomedAlbumId =
    zoomedAlbumId === '__NONE__'
      ? null
      : zoomedAlbumId !== null
      ? zoomedAlbumId
      : matchedFocusedAlbum
      ? matchedFocusedAlbum.id
      : displayMode === 'album' && activePlaylistId && activePlaylistId !== 'all-tracks' && albums.length > 0
      ? albums[0].id
      : null;

  const toggleZoomAlbum = (e: React.MouseEvent, albumId: string) => {
    e.stopPropagation();
    const next = effectiveZoomedAlbumId === albumId ? '__NONE__' : albumId;
    setZoomedAlbumId(next);
    if (next !== '__NONE__' && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const zoomedAlbum = effectiveZoomedAlbumId
    ? albums.find((a) => a.id === effectiveZoomedAlbumId || a.album.toLowerCase() === effectiveZoomedAlbumId.toLowerCase()) || null
    : null;

  const handleAlbumDragStart = (e: React.DragEvent, albumId: string) => {
    if (renamingAlbumId === albumId) {
      e.preventDefault();
      return;
    }
    setDraggedAlbumId(albumId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', albumId);
  };

  const handleAlbumDragOver = (e: React.DragEvent, albumId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedAlbumId && draggedAlbumId !== albumId) {
      setDragOverAlbumId(albumId);
    }
  };

  const handleAlbumDrop = (e: React.DragEvent, targetAlbumId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverAlbumId(null);
    if (draggedAlbumId && draggedAlbumId !== targetAlbumId && reorderHandler) {
      reorderHandler(draggedAlbumId, targetAlbumId);
    }
    setDraggedAlbumId(null);
  };

  const handleAlbumDragEnd = () => {
    setDraggedAlbumId(null);
    setDragOverAlbumId(null);
  };

  const isCompact = cardScale < 160;

  // Responsive full-bleed auto-fill grid styles (fills horizontally and wraps to next row, scaling all items at once)
  const cardGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(90, cardScale)}px, 1fr))`,
    gap: `${Math.max(6, Math.min(18, Math.round(cardScale * 0.06)))}px`,
    width: '100%',
    alignItems: 'start',
  };

  // In ALBUM mode (Cover + Tracklist side-by-side), scale the minimum tile width proportionally to cardScale
  const albumBlockMinWidth = Math.max(250, Math.round(cardScale * 2.0));
  const coverWidthPx = Math.max(88, Math.min(240, Math.round(cardScale * 0.85)));

  const coverGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${albumBlockMinWidth}px, 1fr))`,
    gap: `${Math.max(8, Math.min(18, Math.round(cardScale * 0.07)))}px`,
    width: '100%',
    alignItems: 'start',
  };

  const toggleExpandCard = (albumId: string) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(albumId)) next.delete(albumId);
      else next.add(albumId);
      return next;
    });
  };

  const toggleExpandList = (albumId: string) => {
    setExpandedListIds((prev) => {
      const next = new Set(prev);
      if (next.has(albumId)) next.delete(albumId);
      else next.add(albumId);
      return next;
    });
  };

  const allCardIds = albums.map((a) => a.id);
  const isAllCardsExpanded =
    allCardIds.length > 0 && allCardIds.every((id) => expandedCardIds.has(id));
  const toggleAllCards = () => {
    if (isAllCardsExpanded) {
      setExpandedCardIds(new Set());
    } else {
      setExpandedCardIds(new Set(allCardIds));
    }
  };

  const allListIds = albums.map((a) => a.id);
  const isAllListsExpanded =
    allListIds.length > 0 && allListIds.every((id) => expandedListIds.has(id));
  const toggleAllLists = () => {
    if (isAllListsExpanded) {
      setExpandedListIds(new Set());
    } else {
      setExpandedListIds(new Set(allListIds));
    }
  };

  // Helper to render Artwork or Vinyl Placeholder
  const renderArtwork = (coverUrl?: string, albumName?: string, compact: boolean = false) => {
    if (coverUrl) {
      return (
        <img
          src={coverUrl}
          alt={albumName || ''}
          className="w-full h-full object-cover transition-transform duration-300 group-hover/art:scale-105 pointer-events-none"
          loading="lazy"
        />
      );
    }
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-2 relative bg-gradient-to-br from-black/50 to-black/80">
        <div
          className={`${compact ? 'w-8 h-8' : 'w-14 h-14'} rounded-full border border-dashed flex items-center justify-center`}
          style={{ borderColor: 'var(--theme-border)' }}
        >
          <div
            className={`${compact ? 'w-5 h-5' : 'w-9 h-9'} rounded-full border flex items-center justify-center`}
            style={{
              borderColor: 'var(--theme-borderActive)',
              backgroundColor: 'rgba(0,0,0,0.4)',
            }}
          >
            <Disc size={compact ? 11 : 16} style={{ color: 'var(--theme-textDim)' }} />
          </div>
        </div>
        {!compact && (
          <span
            className="text-[7px] font-mono tracking-widest mt-1.5 uppercase"
            style={{ color: 'var(--theme-textDim)' }}
          >
            NO ARTWORK
          </span>
        )}
      </div>
    );
  };

  // Helper to handle track play directly
  const handleTrackClick = (e: React.MouseEvent, track: any, album: AlbumGroup) => {
    e.stopPropagation();
    if (onPlayTrack) {
      onPlayTrack(track, album);
    } else {
      onPlayAlbum(album);
    }
  };

  // Helper to render album ordering controls (Top, Up, Down, Bottom) + Rename + Edit Tracks + Move/Merge + Delete Album button
  const renderAlbumOrderButtons = (album: AlbumGroup, compactMode: boolean = false, isZoomed: boolean = false) => {
    const idx = albums.findIndex((a) => a.id === album.id);
    const isFirst = idx <= 0;
    const isLast = idx === -1 || idx >= albums.length - 1;
    const btnSizeClass = isZoomed ? 'w-6 h-6' : 'w-4 h-4';
    const iconSize = isZoomed ? 12 : 8;
    const isConfirmingDelete = confirmDeleteAlbumId === album.id;

    return (
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        {isConfirmingDelete && onDeleteAlbum ? (
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 border rounded-[2px]"
            style={{
              backgroundColor: 'var(--theme-list-bg)',
              borderColor: 'var(--theme-list-borderActive)',
            }}
          >
            <span className="text-[8px] font-mono font-bold uppercase tracking-tighter" style={{ color: 'var(--theme-accent)' }}>
              DEL?
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteAlbum(album);
                setConfirmDeleteAlbumId(null);
              }}
              className="hover:opacity-80 p-0.5 flex items-center gap-0.5 text-[8px] font-mono font-bold"
              title="このアルバムを削除する"
              style={{ color: 'var(--theme-accent)' }}
            >
              <Trash2 size={isZoomed ? 11 : 9} />
              <span>削除</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDeleteAlbumId(null);
              }}
              className="hover:opacity-80 p-0.5"
              title="キャンセル"
              style={{ color: 'var(--theme-list-textDim)' }}
            >
              <X size={isZoomed ? 11 : 9} />
            </button>
          </div>
        ) : (
          <>
            {onRenameAlbum && (
              <button
                type="button"
                onClick={(e) => startRenameAlbum(e, album)}
                className={`${isZoomed ? 'px-2.5 h-6 text-[10px]' : 'px-1 h-4 text-[7.5px]'} border rounded-[1px] font-mono font-bold tracking-wider flex items-center gap-1 transition-colors hover:opacity-80 active:scale-95`}
                style={{
                  backgroundColor: 'var(--theme-list-bg)',
                  borderColor: 'var(--theme-list-border)',
                  color: 'var(--theme-list-textMain)',
                }}
                title="アルバム名（フォルダ名）を編集"
              >
                <Edit2 size={isZoomed ? 11 : 8} />
                {(!compactMode || isZoomed) && <span>名前変更</span>}
              </button>
            )}
            {onMoveTracksToAlbum && albums.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMoveTargetModal({
                    trackIds: album.tracks.map((t: any) => t.id),
                    sourceAlbumId: album.id,
                    label: `「${album.album}」(${album.tracks.length}曲)`,
                  });
                }}
                className={`${isZoomed ? 'px-2.5 h-6 text-[10px]' : 'px-1.5 h-4 text-[7.5px]'} border rounded-[1px] font-mono font-bold tracking-wider flex items-center gap-1 transition-colors hover:opacity-80 active:scale-95`}
                style={{
                  backgroundColor: 'var(--theme-accentMuted)',
                  borderColor: 'var(--theme-accent)',
                  color: 'var(--theme-accent)',
                }}
                title="このアルバムの曲を別のアルバムへ移動（結合）する"
              >
                <Folder size={isZoomed ? 11 : 8} />
                {(!compactMode || isZoomed) && <span>他アルバムへ移動</span>}
              </button>
            )}
            {onOpenAlbum && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAlbum(album);
                }}
                className={`${isZoomed ? 'px-2.5 h-6 text-[10px]' : 'px-1 h-4 text-[7.5px]'} border rounded-[1px] font-mono font-bold tracking-wider flex items-center gap-1 transition-colors hover:opacity-80 active:scale-95 mr-0.5`}
                style={{
                  backgroundColor: 'var(--theme-list-bg)',
                  borderColor: 'var(--theme-list-border)',
                  color: 'var(--theme-list-textMain)',
                }}
                title="このアルバムの曲順を TRACKS モードで編集"
              >
                <ListMusic size={isZoomed ? 11 : 8} />
                {(!compactMode || isZoomed) && <span>EDIT</span>}
              </button>
            )}
            {onMoveAlbum && albums.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveAlbum(album.id, 'top');
                  }}
                  disabled={isFirst}
                  className={`${btnSizeClass} border rounded-[1px] flex items-center justify-center transition-colors hover:opacity-80 active:scale-95 disabled:opacity-25`}
                  style={{
                    backgroundColor: 'var(--theme-list-bg)',
                    borderColor: 'var(--theme-list-border)',
                    color: 'var(--theme-list-textMain)',
                  }}
                  title="このアルバムを一番上（先頭）へ移動"
                >
                  <ChevronsUp size={iconSize} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveAlbum(album.id, 'up');
                  }}
                  disabled={isFirst}
                  className={`${btnSizeClass} border rounded-[1px] flex items-center justify-center transition-colors hover:opacity-80 active:scale-95 disabled:opacity-25`}
                  style={{
                    backgroundColor: 'var(--theme-list-bg)',
                    borderColor: 'var(--theme-list-border)',
                    color: 'var(--theme-list-textMain)',
                  }}
                  title="このアルバムを1つ前（左/上）へ移動"
                >
                  <ChevronUp size={iconSize} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveAlbum(album.id, 'down');
                  }}
                  disabled={isLast}
                  className={`${btnSizeClass} border rounded-[1px] flex items-center justify-center transition-colors hover:opacity-80 active:scale-95 disabled:opacity-25`}
                  style={{
                    backgroundColor: 'var(--theme-list-bg)',
                    borderColor: 'var(--theme-list-border)',
                    color: 'var(--theme-list-textMain)',
                  }}
                  title="このアルバムを1つ次（右/下）へ移動"
                >
                  <ChevronDown size={iconSize} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveAlbum(album.id, 'bottom');
                  }}
                  disabled={isLast}
                  className={`${btnSizeClass} border rounded-[1px] flex items-center justify-center transition-colors hover:opacity-80 active:scale-95 disabled:opacity-25`}
                  style={{
                    backgroundColor: 'var(--theme-list-bg)',
                    borderColor: 'var(--theme-list-border)',
                    color: 'var(--theme-list-textMain)',
                  }}
                  title="このアルバムを一番下（末尾）へ移動"
                >
                  <ChevronsDown size={iconSize} />
                </button>
              </>
            )}
            {onDeleteAlbum && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDeleteAlbumId(album.id);
                }}
                className={`${btnSizeClass} border rounded-[1px] flex items-center justify-center transition-colors hover:opacity-80 active:scale-95 ml-0.5`}
                style={{
                  backgroundColor: 'var(--theme-list-bg)',
                  borderColor: 'var(--theme-list-border)',
                  color: 'var(--theme-list-textDim)',
                }}
                title="このアルバム自体を削除（クリックで確認）"
              >
                <Trash2 size={iconSize} />
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  // Helper to render an individual album card (CARD VIEW - Image Viewer Style Tile)
  // Clicking the album jacket brings this album to the very top in enlarged ALBUM mode!
  const renderCard = (album: AlbumGroup) => {
    const isThisAlbumPlaying =
      isPlaying &&
      currentTrackId &&
      album.tracks.some((t) => t.id === currentTrackId);

    const isThisAlbumActive =
      currentTrackId && album.tracks.some((t) => t.id === currentTrackId);

    const isExpanded = expandedCardIds.has(album.id);
    const isDragTarget = dragOverAlbumId === album.id;
    const isSelected = selectedAlbumIds.has(album.id);

    return (
      <div
        key={album.id}
        draggable={!!reorderHandler && renamingAlbumId !== album.id}
        onDragStart={(e) => handleAlbumDragStart(e, album.id)}
        onDragOver={(e) => handleAlbumDragOver(e, album.id)}
        onDrop={(e) => handleAlbumDrop(e, album.id)}
        onDragEnd={handleAlbumDragEnd}
        className="group relative border flex flex-col overflow-hidden transition-all duration-200 select-none rounded-[2px]"
        style={{
          backgroundColor: isThisAlbumActive
            ? 'var(--theme-list-surfaceLighter)'
            : 'var(--theme-list-surface)',
          borderColor: isDragTarget || isSelected
            ? 'var(--theme-accent)'
            : isThisAlbumActive
            ? 'var(--theme-accent)'
            : 'var(--theme-list-border)',
          boxShadow: isDragTarget || isSelected
            ? '0 0 0 2px var(--theme-accent)'
            : isThisAlbumActive
            ? '0 0 0 1px var(--theme-accent)'
            : '0 1px 3px rgba(0,0,0,0.12)',
          opacity: draggedAlbumId === album.id ? 0.45 : 1,
        }}
        title={`${album.album} - ${album.artist} (${album.tracks.length} tracks)`}
      >
        {/* Cover Artwork Container (Square 1:1) - CLICK TO BRING TO TOP IN ENLARGED ALBUM MODE */}
        <div
          className="aspect-square w-full relative overflow-hidden bg-black/40 flex items-center justify-center cursor-pointer group/art"
          onClick={(e) => toggleZoomAlbum(e, album.id)}
          title="ジャケットをクリックして最上部にアルバム拡大モードで表示"
        >
          {/* Multi-Selection Checkbox */}
          <div
            className="absolute top-2 left-2 z-30"
            onClick={(e) => toggleSelectAlbum(album.id, e)}
            title={isSelected ? "選択を解除" : "アルバムを選択"}
          >
            <div 
              className={`w-4 h-4 rounded-[2px] border flex items-center justify-center cursor-pointer transition-all shadow-md ${
                isSelected 
                  ? 'bg-[var(--theme-accent)] border-[var(--theme-accent)] text-white' 
                  : 'bg-black/60 border-white/60 hover:border-white text-transparent hover:bg-black/80'
              }`}
            >
              <Check size={11} strokeWidth={3} className={isSelected ? 'opacity-100' : 'opacity-0'} />
            </div>
          </div>

          {renderArtwork(album.coverUrl, album.album, isCompact)}

          {/* Top-left Artist badge */}
          {!isCompact && (
            <div
              className="absolute top-2 left-7 px-1.5 py-0.5 text-[7px] font-mono font-bold tracking-wider uppercase border rounded-[1px] backdrop-blur-sm pointer-events-none truncate max-w-[65%]"
              style={{
                backgroundColor: 'rgba(0,0,0,0.78)',
                borderColor: 'rgba(255,255,255,0.2)',
                color: '#ffffff',
              }}
            >
              {album.artist}
            </div>
          )}

          {/* Top-right Zoom Indicator Badge */}
          <div
            className="absolute top-2 right-2 px-1.5 py-0.5 text-[7px] opacity-0 group-hover/art:opacity-100 font-mono font-bold tracking-wider uppercase border rounded-[1px] transition-opacity flex items-center gap-1"
            style={{
              backgroundColor: 'rgba(0,0,0,0.78)',
              borderColor: 'rgba(255,255,255,0.25)',
              color: '#ffffff',
            }}
          >
            <Maximize2 size={9} />
            <span>ZOOM</span>
          </div>

          {/* Active Playing Indicator Badge */}
          {isThisAlbumPlaying && (
            <div
              className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[8px] font-mono font-bold tracking-widest uppercase border rounded-[1px] shadow-sm flex items-center gap-1 animate-pulse"
              style={{
                backgroundColor: 'var(--theme-surfaceLighter)',
                borderColor: 'var(--theme-accent)',
                color: 'var(--theme-accent)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent)]" />
              PLAYING
            </div>
          )}
        </div>

        {/* Card Info Footer */}
        <div
          className={`${isCompact ? 'p-1.5' : 'p-2.5'} flex flex-col justify-between flex-1 border-t`}
          style={{ borderColor: 'var(--theme-list-border)' }}
        >
          <div className="min-w-0">
            {/* Album Title + Drag Handle */}
            <div className="flex items-center justify-between gap-1.5">
              {renamingAlbumId === album.id ? (
                renderInlineAlbumTitleInput(album, false)
              ) : (
                <>
                  <div
                    className={`${isCompact ? 'text-[9.5px]' : 'text-[11px]'} font-bold truncate leading-snug tracking-tight cursor-pointer hover:opacity-80 flex-1`}
                    style={{ color: 'var(--theme-list-textMain)' }}
                    title={`${album.album}（ダブルクリックまたは「名前変更」で編集）`}
                    onClick={(e) => toggleZoomAlbum(e, album.id)}
                    onDoubleClick={(e) => startRenameAlbum(e, album)}
                  >
                    {album.album}
                  </div>
                  {reorderHandler && (
                    <GripVertical
                      size={10}
                      className="shrink-0 opacity-40 group-hover:opacity-90 cursor-grab active:cursor-grabbing"
                      style={{ color: 'var(--theme-list-textDim)' }}
                    />
                  )}
                </>
              )}
            </div>

            {/* Artist Name */}
            <div
              className={`${isCompact ? 'text-[8px] mt-0.5' : 'text-[9.5px] mt-0.5'} font-mono truncate`}
              style={{ color: 'var(--theme-list-textMuted)' }}
              title={album.artist}
            >
              {album.artist}
            </div>
          </div>

          {/* Album Reorder Bar (Top / Up / Down / Bottom + Edit Tracks) */}
          <div
            className="flex items-center justify-between mt-1.5 pt-1 border-t flex-wrap gap-1"
            style={{ borderColor: 'var(--theme-list-border)' }}
          >
            <span className="text-[7.5px] font-mono font-bold" style={{ color: 'var(--theme-list-textDim)' }}>
              {album.tracks.length} TRACKS {!isCompact && `• ${formatDuration(album.totalDuration)}`}
            </span>
            {renderAlbumOrderButtons(album, isCompact, false)}
          </div>

          {/* Meta & Action Footer */}
          <div
            className={`flex items-center justify-between ${isCompact ? 'mt-1 pt-1' : 'mt-1.5 pt-1.5'} border-t text-[8px] font-mono`}
            style={{
              borderColor: 'var(--theme-list-border)',
              color: 'var(--theme-list-textDim)',
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlayAlbum(album);
              }}
              className="px-1.5 py-0.5 text-[8px] border rounded-[1px] font-mono font-bold tracking-wider transition-colors hover:opacity-80 flex items-center gap-1"
              style={{
                backgroundColor: 'var(--theme-list-surfaceLighter)',
                borderColor: isThisAlbumPlaying ? 'var(--theme-accent)' : 'var(--theme-list-border)',
                color: isThisAlbumPlaying ? 'var(--theme-accent)' : 'var(--theme-list-textMain)',
              }}
              title="アルバムを再生"
            >
              {isThisAlbumPlaying ? <Pause size={8} /> : <Play size={8} />}
              <span>{isThisAlbumPlaying ? 'PAUSE ALBUM' : 'PLAY ALBUM'}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpandCard(album.id);
              }}
              className="px-1 py-0.5 text-[8px] border rounded-[1px] font-mono font-bold tracking-wider transition-colors hover:opacity-80 flex items-center gap-1"
              style={{
                backgroundColor: isExpanded ? 'var(--theme-accentMuted)' : 'var(--theme-list-surfaceLighter)',
                borderColor: isExpanded ? 'var(--theme-accent)' : 'var(--theme-list-border)',
                color: isExpanded ? 'var(--theme-accent)' : 'var(--theme-list-textMain)',
              }}
              title={isExpanded ? '曲目リストを閉じる' : '曲目リストを展開して選曲'}
            >
              <span>TRACKS</span>
              <ChevronDown size={8} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Inline Expandable Track List */}
        {isExpanded && (
          <div
            className="border-t max-h-48 overflow-y-auto divide-y"
            style={{
              borderColor: 'var(--theme-list-border)',
              backgroundColor: 'var(--theme-list-bg)',
            }}
          >
            {album.tracks.map((track: any, tIdx: number) => {
              const isTrackPlaying = isPlaying && currentTrackId === track.id;
              const isTrackActive = currentTrackId === track.id;

              return (
                <div
                  key={track.id}
                  onClick={(e) => handleTrackClick(e, track, album)}
                  className="px-2 py-1.5 text-[9.5px] gap-1.5 flex items-center font-mono transition-colors cursor-pointer group/tr hover:opacity-80"
                  style={{
                    backgroundColor: isTrackActive
                      ? 'var(--theme-list-accentMuted)'
                      : 'transparent',
                    color: isTrackActive
                      ? 'var(--theme-list-accent)'
                      : 'var(--theme-list-textMain)',
                  }}
                  title="クリックしてこの曲を直接再生"
                >
                  <div className="w-4 shrink-0 flex items-center justify-center">
                    {isTrackPlaying ? (
                      <div className="flex items-end gap-0.5 h-3">
                        <span className="w-0.5 h-3 bg-[var(--theme-accent)] animate-pulse" />
                        <span className="w-0.5 h-2 bg-[var(--theme-accent)] animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <span className="w-0.5 h-2.5 bg-[var(--theme-accent)] animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                    ) : (
                      <span className="text-[8.5px]" style={{ color: 'var(--theme-list-textDim)' }}>
                        {(tIdx + 1).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>
                  <span className="flex-1 min-w-0 truncate font-medium">
                    {track.title || track.fileName}
                  </span>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {onMoveTracksToAlbum && albums.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMoveTargetModal({
                            trackIds: [track.id],
                            sourceAlbumId: album.id,
                            label: `「${track.title || track.fileName}」`,
                          });
                        }}
                        className="px-1 py-0.5 border rounded-[1px] text-[7.5px] font-mono font-bold transition-colors hover:opacity-80"
                        style={{
                          backgroundColor: 'var(--theme-list-surfaceLighter)',
                          borderColor: 'var(--theme-accent)',
                          color: 'var(--theme-accent)',
                        }}
                        title="この曲を別のアルバムへ移動"
                      >
                        移動
                      </button>
                    )}
                    <span className="text-[8px]" style={{ color: 'var(--theme-list-textDim)' }}>
                      {formatDuration(track.duration || 0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Helper to render an album in LIST row mode (LIST VIEW)
  // Clicking the thumbnail jacket brings this album to the very top in enlarged ALBUM mode!
  const renderListRow = (album: AlbumGroup) => {
    const isThisAlbumPlaying =
      isPlaying &&
      currentTrackId &&
      album.tracks.some((t) => t.id === currentTrackId);

    const isThisAlbumActive =
      currentTrackId && album.tracks.some((t) => t.id === currentTrackId);

    const isExpanded = expandedListIds.has(album.id);
    const isDragTarget = dragOverAlbumId === album.id;
    const isSelected = selectedAlbumIds.has(album.id);

    return (
      <div
        key={album.id}
        draggable={!!reorderHandler && renamingAlbumId !== album.id}
        onDragStart={(e) => handleAlbumDragStart(e, album.id)}
        onDragOver={(e) => handleAlbumDragOver(e, album.id)}
        onDrop={(e) => handleAlbumDrop(e, album.id)}
        onDragEnd={handleAlbumDragEnd}
        className="border-b transition-all"
        style={{
          borderColor: isDragTarget
            ? 'var(--theme-accent)'
            : 'var(--theme-list-border)',
          opacity: draggedAlbumId === album.id ? 0.45 : 1,
        }}
      >
        <div
          onClick={() => {
            if (renamingAlbumId !== album.id) toggleExpandList(album.id);
          }}
          className="group flex items-center h-12 px-3 transition-all cursor-pointer select-none"
          style={{
            backgroundColor: isThisAlbumActive
              ? 'var(--theme-list-accentMuted)'
              : isSelected
              ? 'var(--theme-list-surfaceLighter)'
              : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (!isThisAlbumActive && !isSelected) {
              e.currentTarget.style.backgroundColor = 'var(--theme-list-surfaceLighter)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isThisAlbumActive && !isSelected) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {/* Multi-Selection Checkbox */}
          <div
            className="mr-2 shrink-0 flex items-center cursor-pointer"
            onClick={(e) => toggleSelectAlbum(album.id, e)}
            title={isSelected ? "選択を解除" : "アルバムを選択"}
          >
            <div 
              className={`w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center transition-all ${
                isSelected 
                  ? 'bg-[var(--theme-accent)] border-[var(--theme-accent)] text-white' 
                  : 'border-[var(--theme-list-border)] hover:border-[var(--theme-list-borderActive)] bg-[var(--theme-list-bg)]'
              }`}
            >
              <Check size={10} strokeWidth={3} className={isSelected ? 'opacity-100' : 'opacity-0'} />
            </div>
          </div>
          {reorderHandler && (
            <GripVertical
              size={12}
              className="mr-2.5 shrink-0 opacity-40 group-hover:opacity-90 cursor-grab active:cursor-grabbing"
              style={{ color: 'var(--theme-list-textDim)' }}
            />
          )}

          {/* Thumbnail Artwork - CLICK TO BRING TO TOP IN ENLARGED ALBUM MODE */}
          <div
            onClick={(e) => toggleZoomAlbum(e, album.id)}
            className="w-9 h-9 mr-3 shrink-0 border relative overflow-hidden bg-black/40 rounded-[2px] transition-all cursor-pointer group/art"
            style={{
              borderColor: 'var(--theme-list-border)',
            }}
            title="ジャケットをクリックして最上部にアルバム拡大モードで表示"
          >
            {renderArtwork(album.coverUrl, album.album, true)}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/art:opacity-100 transition-opacity flex items-center justify-center">
              <Maximize2 size={11} style={{ color: '#ffffff' }} />
            </div>
            {isThisAlbumPlaying && (
              <div className="absolute top-1 right-1">
                <span className="w-2 h-2 rounded-full bg-[var(--theme-accent)] block animate-pulse" />
              </div>
            )}
          </div>

          {/* Play/Pause Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlayAlbum(album);
            }}
            className="w-6 h-6 mr-3 shrink-0 border rounded-[2px] flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            style={{
              backgroundColor: 'var(--theme-list-surfaceLighter)',
              borderColor: isThisAlbumPlaying ? 'var(--theme-accent)' : 'var(--theme-list-border)',
              color: isThisAlbumPlaying ? 'var(--theme-accent)' : 'var(--theme-list-textMain)',
            }}
            title={isThisAlbumPlaying ? '一時停止' : 'アルバムを再生'}
          >
            {isThisAlbumPlaying ? (
              <Pause size={10} />
            ) : (
              <Play size={10} className="ml-0.5" />
            )}
          </button>

          {/* Album & Artist Info */}
          <div className="flex-1 min-w-0 pr-4">
            {renamingAlbumId === album.id ? (
              renderInlineAlbumTitleInput(album, false)
            ) : (
              <div
                className="text-[11px] font-bold font-mono truncate leading-tight hover:opacity-80"
                style={{ color: 'var(--theme-list-textMain)' }}
                onDoubleClick={(e) => startRenameAlbum(e, album)}
                title={`${album.album}（ダブルクリックまたは「名前変更」で編集）`}
              >
                {album.album}
              </div>
            )}
            <div
              className="text-[9.5px] mt-0.5 font-mono truncate"
              style={{ color: 'var(--theme-list-textMuted)' }}
            >
              {album.artist}
            </div>
          </div>

          {/* Reorder & Edit Controls */}
          <div className="mr-3">
            {renderAlbumOrderButtons(album, false, false)}
          </div>

          {/* Stats */}
          <div
            className="shrink-0 flex items-center gap-3 font-mono text-[9px] mr-3"
            style={{ color: 'var(--theme-list-textDim)' }}
          >
            <span>{album.tracks.length} TRACKS</span>
            <span>•</span>
            <span>{formatDuration(album.totalDuration)}</span>
          </div>

          {/* Expand Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpandList(album.id);
            }}
            className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 text-[9px] border font-mono font-bold tracking-wider transition-colors hover:opacity-80 rounded-[1px]"
            style={{
              backgroundColor: isExpanded ? 'var(--theme-accentMuted)' : 'var(--theme-list-surfaceLighter)',
              borderColor: isExpanded ? 'var(--theme-accent)' : 'var(--theme-list-border)',
              color: isExpanded ? 'var(--theme-accent)' : 'var(--theme-list-textMain)',
            }}
          >
            <span>{isExpanded ? 'CLOSE' : 'TRACKS'}</span>
            <ChevronDown size={10} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* List Row Expanded Tracks */}
        {isExpanded && (
          <div
            className="bg-black/20 divide-y pl-12 pr-4 py-1 border-t"
            style={{ borderColor: 'var(--theme-list-border)' }}
          >
            {album.tracks.map((track: any, tIdx: number) => {
              const isTrackPlaying = isPlaying && currentTrackId === track.id;
              const isTrackActive = currentTrackId === track.id;

              return (
                <div
                  key={track.id}
                  onClick={(e) => handleTrackClick(e, track, album)}
                  className="py-1.5 px-2 text-[10px] gap-3 flex items-center font-mono cursor-pointer transition-colors hover:opacity-80 rounded-[1px]"
                  style={{
                    backgroundColor: isTrackActive ? 'var(--theme-list-accentMuted)' : 'transparent',
                    color: isTrackActive ? 'var(--theme-accent)' : 'var(--theme-list-textMain)',
                  }}
                  title="クリックしてこの曲を直接再生"
                >
                  <div className="w-5 shrink-0 flex items-center justify-center">
                    {isTrackPlaying ? (
                      <div className="flex items-end gap-0.5 h-3">
                        <span className="w-0.5 h-3 bg-[var(--theme-accent)] animate-pulse" />
                        <span className="w-0.5 h-2 bg-[var(--theme-accent)] animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <span className="w-0.5 h-2.5 bg-[var(--theme-accent)] animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                    ) : (
                      <span className="text-[9px]" style={{ color: 'var(--theme-list-textDim)' }}>
                        {(tIdx + 1).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>
                  <span className="flex-1 min-w-0 truncate font-medium">
                    {track.title || track.fileName}
                  </span>
                  {onMoveTracksToAlbum && albums.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoveTargetModal({
                          trackIds: [track.id],
                          sourceAlbumId: album.id,
                          label: `「${track.title || track.fileName}」`,
                        });
                      }}
                      className="px-1.5 py-0.5 border rounded-[1px] text-[8px] font-mono font-bold transition-colors hover:opacity-80"
                      style={{
                        backgroundColor: 'var(--theme-list-surfaceLighter)',
                        borderColor: 'var(--theme-accent)',
                        color: 'var(--theme-accent)',
                      }}
                      title="この曲を別のアルバムへ移動"
                    >
                      別のアルバムへ移動
                    </button>
                  )}
                  <span className="text-[8.5px]" style={{ color: 'var(--theme-list-textDim)' }}>
                    {formatDuration(track.duration || 0)}
                  </span>
                  <button
                    onClick={(e) => handleTrackClick(e, track, album)}
                    className="p-1 hover:scale-110 transition-transform"
                    title={isTrackPlaying ? '再生中' : 'この曲を再生'}
                  >
                    {isTrackPlaying ? (
                      <Pause size={9} style={{ color: 'var(--theme-accent)' }} />
                    ) : (
                      <Play size={9} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Helper to render an album in ALBUM mode (ALBUM VIEW: wide block with cover + full track list side-by-side)
  // Also used when ANY mode's jacket is clicked (`forceZoomed = true`), rendering at the very top of the view!
  const renderAlbumBlock = (album: AlbumGroup, forceZoomed: boolean = false) => {
    const isThisAlbumPlaying =
      isPlaying &&
      currentTrackId &&
      album.tracks.some((t) => t.id === currentTrackId);

    const isThisAlbumActive =
      currentTrackId && album.tracks.some((t) => t.id === currentTrackId);

    const isZoomed = forceZoomed || effectiveZoomedAlbumId === album.id;
    const isDragTarget = dragOverAlbumId === album.id;
    const isSelected = selectedAlbumIds.has(album.id);

    // When zoomed at the top, make the cover jacket significantly larger (320px~380px) and expand across the full width!
    const activeCoverWidthPx = isZoomed
      ? Math.max(300, Math.min(400, Math.round(coverWidthPx * 1.75)))
      : coverWidthPx;

    return (
      <div
        key={forceZoomed ? `zoomed-top-${album.id}` : album.id}
        draggable={!isZoomed && !!reorderHandler && renamingAlbumId !== album.id}
        onDragStart={(e) => handleAlbumDragStart(e, album.id)}
        onDragOver={(e) => handleAlbumDragOver(e, album.id)}
        onDrop={(e) => handleAlbumDrop(e, album.id)}
        onDragEnd={handleAlbumDragEnd}
        className="group border flex flex-row overflow-hidden rounded-[2px] transition-all duration-200 min-w-0 w-full"
        style={{
          backgroundColor: isThisAlbumActive
            ? 'var(--theme-list-surfaceLighter)'
            : 'var(--theme-list-surface)',
          borderColor: isDragTarget || isSelected
            ? 'var(--theme-accent)'
            : 'var(--theme-list-border)',
          boxShadow: isDragTarget || isSelected
            ? '0 0 0 2px var(--theme-accent)'
            : 'none',
          opacity: draggedAlbumId === album.id ? 0.45 : 1,
          gridColumn: isZoomed ? '1 / -1' : undefined,
        }}
      >
        {/* Left Side: Dynamic Scaled Artwork + Controls */}
        <div
          className="shrink-0 flex flex-col border-r transition-all duration-200"
          style={{
            width: `${activeCoverWidthPx}px`,
            borderColor: 'var(--theme-list-border)',
          }}
        >
          {/* Album Cover Jacket - CLICK TO ENLARGE TO TOP / CLICK AGAIN TO RESTORE */}
          <div
            className="aspect-square w-full relative overflow-hidden bg-black/40 group/art cursor-pointer"
            onClick={(e) => toggleZoomAlbum(e, album.id)}
            title={isZoomed ? 'ジャケットをクリックして元の並び・元の表示に戻す' : 'ジャケットをクリックして一番上に拡大表示する'}
          >
            {/* Multi-Selection Checkbox */}
            <div
              className="absolute top-2 left-2 z-30"
              onClick={(e) => toggleSelectAlbum(album.id, e)}
              title={isSelected ? "選択を解除" : "アルバムを選択"}
            >
              <div 
                className={`w-4 h-4 rounded-[2px] border flex items-center justify-center cursor-pointer transition-all shadow-md ${
                  isSelected 
                    ? 'bg-[var(--theme-accent)] border-[var(--theme-accent)] text-white' 
                    : 'bg-black/60 border-white/60 hover:border-white text-transparent hover:bg-black/80'
                }`}
              >
                <Check size={11} strokeWidth={3} className={isSelected ? 'opacity-100' : 'opacity-0'} />
              </div>
            </div>
            {renderArtwork(album.coverUrl, album.album, activeCoverWidthPx < 110)}

            {/* Hover Zoom Indicator Overlay */}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/art:opacity-100 transition-opacity flex items-center justify-center">
              <div
                className="px-2.5 py-1 border rounded-[2px] font-mono text-[10px] font-bold tracking-wider flex items-center gap-1.5 shadow-lg backdrop-blur-sm"
                style={{
                  backgroundColor: 'rgba(15, 20, 28, 0.85)',
                  borderColor: 'var(--theme-accent)',
                  color: 'var(--theme-accent)',
                }}
              >
                {isZoomed ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                <span>{isZoomed ? '元の表示に戻す' : '最上部に拡大表示'}</span>
              </div>
            </div>

            {isThisAlbumPlaying && (
              <div
                className="absolute top-2 right-2 px-1.5 py-0.5 text-[8px] font-mono font-bold tracking-widest uppercase border rounded-[1px] shadow-sm flex items-center gap-1 animate-pulse"
                style={{
                  backgroundColor: 'var(--theme-surfaceLighter)',
                  borderColor: 'var(--theme-accent)',
                  color: 'var(--theme-accent)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent)]" />
                PLAYING
              </div>
            )}
          </div>

          {/* Quick info & Play Album button under artwork */}
          <div className={`${isZoomed ? 'p-3.5 gap-2.5' : 'p-2 gap-1.5'} flex flex-col mt-auto`}>
            <button
              onClick={() => onPlayAlbum(album)}
              className={`w-full flex items-center justify-center gap-1.5 ${isZoomed ? 'py-2 text-[11.5px]' : 'py-1 text-[8.5px]'} border font-mono font-bold tracking-wider transition-colors hover:opacity-80 active:scale-95 rounded-[1px]`}
              style={{
                backgroundColor: isThisAlbumPlaying ? 'var(--theme-accentMuted)' : 'var(--theme-list-surfaceLighter)',
                borderColor: isThisAlbumPlaying ? 'var(--theme-accent)' : 'var(--theme-list-border)',
                color: isThisAlbumPlaying ? 'var(--theme-accent)' : 'var(--theme-list-textMain)',
              }}
              title="このアルバムを頭から再生"
            >
              {isThisAlbumPlaying ? <Pause size={isZoomed ? 13 : 9} /> : <Play size={isZoomed ? 13 : 9} />}
              <span className="truncate">{isThisAlbumPlaying ? 'PAUSE ALBUM' : 'PLAY ALBUM'}</span>
            </button>

            <div
              className={`flex items-center justify-between ${isZoomed ? 'text-[10.5px]' : 'text-[7.5px]'} font-mono`}
              style={{ color: 'var(--theme-list-textDim)' }}
            >
              <span>{album.tracks.length} TRACKS</span>
              <span>{formatDuration(album.totalDuration)}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Header + Direct Playable Track List */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header with Artist Badge + Album Name + Reorder / Edit Controls */}
          <div
            className={`${isZoomed ? 'px-4 py-3' : 'p-2'} border-b flex items-start justify-between gap-2`}
            style={{
              backgroundColor: 'var(--theme-list-surfaceLighter)',
              borderColor: 'var(--theme-list-border)',
            }}
          >
            <div className="flex items-start gap-1.5 min-w-0 flex-1">
              {reorderHandler && !isZoomed && (
                <GripVertical
                  size={12}
                  className="mt-0.5 shrink-0 opacity-40 group-hover:opacity-90 cursor-grab active:cursor-grabbing"
                  style={{ color: 'var(--theme-list-textDim)' }}
                />
              )}
              <div className="min-w-0 flex-1">
                {renamingAlbumId === album.id ? (
                  renderInlineAlbumTitleInput(album, isZoomed)
                ) : (
                  <div
                    className={`${isZoomed ? 'text-[17px]' : 'text-[11px]'} font-bold font-mono truncate leading-tight cursor-pointer hover:opacity-80`}
                    style={{ color: 'var(--theme-list-textMain)' }}
                    title={`${album.album} (ダブルクリックまたは「名前変更」ボタンでタイトル編集 / クリックで拡大)`}
                    onClick={(e) => toggleZoomAlbum(e, album.id)}
                    onDoubleClick={(e) => startRenameAlbum(e, album)}
                  >
                    {album.album}
                  </div>
                )}
                <div
                  className={`${isZoomed ? 'text-[12.5px] mt-1.5' : 'text-[9px] mt-0.5'} font-mono truncate flex items-center gap-1.5`}
                  style={{ color: 'var(--theme-list-textMuted)' }}
                  title={album.artist}
                >
                  <User size={isZoomed ? 12 : 9} className="shrink-0 opacity-70" />
                  <span className="truncate">{album.artist}</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1.5">
              {isZoomed && (
                <button
                  onClick={(e) => toggleZoomAlbum(e, album.id)}
                  className="px-2.5 h-6 border rounded-[1px] font-mono text-[10px] font-bold tracking-wider flex items-center gap-1 transition-colors hover:opacity-80 active:scale-95"
                  style={{
                    backgroundColor: 'var(--theme-accentMuted)',
                    borderColor: 'var(--theme-accent)',
                    color: 'var(--theme-accent)',
                  }}
                  title="元の位置・元の表示に戻す"
                >
                  <Minimize2 size={10} />
                  <span>元に戻す</span>
                </button>
              )}
              {renderAlbumOrderButtons(album, activeCoverWidthPx < 120, isZoomed)}
            </div>
          </div>

          {/* Track List Preview - DIRECT CLICK TO PLAY! */}
          <div
            className="flex-1 overflow-y-auto divide-y"
            style={{
              maxHeight: isZoomed
                ? `${Math.max(420, Math.round(activeCoverWidthPx * 1.45))}px`
                : `${Math.max(130, Math.round(activeCoverWidthPx * 1.15))}px`,
              borderColor: 'var(--theme-list-border)',
            }}
          >
            {album.tracks.map((track: any, tIdx: number) => {
              const isTrackPlaying = isPlaying && currentTrackId === track.id;
              const isTrackActive = currentTrackId === track.id;

              return (
                <div
                  key={track.id}
                  onClick={(e) => handleTrackClick(e, track, album)}
                  className={`${isZoomed ? 'px-4 py-2.5 text-[13.5px] gap-3.5' : 'px-2 py-1 text-[9px] gap-2'} flex items-center font-mono transition-colors cursor-pointer group/row hover:opacity-80`}
                  style={{
                    backgroundColor: isTrackActive
                      ? 'var(--theme-list-accentMuted)'
                      : 'transparent',
                    color: isTrackActive
                      ? 'var(--theme-list-accent)'
                      : 'var(--theme-list-textMain)',
                  }}
                  title="クリックしてこの曲を直接再生"
                >
                  <div className={`${isZoomed ? 'w-7' : 'w-4'} shrink-0 flex items-center justify-center`}>
                    {isTrackPlaying ? (
                      <div className="flex items-end gap-0.5 h-3">
                        <span className="w-0.5 h-3 bg-[var(--theme-accent)] animate-pulse" />
                        <span className="w-0.5 h-2 bg-[var(--theme-accent)] animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <span className="w-0.5 h-2.5 bg-[var(--theme-accent)] animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                    ) : (
                      <span
                        className={isZoomed ? 'text-[12px]' : 'text-[8px]'}
                        style={{ color: 'var(--theme-list-textDim)' }}
                      >
                        {track.trackNumber ? track.trackNumber.toString().padStart(2, '0') : (tIdx + 1).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>

                  <span className="flex-1 min-w-0 truncate font-medium">
                    {track.title || track.fileName}
                  </span>

                  <div className="shrink-0 flex items-center gap-2">
                    {onMoveTracksToAlbum && albums.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMoveTargetModal({
                            trackIds: [track.id],
                            sourceAlbumId: album.id,
                            label: `「${track.title || track.fileName}」`,
                          });
                        }}
                        className={`${isZoomed ? 'px-2 py-0.5 text-[10px]' : 'px-1 py-0.5 text-[7.5px]'} opacity-0 group-hover/row:opacity-100 border rounded-[1px] font-mono font-bold transition-all hover:opacity-100`}
                        style={{
                          backgroundColor: 'var(--theme-list-surfaceLighter)',
                          borderColor: 'var(--theme-accent)',
                          color: 'var(--theme-accent)',
                        }}
                        title="この曲を別のアルバムへ移動する"
                      >
                        移動
                      </button>
                    )}

                    <span
                      className={isZoomed ? 'text-[12px]' : 'text-[8px]'}
                      style={{ color: 'var(--theme-list-textDim)' }}
                    >
                      {formatDuration(track.duration || 0)}
                    </span>

                    <button
                      onClick={(e) => handleTrackClick(e, track, album)}
                      className="opacity-0 group-hover/row:opacity-100 p-0.5 hover:scale-110 transition-all"
                      title={isTrackPlaying ? '再生中' : 'この曲を再生'}
                    >
                      {isTrackPlaying ? (
                        <Pause size={isZoomed ? 13 : 9} style={{ color: 'var(--theme-accent)' }} />
                      ) : (
                        <Play size={isZoomed ? 13 : 9} style={{ color: 'var(--theme-textMain)' }} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Renders the top-pinned enlarged ALBUM mode block whenever any album jacket is clicked in CARDS, ALBUM, or LIST mode
  const renderTopZoomedAlbumSection = () => {
    if (!zoomedAlbum) return null;
    return (
      <div className="mb-4 pb-3 border-b w-full" style={{ borderColor: 'var(--theme-list-border)' }}>
        {renderAlbumBlock(zoomedAlbum, true)}
      </div>
    );
  };

  // Fixed Centered Modal for selecting target album when moving 1 track or merging a split album (Never clipped by scroll!)
  const renderMoveTargetModal = () => {
    if (!moveTargetModal || !onMoveTracksToAlbum) return null;
    const candidateAlbums = albums.filter((a) => a.id !== moveTargetModal.sourceAlbumId);

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        onClick={() => setMoveTargetModal(null)}
      >
        <div
          className="w-full max-w-md border rounded-[2px] shadow-2xl flex flex-col overflow-hidden font-mono"
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-accent)',
            color: 'var(--theme-textMain)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="px-4 py-2.5 border-b flex items-center justify-between"
            style={{
              backgroundColor: 'var(--theme-surfaceLighter)',
              borderColor: 'var(--theme-border)',
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Disc size={14} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
              <span className="text-[11px] font-bold tracking-wider truncate">
                移動先のアルバムを選択
              </span>
            </div>
            <button
              onClick={() => setMoveTargetModal(null)}
              className="px-2 py-0.5 text-[10px] border rounded-[1px] hover:opacity-80"
              style={{
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-textMuted)',
              }}
            >
              閉じる
            </button>
          </div>

          <div
            className="px-4 py-2 border-b text-[10px]"
            style={{
              backgroundColor: 'var(--theme-bg)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-textMuted)',
            }}
          >
            移動対象: <span className="font-bold" style={{ color: 'var(--theme-accent)' }}>{moveTargetModal.label}</span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y" style={{ borderColor: 'var(--theme-border)' }}>
            {candidateAlbums.map((targetAlb) => (
              <button
                key={targetAlb.id}
                onClick={() => {
                  onMoveTracksToAlbum(moveTargetModal.trackIds, targetAlb);
                  setMoveTargetModal(null);
                }}
                className="w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors hover:opacity-90"
                style={{ color: 'var(--theme-textMain)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-surfaceLighter)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div
                  className="w-9 h-9 shrink-0 border rounded-[1px] overflow-hidden flex items-center justify-center bg-black/40"
                  style={{ borderColor: 'var(--theme-border)' }}
                >
                  {targetAlb.coverUrl ? (
                    <img src={targetAlb.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Disc size={14} style={{ color: 'var(--theme-textDim)' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold truncate">{targetAlb.album}</div>
                  <div className="text-[9px] truncate" style={{ color: 'var(--theme-textMuted)' }}>
                    {targetAlb.artist} • {targetAlb.tracks.length} TRACKS
                  </div>
                </div>
                <span
                  className="px-2 py-1 text-[9px] font-bold border rounded-[1px] shrink-0"
                  style={{
                    backgroundColor: 'var(--theme-accentMuted)',
                    borderColor: 'var(--theme-accent)',
                    color: 'var(--theme-accent)',
                  }}
                >
                  ここへ移動
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (albums.length === 0) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center p-8 text-center"
        style={{ color: 'var(--theme-list-textDim)' }}
      >
        <Disc size={36} className="mb-2 opacity-50" />
        <span className="text-[11px] font-mono font-bold tracking-widest uppercase">
          NO ALBUMS DETECTED
        </span>
        <span className="text-[9px] font-mono tracking-wider mt-1 opacity-60">
          曲データを読み込むと、アルバムジャケットが自動的にタイル整列表示されます
        </span>
      </div>
    );
  }

  // Remaining albums (excluding the one currently pinned to the top in enlarged mode)
  const remainingAlbums = zoomedAlbum
    ? albums.filter((a) => a.id !== zoomedAlbum.id)
    : albums;

  // MODE A: GROUPED BY ARTIST (Now also tiles artists horizontally side-by-side when each artist has 1 album, or in a clean multi-column grid!)
  if (groupByArtist) {
    return (
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 w-full">
        {renderMoveTargetModal()}
        {renderSelectionBanner()}
        <div
          className="flex items-center justify-between pb-2 mb-3 border-b text-[9px] font-mono shrink-0"
          style={{
            borderColor: 'var(--theme-list-border)',
            color: 'var(--theme-list-textDim)',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="font-bold tracking-wider uppercase text-[9.5px]"
              style={{ color: 'var(--theme-list-textMain)' }}
            >
              {artists.length} ARTISTS • {albums.length} ALBUMS
            </span>
            <button
              onClick={selectAllAlbums}
              className="px-2 py-0.5 border rounded-[1px] tracking-wider uppercase transition-colors hover:opacity-80 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: 'var(--theme-list-surfaceLighter)',
                borderColor: 'var(--theme-list-border)',
                color: 'var(--theme-list-textMuted)',
              }}
              title="すべてのアルバムを選択"
            >
              全選択
            </button>
            <span>•</span>
            <span className="tracking-widest">MULTI-COLUMN ARTIST TILE VIEW</span>
          </div>
          {(displayMode === 'card' || displayMode === 'list') && (
            <button
              onClick={displayMode === 'card' ? toggleAllCards : toggleAllLists}
              className="px-2 py-0.5 border rounded-[1px] tracking-wider uppercase transition-colors hover:opacity-80 active:scale-95"
              style={{
                backgroundColor: 'var(--theme-list-surfaceLighter)',
                borderColor: 'var(--theme-list-border)',
                color: 'var(--theme-list-textMuted)',
              }}
            >
              {(displayMode === 'card' ? isAllCardsExpanded : isAllListsExpanded)
                ? 'COLLAPSE ALL TRACKS'
                : 'EXPAND ALL TRACKS'}
            </button>
          )}
        </div>

        {/* Top-Pinned Enlarged Album (in ALBUM mode layout) when any jacket is clicked */}
        {renderTopZoomedAlbumSection()}

        {/* Multi-column grid of Artist blocks so artists also flow horizontally left-to-right and wrap! */}
        <div
          style={
            displayMode === 'list'
              ? { display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }
              : displayMode === 'album'
              ? coverGridStyle
              : cardGridStyle
          }
        >
          {artists.map((artGroup) => {
            const visibleArtistAlbums = zoomedAlbum
              ? artGroup.albums.filter((a) => a.id !== zoomedAlbum.id)
              : artGroup.albums;
            if (visibleArtistAlbums.length === 0) return null;

            const spansMultiple = visibleArtistAlbums.length > 1 && displayMode !== 'list';
            return (
              <div
                key={artGroup.artist}
                className="border rounded-[2px] p-2 flex flex-col gap-2 min-w-0 transition-all"
                style={{
                  borderColor: 'var(--theme-list-border)',
                  backgroundColor: 'rgba(0,0,0,0.08)',
                  gridColumn: spansMultiple
                    ? `span ${Math.min(3, visibleArtistAlbums.length)}`
                    : undefined,
                }}
              >
                {/* Compact Artist Header Banner */}
                <div
                  className="flex items-center justify-between pb-1.5 border-b gap-2"
                  style={{ borderColor: 'var(--theme-list-border)' }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className="p-1 border rounded-[1px] shrink-0"
                      style={{
                        backgroundColor: 'var(--theme-list-surfaceLighter)',
                        borderColor: 'var(--theme-list-border)',
                        color: 'var(--theme-accent)',
                      }}
                    >
                      <User size={10} />
                    </div>
                    <div className="min-w-0">
                      <div
                        className="text-[10.5px] font-bold tracking-wider uppercase truncate leading-tight"
                        style={{ color: 'var(--theme-list-textMain)' }}
                        title={artGroup.artist}
                      >
                        {artGroup.artist}
                      </div>
                      <div
                        className="text-[8px] font-mono tracking-wider truncate"
                        style={{ color: 'var(--theme-list-textMuted)' }}
                      >
                        {artGroup.albums.length} ALBUM{artGroup.albums.length > 1 ? 'S' : ''} • {artGroup.totalTracks}T •{' '}
                        {formatDuration(artGroup.totalDuration)}
                      </div>
                    </div>
                  </div>

                  {/* Quick Play All by Artist */}
                  {onPlayArtist && (
                    <button
                      onClick={() => onPlayArtist(artGroup)}
                      className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 border text-[8px] font-mono font-bold tracking-wider transition-colors hover:opacity-80 active:scale-95 rounded-[1px]"
                      style={{
                        backgroundColor: 'var(--theme-list-surfaceLighter)',
                        borderColor: 'var(--theme-list-border)',
                        color: 'var(--theme-accent)',
                      }}
                      title={`${artGroup.artist} の全曲を再生`}
                    >
                      <Play size={8} />
                      <span>PLAY ALL</span>
                    </button>
                  )}
                </div>

                {/* Albums inside this Artist block */}
                {displayMode === 'list' ? (
                  <div className="border divide-y rounded-[2px] w-full" style={{ borderColor: 'var(--theme-list-border)', backgroundColor: 'var(--theme-list-surface)' }}>
                    {visibleArtistAlbums.map(renderListRow)}
                  </div>
                ) : displayMode === 'album' ? (
                  <div
                    style={
                      visibleArtistAlbums.length > 1
                        ? {
                            display: 'grid',
                            gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(240, albumBlockMinWidth - 20)}px, 1fr))`,
                            gap: '10px',
                          }
                        : { display: 'flex', flexDirection: 'column', flex: 1 }
                    }
                  >
                    {visibleArtistAlbums.map((alb) => renderAlbumBlock(alb, false))}
                  </div>
                ) : (
                  <div
                    style={
                      visibleArtistAlbums.length > 1
                        ? {
                            display: 'grid',
                            gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(90, cardScale - 15)}px, 1fr))`,
                            gap: '8px',
                          }
                        : { display: 'flex', flexDirection: 'column', flex: 1 }
                    }
                  >
                    {visibleArtistAlbums.map(renderCard)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // MODE B: FLAT TILES (Default: All albums/artists tiled horizontally left-to-right and wrapping down, scaling all at once!)
  if (displayMode === 'list') {
    return (
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 w-full">
        {renderMoveTargetModal()}
        {renderSelectionBanner()}
        <div
          className="flex items-center justify-between pb-2 border-b text-[9px] font-mono shrink-0 mb-3"
          style={{
            borderColor: 'var(--theme-list-border)',
            color: 'var(--theme-list-textDim)',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="font-bold tracking-wider uppercase text-[9.5px]"
              style={{ color: 'var(--theme-list-textMain)' }}
            >
              {albums.length} ALBUMS
            </span>
            <button
              onClick={selectAllAlbums}
              className="px-2 py-0.5 border rounded-[1px] tracking-wider uppercase transition-colors hover:opacity-80 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: 'var(--theme-list-surfaceLighter)',
                borderColor: 'var(--theme-list-border)',
                color: 'var(--theme-list-textMuted)',
              }}
              title="すべてのアルバムを選択"
            >
              全選択
            </button>
            <span>•</span>
            <span className="tracking-widest">LIST CATALOG</span>
          </div>
          <button
            onClick={toggleAllLists}
            className="px-2 py-0.5 border rounded-[1px] tracking-wider uppercase transition-colors hover:opacity-80 active:scale-95"
            style={{
              backgroundColor: 'var(--theme-list-surfaceLighter)',
              borderColor: 'var(--theme-list-border)',
              color: 'var(--theme-list-textMuted)',
            }}
          >
            {isAllListsExpanded ? 'COLLAPSE ALL TRACKS' : 'EXPAND ALL TRACKS'}
          </button>
        </div>

        {/* Top-Pinned Enlarged Album (in ALBUM mode layout) when any jacket is clicked */}
        {renderTopZoomedAlbumSection()}

        {remainingAlbums.length > 0 && (
          <div className="border divide-y rounded-[2px] w-full" style={{ borderColor: 'var(--theme-list-border)', backgroundColor: 'var(--theme-list-surface)' }}>
            {remainingAlbums.map(renderListRow)}
          </div>
        )}
      </div>
    );
  }

  if (displayMode === 'album') {
    return (
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 w-full">
        {renderMoveTargetModal()}
        {renderSelectionBanner()}
        <div
          className="flex items-center justify-between pb-2 border-b text-[9px] font-mono shrink-0 mb-3"
          style={{
            borderColor: 'var(--theme-list-border)',
            color: 'var(--theme-list-textDim)',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="font-bold tracking-wider uppercase text-[9.5px]"
              style={{ color: 'var(--theme-list-textMain)' }}
            >
              {albums.length} ALBUMS ({artists.length} ARTISTS)
            </span>
            <button
              onClick={selectAllAlbums}
              className="px-2 py-0.5 border rounded-[1px] tracking-wider uppercase transition-colors hover:opacity-80 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: 'var(--theme-list-surfaceLighter)',
                borderColor: 'var(--theme-list-border)',
                color: 'var(--theme-list-textMuted)',
              }}
              title="すべてのアルバムを選択"
            >
              全選択
            </button>
            <span>•</span>
            <span className="tracking-widest">TILE GRID VIEW (COVER + TRACKS)</span>
          </div>
          <span className="text-[8px] font-mono tracking-wider opacity-75">
            USE SIZE SLIDER TO SCALE ALL TILES AT ONCE
          </span>
        </div>

        {/* Top-Pinned Enlarged Album (in ALBUM mode layout) when any jacket is clicked */}
        {renderTopZoomedAlbumSection()}

        {remainingAlbums.length > 0 && (
          <div style={coverGridStyle}>
            {remainingAlbums.map((alb) => renderAlbumBlock(alb, false))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 w-full">
      {renderMoveTargetModal()}
      {renderSelectionBanner()}
      <div
        className="flex items-center justify-between pb-2 border-b text-[9px] font-mono shrink-0 mb-3"
        style={{
          borderColor: 'var(--theme-list-border)',
          color: 'var(--theme-list-textDim)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="font-bold tracking-wider uppercase text-[9.5px]"
            style={{ color: 'var(--theme-list-textMain)' }}
          >
            {albums.length} ALBUMS ({artists.length} ARTISTS)
          </span>
          <button
            onClick={selectAllAlbums}
            className="px-2 py-0.5 border rounded-[1px] tracking-wider uppercase transition-colors hover:opacity-80 active:scale-95 cursor-pointer"
            style={{
              backgroundColor: 'var(--theme-list-surfaceLighter)',
              borderColor: 'var(--theme-list-border)',
              color: 'var(--theme-list-textMuted)',
            }}
            title="すべてのアルバムを選択"
          >
            全選択
          </button>
          <span>•</span>
          <span className="tracking-widest">TILE GRID VIEW (CARDS)</span>
        </div>
        <button
          onClick={toggleAllCards}
          className="px-2 py-0.5 border rounded-[1px] tracking-wider uppercase transition-colors hover:opacity-80 active:scale-95"
          style={{
            backgroundColor: 'var(--theme-list-surfaceLighter)',
            borderColor: 'var(--theme-list-border)',
            color: 'var(--theme-list-textMuted)',
          }}
        >
          {isAllCardsExpanded ? 'COLLAPSE ALL TRACKS' : 'EXPAND ALL TRACKS'}
        </button>
      </div>

      {/* Top-Pinned Enlarged Album (in ALBUM mode layout) when any jacket is clicked */}
      {renderTopZoomedAlbumSection()}

      {remainingAlbums.length > 0 && (
        <div style={cardGridStyle}>
          {remainingAlbums.map(renderCard)}
        </div>
      )}
    </div>
  );
};

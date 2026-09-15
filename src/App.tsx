import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX,
  FolderOpen, ListMusic, Plus, Search, ChevronUp, ChevronDown, 
  ChevronsUp, ChevronsDown, Palette, Activity, Check, X, Trash2, ListPlus, AlertCircle,
  Minimize2, Maximize2, Layers, Minus, PanelTop, GripVertical, Type, Eye, EyeOff
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { get, set } from 'idb-keyval';
import * as mm from 'music-metadata-browser';

// --- Types ---
interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  trackNumber: string;
  fileName: string;
  url: string;
  file?: File;
  duration: number;
  coverUrl?: string;
  missing?: boolean; // true when file blob is not available (e.g. different PC)
  size?: number;
  lastModified?: number;
}

interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}

const THEMES = [
  { 
    id: 'NAVY', 
    bg: '#0d1117', 
    surface: '#121822',
    surfaceLighter: '#1a2332',
    border: '#2c3b53', 
    borderActive: '#4a648c',
    textMain: '#c5d1e0',
    textMuted: '#627a9c',
    textDim: '#415370',
    accent: '#5da0ea',
    accentDark: '#4a648c',
    accentMuted: '#1d2738',
    sliderTrackBg: '#080b10',
    sliderTrackBorder: '#2c3b53'
  },
  { 
    id: 'BLACK', 
    bg: '#0B0C0D', 
    surface: '#14161A',
    surfaceLighter: '#1C2026',
    border: '#252932', 
    borderActive: '#3B4352',
    textMain: '#E1E4EA',
    textMuted: '#7B8494',
    textDim: '#4A5260',
    accent: '#8EA1BD',
    accentDark: '#5D6B80',
    accentMuted: '#161C26',
    sliderTrackBg: '#040506',
    sliderTrackBorder: '#353c48'
  },
  { 
    id: 'GRAY', 
    bg: '#363d47', 
    surface: '#434b57',
    surfaceLighter: '#4e5765',
    border: '#576272', 
    borderActive: '#727e91',
    textMain: '#f0f3f7',
    textMuted: '#a2afbf',
    textDim: '#707d8e',
    accent: '#94a7c1',
    accentDark: '#6a7e99',
    accentMuted: '#2b313a',
    sliderTrackBg: '#252a32',
    sliderTrackBorder: '#454e5c',
    // 04 & 05 ヘッダーバー (#363D47)
    listHeaderBg: '#363d47',
    listHeaderBorder: '#576272',
    listHeaderText: '#f0f3f7',
    listHeaderTextMuted: '#a2afbf',
    // 04 & 05 LIST AREA (プレイリスト一覧 & トラックリスト: 白背景 & 濃いめグレー文字)
    listBg: '#ffffff',
    listSurface: '#f4f6f8',
    listSurfaceLighter: '#edf1f5',
    listBorder: '#b8c5ce',
    listBorderActive: '#727e91',
    listTextMain: '#111a24',
    listTextMuted: '#3a4d5e',
    listTextDim: '#637b8f',
    listAccent: '#213040',
    listAccentMuted: '#dbe3eb',
    listIconColor: '#1a2530',
  },
  { 
    id: 'LIGHT', 
    bg: '#e8ecef', 
    surface: '#f4f6f8',
    surfaceLighter: '#ffffff',
    border: '#9ba9b5', 
    borderActive: '#617789',
    textMain: '#111a24',
    textMuted: '#3a4d5e',
    textDim: '#637b8f',
    accent: '#213040',
    accentDark: '#121c26',
    accentMuted: '#b8c5ce',
    sliderTrackBg: '#ffffff',
    sliderTrackBorder: '#9ba9b5'
  },
  { 
    id: 'BROWN', 
    bg: '#1a1614', 
    surface: '#241e1b',
    surfaceLighter: '#2e2723',
    border: '#453c37', 
    borderActive: '#6b5f58',
    textMain: '#e0d3c8',
    textMuted: '#96887e',
    textDim: '#6b5f58',
    accent: '#d6a076',
    accentDark: '#b58560',
    accentMuted: '#3d2e24',
    sliderTrackBg: '#0d0b0a',
    sliderTrackBorder: '#61534b'
  },
  { 
    id: 'OLIVE', 
    bg: '#161a15', 
    surface: '#1e241c',
    surfaceLighter: '#283025',
    border: '#3c4a37', 
    borderActive: '#5b7053',
    textMain: '#d2dfcb',
    textMuted: '#8b9e83',
    textDim: '#5b7053',
    accent: '#92c27c',
    accentDark: '#759e62',
    accentMuted: '#2d3d25',
    sliderTrackBg: '#0a0d09',
    sliderTrackBorder: '#51664a'
  },
  { 
    id: 'RED', 
    bg: '#140808', 
    surface: '#1f0d0d',
    surfaceLighter: '#2b1212',
    border: '#6e1f1f', 
    borderActive: '#962b2b',
    textMain: '#f2cdcd',
    textMuted: '#c99393',
    textDim: '#946262',
    accent: '#e65c5c',
    accentDark: '#b34747',
    accentMuted: '#421a1a',
    sliderTrackBg: '#0a0303',
    sliderTrackBorder: '#8a2727'
  }
];

// --- Utils ---
const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const parseFilename = (filename: string): { title: string, artist: string } => {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  if (nameWithoutExt.includes('-')) {
    const parts = nameWithoutExt.split('-');
    return {
      artist: parts[0].trim() || 'Unknown Artist',
      title: parts.slice(1).join('-').trim() || 'Unknown Title'
    };
  }
  return { title: nameWithoutExt, artist: 'Unknown Artist' };
};

const COL_LABELS: Record<string, string> = {
  fileName: '名前',
  trackNumber: '#No',
  title: 'タイトル',
  artist: '参加アーティスト',
  album: 'アルバム'
};

const PanelBlock = ({ title, children, className = "", styleVars }: { title: string, children: React.ReactNode, className?: string, styleVars?: React.CSSProperties }) => (
  <div className={`border flex flex-col relative ${className}`} style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', ...styleVars }}>
    {title && (
      <div className="absolute -top-2 left-2 px-1 z-50" style={{ backgroundColor: 'var(--theme-surface)' }}>
         <span className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--theme-textMuted)' }}>{title}</span>
      </div>
    )}
    <div className={`flex-1 overflow-hidden ${title ? 'pt-4' : ''}`}>
      {children}
    </div>
  </div>
);

const getEmbeddedCover = async (file: File): Promise<string | null> => {
  try {
    const metadata = await mm.parseBlob(file, { skipCovers: false });
    const picture = metadata.common.picture?.[0];
    if (!picture) return null;
    // Normalize format - some m4a files report format as 'jpeg' without 'image/' prefix
    let mimeType = picture.format;
    if (!mimeType.startsWith('image/')) {
      mimeType = `image/${mimeType}`;
    }
    return URL.createObjectURL(new Blob([picture.data], { type: mimeType }));
  } catch (err) {
    console.error("Error reading metadata", err);
    return null;
  }
};

export default function App() {
  // --- State ---
  const [library, setLibrary] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([
    { id: 'all-tracks', name: 'ALL TRACKS', tracks: [] }
  ]);
  const [activePlaylistId, setActivePlaylistId] = useState<string>('all-tracks');
  const [playingPlaylistId, setPlayingPlaylistId] = useState<string>('all-tracks');
  
  // Player state
  const [playbackQueue, setPlaybackQueue] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState<number>(() => {
    try {
      const savedVol = localStorage.getItem('v2_solidVolume');
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed;
      }
    } catch(e) {}
    return 1;
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('v2_solidIsMuted') === 'true';
    } catch(e) {}
    return false;
  });
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<0|1|2|3>(0); // 0: off, 1: all, 2: one, 3: set (selected lists)
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState('');
  const [themeIndex, setThemeIndex] = useState<number>(() => {
    try {
      const savedThemeId = localStorage.getItem('v2_solidThemeId');
      if (savedThemeId) {
        const foundIdx = THEMES.findIndex(t => t.id === savedThemeId);
        if (foundIdx !== -1) return foundIdx;
      }
      const savedThemeIdx = localStorage.getItem('v2_solidThemeIndex');
      if (savedThemeIdx !== null) {
        const parsed = parseInt(savedThemeIdx);
        if (!isNaN(parsed) && parsed >= 0 && parsed < THEMES.length) return parsed;
      }
    } catch(e) {}
    return 0;
  });
  const [listFontSize, setListFontSize] = useState<number>(11);
  const [colWidths, setColWidths] = useState({
    index: 96,
    art: 40,
    trackNumber: 48,
    fileName: 180,
    title: 300,
    artist: 180,
    album: 180
  });
  const [colVisibility, setColVisibility] = useState({
    art: true,
    fileName: true,
    trackNumber: true,
    title: true,
    artist: true,
    album: true,
    actions: true
  });
  const [colOrder, setColOrder] = useState<string[]>([
    'fileName', 'trackNumber', 'title', 'artist', 'album'
  ]);
  const columnsContainerRef = useRef<HTMLDivElement>(null);
  const colResizing = useRef<{
    type: 'index' | 'pair';
    key?: string;
    leftKey?: string;
    rightKey?: string;
    startX: number;
    startWidth?: number;
    startLeft?: number;
    startRight?: number;
    containerWidth?: number;
    totalWeight?: number;
  } | null>(null);

  const visibleCols = useMemo(() => {
    return colOrder.filter(col => colVisibility[col as keyof typeof colVisibility]);
  }, [colOrder, colVisibility]);
  
  type SortKey = 'title' | 'artist' | 'album' | 'fileName' | 'trackNumber' | 'none';
  type SortConfigType = { key: SortKey, direction: 'asc' | 'desc' };
  
  const [sortConfigs, setSortConfigs] = useState<Record<string, SortConfigType>>(() => {
    try {
      const saved = localStorage.getItem('v2_sortConfigs');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {};
  });

  const sortConfig = sortConfigs[activePlaylistId] || { key: 'none', direction: 'asc' };
  const activeSortConfig = sortConfig; // Fallback alias
  
  const setSortConfig = (newConfig: SortConfigType | ((prev: SortConfigType) => SortConfigType)) => {
    setSortConfigs(prev => {
      const current = prev[activePlaylistId] || { key: 'none', direction: 'asc' };
      const nextConfig = typeof newConfig === 'function' ? newConfig(current) : newConfig;
      const updated = { ...prev, [activePlaylistId]: nextConfig };
      localStorage.setItem('v2_sortConfigs', JSON.stringify(updated));
      return updated;
    });
  };

  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [showColMenu, setShowColMenu] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ done: 0, total: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const sidebarResizing = useRef(false);
  
  // Edit State
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  
  // Playlist Rename & Delete State
  const [renamingPlaylistId, setRenamingPlaylistId] = useState<string | null>(null);
  const [renamingPlaylistName, setRenamingPlaylistName] = useState('');
  const [draggedPlaylistId, setDraggedPlaylistId] = useState<string | null>(null);
  const [dragOverPlaylistId, setDragOverPlaylistId] = useState<string | null>(null);
  const [confirmDeletePlaylistId, setConfirmDeletePlaylistId] = useState<string | null>(null);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<string>>(new Set());
  const [isPlaylistSelectionMode, setIsPlaylistSelectionMode] = useState(false);
  const lastSelectedPlaylistIdRef = useRef<string | null>(null);
  const [confirmDeleteSelectedPlaylists, setConfirmDeleteSelectedPlaylists] = useState(false);

  // Duplicates & Mini Mode State
  const [duplicateGroups, setDuplicateGroups] = useState<Track[][]>([]);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [viewMode, setViewMode] = useState<'full' | 'mini' | 'slim'>('full');

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const playerRef = useRef<HTMLDivElement>(null);

  // Dragging State for Mini/Slim modes
  const [playerOffset, setPlayerOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef({ 
    isDragging: false, 
    startX: 0, startY: 0, 
    initialOffsetX: 0, initialOffsetY: 0,
    naturalLeft: 0, naturalTop: 0,
    width: 0, height: 0
  });

  const handleDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, [role="button"], .no-drag')) return;
    
    let nLeft = 0;
    let nTop = 0;
    let w = 0;
    let h = 0;

    if (playerRef.current) {
      const rect = playerRef.current.getBoundingClientRect();
      nLeft = rect.left - playerOffset.x;
      nTop = rect.top - playerOffset.y;
      w = rect.width;
      h = rect.height;
    }

    dragState.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialOffsetX: playerOffset.x,
      initialOffsetY: playerOffset.y,
      naturalLeft: nLeft,
      naturalTop: nTop,
      width: w,
      height: h
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!dragState.current.isDragging) return;
    
    let newX = dragState.current.initialOffsetX + (e.clientX - dragState.current.startX);
    let newY = dragState.current.initialOffsetY + (e.clientY - dragState.current.startY);

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const st = dragState.current;

    const maxNegativeX = -st.naturalLeft;
    const maxPositiveX = screenW - st.width - st.naturalLeft;
    const maxNegativeY = -st.naturalTop;
    const maxPositiveY = screenH - st.height - st.naturalTop;

    newX = Math.max(maxNegativeX, Math.min(newX, maxPositiveX));
    newY = Math.max(maxNegativeY, Math.min(newY, maxPositiveY));

    setPlayerOffset({
      x: newX,
      y: newY,
    });
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    dragState.current.isDragging = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    setPlayerOffset({ x: 0, y: 0 });
  }, [viewMode]);

  // Load from IndexedDB
  useEffect(() => {
    const loadState = async () => {
      try {
        const savedLibrary = await get('v2_solidLibrary');
        const savedPlaylists = await get('v2_solidPlaylists');
        const savedSidebarWidth = await get('v2_solidSidebarWidth');
        const savedColWidths = await get('v2_solidColWidths');
        const savedThemeIndex = await get('v2_solidThemeIndex');
        const savedActivePlaylistId = await get('v2_solidActivePlaylistId');
        const savedPlayingPlaylistId = await get('v2_solidPlayingPlaylistId');
        const savedPlaybackQueueIds = await get('v2_solidPlaybackQueueIds');
        const savedCurrentTrackIndex = await get('v2_solidCurrentTrackIndex');
        const savedListFontSize = await get('v2_solidListFontSize');
        const savedColVisibility = await get('v2_solidColVisibility');
        const savedColOrder = await get('v2_solidColOrder');
        const savedVolume = await get('v2_solidVolume');
        const savedIsMuted = await get('v2_solidIsMuted');
        const savedEqLow = await get('v2_solidEqLow');
        const savedEqMid = await get('v2_solidEqMid');
        const savedEqHigh = await get('v2_solidEqHigh');
        
        if (savedVolume !== undefined && !isNaN(savedVolume) && savedVolume >= 0 && savedVolume <= 1) setVolume(savedVolume);
        if (savedIsMuted !== undefined) setIsMuted(!!savedIsMuted);
        if (savedEqLow !== undefined && !isNaN(savedEqLow)) setEqLow(savedEqLow);
        if (savedEqMid !== undefined && !isNaN(savedEqMid)) setEqMid(savedEqMid);
        if (savedEqHigh !== undefined && !isNaN(savedEqHigh)) setEqHigh(savedEqHigh);
        
        if (savedSidebarWidth && !isNaN(savedSidebarWidth)) setSidebarWidth(savedSidebarWidth);
        if (savedColWidths) {
          const sanitized = { ...savedColWidths };
          Object.keys(sanitized).forEach(k => {
            if (isNaN(sanitized[k])) sanitized[k] = 100;
          });
          setColWidths(prev => ({ ...prev, ...sanitized }));
        }
        if (savedColVisibility) setColVisibility(prev => ({ ...prev, ...savedColVisibility }));
        if (savedColOrder) {
          let updatedColOrder = savedColOrder;
          updatedColOrder = updatedColOrder.filter(c => c !== 'art');
          setColOrder(updatedColOrder);
        } else {
          setColOrder(['fileName', 'trackNumber', 'title', 'artist', 'album']);
        }
        if (savedListFontSize !== undefined) setListFontSize(savedListFontSize);
        if (savedActivePlaylistId) setActivePlaylistId(savedActivePlaylistId);
        const savedThemeId = await get('v2_solidThemeId');
        if (savedThemeId) {
          const foundIdx = THEMES.findIndex(t => t.id === savedThemeId);
          if (foundIdx !== -1) setThemeIndex(foundIdx);
        } else if (savedThemeIndex !== undefined && savedThemeIndex < THEMES.length) {
          setThemeIndex(savedThemeIndex);
        }
        
        if (savedLibrary && savedPlaylists) {
          const libraryMap = new Map<string, Track>();
          
          const newLibrary = await Promise.all(savedLibrary.map(async (t: Track) => {
            try {
              const coverData = await get(`v2_track_cover_${t.id}`);
              if (coverData && coverData.buffer) {
                t.coverUrl = URL.createObjectURL(new Blob([coverData.buffer], { type: coverData.type }));
              }
            } catch (e) {
              console.error('Failed to load cover for', t.id, e);
            }
            // Clear the old blob URL from previous session
            t.url = '';
            t.missing = false; // We don't mark it missing yet until we try to play it
            libraryMap.set(t.id, t);
            return t;
          }));
          
          setLibrary(newLibrary);


          // Restore playlists
          const validPlaylists = savedPlaylists.map((p: any) => ({
            ...p,
            tracks: p.tracks.map((pt: Track) => libraryMap.get(pt.id)).filter(Boolean) as Track[]
          }));
          setPlaylists(validPlaylists);

          if (savedPlayingPlaylistId) setPlayingPlaylistId(savedPlayingPlaylistId);
          if (savedPlaybackQueueIds && Array.isArray(savedPlaybackQueueIds)) {
            const restoredQueue = savedPlaybackQueueIds.map(id => libraryMap.get(id)).filter(Boolean) as Track[];
            setPlaybackQueue(restoredQueue);
            if (savedCurrentTrackIndex !== undefined && savedCurrentTrackIndex >= 0 && savedCurrentTrackIndex < restoredQueue.length) {
              setCurrentTrackIndex(savedCurrentTrackIndex);
            }
          }

        }
      } catch (err) {
        console.error("Failed to load state", err);
      } finally {
        setIsInitialized(true);
      }
    };
    loadState();
  }, []);

  // Save to IndexedDB (with debounce)
  useEffect(() => {
    if (isInitialized) {
      const timer = setTimeout(() => {
        const strippedLibrary = library.map(t => ({ ...t, file: undefined }));
        set('v2_solidLibrary', strippedLibrary).catch(console.error);
        set('v2_solidPlaylists', playlists).catch(console.error);
        set('v2_solidSidebarWidth', sidebarWidth).catch(console.error);
        set('v2_solidColWidths', colWidths).catch(console.error);
        set('v2_solidColVisibility', colVisibility).catch(console.error);
        set('v2_solidColOrder', colOrder).catch(console.error);
        set('v2_solidThemeIndex', themeIndex).catch(console.error);
        set('v2_solidListFontSize', listFontSize).catch(console.error);
        set('v2_solidActivePlaylistId', activePlaylistId).catch(console.error);
        set('v2_solidPlayingPlaylistId', playingPlaylistId).catch(console.error);
        set('v2_solidPlaybackQueueIds', playbackQueue.map(t => t.id)).catch(console.error);
        set('v2_solidCurrentTrackIndex', currentTrackIndex).catch(console.error);

      }, 500);
      return () => clearTimeout(timer);
    }
  }, [library, playlists, sidebarWidth, colWidths, colVisibility, colOrder, themeIndex, listFontSize, activePlaylistId, playingPlaylistId, playbackQueue, currentTrackIndex, isInitialized]);


  // (Moved player state)
  const [eqLow, setEqLow] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('v2_solidEqLow');
      if (saved !== null) {
        const parsed = parseInt(saved);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) return parsed;
      }
    } catch(e) {}
    return 60;
  });
  const [eqMid, setEqMid] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('v2_solidEqMid');
      if (saved !== null) {
        const parsed = parseInt(saved);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) return parsed;
      }
    } catch(e) {}
    return 50;
  });
  const [eqHigh, setEqHigh] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('v2_solidEqHigh');
      if (saved !== null) {
        const parsed = parseInt(saved);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) return parsed;
      }
    } catch(e) {}
    return 40;
  });

  // Persist volume, mute, and EQ settings immediately to localStorage & IndexedDB
  useEffect(() => {
    try {
      localStorage.setItem('v2_solidVolume', volume.toString());
      localStorage.setItem('v2_solidIsMuted', isMuted ? 'true' : 'false');
      set('v2_solidVolume', volume).catch(() => {});
      set('v2_solidIsMuted', isMuted).catch(() => {});
    } catch(e) {}
  }, [volume, isMuted]);

  useEffect(() => {
    try {
      localStorage.setItem('v2_solidEqLow', eqLow.toString());
      localStorage.setItem('v2_solidEqMid', eqMid.toString());
      localStorage.setItem('v2_solidEqHigh', eqHigh.toString());
      set('v2_solidEqLow', eqLow).catch(() => {});
      set('v2_solidEqMid', eqMid).catch(() => {});
      set('v2_solidEqHigh', eqHigh).catch(() => {});
    } catch(e) {}
  }, [eqLow, eqMid, eqHigh]);

  useEffect(() => {
    try {
      localStorage.setItem('v2_solidThemeIndex', themeIndex.toString());
      const curTheme = THEMES[themeIndex];
      if (curTheme) {
        localStorage.setItem('v2_solidThemeId', curTheme.id);
        set('v2_solidThemeId', curTheme.id).catch(() => {});
      }
      set('v2_solidThemeIndex', themeIndex).catch(() => {});
    } catch(e) {}
  }, [themeIndex]);

  // --- Refs ---
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastSelectedTrackIdRef = useRef<string | null>(null);

  // Audio Context Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const lowFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const highFilterRef = useRef<BiquadFilterNode | null>(null);

  useEffect(() => {
    if (!audioRef.current || audioCtxRef.current) return;

    // iPad / iOS / Safari detected? Bypass Web Audio API (MediaElementAudioSourceNode)
    // to prevent standard WebKit bugs where subsequent tracks or reloads become completely silent.
    const ua = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
    const isSafari = ua.includes('safari') && !ua.includes('chrome');
    const isIOS = /ipad|iphone|ipod/.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isSafari || isIOS) {
       console.log("iOS/Safari detected. Bypassing Web Audio API filters to maintain robust, multi-track audio playback.");
       return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaElementSource(audioRef.current);
      sourceRef.current = source;

      const lowFilter = ctx.createBiquadFilter();
      lowFilter.type = 'lowshelf';
      lowFilter.frequency.value = 320;
      lowFilterRef.current = lowFilter;

      const midFilter = ctx.createBiquadFilter();
      midFilter.type = 'peaking';
      midFilter.frequency.value = 1000;
      midFilter.Q.value = 0.5;
      midFilterRef.current = midFilter;

      const highFilter = ctx.createBiquadFilter();
      highFilter.type = 'highshelf';
      highFilter.frequency.value = 3200;
      highFilterRef.current = highFilter;

      source.connect(lowFilter);
      lowFilter.connect(midFilter);
      midFilter.connect(highFilter);
      highFilter.connect(ctx.destination);
    } catch (e) {
      console.warn("Web Audio API failed to initialize", e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioRef.current]);

  useEffect(() => {
    if (lowFilterRef.current) {
      lowFilterRef.current.gain.value = (eqLow - 50) * 0.24;
    }
  }, [eqLow]);

  useEffect(() => {
    if (midFilterRef.current) {
      midFilterRef.current.gain.value = (eqMid - 50) * 0.24;
    }
  }, [eqMid]);

  useEffect(() => {
    if (highFilterRef.current) {
      highFilterRef.current.gain.value = (eqHigh - 50) * 0.24;
    }
  }, [eqHigh]);

  const theme = THEMES[themeIndex];
  const isLightTheme = theme.id === 'LIGHT';
  const iconColor = isLightTheme ? '#1a2530' : '#ffffff';
  const listIconColor = (theme as any).listIconColor || iconColor;
  
  // Dynamically update browser theme-color meta tag
  useEffect(() => {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', theme.bg);
  }, [theme]);

  // Refs for visualizer to prevent loop restarts
  const visualizerActive = useRef(isPlaying);
  visualizerActive.current = isPlaying;
  const currentTheme = useRef(theme);
  currentTheme.current = theme;
  // isLight ref for visualizer canvas (canvas can't read CSS vars directly)
  const isLightRef = useRef(isLightTheme);
  isLightRef.current = isLightTheme;

  const activePlaylist = playlists.find(p => p.id === activePlaylistId) || playlists[0];
  const playingPlaylist = playlists.find(p => p.id === playingPlaylistId) || playlists[0];

  const getSortedTracks = (tracks: Track[]) => {
    if (activeSortConfig.key === 'none') return tracks;
    
    return [...tracks].sort((a, b) => {
      let valA = '';
      let valB = '';

      switch (activeSortConfig.key) {
        case 'title': valA = a.title; valB = b.title; break;
        case 'artist': valA = a.artist; valB = b.artist; break;
        case 'album': valA = a.album; valB = b.album; break;
        case 'fileName': valA = a.fileName; valB = b.fileName; break;
        case 'trackNumber': 
          const numA = parseInt(a.trackNumber) || 0;
          const numB = parseInt(b.trackNumber) || 0;
          return activeSortConfig.direction === 'asc' ? numA - numB : numB - numA;
        default: break;
      }
      
      valA = (valA || '').toLowerCase();
      valB = (valB || '').toLowerCase();
      
      if (valA < valB) return activeSortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return activeSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const displayTracks = getSortedTracks(activePlaylist.tracks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  ));
  const currentTrack = playbackQueue[currentTrackIndex] || null;

  useEffect(() => {
    const track = playbackQueue[currentTrackIndex];
    if (track && track.url === '' && !track.missing) {
      (async () => {
        try {
          const audioData = await get(`v2_track_audio_${track.id}`);
          if (audioData && audioData.buffer) {
            const memoryBlob = new Blob([audioData.buffer], { type: audioData.type });
            const blobUrl = URL.createObjectURL(memoryBlob);
            
            const updateTrack = (t: Track) => t.id === track.id ? { ...t, url: blobUrl } : t;
            setLibrary(prev => prev.map(updateTrack));
            setPlaylists(prev => prev.map(p => ({ ...p, tracks: p.tracks.map(updateTrack) })));
            setPlaybackQueue(prev => prev.map(updateTrack));
          } else {
            console.error("Audio data not found for", track.id);
            const markMissing = (t: Track) => t.id === track.id ? { ...t, missing: true } : t;
            setLibrary(prev => prev.map(markMissing));
            setPlaylists(prev => prev.map(p => ({ ...p, tracks: p.tracks.map(markMissing) })));
            setPlaybackQueue(prev => prev.map(markMissing));
          }
        } catch (e) {
          console.error("Error loading audio data", e);
        }
      })();
    }
  }, [currentTrackIndex, playbackQueue]);

  // Volume Sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Visualizer Animation Loop (Dummy Visualizer)
  useEffect(() => {
    let animationId: number;
    const numBars = 32;
    const dummyData = new Array(numBars).fill(0);

    const draw = () => {
      animationId = window.requestAnimationFrame(draw);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Theme-aware colors for canvas
      const isLight = isLightRef.current;
      const canvasBg = isLight ? currentTheme.current.surfaceLighter : currentTheme.current.bg;
      const barColor = isLight ? currentTheme.current.accentDark : currentTheme.current.accent;
      const baselineColor = isLight ? currentTheme.current.border : currentTheme.current.borderActive;

      // Clear with theme bg color
      ctx.fillStyle = canvasBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerY = Math.floor(canvas.height / 2);

      // Always draw a faint baseline centered
      ctx.fillStyle = baselineColor;
      ctx.fillRect(0, centerY, canvas.width, 1);

      if (visualizerActive.current) {
        const barWidth = canvas.width / numBars;
        let x = 0;

        for (let i = 0; i < numBars; i++) {
          // Fake frequency data, bouncy
          const target = Math.random() * 255 * (1 - (i / numBars) * 0.4); 
          dummyData[i] = dummyData[i] + (target - dummyData[i]) * 0.3;
          
          const val = dummyData[i];
          if (val > 5) {
              const rawHeight = (val / 255) * canvas.height * 0.9;
              const barHeight = Math.max(2, rawHeight);
              ctx.fillStyle = barColor;
              const y = centerY - (barHeight / 2);
              ctx.fillRect(x, y, barWidth - 0.5, barHeight);
          }
          x += barWidth;
        }
      } else {
         // Smooth decay when paused
         const barWidth = canvas.width / numBars;
         let x = 0;
         for (let i = 0; i < numBars; i++) {
           dummyData[i] = dummyData[i] * 0.8;
           const val = dummyData[i];
           if (val > 2) {
               const rawHeight = (val / 255) * canvas.height * 0.9;
               const barHeight = Math.max(2, rawHeight);
               ctx.fillStyle = barColor;
               const y = centerY - (barHeight / 2);
               ctx.fillRect(x, y, barWidth - 0.5, barHeight);
           }
           x += barWidth;
         }
      }
    };

    draw();

    return () => window.cancelAnimationFrame(animationId);
  }, []);

  // --- Handlers ---
  const saveTrackEdit = async (trackId: string) => {
    setLibrary(prev => prev.map(t => {
      if (t.id === trackId) {
        return { ...t, title: editTitle || t.title, artist: editArtist || t.artist };
      }
      return t;
    }));
    
    setPlaylists(prev => prev.map(p => ({
      ...p,
      tracks: p.tracks.map(t => {
        if (t.id === trackId) {
           return { ...t, title: editTitle || t.title, artist: editArtist || t.artist };
        }
        return t;
      })
    })));
    setEditingTrackId(null);
  };

  const removeArtwork = (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    setLibrary(prev => prev.map(t => t.id === trackId ? { ...t, coverUrl: undefined } : t));
    setPlaylists(prev => prev.map(p => ({
      ...p,
      tracks: p.tracks.map(t => t.id === trackId ? { ...t, coverUrl: undefined } : t)
    })));
  };

  const startEditTrack = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    setEditingTrackId(track.id);
    setEditTitle(track.title);
    setEditArtist(track.artist);
  };

  const findDuplicates = () => {
    const groups = new Map<string, Track[]>();
    
    library.forEach(track => {
      let key = '';
      if (track.size) {
        key = `file::${track.fileName.toLowerCase()}::${track.size}`;
      } else if (track.title && track.title !== 'Unknown Title' && track.artist && track.artist !== 'Unknown Artist') {
        key = `meta::${track.title.toLowerCase()}::${track.artist.toLowerCase()}`;
      } else {
        key = `name::${track.fileName.toLowerCase()}`;
      }
      
      if (!groups.has(key)) {
         groups.set(key, []);
      }
      groups.get(key)!.push(track);
    });
    
    const dups = Array.from(groups.values()).filter(group => group.length > 1);
    setDuplicateGroups(dups);
    setShowDuplicatesModal(true);
  };

  const handleDeleteMultipleGlobal = async (trackIdsToDelete: string[]) => {
    if (trackIdsToDelete.length === 0) return;

    const idsSet = new Set(trackIdsToDelete);

    // Filter library
    const newLibrary = library.filter(t => !idsSet.has(t.id));

    // Filter all playlists
    const newPlaylists = playlists.map(p => ({
      ...p,
      tracks: p.tracks.filter(t => !idsSet.has(t.id))
    }));

    setLibrary(newLibrary);
    setPlaylists(newPlaylists);
    
    // Update duplicates modal state if it is open
    if (showDuplicatesModal) {
      const newDups = duplicateGroups
        .map(group => group.filter(t => !idsSet.has(t.id)))
        .filter(group => group.length > 1);
      setDuplicateGroups(newDups);
    }
  };

  const handleSelectFolder = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Parse a single audio file into a Track object
  const parseSingleFile = async (file: File, existingId?: string): Promise<Track | null> => {
    const isAudio = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/x-m4a', 'audio/mp4', 'audio/aac'].includes(file.type) ||
                    ['.mp3', '.wav', '.flac', '.m4a', '.ogg', '.aac'].some(ext => file.name.toLowerCase().endsWith(ext));
    if (!isAudio) return null;

    let title = '';
    let artist = 'Unknown Artist';
    let album = 'Unknown Album';
    let trackNumber = '';
    let duration = 0;

    const trackId = existingId || uuidv4();
    let blobUrl = '';
    let coverUrl: string | undefined = undefined;

    try {
      const metadata = await mm.parseBlob(file, { skipCovers: false });
      title = metadata.common.title || '';
      artist = metadata.common.artist || metadata.common.albumartist || 'Unknown Artist';
      album = metadata.common.album || 'Unknown Album';
      trackNumber = metadata.common.track?.no?.toString() || '';
      duration = metadata.format.duration || 0;

      const picture = metadata.common.picture?.[0];
      if (picture) {
        let mimeType = picture.format;
        if (!mimeType.startsWith('image/')) mimeType = `image/${mimeType}`;
        const coverBuffer = picture.data.buffer.slice(picture.data.byteOffset, picture.data.byteOffset + picture.data.byteLength);
        await set(`v2_track_cover_${trackId}`, { buffer: coverBuffer, type: mimeType });
        coverUrl = URL.createObjectURL(new Blob([coverBuffer], { type: mimeType }));
      }
    } catch (err) {
      console.error("Error reading metadata:", file.name, err);
    }

    if (!title) {
      const parsed = parseFilename(file.name);
      title = parsed.title;
      if (artist === 'Unknown Artist') artist = parsed.artist;
    }

    try {
      let mimeType = file.type;
      if (!mimeType || mimeType === '') {
        mimeType = 'audio/mpeg';
        const lowerName = file.name ? file.name.toLowerCase() : '';
        if (lowerName.endsWith('.flac')) mimeType = 'audio/flac';
        else if (lowerName.endsWith('.m4a')) mimeType = 'audio/mp4';
        else if (lowerName.endsWith('.wav')) mimeType = 'audio/wav';
        else if (lowerName.endsWith('.ogg')) mimeType = 'audio/ogg';
        else if (lowerName.endsWith('.aac')) mimeType = 'audio/aac';
      }
      
      const buffer = await file.arrayBuffer();
      await set(`v2_track_audio_${trackId}`, { buffer, type: mimeType });
      
      const memoryBlob = new Blob([buffer], { type: mimeType });
      blobUrl = URL.createObjectURL(memoryBlob);
    } catch (e) {
      console.error('Failed to store file to IndexedDB', e);
      blobUrl = URL.createObjectURL(file);
    }

    return {
      id: trackId,
      title,
      artist,
      album,
      trackNumber,
      fileName: file.name,
      url: blobUrl,
      duration,
      coverUrl,
      size: file.size,
      lastModified: file.lastModified
    };
  };

  const processFiles = async (files: FileList | File[], targetPlaylistName?: string) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsLoadingFiles(true);
    setLoadingProgress({ done: 0, total: fileArray.length });

    // Process sequentially (1 by 1) to prevent V8 memory spikes (OOM)
    const allTracks: Track[] = [];
    const processedKeys = new Set<string>();

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      
      const existingTracks = library.filter(t => t.fileName === file.name);
      
      let exactMatch = false;
      let existingTrackToUpdate: Track | undefined = undefined;
      
      if (existingTracks.length > 0) {
        if (existingTracks.some(t => t.size === file.size && t.lastModified === file.lastModified)) {
           exactMatch = true;
        } else {
           existingTrackToUpdate = existingTracks[0];
        }
      }
      
      const batchKey = `${file.name}_${file.size}_${file.lastModified}`;
      if (processedKeys.has(batchKey)) {
         exactMatch = true;
      }
      
      if (exactMatch) {
         setLoadingProgress({ done: i + 1, total: fileArray.length });
         continue; // 完全な重複はIDB保存・パースごとスキップしてリーク防止
      }
      
      processedKeys.add(batchKey);

      const result = await parseSingleFile(file, existingTrackToUpdate?.id);
      if (result) {
        allTracks.push(result);
        
        // Stream results into state progressively
        setLibrary(prev => {
          if (existingTrackToUpdate) {
             const idx = prev.findIndex(t => t.id === existingTrackToUpdate!.id);
             if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = result;
                return updated;
             }
          }
          const isDup = prev.some(t => t.fileName === result.fileName && t.size === result.size && t.lastModified === result.lastModified);
          if (isDup) return prev;
          
          return [...prev, result];
        });
        
        setPlaylists(prev => {
          let updatedPlaylists = [...prev];
          let currentTargetId = activePlaylistId;
          
          if (targetPlaylistName) {
            let existing = updatedPlaylists.find(p => p.name === targetPlaylistName);
            if (!existing) {
              existing = { id: uuidv4(), name: targetPlaylistName, tracks: [] };
              updatedPlaylists.push(existing);
            }
            currentTargetId = existing.id;
          }

          return updatedPlaylists.map(p => {
            if (existingTrackToUpdate) {
               const idx = p.tracks.findIndex(t => t.id === existingTrackToUpdate!.id);
               if (idx !== -1) {
                  const newTracks = [...p.tracks];
                  newTracks[idx] = result;
                  return { ...p, tracks: newTracks };
               }
            }
            
            if (p.id !== 'all-tracks' && p.id !== currentTargetId) return p;
            
            const isDup = p.tracks.some(t => t.fileName === result.fileName && t.size === result.size && t.lastModified === result.lastModified);
            if (!isDup) {
               return { ...p, tracks: [...p.tracks, result] };
            }
            return p;
          });
        });
      }
      setLoadingProgress({ done: i + 1, total: fileArray.length });
    }

    setIsLoadingFiles(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Convert FileList to Array immediately — the FileList reference
      // becomes invalid once the input is reset, so we capture it first.
      const fileArray = Array.from(e.target.files) as File[];
      // Reset input AFTER capturing files so it can accept the same folder again
      if (fileInputRef.current) fileInputRef.current.value = '';
      await processFiles(fileArray);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const items = e.dataTransfer.items;
    
    // Group files by playlist name (undefined means add to current active playlist)
    const fileGroups = new Map<string | undefined, File[]>();

    // Try webkitGetAsEntry first (supports directories)
    if (items && items.length > 0) {
      let hasEntries = false;

      const traverseFileTree = async (item: any, playlistName?: string): Promise<void> => {
        if (item.isFile) {
          return new Promise<void>((resolve) => {
            item.file((file: File) => {
              const group = fileGroups.get(playlistName) || [];
              group.push(file);
              fileGroups.set(playlistName, group);
              resolve();
            }, () => resolve()); // error callback
          });
        } else if (item.isDirectory) {
          const dirReader = item.createReader();
          return new Promise<void>((resolve) => {
            const readEntries = () => {
              dirReader.readEntries(async (entries: any[]) => {
                if (entries.length === 0) {
                  resolve();
                } else {
                  for (const entry of entries) {
                    await traverseFileTree(entry, playlistName);
                  }
                  readEntries(); // readEntries only returns up to 100 at a time
                }
              }, () => resolve()); // error callback
            };
            readEntries();
          });
        }
      };

      const promises: Promise<void>[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry ? items[i].webkitGetAsEntry() : null;
        if (entry) {
          hasEntries = true;
          if (entry.isDirectory) {
            promises.push(traverseFileTree(entry, entry.name));
          } else {
            promises.push(traverseFileTree(entry, undefined));
          }
        }
      }

      if (hasEntries && promises.length > 0) {
        await Promise.all(promises);
        
        for (const [playlistName, files] of Array.from(fileGroups.entries())) {
           if (files.length > 0) {
              await processFiles(files, playlistName);
           }
        }
        return;
      }
    }

    // Fallback: use dataTransfer.files directly
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const clearActivePlaylist = () => {
     setShowClearConfirm(true);
  };

  const executeClearData = () => {
     if (activePlaylistId === 'all-tracks') {
         setLibrary([]);
         setPlaylists(prev => prev.map(p => ({ ...p, tracks: [] })));
         setIsPlaying(false);
         if (audioRef.current) {
             audioRef.current.pause();
             audioRef.current.currentTime = 0;
         }
         setCurrentTrackIndex(-1);
     } else {
         setPlaylists(prev => prev.map(p => {
             if (p.id === activePlaylistId) {
                 return { ...p, tracks: [] };
             }
             return p;
         }));
         if (playingPlaylistId === activePlaylistId) {
             setIsPlaying(false);
             if (audioRef.current) {
                 audioRef.current.pause();
                 audioRef.current.currentTime = 0;
             }
             setCurrentTrackIndex(-1);
         }
     }
     setSelectedTrackIds(new Set());
     setShowClearConfirm(false);
  };

  const deleteSelectedTracks = () => {
      if (selectedTrackIds.size === 0) return;
      
      setPlaylists(prev => prev.map(p => {
          if (p.id === activePlaylistId) {
              return { ...p, tracks: p.tracks.filter(t => !selectedTrackIds.has(t.id)) };
          }
          if (activePlaylistId === 'all-tracks') {
             // If we are deleting from all-tracks, should we delete from everywhere?
             // The user just said "it deletes those placed in the playlist". 
             // Let's just remove from all-tracks for now if active is all-tracks.
             return { ...p, tracks: p.tracks.filter(t => !selectedTrackIds.has(t.id)) };
          }
          return p;
      }));

      // Find if playing track is deleted
      const currentTrack = playingPlaylist.tracks[currentTrackIndex];
      if (currentTrack && selectedTrackIds.has(currentTrack.id) && playingPlaylistId === activePlaylistId) {
          setIsPlaying(false);
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
          }
          setCurrentTrackIndex(-1);
      }
      setSelectedTrackIds(new Set());
  };

  const handleAddSelectedToPlaylist = (targetPlaylistId: string) => {
      const selectedTracks = displayTracks.filter(t => selectedTrackIds.has(t.id));
      if (selectedTracks.length === 0) return;

      setPlaylists(prev => prev.map(p => {
          // 移動先プレイリストに追加
          if (p.id === targetPlaylistId) {
             const existingIds = new Set(p.tracks.map(t => t.id));
             const tracksToAdd = selectedTracks.filter(t => !existingIds.has(t.id));
             return { ...p, tracks: [...p.tracks, ...tracksToAdd] };
          }
          // 現在のプレイリスト（ALL TRACKS以外）からは削除（移動）
          if (activePlaylistId !== 'all-tracks' && p.id === activePlaylistId) {
             return { ...p, tracks: p.tracks.filter(t => !selectedTrackIds.has(t.id)) };
          }
          return p;
      }));
      setShowAddToPlaylist(false);
      setSelectedTrackIds(new Set());
  };

  const toggleTrackSelection = (e: React.MouseEvent, trackId: string) => {
      e.stopPropagation();
      const isShift = e.shiftKey;
      const lastSelected = lastSelectedTrackIdRef.current;
      
      setSelectedTrackIds(prev => {
          const next = new Set(prev);
          
          if (isShift && lastSelected) {
              const currentIndex = displayTracks.findIndex(t => t.id === trackId);
              const lastIndex = displayTracks.findIndex(t => t.id === lastSelected);
              
              if (currentIndex !== -1 && lastIndex !== -1) {
                  const start = Math.min(currentIndex, lastIndex);
                  const end = Math.max(currentIndex, lastIndex);
                  
                  // Shift+Click always selects the range to be intuitive
                  for (let i = start; i <= end; i++) {
                      next.add(displayTracks[i].id);
                  }
                  return next;
              }
          }
          
          if (next.has(trackId)) next.delete(trackId);
          else next.add(trackId);
          return next;
      });
      
      lastSelectedTrackIdRef.current = trackId;
  };

  const handleSort = (key: 'title' | 'artist' | 'album' | 'fileName' | 'trackNumber') => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return { key: 'none', direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const playTrack = (index: number) => {
    const trackToPlay = displayTracks[index];
    if (!trackToPlay) return;

    // If already playing this track from the same view, just toggle
    if (currentTrack?.id === trackToPlay.id && playingPlaylistId === activePlaylistId) {
      togglePlay();
      return;
    }

    // Snapshot the current view as the playback queue
    setPlaybackQueue(displayTracks);
    setPlayingPlaylistId(activePlaylistId);
    setCurrentTrackIndex(index);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (!currentTrack) return;
    setIsPlaying(prev => {
      const next = !prev;
      if (audioRef.current) {
        if (next) {
          if (audioCtxRef.current?.state === 'suspended') {
            audioCtxRef.current.resume();
          }
          audioRef.current.play().catch(()=>{});
        }
        else audioRef.current.pause();
      }
      return next;
    });
  };

  const handleNext = () => {
    // Mode 3: SET repeat across selected playlists
    if (repeatMode === 3 && selectedPlaylistIds.size > 0) {
      // Gather all selected playlists that actually exist
      const chosenPlaylists = playlists.filter(p => p.id !== 'all-tracks' && selectedPlaylistIds.has(p.id));
      if (chosenPlaylists.length > 0) {
        // If shuffle is active, pick random playlist and random track from it
        if (isShuffle) {
          const validPlaylists = chosenPlaylists.filter(p => p.tracks.length > 0);
          if (validPlaylists.length > 0) {
            const randomPl = validPlaylists[Math.floor(Math.random() * validPlaylists.length)];
            const randomTrackIdx = Math.floor(Math.random() * randomPl.tracks.length);
            setPlaybackQueue(randomPl.tracks);
            setPlayingPlaylistId(randomPl.id);
            setCurrentTrackIndex(randomTrackIdx);
            setIsPlaying(true);
            return;
          }
        }

        // Sequential: if within current playing playlist and has next track
        const currentPlIdx = chosenPlaylists.findIndex(p => p.id === playingPlaylistId);
        if (currentPlIdx !== -1) {
          const currentPl = chosenPlaylists[currentPlIdx];
          if (currentTrackIndex + 1 < playbackQueue.length) {
            setCurrentTrackIndex(currentTrackIndex + 1);
            setIsPlaying(true);
            return;
          } else {
            // Move to next selected playlist with tracks
            let nextPlIdx = (currentPlIdx + 1) % chosenPlaylists.length;
            let attempts = 0;
            while (chosenPlaylists[nextPlIdx].tracks.length === 0 && attempts < chosenPlaylists.length) {
              nextPlIdx = (nextPlIdx + 1) % chosenPlaylists.length;
              attempts++;
            }
            const nextPl = chosenPlaylists[nextPlIdx];
            if (nextPl.tracks.length > 0) {
              setPlaybackQueue(nextPl.tracks);
              setPlayingPlaylistId(nextPl.id);
              setCurrentTrackIndex(0);
              setIsPlaying(true);
              return;
            }
          }
        } else {
          // Current playing playlist is not in selected set, start from first selected playlist with tracks
          const firstWithTracks = chosenPlaylists.find(p => p.tracks.length > 0);
          if (firstWithTracks) {
            setPlaybackQueue(firstWithTracks.tracks);
            setPlayingPlaylistId(firstWithTracks.id);
            setCurrentTrackIndex(0);
            setIsPlaying(true);
            return;
          }
        }
      }
    }

    if (playbackQueue.length === 0) return;
    
    if (repeatMode === 2) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setIsPlaying(true);
      }
      return;
    }

    if (isShuffle) {
      let nextIndex = Math.floor(Math.random() * playbackQueue.length);
      if (nextIndex === currentTrackIndex && playbackQueue.length > 1) {
        nextIndex = (nextIndex + 1) % playbackQueue.length;
      }
      setCurrentTrackIndex(nextIndex);
    } else {
      const nextIndex = currentTrackIndex + 1;
      if (nextIndex >= playbackQueue.length) {
        setCurrentTrackIndex(0);
        if (repeatMode === 0) {
          setIsPlaying(false);
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          return;
        }
      } else {
        setCurrentTrackIndex(nextIndex);
      }
    }
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (currentTime > 3) {
      if (audioRef.current) {
         audioRef.current.currentTime = 0;
         audioRef.current.play().catch(()=>{});
      }
      setCurrentTime(0);
      setIsPlaying(true);
      return;
    }

    // Mode 3: SET repeat across selected playlists for prev track
    if (repeatMode === 3 && selectedPlaylistIds.size > 0 && currentTrackIndex <= 0) {
      const chosenPlaylists = playlists.filter(p => p.id !== 'all-tracks' && selectedPlaylistIds.has(p.id));
      const currentPlIdx = chosenPlaylists.findIndex(p => p.id === playingPlaylistId);
      if (currentPlIdx !== -1) {
        let prevPlIdx = (currentPlIdx - 1 + chosenPlaylists.length) % chosenPlaylists.length;
        let attempts = 0;
        while (chosenPlaylists[prevPlIdx].tracks.length === 0 && attempts < chosenPlaylists.length) {
          prevPlIdx = (prevPlIdx - 1 + chosenPlaylists.length) % chosenPlaylists.length;
          attempts++;
        }
        const prevPl = chosenPlaylists[prevPlIdx];
        if (prevPl.tracks.length > 0) {
          setPlaybackQueue(prevPl.tracks);
          setPlayingPlaylistId(prevPl.id);
          setCurrentTrackIndex(prevPl.tracks.length - 1);
          setIsPlaying(true);
          return;
        }
      }
    }

    if (playbackQueue.length === 0 || currentTrackIndex === -1) return;
    
    let prevIndex = currentTrackIndex - 1;
    if (prevIndex < 0) {
      prevIndex = (repeatMode === 1 || repeatMode === 3) ? playbackQueue.length - 1 : 0;
    }
    setCurrentTrackIndex(prevIndex);
    setIsPlaying(true);
  };

  const handleProgressScrub = (clientX: number) => {
    if (!progressBarRef.current || !audioRef.current || !currentTrack) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    let percent = (clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    const newTime = percent * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    handleProgressScrub(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      handleProgressScrub(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const submitPlaylist = () => {
    if (newPlaylistName.trim()) {
      const newPlaylist: Playlist = { id: uuidv4(), name: newPlaylistName.trim().toUpperCase(), tracks: [] };
      setPlaylists([playlists[0], newPlaylist, ...playlists.slice(1)]);
      setActivePlaylistId(newPlaylist.id);
    }
    setIsCreatingPlaylist(false);
    setNewPlaylistName('');
  };

  const cycleTheme = () => {
    setThemeIndex((prev) => (prev + 1) % THEMES.length);
  };

  // --- Playlist Drag and Drop ---
  const handlePlaylistDragStart = (e: React.DragEvent, id: string) => {
    if (id === 'all-tracks') {
      e.preventDefault();
      return;
    }
    setDraggedPlaylistId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePlaylistDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== 'all-tracks' && id !== draggedPlaylistId) {
      setDragOverPlaylistId(id);
    } else {
      setDragOverPlaylistId(null);
    }
  };

  const handlePlaylistDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverPlaylistId(null);
    
    if (!draggedPlaylistId || targetId === 'all-tracks' || draggedPlaylistId === targetId) return;

    setPlaylists(prev => {
      const copy = [...prev];
      const fromIndex = copy.findIndex(p => p.id === draggedPlaylistId);
      const toIndex = copy.findIndex(p => p.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
    setDraggedPlaylistId(null);
  };

  const handlePlaylistDragEnd = () => {
    setDraggedPlaylistId(null);
    setDragOverPlaylistId(null);
  };

  const togglePlaylistSelection = (e: React.MouseEvent, playlistId: string) => {
    e.stopPropagation();
    if (playlistId === 'all-tracks') return;
    
    const isShift = e.shiftKey;
    const lastSelected = lastSelectedPlaylistIdRef.current;
    
    setSelectedPlaylistIds(prev => {
      const next = new Set(prev);
      
      if (isShift && lastSelected) {
        const customPlaylists = playlists.filter(p => p.id !== 'all-tracks');
        const currentIndex = customPlaylists.findIndex(p => p.id === playlistId);
        const lastIndex = customPlaylists.findIndex(p => p.id === lastSelected);
        
        if (currentIndex !== -1 && lastIndex !== -1) {
          const start = Math.min(currentIndex, lastIndex);
          const end = Math.max(currentIndex, lastIndex);
          for (let i = start; i <= end; i++) {
            next.add(customPlaylists[i].id);
          }
          return next;
        }
      }
      
      if (next.has(playlistId)) {
        next.delete(playlistId);
      } else {
        next.add(playlistId);
      }
      return next;
    });
    
    lastSelectedPlaylistIdRef.current = playlistId;
  };

  const moveSelectedPlaylists = (direction: 'up' | 'down') => {
    setPlaylists(prev => {
      const copy = [...prev];
      if (direction === 'up') {
        for (let i = 1; i < copy.length; i++) {
          if (selectedPlaylistIds.has(copy[i].id)) {
            if (i > 1 && !selectedPlaylistIds.has(copy[i - 1].id)) {
              const temp = copy[i];
              copy[i] = copy[i - 1];
              copy[i - 1] = temp;
            }
          }
        }
      } else {
        for (let i = copy.length - 2; i >= 1; i--) {
          if (selectedPlaylistIds.has(copy[i].id)) {
            if (i + 1 < copy.length && !selectedPlaylistIds.has(copy[i + 1].id)) {
              const temp = copy[i];
              copy[i] = copy[i + 1];
              copy[i + 1] = temp;
            }
          }
        }
      }
      return copy;
    });
  };

  const deleteSelectedPlaylists = () => {
    if (selectedPlaylistIds.size === 0) return;
    
    setPlaylists(prev => prev.filter(p => p.id === 'all-tracks' || !selectedPlaylistIds.has(p.id)));
    if (selectedPlaylistIds.has(activePlaylistId)) {
      setActivePlaylistId('all-tracks');
    }
    if (selectedPlaylistIds.has(playingPlaylistId)) {
      setPlayingPlaylistId('all-tracks');
    }
    setSelectedPlaylistIds(new Set());
    setConfirmDeleteSelectedPlaylists(false);
  };

  // --- Track Ordering ---
  const moveTrack = (e: React.MouseEvent, fromIndex: number, toIndex: number) => {
    e.stopPropagation();
    
    setPlaylists(prev => {
      const next = [...prev];
      const pIndex = next.findIndex(p => p.id === activePlaylistId);
      if (pIndex !== -1) {
        const newTracks = [...next[pIndex].tracks];
        
        if (toIndex < 0) toIndex = 0;
        if (toIndex >= newTracks.length) toIndex = newTracks.length - 1;

        const [itemMove] = newTracks.splice(fromIndex, 1);
        newTracks.splice(toIndex, 0, itemMove);
        
        next[pIndex] = { ...next[pIndex], tracks: newTracks };
      }
      return next;
    });

    if (activePlaylistId === playingPlaylistId) {
      setPlaybackQueue(prevQueue => {
        const newQueue = [...prevQueue];
        if (toIndex < 0) toIndex = 0;
        if (toIndex >= newQueue.length) toIndex = newQueue.length - 1;
        const [itemMove] = newQueue.splice(fromIndex, 1);
        newQueue.splice(toIndex, 0, itemMove);
        return newQueue;
      });

      if (currentTrackIndex === fromIndex) {
          setCurrentTrackIndex(toIndex);
      } else if (fromIndex < currentTrackIndex && toIndex >= currentTrackIndex) {
          setCurrentTrackIndex(currentTrackIndex - 1);
      } else if (fromIndex > currentTrackIndex && toIndex <= currentTrackIndex) {
          setCurrentTrackIndex(currentTrackIndex + 1);
      }
    }
  };

  // Sidebar resize handlers
  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    sidebarResizing.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      if (!sidebarResizing.current) return;
      const delta = ev.clientX - startX;
      const newWidth = Math.max(120, Math.min(800, (startWidth || 220) + delta));
      setSidebarWidth(newWidth);
    };
    const onUp = () => {
      sidebarResizing.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Column resize handlers
  const handleColMouseDown = (e: React.MouseEvent, leftCol: string, rightCol?: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (leftCol === 'index' || !rightCol) {
      // Index column resizing
      const startWidth = colWidths.index;
      colResizing.current = {
        type: 'index',
        key: 'index',
        startX: e.clientX,
        startWidth
      };

      const onMove = (ev: MouseEvent) => {
        if (!colResizing.current || colResizing.current.type !== 'index') return;
        const delta = ev.clientX - colResizing.current.startX;
        const newWidth = Math.min(240, Math.max(60, (colResizing.current.startWidth || 96) + delta));
        setColWidths(prev => ({ ...prev, index: newWidth }));
      };

      const onUp = () => {
        colResizing.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return;
    }

    // Pair resizing between adjacent visible columns
    const containerWidth = columnsContainerRef.current?.clientWidth || 800;
    const totalWeight = visibleCols.reduce((sum, col) => sum + (colWidths[col as keyof typeof colWidths] || 150), 0) || 1;
    const startLeft = colWidths[leftCol as keyof typeof colWidths] || 150;
    const startRight = colWidths[rightCol as keyof typeof colWidths] || 150;

    colResizing.current = {
      type: 'pair',
      leftKey: leftCol,
      rightKey: rightCol,
      startX: e.clientX,
      startLeft,
      startRight,
      containerWidth,
      totalWeight
    };

    const onMove = (ev: MouseEvent) => {
      if (!colResizing.current || colResizing.current.type !== 'pair') return;
      const { leftKey, rightKey, startX, startLeft, startRight, containerWidth, totalWeight } = colResizing.current;
      if (!leftKey || !rightKey || startLeft === undefined || startRight === undefined || !containerWidth || !totalWeight) return;

      const deltaX = ev.clientX - startX;
      // Convert pixel delta to proportional weight delta
      const weightPerPx = totalWeight / containerWidth;
      const deltaWeight = deltaX * weightPerPx;
      const minWeight = Math.max(20, 40 * weightPerPx); // Minimum ~40px width

      let newLeft = startLeft + deltaWeight;
      let newRight = startRight - deltaWeight;

      const totalPairWeight = startLeft + startRight;
      if (newLeft < minWeight) {
        newLeft = minWeight;
        newRight = totalPairWeight - minWeight;
      } else if (newRight < minWeight) {
        newRight = minWeight;
        newLeft = totalPairWeight - minWeight;
      }

      setColWidths(prev => ({
        ...prev,
        [leftKey]: Math.round(newLeft),
        [rightKey]: Math.round(newRight)
      }));
    };

    const onUp = () => {
      colResizing.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleColDragStart = (e: React.DragEvent, colName: string) => {
    e.dataTransfer.setData('text/plain', colName);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleColDrop = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    const sourceCol = e.dataTransfer.getData('text/plain');
    if (sourceCol && sourceCol !== targetCol) {
      setColOrder(prev => {
        const newOrder = [...prev];
        const sourceIdx = newOrder.indexOf(sourceCol);
        const targetIdx = newOrder.indexOf(targetCol);
        if (sourceIdx !== -1 && targetIdx !== -1) {
          newOrder.splice(sourceIdx, 1);
          newOrder.splice(targetIdx, 0, sourceCol);
          return newOrder;
        }
        return prev;
      });
    }
  };

  // CSS Variables
  const styleVars = {
    '--theme-bg': theme.bg,
    '--theme-surface': theme.surface,
    '--theme-surfaceLighter': theme.surfaceLighter,
    '--theme-border': theme.border,
    '--theme-borderActive': theme.borderActive,
    '--theme-textMain': theme.textMain,
    '--theme-textMuted': theme.textMuted,
    '--theme-textDim': theme.textDim,
    '--theme-accent': theme.accent,
    '--theme-accentDark': theme.accentDark,
    '--theme-accentMuted': theme.accentMuted,
    '--theme-sliderTrackBg': theme.sliderTrackBg,
    '--theme-sliderTrackBorder': theme.sliderTrackBorder,
    // Accent dark boxes & list headers (#363D47 in GRAY theme)
    '--theme-controlBox-bg': (theme as any).controlBoxBg || theme.surface,
    '--theme-listHeader-bg': (theme as any).listHeaderBg || (theme as any).listSurface || theme.surfaceLighter,
    '--theme-listHeader-border': (theme as any).listHeaderBorder || (theme as any).listBorder || theme.border,
    '--theme-listHeader-text': (theme as any).listHeaderText || (theme as any).listTextMain || theme.textMain,
    '--theme-listHeader-textMuted': (theme as any).listHeaderTextMuted || (theme as any).listTextMuted || theme.textMuted,
    // List Area variables
    '--theme-list-bg': (theme as any).listBg || theme.bg,
    '--theme-list-surface': (theme as any).listSurface || theme.surfaceLighter,
    '--theme-list-surfaceLighter': (theme as any).listSurfaceLighter || theme.surface,
    '--theme-list-border': (theme as any).listBorder || theme.border,
    '--theme-list-borderActive': (theme as any).listBorderActive || theme.borderActive,
    '--theme-list-textMain': (theme as any).listTextMain || theme.textMain,
    '--theme-list-textMuted': (theme as any).listTextMuted || theme.textMuted,
    '--theme-list-textDim': (theme as any).listTextDim || theme.textDim,
    '--theme-list-accent': (theme as any).listAccent || theme.accent,
    '--theme-list-accentMuted': (theme as any).listAccentMuted || theme.accentMuted,
    '--list-font-size': `${listFontSize}px`,
    '--list-font-size-sm': `${Math.max(8, listFontSize - 1)}px`,
    '--list-font-size-xs': `${Math.max(8, listFontSize - 2)}px`,
  } as React.CSSProperties;

  // --- UI Components ---
  const memoizedTrackList = React.useMemo(() => {
    return displayTracks.map((track, idx) => {
      const isActive = (activePlaylistId === playingPlaylistId && currentTrackIndex === idx) || 
                       (currentTrack && track.id === currentTrack.id);
      const isSelected = selectedTrackIds.has(track.id);

      return (
        <div
          key={`${track.id}-${idx}`}
          onClick={(e) => {
            if (editingTrackId === track.id) return;
            if (e.shiftKey || e.ctrlKey || e.metaKey) {
              toggleTrackSelection(e, track.id);
            } else {
              if (!track.missing) playTrack(idx);
              setSelectedTrackIds(new Set([track.id]));
              lastSelectedTrackIdRef.current = track.id;
            }
          }}
          title={track.missing ? `このPCにファイルがありません: ${track.fileName}\nファイルをドラッグ&ドロップするか、フォルダを読み込んでください` : undefined}
          className="group flex items-center h-10 px-2 border-b transition-colors shrink-0 select-none w-full"
          style={{ 
              backgroundColor: isActive ? 'var(--theme-list-accentMuted)' : (isSelected ? 'var(--theme-list-surfaceLighter)' : 'transparent'), 
              borderColor: isActive ? 'var(--theme-list-borderActive)' : 'var(--theme-list-border)', 
              color: isActive ? 'var(--theme-list-textMain)' : 'var(--theme-list-textMuted)',
              cursor: track.missing ? 'not-allowed' : 'pointer',
              opacity: track.missing ? 0.55 : 1,
              fontSize: 'var(--list-font-size)',
          }}
          onMouseEnter={e => { if (!isActive && !isSelected) e.currentTarget.style.backgroundColor = 'var(--theme-list-surfaceLighter)'; }}
          onMouseLeave={e => { if (!isActive && !isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <div className="flex items-center h-full flex-shrink-0" style={{ width: colWidths.index }}>
            <div className="w-8 flex-shrink-0 flex items-center justify-center" onClick={(e) => toggleTrackSelection(e, track.id)}>
                <div 
                    className="w-3 h-3 flex items-center justify-center border transition-colors"
                    style={{ 
                        backgroundColor: isSelected ? 'var(--theme-list-accent)' : 'transparent',
                        borderColor: isSelected ? 'var(--theme-list-accent)' : 'var(--theme-list-border)'
                    }}
                >
                    {isSelected && <Check size={8} className="text-white" />}
                </div>
            </div>
            <div className="w-8 flex-shrink-0 flex items-center justify-center relative" style={{ color: 'var(--theme-list-textDim)' }}>
              {isActive ? (
                 <div className="absolute w-[6px] h-[6px] rounded-full" style={{ backgroundColor: 'var(--theme-list-accent)', boxShadow: `0 0 8px var(--theme-list-accent)` }}></div>
              ) : (
                <span style={{ fontSize: '11px' }}>{(idx + 1).toString().padStart(2, '0')}</span>
              )}
            </div>
            {colVisibility.art && (
              <div className="w-8 flex-shrink-0 flex items-center relative overflow-hidden" style={{ opacity: track.missing ? 0.5 : 1 }}>
                {track.coverUrl ? (
                   <img src={track.coverUrl} className="w-[28px] h-[28px] object-cover border" style={{ borderColor: 'var(--theme-list-border)' }} alt="" />
                ) : (
                   <div className="w-[28px] h-[28px] border flex items-center justify-center" style={{ borderColor: track.missing ? 'var(--theme-list-accent)' : 'var(--theme-list-border)', backgroundColor: 'var(--theme-list-bg)' }}>
                     <Activity size={8} style={{ color: 'var(--theme-list-textDim)' }} />
                   </div>
                )}
              </div>
            )}
          </div>
          {/* Track Info with Inline Edit */}
          {editingTrackId === track.id ? (
            <div className="flex-1 min-w-0 flex gap-2 pr-4 h-full items-center pl-3" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}>
              <input
                 type="text"
                 value={editTitle}
                 onChange={e => setEditTitle(e.target.value)}
                 className="flex-1 bg-transparent border-b outline-none font-mono"
                 style={{ borderColor: 'var(--theme-list-borderActive)', color: 'var(--theme-list-textMain)', fontSize: 'var(--list-font-size)' }}
                 autoFocus
                 onKeyDown={e => { if (e.key === 'Enter') saveTrackEdit(track.id); }}
              />
              <input
                 type="text"
                 value={editArtist}
                 onChange={e => setEditArtist(e.target.value)}
                 className="w-1/4 bg-transparent border-b outline-none font-mono"
                 style={{ borderColor: 'var(--theme-list-borderActive)', color: 'var(--theme-list-textMain)', fontSize: 'var(--list-font-size)' }}
                 onKeyDown={e => { if (e.key === 'Enter') saveTrackEdit(track.id); }}
              />
              <button onClick={() => saveTrackEdit(track.id)} className="px-1" title="Save" style={{ color: 'var(--theme-list-accent)' }}><Check size={12} /></button>
              <button title="Remove Artwork" onClick={(e) => removeArtwork(e, track.id)} className="px-1" style={{ color: 'var(--theme-list-textDim)' }}><Trash2 size={12} /></button>
              <button onClick={() => setEditingTrackId(null)} className="px-1" title="Cancel" style={{ color: 'var(--theme-list-textDim)' }}><X size={12} /></button>
            </div>
          ) : (
            <div className="flex-1 min-w-0 flex items-center gap-3 pl-3 h-full">
              {visibleCols.map(col => {
                const weight = colWidths[col as keyof typeof colWidths] || 150;

                if (col === 'fileName') {
                  return (
                    <div key="fileName" className="min-w-0 pr-2 truncate font-mono tracking-wide" style={{ flex: `${weight} 0 0%`, minWidth: 40, color: 'var(--theme-list-textMuted)', fontSize: 'var(--list-font-size-sm)' }} title={track.fileName}>
                      {track.fileName}
                    </div>
                  );
                }
                if (col === 'trackNumber') {
                  return (
                    <div key="trackNumber" className="min-w-0 text-center font-mono opacity-80 truncate pr-1" style={{ flex: `${weight} 0 0%`, minWidth: 30, color: 'var(--theme-list-textDim)', fontSize: 'var(--list-font-size-sm)' }}>
                      {track.trackNumber ? track.trackNumber.toString().padStart(2, '0') : '-'}
                    </div>
                  );
                }
                if (col === 'title') {
                  return (
                    <div key="title" className="min-w-0 pr-2 truncate font-bold font-mono tracking-wide" style={{ flex: `${weight} 0 0%`, minWidth: 40, color: 'var(--theme-list-textMain)', fontSize: 'var(--list-font-size)' }} title={track.title}>
                      {track.title}
                    </div>
                  );
                }
                if (col === 'artist') {
                  return (
                    <div key="artist" className="min-w-0 pr-2 truncate font-mono tracking-wide" style={{ flex: `${weight} 0 0%`, minWidth: 40, color: 'var(--theme-list-textMuted)', fontSize: 'var(--list-font-size-sm)' }} title={track.artist}>
                      {track.artist}
                    </div>
                  );
                }
                if (col === 'album') {
                  return (
                    <div key="album" className="min-w-0 pr-2 truncate font-mono tracking-wide" style={{ flex: `${weight} 0 0%`, minWidth: 40, color: 'var(--theme-list-textDim)', fontSize: 'var(--list-font-size-sm)' }} title={track.album}>
                      {track.album}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
          {/* Explicit Reordering Tools */}
          {colVisibility.actions && (
            <div className="w-24 flex-shrink-0 flex items-center justify-end gap-1 transition-opacity pr-2">
              {editingTrackId !== track.id && (
                  <button onClick={(e) => startEditTrack(e, track)} title="Edit Info" className="w-5 h-5 flex items-center justify-center border rounded-[2px] transition-colors hover:opacity-80 active:scale-95" style={{ backgroundColor: 'var(--theme-list-accentMuted)', borderColor: 'var(--theme-list-borderActive)', color: listIconColor }}>
                    <Palette size={10} />
                  </button>
              )}
            <button 
              onClick={(e) => moveTrack(e, idx, 0)} 
              title={activeSortConfig.key !== 'none' ? 'ソートを解除すると並べ替えできます' : '先頭へ移動'} 
              className="w-5 h-5 flex items-center justify-center border rounded-[2px] transition-colors hover:opacity-80 active:scale-95 disabled:opacity-20" 
              disabled={idx === 0 || activeSortConfig.key !== 'none'} 
              style={{ backgroundColor: 'var(--theme-list-surfaceLighter)', borderColor: 'var(--theme-list-border)', color: listIconColor }}
            >
              <ChevronsUp size={10} />
            </button>
            <button 
              onClick={(e) => moveTrack(e, idx, idx - 1)} 
              title={activeSortConfig.key !== 'none' ? 'ソートを解除すると並べ替えできます' : '一つ上へ移動'} 
              className="w-5 h-5 flex items-center justify-center border rounded-[2px] transition-colors hover:opacity-80 active:scale-95 disabled:opacity-20" 
              disabled={idx === 0 || activeSortConfig.key !== 'none'} 
              style={{ backgroundColor: 'var(--theme-list-surfaceLighter)', borderColor: 'var(--theme-list-border)', color: listIconColor }}
            >
              <ChevronUp size={10} />
            </button>
            <button 
              onClick={(e) => moveTrack(e, idx, idx + 1)} 
              title={activeSortConfig.key !== 'none' ? 'ソートを解除すると並べ替えできます' : '一つ下へ移動'} 
              className="w-5 h-5 flex items-center justify-center border rounded-[2px] transition-colors hover:opacity-80 active:scale-95 disabled:opacity-20" 
              disabled={idx === displayTracks.length - 1 || activeSortConfig.key !== 'none'} 
              style={{ backgroundColor: 'var(--theme-list-surfaceLighter)', borderColor: 'var(--theme-list-border)', color: listIconColor }}
            >
              <ChevronDown size={10} />
            </button>
            <button 
              onClick={(e) => moveTrack(e, idx, displayTracks.length - 1)} 
              title={activeSortConfig.key !== 'none' ? 'ソートを解除すると並べ替えできます' : '末尾へ移動'} 
              className="w-5 h-5 flex items-center justify-center border rounded-[2px] transition-colors hover:opacity-80 active:scale-95 disabled:opacity-20" 
              disabled={idx === displayTracks.length - 1 || activeSortConfig.key !== 'none'} 
              style={{ backgroundColor: 'var(--theme-list-surfaceLighter)', borderColor: 'var(--theme-list-border)', color: listIconColor }}
            >
              <ChevronsDown size={10} />
            </button>
          </div>
          )}
        </div>
      );
    });
  }, [displayTracks, activePlaylistId, playingPlaylistId, currentTrackIndex, currentTrack?.id, selectedTrackIds, editingTrackId, editTitle, editArtist, listIconColor, activeSortConfig.key, colWidths, colVisibility]);

  // Replace old PanelBlock definition location
  return (
    <div 
      className="h-screen w-screen relative flex flex-col font-mono box-border overflow-hidden transition-colors duration-300"
      style={{ ...styleVars, backgroundColor: 'var(--theme-bg)', color: 'var(--theme-textMain)' }}
    >
      {/* Hidden Inputs */}
      <audio 
        ref={audioRef} 
        src={currentTrack?.url} 
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={handleNext}
        onCanPlay={() => {
          if (isPlaying && audioRef.current?.paused) {
            if (audioCtxRef.current?.state === 'suspended') {
              audioCtxRef.current.resume();
            }
            audioRef.current.play().catch(()=>{});
          }
        }}
      />
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        // @ts-ignore
        webkitdirectory="true" 
        directory="true" 
        multiple 
      />

      {/* --- MINI & SLIM MODE UI --- */}
      {viewMode !== 'full' && (
         <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          
          {viewMode === 'mini' ? (
             <div 
                ref={playerRef}
                className="w-[360px] rounded-xl flex flex-col overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)] border pointer-events-auto"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', transform: `translate(${playerOffset.x}px, ${playerOffset.y}px)` }}
             >
                {/* Embedded Draggable Header */}
                <div 
                   className="w-full h-10 flex items-center justify-between px-4 shrink-0 cursor-move border-b"
                   style={{ borderColor: 'var(--theme-border)' }}
                   onPointerDown={handleDragStart}
                   onPointerMove={handleDragMove}
                   onPointerUp={handleDragEnd}
                   onPointerCancel={handleDragEnd}
                >
                   <div className="text-[10px] tracking-widest font-bold flex items-center gap-2 pointer-events-none" style={{ color: 'var(--theme-textMuted)' }}>
                      <Activity size={12} style={{ color: 'var(--theme-accent)' }} />
                      SOLID AUDIO
                   </div>
                   <div className="flex items-center gap-4 no-drag">
                      <button 
                        onClick={() => setViewMode('slim')}
                        className="hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--theme-textMain)' }}
                        title="Slim Mode"
                      >
                         <Minus size={14} />
                      </button>
                      <button 
                        onClick={() => setViewMode('full')}
                        className="hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--theme-textMain)' }}
                        title="Close Mode"
                      >
                         <X size={16} />
                      </button>
                   </div>
                </div>

                {currentTrack ? (
                    <div className="flex flex-col">
                       <div className="w-full aspect-square border-b shrink-0 flex items-center justify-center relative overflow-hidden" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)' }}>
                          {currentTrack.coverUrl ? (
                             <img src={currentTrack.coverUrl} className="absolute inset-0 w-full h-full object-cover pointer-events-none" alt="album cover" />
                          ) : (
                             <Activity size={32} style={{ color: 'var(--theme-textDim)' }} />
                          )}
                       </div>
                       <div className="p-6 flex flex-col gap-5">
                          <div className="text-center flex flex-col gap-1">
                             <h3 className="font-bold text-lg truncate leading-tight" style={{ color: 'var(--theme-textMain)' }}>{currentTrack.title}</h3>
                             <p className="text-[10px] truncate tracking-widest uppercase" style={{ color: 'var(--theme-textMuted)' }}>{currentTrack.artist}</p>
                          </div>
                          
                          {/* Transport & Time */}
                          <div className="flex flex-col gap-2">
                             <div className="flex justify-between items-center text-[10px] tracking-widest font-mono" style={{ color: 'var(--theme-textMuted)' }}>
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                             </div>
                             <div 
                                className="h-[6px] border cursor-pointer relative"
                                style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                onPointerCancel={handlePointerUp}
                             >
                                <div 
                                  className="absolute top-0 left-0 h-full transition-all duration-75 ease-linear pointer-events-none"
                                  style={{ width: `${duration && !isNaN(duration) && !isNaN(currentTime) ? (currentTime / duration) * 100 : 0}%`, backgroundColor: 'var(--theme-accent)' }}
                                />
                             </div>
                          </div>
                          
                          {/* Controls */}
                          <div className="flex items-center justify-between mt-2">
                             <button 
                               onClick={() => setIsShuffle(!isShuffle)}
                               className="w-8 h-8 flex items-center justify-center rounded transition-colors hover:opacity-80"
                               style={{ color: isShuffle ? 'var(--theme-accent)' : 'var(--theme-textMuted)' }}
                             >
                                <Shuffle size={14} />
                             </button>

                             <div className="flex items-center gap-6">
                               <button onClick={handlePrev} className="hover:opacity-80 transition-opacity" style={{ color: 'var(--theme-textMain)' }}>
                                  <SkipBack size={24} />
                               </button>
                               <button 
                                  onClick={togglePlay} 
                                  className="w-16 h-16 rounded-full flex items-center justify-center border hover:opacity-90 transition-all active:scale-95 shadow-lg"
                                  style={isPlaying ? { backgroundColor: 'var(--theme-accentMuted)', borderColor: 'var(--theme-accentDark)', color: 'var(--theme-accent)' } : { backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-textMain)' }}
                               >
                                  {isPlaying ? <Pause size={28} /> : <Play size={28} className="translate-x-[2px]" />}
                               </button>
                               <button onClick={handleNext} className="hover:opacity-80 transition-opacity" style={{ color: 'var(--theme-textMain)' }}>
                                  <SkipForward size={24} />
                               </button>
                             </div>

                             <button 
                               onClick={() => setRepeatMode((prev) => (prev + 1) % 4 as 0|1|2|3)}
                               className="w-8 h-8 flex items-center justify-center rounded transition-colors relative hover:opacity-80"
                               style={{ color: repeatMode > 0 ? 'var(--theme-accent)' : 'var(--theme-textMuted)' }}
                               title={repeatMode === 1 ? "Repeat All" : repeatMode === 2 ? "Repeat One" : repeatMode === 3 ? "Repeat Set" : "Repeat Off"}
                             >
                                <Repeat size={14} />
                                {repeatMode === 2 && <span className="absolute top-0 right-0 text-[8px] font-bold" style={{ color: 'var(--theme-accent)' }}>1</span>}
                                {repeatMode === 3 && <span className="absolute -top-1 -right-1 text-[7px] font-bold px-0.5 rounded leading-none" style={{ backgroundColor: 'var(--theme-accentDark)', color: '#fff' }}>SET</span>}
                             </button>
                          </div>
                       </div>
                    </div>
                ) : (
                    <div className="p-12 flex flex-col items-center justify-center gap-4 text-center">
                       <Activity size={32} style={{ color: 'var(--theme-textDim)' }} />
                       <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--theme-textMuted)' }}>NO TRACK SELECTED</p>
                    </div>
                )}
             </div>
          ) : (
             <div 
                ref={playerRef}
                className="w-[600px] max-w-[90vw] rounded-xl flex items-center overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)] border p-2 gap-4 pointer-events-auto" 
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', transform: `translate(${playerOffset.x}px, ${playerOffset.y}px)` }}
             >
                {/* Embedded Draggable Drag Handle */}
                <div 
                   className="w-8 h-full flex flex-col items-center justify-center shrink-0 cursor-move rounded hover:bg-black/10 transition-colors"
                   onPointerDown={handleDragStart}
                   onPointerMove={handleDragMove}
                   onPointerUp={handleDragEnd}
                   onPointerCancel={handleDragEnd}
                >
                   <GripVertical size={14} className="opacity-30 pointer-events-none" style={{ color: 'var(--theme-textMain)' }} />
                </div>

                {/* SLIM MODE UI */}
                {currentTrack ? (
                   <>
                      <div className="flex items-center gap-3 w-[30%] min-w-0 pr-2 shrink-0 border-r" style={{ borderColor: 'var(--theme-border)' }}>
                         <div className="w-10 h-10 shrink-0 border relative overflow-hidden" style={{ borderColor: 'var(--theme-border)' }}>
                            {currentTrack.coverUrl ? (
                               <img src={currentTrack.coverUrl} className="absolute inset-0 w-full h-full object-cover" alt="album" />
                            ) : (
                               <Activity size={16} className="absolute inset-0 m-auto" style={{ color: 'var(--theme-textDim)' }} />
                            )}
                         </div>
                         <div className="flex flex-col min-w-0 overflow-hidden">
                            <div className="text-xs font-bold truncate tracking-wide" style={{ color: 'var(--theme-textMain)' }}>{currentTrack.title}</div>
                            <div className="text-[9px] uppercase tracking-wider truncate" style={{ color: 'var(--theme-textMuted)' }}>{currentTrack.artist}</div>
                         </div>
                      </div>

                      <div className="flex items-center gap-3 justify-center shrink-0">
                          <button onClick={handlePrev} className="hover:opacity-80 transition-opacity" style={{ color: 'var(--theme-textMain)' }}><SkipBack size={16} /></button>
                          <button 
                             onClick={togglePlay} 
                             className="w-10 h-10 rounded-full flex items-center justify-center border hover:opacity-90 transition-all active:scale-95"
                             style={isPlaying ? { backgroundColor: 'var(--theme-accentMuted)', borderColor: 'var(--theme-accentDark)', color: 'var(--theme-accent)' } : { backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-textMain)' }}
                          >
                             {isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-[1px]" />}
                          </button>
                          <button onClick={handleNext} className="hover:opacity-80 transition-opacity" style={{ color: 'var(--theme-textMain)' }}><SkipForward size={16} /></button>
                      </div>

                      <div className="flex-1 flex items-center gap-3 px-2 min-w-0">
                         <div className="text-[9px] tracking-widest font-mono shrink-0" style={{ color: 'var(--theme-textMuted)' }}>{formatTime(currentTime)}</div>
                         <div 
                             className="h-[4px] flex-1 border cursor-pointer relative"
                             style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}
                             onPointerDown={handlePointerDown}
                             onPointerMove={handlePointerMove}
                             onPointerUp={handlePointerUp}
                             onPointerCancel={handlePointerUp}
                         >
                            <div 
                               className="absolute top-0 left-0 h-full transition-all duration-75 ease-linear pointer-events-none"
                               style={{ width: `${duration && !isNaN(duration) && !isNaN(currentTime) ? (currentTime / duration) * 100 : 0}%`, backgroundColor: 'var(--theme-accent)' }}
                            />
                         </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 px-2">
                          <button 
                            onClick={() => setIsShuffle(!isShuffle)}
                            className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:opacity-80"
                            style={{ color: isShuffle ? 'var(--theme-accent)' : 'var(--theme-textMuted)', backgroundColor: isShuffle ? 'var(--theme-accentMuted)' : 'transparent' }}
                          >
                             <Shuffle size={12} />
                          </button>
                          <button 
                            onClick={() => setRepeatMode((prev) => (prev + 1) % 4 as 0|1|2|3)}
                            className="w-6 h-6 flex items-center justify-center rounded transition-colors relative hover:opacity-80"
                            style={{ color: repeatMode > 0 ? 'var(--theme-accent)' : 'var(--theme-textMuted)', backgroundColor: repeatMode > 0 ? 'var(--theme-accentMuted)' : 'transparent' }}
                            title={repeatMode === 1 ? "Repeat All" : repeatMode === 2 ? "Repeat One" : repeatMode === 3 ? "Repeat Set" : "Repeat Off"}
                          >
                             <Repeat size={12} />
                             {repeatMode === 2 && <span className="absolute -top-1 -right-1 text-[8px] font-bold" style={{ color: 'var(--theme-accent)' }}>1</span>}
                             {repeatMode === 3 && <span className="absolute -top-1.5 -right-2 text-[6px] font-bold px-0.5 rounded leading-none" style={{ backgroundColor: 'var(--theme-accentDark)', color: '#fff' }}>SET</span>}
                          </button>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0 pl-3 border-l" style={{ borderColor: 'var(--theme-border)' }}>
                         <button 
                           onClick={() => setViewMode('mini')}
                           className="hover:opacity-80 transition-opacity"
                           style={{ color: 'var(--theme-textMain)' }}
                           title="Card Mode"
                         >
                            <PanelTop size={14} />
                         </button>
                         <button 
                           onClick={() => setViewMode('full')}
                           className="hover:opacity-80 transition-opacity"
                           style={{ color: 'var(--theme-textMain)' }}
                           title="Close Mode"
                         >
                            <X size={16} />
                         </button>
                      </div>
                   </>
                ) : (
                   <div className="w-full h-10 flex items-center justify-center text-[10px] tracking-widest flex-1" style={{ color: 'var(--theme-textDim)' }}>AWAITING TRACK SELECTION</div>
                )}
             </div>
          )}
         </div>
      )}

      {/* --- MAIN UI --- */}
      <div className={`flex flex-col h-full w-full p-4 gap-6 box-border transition-opacity duration-300 ${viewMode !== 'full' ? 'opacity-0 pointer-events-none absolute' : 'opacity-100 relative'}`}>

      {/* Top Header Row */}
      <header className="flex justify-between items-center px-1">
        <div className="flex items-center gap-3">
          <Activity size={18} style={{ color: 'var(--theme-accent)' }} />
          <h1 className="text-xl font-bold tracking-widest uppercase">SOLID AUDIO MUSIC PLAYER</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setViewMode('mini')}
            className="flex items-center justify-center border h-6 px-2 transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)', color: 'var(--theme-textMuted)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--theme-textMain)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--theme-textMuted)'}
            title="Mini Player Mode"
          >
            <Minimize2 size={12} />
          </button>
          
          <div 
            className="flex items-center gap-3 border h-6 px-3"
            style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)' }}
          >
            <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color: 'var(--theme-textMuted)' }}>SIZE</span>
            <input
              type="range"
              min="9"
              max="24"
              value={listFontSize}
              onChange={(e) => setListFontSize(parseInt(e.target.value))}
              className="w-20 sq-slider"
            />
            <span className="text-[9px] uppercase tracking-wider font-mono" style={{ color: 'var(--theme-accent)', width: '24px', textAlign: 'right' }}>{listFontSize}PX</span>
          </div>

          <button 
            onClick={cycleTheme}
            className="flex items-center justify-center gap-2 border h-6 px-2 transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)', color: 'var(--theme-textMuted)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--theme-textMain)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--theme-textMuted)'}
          >
            <Palette size={12} />
            <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--theme-accent)' }}>THEME: {theme.id}</span>
          </button>
          <div className="text-xs tracking-widest font-mono" style={{ color: 'var(--theme-textMuted)' }}>v2.0.8 OS</div>
        </div>
      </header>

      {/* Main Control Surface - Top half */}
      <div className="grid grid-cols-12 gap-4 h-[200px] shrink-0">
        
        {/* 01 TRACK INFO */}
        <PanelBlock title="01 TRACK INFO" className="col-span-4 p-4 relative">
          {currentTrack ? (
            <div className="flex h-full gap-4 overflow-hidden relative">
              <div className="h-full aspect-square shrink-0 relative border shadow-inner" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)' }}>
                {currentTrack.coverUrl ? (
                  <img src={currentTrack.coverUrl} className="absolute inset-0 w-full h-full object-cover" alt="Album Art" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                     <Activity size={24} style={{ color: 'var(--theme-textDim)' }} />
                  </div>
                )}
              </div>
              <div className="flex flex-col h-full justify-between pb-1 min-w-0 flex-1">
                <div className="min-w-0">
                  <div className="text-lg font-bold mb-1 leading-tight break-words" title={currentTrack.title} style={{ color: 'var(--theme-textMain)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {currentTrack.title}
                  </div>
                  <div className="text-[10px] truncate uppercase tracking-[0.2em] font-medium" style={{ color: 'var(--theme-accent)' }} title={currentTrack.artist}>
                    {currentTrack.artist}
                  </div>
                </div>
                
                <div className="flex flex-col gap-1 mt-1">
                   <div className="text-[9px] truncate tracking-wider" style={{ color: 'var(--theme-textDim)' }}>
                     FILE: {currentTrack.fileName}
                   </div>
                   <div className="border p-1 rounded-[1px] h-8 w-full flex items-center justify-center" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)' }}>
                      <canvas 
                        ref={canvasRef} 
                        width={200} 
                        height={20} 
                        className="block w-full"
                        style={{ opacity: 1, pointerEvents: 'none' }}
                      />
                   </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-xs tracking-widest" style={{ color: 'var(--theme-textDim)' }}>
              AWAITING TRACK SELECTION
            </div>
          )}
        </PanelBlock>

        {/* 02 TRANSPORT & TIME */}
        <PanelBlock title="02 TRANSPORT ENGINE" className="col-span-5 p-4 flex flex-col justify-between">
          {/* Progress */}
          <div className="mb-2">
            <div className="flex justify-between text-[10px] tracking-widest mb-2" style={{ color: 'var(--theme-textMuted)' }}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <div 
              ref={progressBarRef}
              className="h-[6px] border cursor-pointer relative"
              style={{ backgroundColor: 'var(--theme-sliderTrackBg, var(--theme-bg))', borderColor: 'var(--theme-sliderTrackBorder, var(--theme-border))', touchAction: 'none' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div 
                className="absolute top-0 left-0 h-full transition-all duration-75 ease-linear"
                style={{ width: `${duration && !isNaN(duration) && !isNaN(currentTime) ? (currentTime / duration) * 100 : 0}%`, backgroundColor: 'var(--theme-accent)' }}
              />
            </div>
          </div>

          {/* Controls & EQ - 6 Unified Panels (3 columns x 2 rows, matching width and height) */}
          {/* Row 1: Top 3 Panels (Play modes, Transport, Volume) */}
          <div className="grid grid-cols-3 gap-4 items-center">
            {/* Panel 1: Play modes (Shuffle / Repeat) - Centered in panel with dark buttons */}
            <div 
              className="border h-14 flex items-center justify-center gap-3 px-2 w-full"
              style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)' }}
            >
              <button 
                onClick={() => setIsShuffle(!isShuffle)}
                className="w-12 h-9 flex items-center justify-center border transition-all hover:opacity-80 active:scale-95"
                style={isShuffle 
                  ? { backgroundColor: 'var(--theme-accentMuted)', color: 'var(--theme-accent)', borderColor: 'var(--theme-borderActive)' } 
                  : { backgroundColor: 'var(--theme-bg)', color: 'var(--theme-textMain)', borderColor: 'var(--theme-border)' }
                }
                title="Shuffle"
              >
                <Shuffle size={15} />
              </button>
              <button 
                onClick={() => setRepeatMode((prev) => (prev + 1) % 4 as 0|1|2|3)}
                className="w-12 h-9 flex items-center justify-center border transition-all relative hover:opacity-80 active:scale-95"
                style={repeatMode > 0 
                  ? { backgroundColor: 'var(--theme-accentMuted)', color: 'var(--theme-accent)', borderColor: 'var(--theme-borderActive)' } 
                  : { backgroundColor: 'var(--theme-bg)', color: 'var(--theme-textMain)', borderColor: 'var(--theme-border)' }
                }
                title={repeatMode === 1 ? "Repeat All" : repeatMode === 2 ? "Repeat One" : repeatMode === 3 ? "Repeat Set (Selected Lists)" : "Repeat Off"}
              >
                <Repeat size={15} />
                {repeatMode === 2 && (
                  <span className="absolute -top-1.5 -right-1.5 text-[8px] rounded-sm px-1 flex items-center justify-center z-10 font-bold" style={{ backgroundColor: 'var(--theme-accentDark)', color: '#fff' }}>1</span>
                )}
                {repeatMode === 3 && (
                  <span className="absolute -top-1.5 -right-1.5 text-[7px] font-bold rounded-sm px-1 py-0.2 flex items-center justify-center z-10 leading-none tracking-tighter" style={{ backgroundColor: 'var(--theme-accentDark)', color: '#fff' }}>SET</span>
                )}
              </button>
            </div>

            {/* Panel 2: Transport Core - Centered in panel with dark buttons */}
            <div 
              className="border h-14 flex items-center justify-center gap-1.5 px-2 w-full"
              style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)' }}
            >
              <button 
                onClick={handlePrev} 
                className="w-11 h-9 flex items-center justify-center border transition-all hover:opacity-80 active:scale-95"
                style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-textMain)' }}
                title="Previous Track"
              >
                <SkipBack size={16} />
              </button>
              <button 
                onClick={togglePlay} 
                className="w-14 h-9 flex items-center justify-center transition-all border hover:opacity-90 active:scale-95"
                style={isPlaying 
                  ? { backgroundColor: 'var(--theme-accentMuted)', borderColor: 'var(--theme-accentDark)', color: 'var(--theme-accent)' } 
                  : { backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-textMain)' }
                }
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
              </button>
              <button 
                onClick={handleNext} 
                className="w-11 h-9 flex items-center justify-center border transition-all hover:opacity-80 active:scale-95"
                style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-textMain)' }}
                title="Next Track"
              >
                <SkipForward size={16} />
              </button>
            </div>

            {/* Panel 3: Volume Box - matching the panel's background color */}
            <div 
              className="border h-14 flex items-center gap-2 px-3 w-full"
              style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)' }}
            >
              <button 
                onClick={() => setIsMuted(!isMuted)} 
                className="hover:opacity-80 p-1 shrink-0 flex items-center transition-colors" 
                style={{ color: isMuted ? 'var(--theme-textDim)' : 'var(--theme-textMain)' }}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <input 
                type="range" 
                min="0" max="1" step="0.01" 
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="flex-1 min-w-0 appearance-none vol-slider"
                title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
              <span 
                className="text-[10px] font-mono tracking-wider text-right shrink-0 select-none font-bold" 
                style={{ color: 'var(--theme-accent)', width: '32px' }}
              >
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>
          </div>

          {/* Row 2: Bottom 3 Panels (EQ Section) - Restored to theme-bg */}
          <div className="grid grid-cols-3 gap-4 mt-3">
            {/* Panel 4: LOW EQ */}
            <div className="border h-14 p-2.5 flex flex-col justify-between" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
              <div className="flex justify-between items-center text-[10px] font-mono tracking-widest" style={{ color: 'var(--theme-textMuted)' }}>
                <span>01 LOW</span>
                <span className="font-bold" style={{ color: 'var(--theme-textMain)' }}>{eqLow}</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" step="1" 
                value={eqLow}
                onChange={(e) => setEqLow(parseInt(e.target.value))}
                className="w-full appearance-none cursor-pointer sq-slider"
                style={{ accentColor: 'var(--theme-accent)' }}
              />
            </div>

            {/* Panel 5: MID EQ */}
            <div className="border h-14 p-2.5 flex flex-col justify-between" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
              <div className="flex justify-between items-center text-[10px] font-mono tracking-widest" style={{ color: 'var(--theme-textMuted)' }}>
                <span>02 MID</span>
                <span className="font-bold" style={{ color: 'var(--theme-textMain)' }}>{eqMid}</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" step="1" 
                value={eqMid}
                onChange={(e) => setEqMid(parseInt(e.target.value))}
                className="w-full appearance-none cursor-pointer sq-slider"
                style={{ accentColor: 'var(--theme-accent)' }}
              />
            </div>

            {/* Panel 6: HIGH EQ */}
            <div className="border h-14 p-2.5 flex flex-col justify-between" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
              <div className="flex justify-between items-center text-[10px] font-mono tracking-widest" style={{ color: 'var(--theme-textMuted)' }}>
                <span>03 HIGH</span>
                <span className="font-bold" style={{ color: 'var(--theme-textMain)' }}>{eqHigh}</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" step="1" 
                value={eqHigh}
                onChange={(e) => setEqHigh(parseInt(e.target.value))}
                className="w-full appearance-none cursor-pointer sq-slider"
                style={{ accentColor: 'var(--theme-accent)' }}
              />
            </div>
          </div>
        </PanelBlock>

        {/* 03 SETTINGS / ACTIONS */}
        <PanelBlock title="03 SYSTEM ACTIONS" className="col-span-3 p-4">
           <div className="flex flex-col gap-3 h-full pt-1">
               <button 
                  onClick={handleSelectFolder}
                  className="flex items-center justify-center gap-2 border h-8 shrink-0 text-[10px] tracking-widest font-bold transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-borderActive)', color: 'var(--theme-accent)' }}
                >
                  <FolderOpen size={14} />
                  READ DIRECTORY
               </button>
               
               <div className="grid grid-cols-2 gap-2 shrink-0">
                 <button 
                    onClick={() => { setIsCreatingPlaylist(true); setNewPlaylistName(''); }}
                    className="flex items-center justify-center gap-2 border h-7 text-[9px] tracking-widest transition-colors hover:opacity-80 active:scale-95"
                    style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-textMain)' }}
                  >
                    <Plus size={12} style={{ color: 'var(--theme-textMuted)' }} />
                    CREATE LIST
                 </button>
                 <button 
                    onClick={findDuplicates}
                    className="flex items-center justify-center gap-2 border h-7 text-[9px] tracking-widest transition-colors hover:opacity-80 active:scale-95"
                    style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-textMain)' }}
                  >
                    <Layers size={12} style={{ color: 'var(--theme-textMuted)' }} />
                    FIND DUPES
                 </button>
                 <button 
                    onClick={clearActivePlaylist}
                    className="col-span-2 flex items-center justify-center gap-2 border h-7 text-[9px] tracking-widest transition-colors hover:opacity-80 active:scale-95 disabled:opacity-50"
                    style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-textMain)' }}
                    disabled={displayTracks.length === 0}
                  >
                    <Trash2 size={12} style={{ color: 'var(--theme-textMuted)' }} />
                    CLEAR ALL DATA
                 </button>
               </div>
               
               <div className="relative mt-auto border h-8 flex items-center shrink-0" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
                  <Search size={12} className="absolute left-2" style={{ color: 'var(--theme-textDim)' }} />
                  <input 
                    type="text" 
                    placeholder="FIND KEYWORD..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-[10px] pl-7 pr-2 outline-none font-mono tracking-widest h-full"
                    style={{ color: 'var(--theme-textMain)' }}
                  />
               </div>
           </div>
        </PanelBlock>

      </div>

      {/* Main Content Area - Bottom half */}
      <div className="flex gap-4 flex-1 min-h-0 border p-4 relative" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
        <div className="absolute -top-2 left-2 px-1" style={{ backgroundColor: 'var(--theme-surface)' }}>
           <span className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--theme-textMuted)' }}>04 DATA BANKS</span>
        </div>

        {/* 04 BROWSER (Playlists) */}
        <div 
          className="border flex flex-col shrink-0 relative transition-colors" 
          style={{ 
            width: sidebarWidth, 
            minWidth: 120, 
            maxWidth: 800, 
            backgroundColor: isDragOver ? 'var(--theme-accentMuted)' : 'var(--theme-list-bg)', 
            borderColor: isDragOver ? 'var(--theme-accent)' : 'var(--theme-border)',
            boxShadow: isDragOver ? 'inset 0 0 0 2px var(--theme-accent)' : 'none'
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="border-b px-2 py-1 flex items-center justify-between h-8 shrink-0 gap-1 overflow-hidden" style={{ backgroundColor: 'var(--theme-listHeader-bg)', borderColor: 'var(--theme-listHeader-border)' }}>
            <div className="flex items-center gap-1 min-w-0">
              <span className="uppercase tracking-wider text-[11px] truncate font-medium" style={{ color: 'var(--theme-listHeader-textMuted)' }}>INDEX MAP</span>
              {selectedPlaylistIds.size > 0 && (
                <span className="text-[9px] font-mono px-1 border rounded-[2px] shrink-0" style={{ borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)', backgroundColor: 'var(--theme-accentMuted)' }}>
                  {selectedPlaylistIds.size}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              {/* SELECT button to toggle selection mode */}
              <button 
                onClick={() => {
                  const nextMode = !isPlaylistSelectionMode;
                  setIsPlaylistSelectionMode(nextMode);
                  if (!nextMode && selectedPlaylistIds.size === 0) {
                    setConfirmDeleteSelectedPlaylists(false);
                  }
                }}
                className="flex items-center justify-center border rounded-[2px] px-1.5 h-5 text-[9px] font-mono tracking-wider transition-colors hover:opacity-80 active:scale-95"
                style={isPlaylistSelectionMode 
                  ? { backgroundColor: 'var(--theme-accentMuted)', borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)' } 
                  : { backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-listHeader-border)', color: 'var(--theme-listHeader-text)' }
                }
                title={isPlaylistSelectionMode ? "選択モード終了" : "プレイリスト選択モード (SETリピート・一括操作)"}
              >
                SELECT
              </button>

              {selectedPlaylistIds.size > 0 && (
                <>
                  <button 
                    onClick={() => moveSelectedPlaylists('up')}
                    className="flex items-center justify-center border rounded-[2px] w-5 h-5 transition-colors hover:opacity-80 active:scale-95"
                    style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-listHeader-border)' }}
                    title="選択したリストを上に移動"
                  >
                    <ChevronUp size={11} style={{ color: 'var(--theme-listHeader-text)' }} />
                  </button>

                  <button 
                    onClick={() => moveSelectedPlaylists('down')}
                    className="flex items-center justify-center border rounded-[2px] w-5 h-5 transition-colors hover:opacity-80 active:scale-95"
                    style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-listHeader-border)' }}
                    title="選択したリストを下に移動"
                  >
                    <ChevronDown size={11} style={{ color: 'var(--theme-listHeader-text)' }} />
                  </button>

                  {confirmDeleteSelectedPlaylists ? (
                    <div className="flex items-center gap-0.5 px-1 py-0.5 border rounded-[2px]" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-borderActive)' }} onClick={e => e.stopPropagation()}>
                      <span className="text-[8px] uppercase tracking-tighter" style={{ color: 'var(--theme-accent)' }}>DEL?</span>
                      <button
                        onClick={deleteSelectedPlaylists}
                        className="p-0.5 hover:opacity-80"
                        title="選択したリストを削除"
                        style={{ color: 'var(--theme-accent)' }}
                      >
                        <Trash2 size={10} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteSelectedPlaylists(false)}
                        className="p-0.5 hover:opacity-80"
                        title="キャンセル"
                        style={{ color: 'var(--theme-textDim)' }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setConfirmDeleteSelectedPlaylists(true)}
                      className="flex items-center justify-center border rounded-[2px] w-5 h-5 transition-colors hover:opacity-80 active:scale-95"
                      style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-listHeader-border)' }}
                      title="選択したリストを削除"
                    >
                      <Trash2 size={10} style={{ color: 'var(--theme-accent)' }} />
                    </button>
                  )}

                  <button 
                    onClick={() => { setSelectedPlaylistIds(new Set()); setConfirmDeleteSelectedPlaylists(false); }}
                    className="flex items-center justify-center border rounded-[2px] w-5 h-5 transition-colors hover:opacity-80 active:scale-95"
                    style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-listHeader-border)' }}
                    title="選択を解除"
                  >
                    <X size={10} style={{ color: 'var(--theme-listHeader-textMuted)' }} />
                  </button>
                </>
              )}

              <button 
                onClick={() => { setIsCreatingPlaylist(true); setNewPlaylistName(''); }}
                className="flex items-center justify-center border rounded-[2px] w-5 h-5 transition-colors hover:opacity-80 active:scale-95"
                style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-listHeader-border)' }}
                title="CREATE LIST"
              >
                <Plus size={10} style={{ color: 'var(--theme-listHeader-text)' }} />
              </button>
            </div>
          </div>
          <div className="flex flex-col h-full overflow-y-auto w-full" style={{ backgroundColor: 'var(--theme-list-bg)' }}>
            {playlists.map((pl, plIdx) => {
              const isSelected = pl.id !== 'all-tracks' && selectedPlaylistIds.has(pl.id);
              const isActive = activePlaylistId === pl.id;

              return (
              <React.Fragment key={pl.id}>
              <div
                draggable={pl.id !== 'all-tracks' && renamingPlaylistId !== pl.id}
                onDragStart={(e) => handlePlaylistDragStart(e, pl.id)}
                onDragOver={(e) => handlePlaylistDragOver(e, pl.id)}
                onDrop={(e) => handlePlaylistDrop(e, pl.id)}
                onDragEnd={handlePlaylistDragEnd}
                onClick={(e) => {
                  if (pl.id === 'all-tracks') {
                    setActivePlaylistId('all-tracks');
                    setSelectedPlaylistIds(new Set());
                    lastSelectedPlaylistIdRef.current = null;
                    return;
                  }
                  if (isPlaylistSelectionMode) {
                    togglePlaylistSelection(e, pl.id);
                    setActivePlaylistId(pl.id);
                    return;
                  }
                  if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    togglePlaylistSelection(e, pl.id);
                  } else {
                    setActivePlaylistId(pl.id);
                    setSelectedPlaylistIds(new Set([pl.id]));
                    lastSelectedPlaylistIdRef.current = pl.id;
                  }
                }}
                onDoubleClick={() => {
                  if (pl.id !== 'all-tracks') {
                    setRenamingPlaylistId(pl.id);
                    setRenamingPlaylistName(pl.name);
                  }
                }}
                className={`text-left px-3 py-2 tracking-widest flex items-center justify-between border-b transition-colors cursor-pointer group select-none ${pl.id !== 'all-tracks' && renamingPlaylistId !== pl.id ? 'cursor-grab active:cursor-grabbing' : ''}`}
                style={{
                  backgroundColor: isSelected 
                    ? 'var(--theme-list-accentMuted)' 
                    : (isActive ? 'var(--theme-list-accentMuted)' : (dragOverPlaylistId === pl.id ? 'var(--theme-list-surfaceLighter)' : 'transparent')),
                  borderBottomColor: dragOverPlaylistId === pl.id ? 'var(--theme-list-accent)' : 'var(--theme-list-border)',
                  borderLeft: `2px solid ${isSelected || isActive ? 'var(--theme-list-accent)' : 'transparent'}`,
                  color: isSelected || isActive ? 'var(--theme-list-textMain)' : 'var(--theme-list-textMuted)',
                  opacity: draggedPlaylistId === pl.id ? 0.5 : 1,
                  fontSize: 'var(--list-font-size)'
                }}
                onMouseEnter={e => {
                  if (!isSelected && !isActive && dragOverPlaylistId !== pl.id) {
                    e.currentTarget.style.backgroundColor = 'var(--theme-list-surfaceLighter)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected && !isActive && dragOverPlaylistId !== pl.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {renamingPlaylistId === pl.id ? (
                  <div className="flex-1 flex gap-2 mr-2" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      type="text"
                      className="w-full bg-transparent border-b outline-none font-mono"
                      style={{ borderColor: 'var(--theme-list-accent)', color: 'var(--theme-list-textMain)' }}
                      value={renamingPlaylistName}
                      onChange={(e) => setRenamingPlaylistName(e.target.value)}
                      onBlur={() => {
                        if (renamingPlaylistName.trim()) {
                          setPlaylists(prev => prev.map(p => p.id === pl.id ? { ...p, name: renamingPlaylistName.trim() } : p));
                        }
                        setRenamingPlaylistId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (renamingPlaylistName.trim()) {
                            setPlaylists(prev => prev.map(p => p.id === pl.id ? { ...p, name: renamingPlaylistName.trim() } : p));
                          }
                          setRenamingPlaylistId(null);
                        } else if (e.key === 'Escape') {
                          setRenamingPlaylistId(null);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 truncate">
                    {isPlaylistSelectionMode && pl.id !== 'all-tracks' ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlaylistSelection(e, pl.id);
                        }}
                        className="w-3.5 h-3.5 border rounded-[2px] flex items-center justify-center shrink-0 transition-colors"
                        style={{
                          borderColor: isSelected ? 'var(--theme-list-accent)' : 'var(--theme-list-border)',
                          backgroundColor: isSelected ? 'var(--theme-list-accent)' : 'var(--theme-list-bg)'
                        }}
                        title={isSelected ? "選択解除" : "選択"}
                      >
                        {isSelected && <Check size={10} style={{ color: '#fff' }} strokeWidth={3} />}
                      </button>
                    ) : (
                      <>
                        {isSelected ? (
                          <Check size={12} style={{ color: 'var(--theme-list-accent)' }} />
                        ) : (
                          <ListMusic size={12} style={{ color: isActive ? 'var(--theme-list-accent)' : 'var(--theme-list-textDim)' }} />
                        )}
                      </>
                    )}
                    <span className="truncate">{pl.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono font-medium" style={{ color: isSelected || isActive ? 'var(--theme-list-textMain)' : 'var(--theme-list-textDim)' }}>
                    {pl.tracks.length.toString().padStart(3, '0')}
                  </span>
                  {pl.id !== 'all-tracks' && (
                    <div className={`flex items-center space-x-1 transition-opacity ${confirmDeletePlaylistId === pl.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {confirmDeletePlaylistId === pl.id ? (
                        <div className="flex items-center gap-1 px-1 py-0.5 border rounded-[2px]" style={{ backgroundColor: 'var(--theme-list-surface)', borderColor: 'var(--theme-list-borderActive)' }} onClick={e => e.stopPropagation()}>
                          <span className="text-[8px] uppercase tracking-tighter" style={{ color: 'var(--theme-list-accent)' }}>DEL?</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlaylists(prev => prev.filter(p => p.id !== pl.id));
                              if (activePlaylistId === pl.id) setActivePlaylistId('all-tracks');
                              if (playingPlaylistId === pl.id) setPlayingPlaylistId('all-tracks');
                              setSelectedPlaylistIds(prev => {
                                const next = new Set(prev);
                                next.delete(pl.id);
                                return next;
                              });
                              setConfirmDeletePlaylistId(null);
                            }}
                            className="hover:opacity-80 transition-opacity p-0.5"
                            title="削除を確定"
                            style={{ color: 'var(--theme-list-accent)' }}
                          >
                            <Trash2 size={10} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeletePlaylistId(null);
                            }}
                            className="hover:opacity-80 transition-opacity p-0.5"
                            title="キャンセル"
                            style={{ color: 'var(--theme-list-textDim)' }}
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeletePlaylistId(pl.id);
                          }}
                          className="hover:opacity-80 transition-opacity ml-1 p-0.5"
                          title="リストを削除（クリックで確認）"
                        >
                          <X size={10} style={{ color: isSelected || isActive ? 'var(--theme-list-textMain)' : 'var(--theme-list-textDim)' }} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Inline Create Playlist Input right after ALL TRACKS */}
              {plIdx === 0 && isCreatingPlaylist && (
                 <div className="flex flex-col gap-2 p-2 border-b" style={{ borderColor: 'var(--theme-list-border)', backgroundColor: 'var(--theme-list-surface)' }}>
                    <input 
                       type="text" 
                       value={newPlaylistName}
                       onChange={e => setNewPlaylistName(e.target.value)}
                       placeholder="NAME..."
                       className="w-full text-[10px] outline-none font-mono tracking-widest px-2 py-1"
                       style={{ backgroundColor: 'var(--theme-list-bg)', color: 'var(--theme-list-textMain)', border: '1px solid var(--theme-list-border)' }}
                       onKeyDown={e => { if (e.key === 'Enter') submitPlaylist(); else if (e.key === 'Escape') setIsCreatingPlaylist(false); }}
                    />
                    <div className="flex gap-1 justify-end">
                       <button onClick={() => setIsCreatingPlaylist(false)} className="p-1 hover:opacity-80"><X size={12} style={{ color: 'var(--theme-list-textDim)' }}/></button>
                       <button onClick={submitPlaylist} className="p-1 hover:opacity-80"><Check size={12} style={{ color: 'var(--theme-list-accent)' }}/></button>
                    </div>
                 </div>
              )}
              </React.Fragment>
              );
            })}
          </div>
          {/* Resize Handle */}
          <div
            onMouseDown={handleSidebarMouseDown}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-20 transition-colors"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--theme-list-accent)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          />
        </div>

        {/* 05 PLAYLIST (Tracks) */}
        <div 
           className="flex-1 border flex flex-col relative w-full overflow-hidden transition-colors" 
           style={{ 
             backgroundColor: isDragOver ? 'var(--theme-accentMuted)' : 'var(--theme-list-bg)', 
             borderColor: isDragOver ? 'var(--theme-accent)' : 'var(--theme-border)',
             boxShadow: isDragOver ? 'inset 0 0 0 2px var(--theme-accent)' : 'none'
           }}
           onDragOver={handleDragOver}
           onDragLeave={handleDragLeave}
           onDrop={handleDrop}
        >
          <div className="border-b px-3 py-1 flex items-center h-8 justify-between shrink-0" style={{ backgroundColor: 'var(--theme-listHeader-bg)', borderColor: 'var(--theme-listHeader-border)' }}>
             <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                 <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--theme-listHeader-textMuted)' }}>VIEW:</span>
                 <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--theme-accent)' }}>{activePlaylist.name}</span>
               </div>
               
               {displayTracks.length > 0 && (
                 <div className="flex items-center gap-3 border-l pl-3" style={{ borderColor: 'var(--theme-listHeader-border)' }}>
                   <button 
                     onClick={() => {
                        if (selectedTrackIds.size > 0) {
                            setSelectedTrackIds(new Set());
                        } else {
                            setSelectedTrackIds(new Set(displayTracks.map(t => t.id)));
                        }
                     }}
                     className="flex items-center gap-1 text-[9px] uppercase tracking-wider transition-colors hover:opacity-80 active:scale-95"
                     style={{ color: selectedTrackIds.size > 0 ? 'var(--theme-accent)' : 'var(--theme-listHeader-textMuted)' }}
                   >
                     {selectedTrackIds.size === displayTracks.length ? <Check size={10} /> : selectedTrackIds.size > 0 ? <Minus size={10} /> : <div className="w-[10px] h-[10px] border rounded-[1px]" style={{ borderColor: 'currentcolor' }}></div>}
                     {selectedTrackIds.size > 0 ? 'SELECT CANCEL' : 'SELECT ALL'}
                   </button>
                   {selectedTrackIds.size > 0 && (
                     <div className="flex items-center gap-3">
                       <div className="relative">
                         <button 
                            onClick={() => setShowAddToPlaylist(!showAddToPlaylist)}
                            className="flex items-center gap-1 text-[9px] uppercase tracking-wider transition-colors hover:opacity-80 active:scale-95"
                            style={{ color: 'var(--theme-listHeader-text)' }}
                            title="選択した曲を別のリストへ移動/追加"
                          >
                            <ListPlus size={10} style={{ color: 'var(--theme-accent)' }} />
                            {activePlaylistId === 'all-tracks' ? 'ADD TO VIEW' : 'MOVE TO VIEW'}
                          </button>
                          {showAddToPlaylist && (
                             <div className="absolute top-full left-0 mt-2 w-48 max-h-60 overflow-y-auto border z-50 flex flex-col p-1 shadow-lg" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                                {playlists.filter(p => p.id !== 'all-tracks' && p.id !== activePlaylistId).map(p => (
                                   <button 
                                      key={p.id}
                                      onClick={() => handleAddSelectedToPlaylist(p.id)}
                                      className="text-left px-2 py-1.5 text-[9px] uppercase tracking-wider hover:opacity-80 transition-colors truncate flex-shrink-0"
                                      style={{ color: 'var(--theme-textMain)' }}
                                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--theme-surfaceLighter)'}
                                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                      title={activePlaylistId === 'all-tracks' ? `ADD TO ${p.name}` : `MOVE TO ${p.name}`}
                                   >
                                     {p.name}
                                   </button>
                                ))}
                                {playlists.filter(p => p.id !== 'all-tracks' && p.id !== activePlaylistId).length === 0 && (
                                   <div className="px-2 py-1 text-[9px] uppercase tracking-wider opacity-50 text-center" style={{ color: 'var(--theme-textMuted)' }}>NO OTHER VIEWS</div>
                                )}
                             </div>
                          )}
                       </div>
                       
                       <button 
                         onClick={deleteSelectedTracks}
                         className="flex items-center gap-1 text-[9px] uppercase tracking-wider transition-colors hover:opacity-80 active:scale-95"
                         style={{ color: 'var(--theme-listHeader-text)' }}
                       >
                         <Trash2 size={10} style={{ color: 'var(--theme-accent)' }} />
                         DELETE SELECTED ({selectedTrackIds.size})
                       </button>
                     </div>
                   )}
                 </div>
               )}
             </div>
            <div className="flex items-center gap-3 shrink-0">
               <div className="relative">
                 <button
                   onClick={() => setShowColMenu(!showColMenu)}
                   className="flex items-center gap-1 text-[9px] uppercase tracking-wider border px-2 py-0.5 transition-colors hover:opacity-80 active:scale-95"
                   style={{ borderColor: 'var(--theme-listHeader-border)', color: 'var(--theme-listHeader-text)', backgroundColor: showColMenu ? 'var(--theme-bg)' : 'transparent' }}
                   title="表示項目の設定"
                 >
                   <Eye size={9} />
                   COLUMNS
                 </button>
                 {showColMenu && (
                   <div className="absolute top-full right-0 mt-2 w-36 border z-50 flex flex-col p-1 shadow-lg" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                     {(Object.keys(colVisibility) as (keyof typeof colVisibility)[]).map(key => {
                       const labelMap = { art: 'アルバムアート', fileName: '名前', trackNumber: '#No', title: 'タイトル', artist: 'アーティスト', album: 'アルバム', actions: '操作' };
                       return (
                         <label key={key} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:opacity-80 transition-colors" style={{ color: 'var(--theme-textMain)' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--theme-surfaceLighter)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                           <input type="checkbox" className="accent-[var(--theme-accent)] w-3 h-3" checked={colVisibility[key]} onChange={(e) => setColVisibility(prev => ({ ...prev, [key]: e.target.checked }))} />
                           <span className="text-[9px] uppercase tracking-wider mt-[1px]">{labelMap[key]}</span>
                         </label>
                       );
                     })}
                   </div>
                 )}
               </div>
               {activeSortConfig.key !== 'none' && (
                 <button
                   onClick={() => handleSort(activeSortConfig.key as any)}
                   className="flex items-center gap-1 text-[9px] uppercase tracking-wider border px-2 py-0.5 transition-colors hover:opacity-80 active:scale-95"
                   style={{ borderColor: 'var(--theme-list-borderActive)', color: 'var(--theme-list-accent)', backgroundColor: 'var(--theme-list-accentMuted)' }}
                   title="ソートを解除して手動並べ替えを有効にする"
                 >
                   <X size={9} />
                   SORT: {activeSortConfig.key.toUpperCase()}
                 </button>
               )}
               <span className="text-[9px] font-mono tracking-widest" style={{ color: 'var(--theme-listHeader-textMuted)' }}>{displayTracks.length} ITEMS</span>
            </div>
          </div>

          {/* Missing files banner */}
          {!isLoadingFiles && displayTracks.some(t => t.missing) && (
            <div 
              className="flex items-center gap-3 px-3 py-1.5 text-[10px] tracking-wide shrink-0 border-b"
              style={{ backgroundColor: 'var(--theme-list-accentMuted)', borderColor: 'var(--theme-list-borderActive)', color: 'var(--theme-list-textMain)' }}
            >
              <AlertCircle size={12} style={{ color: 'var(--theme-list-accent)', flexShrink: 0 }} />
              <span>
                {displayTracks.filter(t => t.missing).length}件のファイルがこのPCで見つかりません。
                ファイル/フォルダをドラッグ&ドロップするか、「READ DIRECTORY」で読み込んでください。
              </span>
            </div>
          )}

          {isLoadingFiles ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ color: 'var(--theme-list-textDim)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--theme-list-accent)' }}></div>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--theme-list-accent)', animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--theme-list-accent)', animationDelay: '0.4s' }}></div>
              </div>
              <span className="tracking-widest text-[10px] uppercase">READING FILES... {loadingProgress.done}/{loadingProgress.total}</span>
            </div>
          ) : displayTracks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ color: 'var(--theme-list-textDim)' }}>
              <span className="tracking-widest text-[10px] uppercase">NO DATA STORES LINKED</span>
              <span className="tracking-widest text-[9px] uppercase" style={{ color: 'var(--theme-list-textDim)', opacity: 0.6 }}>DRAG &amp; DROP FILES OR FOLDER HERE</span>
              {activePlaylistId === 'all-tracks' && (
                <button 
                  onClick={handleSelectFolder}
                  className="h-8 px-6 border transition-colors text-[10px] tracking-widest uppercase hover:opacity-80"
                  style={{ borderColor: 'var(--theme-list-border)', color: 'var(--theme-list-textMuted)', backgroundColor: 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--theme-list-surfaceLighter)'; e.currentTarget.style.color = 'var(--theme-list-textMain)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--theme-list-textMuted)'; }}
                >
                  INITIALIZE FOLDER READ
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden relative w-full" style={{ backgroundColor: 'var(--theme-list-bg)' }}>
              <div className="w-full flex flex-col min-h-full">
                {/* List Header */}
                <div className="flex items-center uppercase tracking-normal px-2 h-8 border-b shrink-0 sticky top-0 z-20 text-[10px] w-full" style={{ backgroundColor: 'var(--theme-list-bg)', borderColor: 'var(--theme-list-border)', color: 'var(--theme-list-textMuted)' }}>
                  <div className="relative flex-shrink-0 flex items-center h-full" style={{ width: colWidths.index }}>
                    <div className="w-8 flex-shrink-0 flex items-center justify-center"></div>
                    <div className="w-8 flex-shrink-0 flex items-center justify-center" style={{ color: 'var(--theme-list-textDim)' }}>
                      #
                    </div>
                    {colVisibility.art && (
                      <div className="w-8 flex-shrink-0 flex items-center pl-1" style={{ color: 'var(--theme-list-textDim)' }}>
                        ART
                      </div>
                    )}
                    <div onMouseDown={(e) => handleColMouseDown(e, 'index')} className="absolute right-0 top-0 bottom-0 w-[14px] cursor-col-resize flex justify-center z-20 group" style={{ transform: 'translateX(50%)' }}>
                      <div className="w-[1px] h-full opacity-40 group-hover:opacity-100 transition-colors" style={{ backgroundColor: 'var(--theme-list-border)' }} />
                    </div>
                  </div>
                  <div ref={columnsContainerRef} className="flex-1 min-w-0 flex items-center gap-3 pl-3 h-full">
                    {visibleCols.map((col, idx) => {
                      const isLast = idx === visibleCols.length - 1;
                      const nextCol = isLast ? undefined : visibleCols[idx + 1];
                      const weight = colWidths[col as keyof typeof colWidths] || 150;

                      return (
                        <div 
                          key={col} 
                          draggable 
                          onDragStart={(e) => handleColDragStart(e, col)} 
                          onDragOver={handleColDragOver} 
                          onDrop={(e) => handleColDrop(e, col)} 
                          className="relative min-w-0 pr-2 flex items-center h-full select-none" 
                          style={{ flex: `${weight} 0 0%`, minWidth: col === 'trackNumber' ? 30 : 40 }}
                        >
                          <div onClick={() => handleSort(col as 'title' | 'artist' | 'album' | 'fileName' | 'trackNumber')} className="flex-1 min-w-0 flex items-center gap-1 cursor-pointer" style={{ color: 'var(--theme-list-textMuted)' }}>
                            <span className="truncate">{COL_LABELS[col] || col}</span>
                            {activeSortConfig.key === col && (activeSortConfig.direction === 'asc' ? <ChevronUp size={10} className="shrink-0" /> : <ChevronDown size={10} className="shrink-0" />)}
                          </div>
                          {!isLast && nextCol && (
                            <div onMouseDown={(e) => handleColMouseDown(e, col, nextCol)} className="absolute right-0 top-0 bottom-0 w-[14px] cursor-col-resize flex justify-center z-20 group" style={{ transform: 'translateX(50%)' }}>
                              <div className="w-[1px] h-full opacity-40 group-hover:opacity-100 transition-colors" style={{ backgroundColor: 'var(--theme-list-border)' }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {colVisibility.actions && <div className="w-24 flex-shrink-0 text-center" style={{ color: 'var(--theme-list-textMuted)' }}>操作</div>}
                </div>
                {/* List Items */}
                <div className="flex flex-col flex-1 pb-4 w-full">
                  {memoizedTrackList}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
      
      {/* Footer Status Line */}
      <footer className="flex justify-between items-center text-[9px] tracking-widest py-3 border-t mt-auto uppercase" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-textDim)' }}>
        <div className="truncate pr-4 flex-1">{isLoadingFiles ? `READING FILES... ${loadingProgress.done}/${loadingProgress.total}` : `SYSTEM READY_ ${currentTrack ? `CURRENT: ${currentTrack.fileName}` : ''}`}</div>
        <div className="flex gap-6 shrink-0 font-mono">
          <span>STORES: {library.length.toString().padStart(4, '0')}</span>
          <span style={isPlaying ? { color: 'var(--theme-accent)' } : {}}>{isPlaying ? 'ENGINE ACTIVE' : 'ENGINE IDLE'}</span>
        </div>
      </footer>

      </div>

      {/* Duplicate Modal */}
      {showDuplicatesModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm font-mono tracking-widest p-4">
            <div className="w-full max-w-2xl max-h-[80vh] flex flex-col border shadow-2xl" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
               <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--theme-border)' }}>
                  <h2 className="text-sm font-bold text-[var(--theme-textMain)]">DUPLICATES DETECTED</h2>
                  <button onClick={() => setShowDuplicatesModal(false)} className="hover:opacity-80">
                     <X size={16} style={{ color: 'var(--theme-textMuted)' }} />
                  </button>
               </div>
               
               {duplicateGroups.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 gap-4" style={{ color: 'var(--theme-textMuted)' }}>
                     <Check size={48} style={{ color: 'var(--theme-accent)' }} />
                     <p className="text-xs uppercase">NO DUPLICATES FOUND IN LIBRARY</p>
                  </div>
               ) : (
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
                     {duplicateGroups.map((group, i) => (
                        <div key={i} className="border flex flex-col" style={{ borderColor: 'var(--theme-border)' }}>
                           <div className="text-[10px] uppercase p-2 border-b truncate font-bold" style={{ backgroundColor: 'var(--theme-surfaceLighter)', borderColor: 'var(--theme-border)', color: 'var(--theme-textMain)' }}>
                              {group[0].title || group[0].fileName} - {group[0].artist}
                           </div>
                           <div className="flex flex-col">
                              {group.map((track) => (
                                 <div key={track.id} className="flex justify-between items-center p-2 border-b last:border-b-0 text-[10px]" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)' }}>
                                    <div className="truncate pr-4 flex-1" style={{ color: 'var(--theme-textMuted)' }}>
                                       {track.fileName} {track.size ? `[${(track.size / 1024 / 1024).toFixed(1)}MB]` : ''}
                                    </div>
                                    <button 
                                       onClick={() => handleDeleteMultipleGlobal([track.id])}
                                       className="shrink-0 border px-3 py-1 hover:bg-black/20 transition-colors uppercase"
                                       style={{ borderColor: 'red', color: 'red' }}
                                    >
                                       DELETE
                                    </button>
                                 </div>
                              ))}
                           </div>
                        </div>
                     ))}
                  </div>
               )}
               
               <div className="p-4 border-t flex justify-end" style={{ borderColor: 'var(--theme-border)' }}>
                  <button 
                     onClick={() => setShowDuplicatesModal(false)} 
                     className="px-6 py-2 text-[10px] border uppercase hover:opacity-80 transition-opacity"
                     style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-textMain)' }}
                  >
                     CLOSE
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm font-mono tracking-widest p-4">
            <div className="w-full max-w-sm flex flex-col border shadow-2xl" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
               <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--theme-border)' }}>
                  <AlertCircle size={18} style={{ color: 'red' }} />
                  <h2 className="text-sm font-bold text-[var(--theme-textMain)]">WARNING</h2>
               </div>
               <div className="p-6 text-xs text-center leading-relaxed" style={{ color: 'var(--theme-textMuted)' }}>
                  {activePlaylistId === 'all-tracks' 
                    ? "ARE YOU SURE YOU WANT TO CLEAR ALL DATA? THIS WILL EMPTY YOUR ENTIRE LIBRARY." 
                    : "ARE YOU SURE YOU WANT TO CLEAR THIS PLAYLIST?"}
               </div>
               <div className="p-4 border-t flex justify-end gap-4" style={{ borderColor: 'var(--theme-border)' }}>
                  <button 
                     onClick={() => setShowClearConfirm(false)} 
                     className="px-6 py-2 text-[10px] border uppercase hover:opacity-80 transition-opacity"
                     style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-textMain)' }}
                  >
                     CANCEL
                  </button>
                  <button 
                     onClick={executeClearData} 
                     className="px-6 py-2 text-[10px] border uppercase hover:opacity-80 transition-opacity font-bold"
                     style={{ borderColor: 'red', backgroundColor: 'transparent', color: 'red' }}
                  >
                     DELETE
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
}

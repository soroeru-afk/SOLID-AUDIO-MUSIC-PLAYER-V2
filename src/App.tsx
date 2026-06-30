import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX,
  FolderOpen, ListMusic, Plus, Search, ChevronUp, ChevronDown, 
  ChevronsUp, ChevronsDown, Palette, Activity, Check, X, Trash2, ListPlus, AlertCircle,
  Minimize2, Maximize2, Layers, Minus, PanelTop, GripVertical
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
    accentMuted: '#1d2738'
  },
  { 
    id: 'GRAY', 
    bg: '#111111', 
    surface: '#181818',
    surfaceLighter: '#222222',
    border: '#333333', 
    borderActive: '#555555',
    textMain: '#e0e0e0',
    textMuted: '#888888',
    textDim: '#555555',
    accent: '#aaaaaa',
    accentDark: '#666666',
    accentMuted: '#2a2a2a'
  },
  { 
    id: 'LIGHT', 
    bg: '#e8ecef', 
    surface: '#f4f6f8',
    surfaceLighter: '#ffffff',
    border: '#c0cbd3', 
    borderActive: '#8c9ead',
    textMain: '#2c3b4a',
    textMuted: '#5d7386',
    textDim: '#8ea3b5',
    accent: '#34495e',
    accentDark: '#22303d',
    accentMuted: '#d1dadd'
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
    accentMuted: '#3d2e24'
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
    accentMuted: '#2d3d25'
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
  const [searchQuery, setSearchQuery] = useState('');
  const [themeIndex, setThemeIndex] = useState(0); 
  const [colWidths, setColWidths] = useState({
    fileName: 180,
    title: 300,
    artist: 180,
    album: 180
  });
  const colResizing = useRef<{ key: string, startX: number, startWidth: number } | null>(null);
  
  const [sortConfig, setSortConfig] = useState<{ key: 'title' | 'artist' | 'album' | 'fileName' | 'trackNumber' | 'none', direction: 'asc' | 'desc' }>({ key: 'none', direction: 'asc' });
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
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
  
  // Playlist Rename State
  const [renamingPlaylistId, setRenamingPlaylistId] = useState<string | null>(null);
  const [renamingPlaylistName, setRenamingPlaylistName] = useState('');
  const [draggedPlaylistId, setDraggedPlaylistId] = useState<string | null>(null);
  const [dragOverPlaylistId, setDragOverPlaylistId] = useState<string | null>(null);

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
        const savedLibrary = await get('solidLibrary');
        const savedPlaylists = await get('solidPlaylists');
        const savedSidebarWidth = await get('solidSidebarWidth');
        const savedColWidths = await get('solidColWidths');
        
        if (savedSidebarWidth) setSidebarWidth(savedSidebarWidth);
        if (savedColWidths) setColWidths(savedColWidths);
        
        if (savedLibrary && savedPlaylists) {
          const libraryMap = new Map<string, Track>();
          
          const newLibrary = await Promise.all(savedLibrary.map(async (t: Track) => {
            // Check if individual disk-backed blob exists
            let fileBlob = await get(`track_file_${t.id}`);
            
            // Fallback for old save format
            if (!fileBlob && t.file) {
              fileBlob = t.file;
            }

            if (fileBlob) {
              // File blob exists in this browser's IndexedDB — re-extract everything
              try {
                // Workaround for IndexedDB dropping MIME types, which breaks FLAC playback in Chrome
                if (!fileBlob.type || fileBlob.type === '') {
                  let mimeType = 'audio/mpeg';
                  const lowerName = t.fileName ? t.fileName.toLowerCase() : '';
                  if (lowerName.endsWith('.flac')) mimeType = 'audio/flac';
                  else if (lowerName.endsWith('.m4a')) mimeType = 'audio/mp4';
                  else if (lowerName.endsWith('.wav')) mimeType = 'audio/wav';
                  else if (lowerName.endsWith('.ogg')) mimeType = 'audio/ogg';
                  else if (lowerName.endsWith('.aac')) mimeType = 'audio/aac';
                  fileBlob = new Blob([fileBlob], { type: mimeType });
                }
                
                t.url = URL.createObjectURL(fileBlob);
                const meta = await mm.parseBlob(fileBlob, { skipCovers: false });
                if (meta.common.title) t.title = meta.common.title;
                if (meta.common.artist || meta.common.albumartist)
                  t.artist = meta.common.artist || meta.common.albumartist || t.artist;
                if (meta.common.album) t.album = meta.common.album;
                if (meta.common.track?.no) t.trackNumber = meta.common.track.no.toString();
                if (meta.format.duration) t.duration = meta.format.duration;
                const picture = meta.common.picture?.[0];
                if (picture) {
                  let mimeType = picture.format;
                  if (!mimeType.startsWith('image/')) mimeType = `image/${mimeType}`;
                  t.coverUrl = URL.createObjectURL(new Blob([picture.data], { type: mimeType }));
                }
              } catch (e) {
                console.error('Re-extract metadata failed', t.fileName, e);
                t.missing = true;
              }
            } else {
              // No file blob — this track was saved on a different PC/browser
              // Keep metadata (title/artist/album) but mark as missing so UI can show it
              t.missing = true;
            }
            // Strip file reference from track object to save RAM
            delete t.file;
            libraryMap.set(t.id, t);
            return t;
          }));
          
          const newPlaylists = savedPlaylists.map((p: Playlist) => ({
            ...p,
            tracks: p.tracks.map((t: Track) => {
              return libraryMap.get(t.id) || t;
            })
          }));
          
          setLibrary(newLibrary);
          setPlaylists(newPlaylists);
        }
      } catch (err) {
        console.error("Failed to load state from IndexedDB", err);
      } finally {
        setIsInitialized(true);
      }
    };
    loadState();
  }, []);

  // Save to IndexedDB
  useEffect(() => {
    if (isInitialized) {
      const strippedLibrary = library.map(t => ({ ...t, file: undefined }));
      set('solidLibrary', strippedLibrary).catch(console.error);
      set('solidPlaylists', playlists).catch(console.error);
      set('solidSidebarWidth', sidebarWidth).catch(console.error);
      set('solidColWidths', colWidths).catch(console.error);
    }
  }, [library, playlists, sidebarWidth, colWidths, isInitialized]);

  // Player state
  const [playbackQueue, setPlaybackQueue] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<0|1|2>(0); // 0: off, 1: all, 2: one
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  
  const [eqLow, setEqLow] = useState(60);
  const [eqMid, setEqMid] = useState(50);
  const [eqHigh, setEqHigh] = useState(40);

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
    if (sortConfig.key === 'none') return tracks;
    
    return [...tracks].sort((a, b) => {
      let valA = '';
      let valB = '';

      switch (sortConfig.key) {
        case 'title': valA = a.title; valB = b.title; break;
        case 'artist': valA = a.artist; valB = b.artist; break;
        case 'album': valA = a.album; valB = b.album; break;
        case 'fileName': valA = a.fileName; valB = b.fileName; break;
        case 'trackNumber': 
          const numA = parseInt(a.trackNumber) || 0;
          const numB = parseInt(b.trackNumber) || 0;
          return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        default: break;
      }
      
      valA = (valA || '').toLowerCase();
      valB = (valB || '').toLowerCase();
      
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const displayTracks = getSortedTracks(activePlaylist.tracks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  ));
  const currentTrack = playbackQueue[currentTrackIndex] || null;

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
    let updatedCoverUrl = '';
    try {
      if (editTitle || editArtist) {
        let query = encodeURIComponent(`${editTitle} ${editArtist}`.trim());
        const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=album&limit=1`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          // Get high-res cover art by replacing 100x100bb with a larger size
          updatedCoverUrl = data.results[0].artworkUrl100?.replace('100x100bb', '600x600bb');
        }
      }
    } catch (e) {
      console.error("Failed to fetch cover art", e);
    }

    setLibrary(prev => prev.map(t => {
      if (t.id === trackId) {
        return { ...t, title: editTitle || t.title, artist: editArtist || t.artist, coverUrl: updatedCoverUrl || t.coverUrl };
      }
      return t;
    }));
    
    setPlaylists(prev => prev.map(p => ({
      ...p,
      tracks: p.tracks.map(t => {
        if (t.id === trackId) {
           return { ...t, title: editTitle || t.title, artist: editArtist || t.artist, coverUrl: updatedCoverUrl || t.coverUrl };
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
      if (track.file && track.file.size) {
        key = `file::${track.fileName.toLowerCase()}::${track.file.size}`;
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
  const parseSingleFile = async (file: File): Promise<Track | null> => {
    const isAudio = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/x-m4a', 'audio/mp4', 'audio/aac'].includes(file.type) ||
                    ['.mp3', '.wav', '.flac', '.m4a', '.ogg', '.aac'].some(ext => file.name.toLowerCase().endsWith(ext));
    if (!isAudio) return null;

    let title = '';
    let artist = 'Unknown Artist';
    let album = 'Unknown Album';
    let trackNumber = '';
    let coverUrl: string | undefined = undefined;
    let duration = 0;

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
        coverUrl = URL.createObjectURL(new Blob([picture.data], { type: mimeType }));
      }
    } catch (err) {
      console.error("Error reading metadata:", file.name, err);
    }

    if (!title) {
      const parsed = parseFilename(file.name);
      title = parsed.title;
      if (artist === 'Unknown Artist') artist = parsed.artist;
    }

    const trackId = uuidv4();
    let blobUrl = '';
    
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
      
      // Detach from native file system into Memory Blob
      const buffer = await file.arrayBuffer();
      const memoryBlob = new Blob([buffer], { type: mimeType });
      
      // Save individual file to IndexedDB immediately
      await set(`track_file_${trackId}`, memoryBlob);
      
      // Load back disk-backed blob to release memory Blob reference
      const diskBlob = await get(`track_file_${trackId}`);
      if (diskBlob) {
        blobUrl = URL.createObjectURL(diskBlob);
      } else {
        blobUrl = URL.createObjectURL(memoryBlob);
      }
    } catch (e) {
      console.error('Failed to process and store file to IndexedDB', e);
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
      coverUrl
    };
  };

  const processFiles = async (files: FileList | File[], targetPlaylistName?: string) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsLoadingFiles(true);
    setLoadingProgress({ done: 0, total: fileArray.length });

    // Process sequentially (1 by 1) to prevent V8 memory spikes (OOM)
    const allTracks: Track[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const result = await parseSingleFile(fileArray[i]);
      if (result) {
        allTracks.push(result);
        
        // Stream results into state progressively
        setLibrary(prev => {
          // Deduplicate by fileName + duration to avoid double-adding
          const existingKeys = new Set(prev.map(t => `${t.fileName}_${t.duration}`));
          if (!existingKeys.has(`${result.fileName}_${result.duration}`)) {
            return [...prev, result];
          }
          return prev;
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
            if (p.id !== 'all-tracks' && p.id !== currentTargetId) return p;
            const existingKeys = new Set(p.tracks.map(t => `${t.fileName}_${t.duration}`));
            const fresh = [result].filter(t => !existingKeys.has(`${t.fileName}_${t.duration}`));
            if (fresh.length === 0) return p;
            return { ...p, tracks: [...p.tracks, ...fresh] };
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

  const handleAddSelectedToPlaylist = (playlistId: string) => {
      const selectedTracks = displayTracks.filter(t => selectedTrackIds.has(t.id));
      setPlaylists(prev => prev.map(p => {
          if (p.id === playlistId) {
             return { ...p, tracks: [...p.tracks, ...selectedTracks] };
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
    if (playbackQueue.length === 0 || currentTrackIndex === -1) return;
    
    let prevIndex = currentTrackIndex - 1;
    if (prevIndex < 0) {
      prevIndex = repeatMode === 1 ? playbackQueue.length - 1 : 0;
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
      setPlaylists([...playlists, newPlaylist]);
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
      const newWidth = Math.max(120, Math.min(400, startWidth + delta));
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
  const handleColMouseDown = (e: React.MouseEvent, key: keyof typeof colWidths) => {
    e.preventDefault();
    e.stopPropagation();
    colResizing.current = { key, startX: e.clientX, startWidth: colWidths[key] };
    const onMove = (ev: MouseEvent) => {
      if (!colResizing.current) return;
      const delta = ev.clientX - colResizing.current.startX;
      const newWidth = Math.max(50, colResizing.current.startWidth + delta);
      setColWidths(prev => ({ ...prev, [colResizing.current!.key]: newWidth }));
    };
    const onUp = () => {
      colResizing.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
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
            if (e.shiftKey || e.ctrlKey || e.metaKey) {
              toggleTrackSelection(e, track.id);
            } else {
              if (!track.missing) playTrack(idx);
            }
          }}
          title={track.missing ? `このPCにファイルがありません: ${track.fileName}\nファイルをドラッグ&ドロップするか、フォルダを読み込んでください` : undefined}
          className="group flex items-center text-[11px] h-10 px-2 border-b transition-colors shrink-0 select-none"
          style={{ 
              backgroundColor: isActive ? 'var(--theme-accentMuted)' : (isSelected ? 'var(--theme-surfaceLighter)' : 'transparent'), 
              borderColor: isActive ? 'var(--theme-borderActive)' : 'var(--theme-surface)', 
              color: isActive ? 'var(--theme-textMain)' : 'var(--theme-textMuted)',
              cursor: track.missing ? 'not-allowed' : 'pointer',
              opacity: track.missing ? 0.55 : 1,
          }}
          onMouseEnter={e => { if (!isActive && !isSelected) e.currentTarget.style.backgroundColor = 'var(--theme-surface)'; }}
          onMouseLeave={e => { if (!isActive && !isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <div className="w-8 flex-shrink-0 flex items-center justify-center" onClick={(e) => toggleTrackSelection(e, track.id)}>
              <div 
                  className="w-3 h-3 flex items-center justify-center border transition-colors"
                  style={{ 
                      backgroundColor: isSelected ? 'var(--theme-accent)' : 'transparent',
                      borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-border)'
                  }}
              >
                  {isSelected && <Check size={8} className="text-white" />}
              </div>
          </div>
          <div className="w-8 flex-shrink-0 flex items-center justify-center relative" style={{ color: 'var(--theme-textDim)' }}>
            {isActive ? (
               <div className="absolute w-[6px] h-[6px] rounded-full" style={{ backgroundColor: 'var(--theme-accent)', boxShadow: `0 0 8px var(--theme-accent)` }}></div>
            ) : (
              <span className="text-[9px]">{(idx + 1).toString().padStart(2, '0')}</span>
            )}
          </div>

          {/* List Album Art Small */}
          <div 
            className="w-8 h-8 flex-shrink-0 mr-3 border flex items-center justify-center overflow-hidden relative"
            style={{ 
              borderColor: track.missing ? 'var(--theme-accent)' : 'var(--theme-border)', 
              backgroundColor: 'var(--theme-bg)',
              opacity: track.missing ? 0.5 : 1
            }}
          >
             {track.coverUrl ? (
                <img src={track.coverUrl} className="w-full h-full object-cover" alt="" />
             ) : (
                <Activity size={10} style={{ color: 'var(--theme-textDim)' }} />
             )}
          </div>
          
          {/* Track Info with Inline Edit */}
          {editingTrackId === track.id ? (
            <div className="flex-1 flex gap-2 pr-4 h-full items-center" onClick={e => e.stopPropagation()}>
              <input
                 type="text"
                 value={editTitle}
                 onChange={e => setEditTitle(e.target.value)}
                 className="flex-1 bg-transparent border-b outline-none text-[11px] font-mono"
                 style={{ borderColor: 'var(--theme-borderActive)', color: 'var(--theme-textMain)' }}
                 autoFocus
                 onKeyDown={e => { if (e.key === 'Enter') saveTrackEdit(track.id); }}
              />
              <input
                 type="text"
                 value={editArtist}
                 onChange={e => setEditArtist(e.target.value)}
                 className="w-1/4 bg-transparent border-b outline-none text-[11px] font-mono"
                 style={{ borderColor: 'var(--theme-borderActive)', color: 'var(--theme-textMain)' }}
                 onKeyDown={e => { if (e.key === 'Enter') saveTrackEdit(track.id); }}
              />
              <button onClick={() => saveTrackEdit(track.id)} className="px-1" title="Save & Fetch Art" style={{ color: 'var(--theme-accent)' }}><Check size={12} /></button>
              <button title="Remove Artwork" onClick={(e) => removeArtwork(e, track.id)} className="px-1" style={{ color: 'var(--theme-textDim)' }}><Trash2 size={12} /></button>
              <button onClick={() => setEditingTrackId(null)} className="px-1" title="Cancel" style={{ color: 'var(--theme-textDim)' }}><X size={12} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 min-w-0 pr-2 truncate font-mono tracking-wide text-[10px]" style={{ width: colWidths.fileName, color: 'var(--theme-textMuted)' }} title={track.fileName}>
                {track.fileName}
              </div>
              <div className="w-10 flex-shrink-0 text-center font-mono opacity-80 text-[10px]">
                {track.trackNumber || '-'}
              </div>
              <div className="flex-shrink-0 min-w-0 pr-2 truncate font-bold font-mono tracking-wide" style={{ width: colWidths.title, color: 'var(--theme-textMain)' }} title={track.title}>
                {track.title}
              </div>
              <div className="flex-shrink-0 min-w-0 pr-2 truncate font-mono tracking-wide" style={{ width: colWidths.artist, color: 'var(--theme-textMuted)' }} title={track.artist}>
                {track.artist}
              </div>
              <div className="flex-shrink-0 min-w-0 pr-2 truncate font-mono tracking-wide" style={{ width: colWidths.album, color: 'var(--theme-textDim)' }} title={track.album}>
                {track.album}
              </div>
            </div>
          )}

          {/* Explicit Reordering Tools */}
          <div className="w-24 flex-shrink-0 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
            {editingTrackId !== track.id && (
                <button onClick={(e) => startEditTrack(e, track)} title="Edit Info & Fetch Artwork" className="w-5 h-5 flex items-center justify-center border rounded-[2px] transition-colors hover:opacity-80 active:scale-95" style={{ backgroundColor: 'var(--theme-accentMuted)', borderColor: 'var(--theme-borderActive)', color: iconColor }}>
                  <Palette size={10} />
                </button>
            )}
            <button 
              onClick={(e) => moveTrack(e, idx, 0)} 
              title={sortConfig.key !== 'none' ? 'ソートを解除すると並べ替えできます' : '先頭へ移動'} 
              className="w-5 h-5 flex items-center justify-center border rounded-[2px] transition-colors hover:opacity-80 active:scale-95 disabled:opacity-20" 
              disabled={idx === 0 || sortConfig.key !== 'none'} 
              style={{ backgroundColor: 'var(--theme-surfaceLighter)', borderColor: 'var(--theme-border)', color: iconColor }}
            >
              <ChevronsUp size={10} />
            </button>
            <button 
              onClick={(e) => moveTrack(e, idx, idx - 1)} 
              title={sortConfig.key !== 'none' ? 'ソートを解除すると並べ替えできます' : '一つ上へ移動'} 
              className="w-5 h-5 flex items-center justify-center border rounded-[2px] transition-colors hover:opacity-80 active:scale-95 disabled:opacity-20" 
              disabled={idx === 0 || sortConfig.key !== 'none'} 
              style={{ backgroundColor: 'var(--theme-surfaceLighter)', borderColor: 'var(--theme-border)', color: iconColor }}
            >
              <ChevronUp size={10} />
            </button>
            <button 
              onClick={(e) => moveTrack(e, idx, idx + 1)} 
              title={sortConfig.key !== 'none' ? 'ソートを解除すると並べ替えできます' : '一つ下へ移動'} 
              className="w-5 h-5 flex items-center justify-center border rounded-[2px] transition-colors hover:opacity-80 active:scale-95 disabled:opacity-20" 
              disabled={idx === displayTracks.length - 1 || sortConfig.key !== 'none'} 
              style={{ backgroundColor: 'var(--theme-surfaceLighter)', borderColor: 'var(--theme-border)', color: iconColor }}
            >
              <ChevronDown size={10} />
            </button>
            <button 
              onClick={(e) => moveTrack(e, idx, displayTracks.length - 1)} 
              title={sortConfig.key !== 'none' ? 'ソートを解除すると並べ替えできます' : '末尾へ移動'} 
              className="w-5 h-5 flex items-center justify-center border rounded-[2px] transition-colors hover:opacity-80 active:scale-95 disabled:opacity-20" 
              disabled={idx === displayTracks.length - 1 || sortConfig.key !== 'none'} 
              style={{ backgroundColor: 'var(--theme-surfaceLighter)', borderColor: 'var(--theme-border)', color: iconColor }}
            >
              <ChevronsDown size={10} />
            </button>
          </div>
        </div>
      );
    });
  }, [displayTracks, activePlaylistId, playingPlaylistId, currentTrackIndex, currentTrack?.id, selectedTrackIds, editingTrackId, editTitle, editArtist, iconColor, sortConfig.key, colWidths]);

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
                                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%`, backgroundColor: 'var(--theme-accent)' }}
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
                               onClick={() => setRepeatMode((prev) => (prev + 1) % 3 as 0|1|2)}
                               className="w-8 h-8 flex items-center justify-center rounded transition-colors relative hover:opacity-80"
                               style={{ color: repeatMode > 0 ? 'var(--theme-accent)' : 'var(--theme-textMuted)' }}
                             >
                                <Repeat size={14} />
                                {repeatMode === 2 && <span className="absolute top-0 right-0 text-[8px]" style={{ color: 'var(--theme-accent)' }}>1</span>}
                             </button>
                          </div>
                       </div>
                    </div>
                ) : (
                    <div className="p-12 flex flex-col items-center justify-center gap-4 text-center">
                       <Activity size={32} style={{ color: 'var(--theme-textDim)' }} />
                       <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--theme-textMuted)' }}>NO TRACK SELECTED</p>
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
                               style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%`, backgroundColor: 'var(--theme-accent)' }}
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
                            onClick={() => setRepeatMode((prev) => (prev + 1) % 3 as 0|1|2)}
                            className="w-6 h-6 flex items-center justify-center rounded transition-colors relative hover:opacity-80"
                            style={{ color: repeatMode > 0 ? 'var(--theme-accent)' : 'var(--theme-textMuted)', backgroundColor: repeatMode > 0 ? 'var(--theme-accentMuted)' : 'transparent' }}
                          >
                             <Repeat size={12} />
                             {repeatMode === 2 && <span className="absolute -top-1 -right-1 text-[8px]" style={{ color: 'var(--theme-accent)' }}>1</span>}
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
          <button 
            onClick={cycleTheme}
            className="flex items-center justify-center gap-2 border h-6 px-2 transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)', color: 'var(--theme-textMuted)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--theme-textMain)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--theme-textMuted)'}
          >
            <Palette size={12} />
            <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--theme-accent)' }}>THEME: {theme.id}</span>
          </button>
          <div className="text-xs tracking-widest" style={{ color: 'var(--theme-textMuted)' }}>v2.2 OS</div>
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
                   <div className="border p-1 rounded-[1px] h-8 w-full flex items-center justify-center" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surfaceLighter)' }}>
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
              style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', touchAction: 'none' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div 
                className="absolute top-0 left-0 h-full transition-all duration-75 ease-linear"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%`, backgroundColor: 'var(--theme-accent)' }}
              />
            </div>
          </div>

          {/* Controls Route */}
          <div className="flex items-center justify-between">
            {/* Play modes */}
            <div className="flex gap-2">
              <button 
                onClick={() => setIsShuffle(!isShuffle)}
                className="w-8 h-8 flex items-center justify-center border transition-colors hover:opacity-80 active:scale-95"
                style={isShuffle ? { backgroundColor: 'var(--theme-accentMuted)', color: 'var(--theme-accent)', borderColor: 'var(--theme-borderActive)' } : { backgroundColor: 'var(--theme-bg)', color: 'var(--theme-textMuted)', borderColor: 'var(--theme-border)' }}
              >
                <Shuffle size={14} />
              </button>
              <button 
                onClick={() => setRepeatMode((prev) => (prev + 1) % 3 as 0|1|2)}
                className="w-8 h-8 flex items-center justify-center border transition-colors relative hover:opacity-80 active:scale-95"
                style={repeatMode > 0 ? { backgroundColor: 'var(--theme-accentMuted)', color: 'var(--theme-accent)', borderColor: 'var(--theme-borderActive)' } : { backgroundColor: 'var(--theme-bg)', color: 'var(--theme-textMuted)', borderColor: 'var(--theme-border)' }}
              >
                <Repeat size={14} />
                {repeatMode === 2 && <span className="absolute -top-1.5 -right-1.5 text-[8px] rounded-sm px-1 flex items-center justify-center z-10" style={{ backgroundColor: 'var(--theme-accentDark)', color: '#fff' }}>1</span>}
              </button>
            </div>

            {/* Transport Core */}
            <div className="flex gap-1 justify-center">
              <button 
                onClick={handlePrev} 
                className="w-12 h-10 flex items-center justify-center border transition-colors hover:opacity-80 active:scale-95"
                style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-textMain)' }}
              >
                <SkipBack size={16} />
              </button>
              <button 
                onClick={togglePlay} 
                className="w-16 h-10 flex items-center justify-center transition-colors border hover:opacity-90 active:scale-95"
                style={isPlaying ? { backgroundColor: 'var(--theme-accentMuted)', borderColor: 'var(--theme-accentDark)', color: 'var(--theme-accent)' } : { backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-textMain)' }}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-1" />}
              </button>
              <button 
                onClick={handleNext} 
                className="w-12 h-10 flex items-center justify-center border transition-colors hover:opacity-80 active:scale-95"
                style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-textMain)' }}
              >
                <SkipForward size={16} />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2 w-24">
              <button onClick={() => setIsMuted(!isMuted)} className="hover:opacity-80" style={{ color: 'var(--theme-textMuted)' }}>
                {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <input 
                type="range" 
                min="0" max="1" step="0.01" 
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1 appearance-none cursor-pointer"
                style={{ backgroundColor: 'var(--theme-bg)', accentColor: 'var(--theme-accent)' }}
              />
            </div>
          </div>

          {/* EQ Section */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            {/* LOW EQ */}
            <div className="border p-2 flex flex-col justify-between" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
              <div className="flex justify-between items-center text-[10px] font-mono tracking-widest mb-4" style={{ color: 'var(--theme-textMuted)' }}>
                <span>01 LOW</span>
                <span>{eqLow}</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" step="1" 
                value={eqLow}
                onChange={(e) => setEqLow(parseInt(e.target.value))}
                className="w-full h-1 appearance-none cursor-pointer sq-slider"
                style={{ backgroundColor: 'var(--theme-surfaceLighter)', accentColor: 'var(--theme-accent)' }}
              />
            </div>

            {/* MID EQ */}
            <div className="border p-2 flex flex-col justify-between" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
              <div className="flex justify-between items-center text-[10px] font-mono tracking-widest mb-4" style={{ color: 'var(--theme-textMuted)' }}>
                <span>02 MID</span>
                <span>{eqMid}</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" step="1" 
                value={eqMid}
                onChange={(e) => setEqMid(parseInt(e.target.value))}
                className="w-full h-1 appearance-none cursor-pointer sq-slider"
                style={{ backgroundColor: 'var(--theme-surfaceLighter)', accentColor: 'var(--theme-accent)' }}
              />
            </div>

            {/* HIGH EQ */}
            <div className="border p-2 flex flex-col justify-between" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
              <div className="flex justify-between items-center text-[10px] font-mono tracking-widest mb-4" style={{ color: 'var(--theme-textMuted)' }}>
                <span>03 HIGH</span>
                <span>{eqHigh}</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" step="1" 
                value={eqHigh}
                onChange={(e) => setEqHigh(parseInt(e.target.value))}
                className="w-full h-1 appearance-none cursor-pointer sq-slider"
                style={{ backgroundColor: 'var(--theme-surfaceLighter)', accentColor: 'var(--theme-accent)' }}
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
            maxWidth: 400, 
            backgroundColor: isDragOver ? 'var(--theme-accentMuted)' : 'var(--theme-bg)', 
            borderColor: isDragOver ? 'var(--theme-accent)' : 'var(--theme-border)',
            boxShadow: isDragOver ? 'inset 0 0 0 2px var(--theme-accent)' : 'none'
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="border-b px-2 py-1 flex items-center justify-between h-8 shrink-0" style={{ backgroundColor: 'var(--theme-surfaceLighter)', borderColor: 'var(--theme-border)' }}>
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--theme-textMuted)' }}>INDEX MAP</span>
          </div>
          <div className="flex flex-col h-full overflow-y-auto w-full">
            {playlists.map((pl, plIdx) => (
              <div
                key={pl.id}
                draggable={pl.id !== 'all-tracks'}
                onDragStart={(e) => handlePlaylistDragStart(e, pl.id)}
                onDragOver={(e) => handlePlaylistDragOver(e, pl.id)}
                onDrop={(e) => handlePlaylistDrop(e, pl.id)}
                onDragEnd={handlePlaylistDragEnd}
                onClick={() => setActivePlaylistId(pl.id)}
                onDoubleClick={() => {
                  if (pl.id !== 'all-tracks') {
                    setRenamingPlaylistId(pl.id);
                    setRenamingPlaylistName(pl.name);
                  }
                }}
                className={`text-left px-3 py-2 text-[10px] tracking-widest flex items-center justify-between border-b transition-colors cursor-pointer group ${pl.id !== 'all-tracks' ? 'cursor-grab active:cursor-grabbing' : ''}`}
                style={{
                  backgroundColor: activePlaylistId === pl.id ? 'var(--theme-accentMuted)' : (dragOverPlaylistId === pl.id ? 'var(--theme-surfaceLighter)' : 'transparent'),
                  borderBottomColor: dragOverPlaylistId === pl.id ? 'var(--theme-accent)' : 'var(--theme-border)',
                  borderLeft: `2px solid ${activePlaylistId === pl.id ? 'var(--theme-accent)' : 'transparent'}`,
                  color: activePlaylistId === pl.id ? 'var(--theme-textMain)' : 'var(--theme-textMuted)',
                  opacity: draggedPlaylistId === pl.id ? 0.5 : 1
                }}
              >
                {renamingPlaylistId === pl.id ? (
                  <div className="flex-1 flex gap-2 mr-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      type="text"
                      className="w-full bg-transparent border-b outline-none font-mono"
                      style={{ borderColor: 'var(--theme-accent)', color: 'var(--theme-textMain)' }}
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
                    <ListMusic size={12} style={{ color: activePlaylistId === pl.id ? 'var(--theme-accent)' : 'var(--theme-textDim)' }} />
                    <span className="truncate">{pl.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono" style={{ color: activePlaylistId === pl.id ? 'var(--theme-textMain)' : 'var(--theme-textDim)' }}>
                    {pl.tracks.length.toString().padStart(3, '0')}
                  </span>
                  {pl.id !== 'all-tracks' && (
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaylists(prev => prev.filter(p => p.id !== pl.id));
                          if (activePlaylistId === pl.id) setActivePlaylistId('all-tracks');
                          if (playingPlaylistId === pl.id) setPlayingPlaylistId('all-tracks');
                        }}
                        className="hover:opacity-80 transition-opacity ml-1"
                        title="DELETE"
                      >
                        <X size={10} style={{ color: activePlaylistId === pl.id ? 'var(--theme-textMain)' : 'var(--theme-textDim)' }} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Inline Create Playlist Input */}
            {isCreatingPlaylist && (
               <div className="flex flex-col gap-2 p-2 border-b" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)' }}>
                  <input 
                     type="text" 
                     value={newPlaylistName}
                     onChange={e => setNewPlaylistName(e.target.value)}
                     placeholder="NAME..."
                     className="w-full text-[10px] outline-none font-mono tracking-widest px-2 py-1"
                     style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-textMain)', border: '1px solid var(--theme-border)' }}
                     onKeyDown={e => { if (e.key === 'Enter') submitPlaylist(); else if (e.key === 'Escape') setIsCreatingPlaylist(false); }}
                  />
                  <div className="flex gap-1 justify-end">
                     <button onClick={() => setIsCreatingPlaylist(false)} className="p-1 hover:opacity-80"><X size={12} style={{ color: 'var(--theme-textDim)' }}/></button>
                     <button onClick={submitPlaylist} className="p-1 hover:opacity-80"><Check size={12} style={{ color: 'var(--theme-accent)' }}/></button>
                  </div>
               </div>
            )}
          </div>
          {/* Resize Handle */}
          <div
            onMouseDown={handleSidebarMouseDown}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-20 transition-colors"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--theme-accent)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          />
        </div>

        {/* 05 PLAYLIST (Tracks) */}
        <div 
           className="flex-1 border flex flex-col relative w-full overflow-hidden transition-colors" 
           style={{ 
             backgroundColor: isDragOver ? 'var(--theme-accentMuted)' : 'var(--theme-bg)', 
             borderColor: isDragOver ? 'var(--theme-accent)' : 'var(--theme-border)',
             boxShadow: isDragOver ? 'inset 0 0 0 2px var(--theme-accent)' : 'none'
           }}
           onDragOver={handleDragOver}
           onDragLeave={handleDragLeave}
           onDrop={handleDrop}
        >
          <div className="border-b px-3 py-1 flex items-center h-8 justify-between shrink-0" style={{ backgroundColor: 'var(--theme-surfaceLighter)', borderColor: 'var(--theme-border)' }}>
             <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                 <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--theme-textMain)' }}>VIEW:</span>
                 <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--theme-accent)' }}>{activePlaylist.name}</span>
               </div>
               
               {displayTracks.length > 0 && (
                 <div className="flex items-center gap-3 border-l pl-3" style={{ borderColor: 'var(--theme-border)' }}>
                   <button 
                     onClick={() => {
                        if (selectedTrackIds.size > 0) {
                            setSelectedTrackIds(new Set());
                        } else {
                            setSelectedTrackIds(new Set(displayTracks.map(t => t.id)));
                        }
                     }}
                     className="flex items-center gap-1 text-[9px] uppercase tracking-widest transition-colors hover:opacity-80 active:scale-95"
                     style={{ color: selectedTrackIds.size > 0 ? 'var(--theme-accent)' : 'var(--theme-textMuted)' }}
                   >
                     {selectedTrackIds.size === displayTracks.length ? <Check size={10} /> : selectedTrackIds.size > 0 ? <Minus size={10} /> : <div className="w-[10px] h-[10px] border rounded-[1px]" style={{ borderColor: 'currentcolor' }}></div>}
                     {selectedTrackIds.size > 0 ? 'SELECT CANCEL' : 'SELECT ALL'}
                   </button>
                   {selectedTrackIds.size > 0 && (
                     <div className="flex items-center gap-3">
                       <div className="relative">
                         <button 
                           onClick={() => setShowAddToPlaylist(!showAddToPlaylist)}
                           className="flex items-center gap-1 text-[9px] uppercase tracking-widest transition-colors hover:opacity-80 active:scale-95"
                           style={{ color: 'var(--theme-textMain)' }}
                         >
                           <ListPlus size={10} style={{ color: 'var(--theme-accent)' }} />
                           ADD TO VIEW
                         </button>
                         {showAddToPlaylist && (
                            <div className="absolute top-full left-0 mt-2 w-48 border z-50 flex flex-col p-1 shadow-lg" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                               {playlists.filter(p => p.id !== 'all-tracks').map(p => (
                                  <button 
                                     key={p.id}
                                     onClick={() => handleAddSelectedToPlaylist(p.id)}
                                     className="text-left px-2 py-1.5 text-[9px] uppercase tracking-widest hover:opacity-80 transition-colors"
                                     style={{ color: 'var(--theme-textMain)' }}
                                     onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--theme-surfaceLighter)'}
                                     onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                  >
                                    {p.name}
                                  </button>
                               ))}
                               {playlists.length === 1 && (
                                  <div className="px-2 py-1 text-[9px] uppercase tracking-widest opacity-50 text-center" style={{ color: 'var(--theme-textMuted)' }}>NO CUSTOM VIEWS</div>
                               )}
                            </div>
                         )}
                       </div>
                       
                       <button 
                         onClick={deleteSelectedTracks}
                         className="flex items-center gap-1 text-[9px] uppercase tracking-widest transition-colors hover:opacity-80 active:scale-95"
                         style={{ color: 'var(--theme-textMain)' }}
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
               {sortConfig.key !== 'none' && (
                 <button
                   onClick={() => setSortConfig({ key: 'none', direction: 'asc' })}
                   className="flex items-center gap-1 text-[9px] uppercase tracking-widest border px-2 py-0.5 transition-colors hover:opacity-80 active:scale-95"
                   style={{ borderColor: 'var(--theme-borderActive)', color: 'var(--theme-accent)', backgroundColor: 'var(--theme-accentMuted)' }}
                   title="ソートを解除して手動並べ替えを有効にする"
                 >
                   <X size={9} />
                   SORT: {sortConfig.key.toUpperCase()}
                 </button>
               )}
               <span className="text-[9px] font-mono tracking-widest" style={{ color: 'var(--theme-textDim)' }}>{displayTracks.length} ITEMS</span>
            </div>
          </div>

          {/* Missing files banner */}
          {!isLoadingFiles && displayTracks.some(t => t.missing) && (
            <div 
              className="flex items-center gap-3 px-3 py-1.5 text-[10px] tracking-wide shrink-0 border-b"
              style={{ backgroundColor: 'var(--theme-accentMuted)', borderColor: 'var(--theme-borderActive)', color: 'var(--theme-textMain)' }}
            >
              <AlertCircle size={12} style={{ color: 'var(--theme-accent)', flexShrink: 0 }} />
              <span>
                {displayTracks.filter(t => t.missing).length}件のファイルがこのPCで見つかりません。
                ファイル/フォルダをドラッグ&ドロップするか、「READ DIRECTORY」で読み込んでください。
              </span>
            </div>
          )}

          {isLoadingFiles ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ color: 'var(--theme-textDim)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--theme-accent)' }}></div>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--theme-accent)', animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--theme-accent)', animationDelay: '0.4s' }}></div>
              </div>
              <span className="tracking-widest text-[10px] uppercase">READING FILES... {loadingProgress.done}/{loadingProgress.total}</span>
            </div>
          ) : displayTracks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ color: 'var(--theme-textDim)' }}>
              <span className="tracking-widest text-[10px] uppercase">NO DATA STORES LINKED</span>
              <span className="tracking-widest text-[9px] uppercase" style={{ color: 'var(--theme-textDim)', opacity: 0.6 }}>DRAG &amp; DROP FILES OR FOLDER HERE</span>
              {activePlaylistId === 'all-tracks' && (
                <button 
                  onClick={handleSelectFolder}
                  className="h-8 px-6 border transition-colors text-[10px] tracking-widest uppercase hover:opacity-80"
                  style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-textMuted)', backgroundColor: 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--theme-surfaceLighter)'; e.currentTarget.style.color = 'var(--theme-textMain)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--theme-textMuted)'; }}
                >
                  INITIALIZE FOLDER READ
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-auto relative">
              <div className="min-w-max flex flex-col min-h-full">
                {/* List Header */}
                <div className="flex items-center text-[9px] uppercase tracking-widest px-2 h-8 border-b shrink-0 sticky top-0 z-20" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-textMuted)' }}>
                  <div className="w-10 flex-shrink-0 text-center">#</div>
                  <div className="w-8 mr-3 text-center">ART</div>
                  <div className="flex items-center gap-3">
                    {/* fileName */}
                    <div className="relative flex-shrink-0 min-w-0 pr-2 flex items-center" style={{ width: colWidths.fileName }}>
                      <div onClick={() => handleSort('fileName')} className="flex-1 min-w-0 flex items-center gap-1 cursor-pointer hover:text-[var(--theme-textMain)]">
                        <span className="truncate">名前</span>
                        {sortConfig.key === 'fileName' && (sortConfig.direction === 'asc' ? <ChevronUp size={10} className="shrink-0" /> : <ChevronDown size={10} className="shrink-0" />)}
                      </div>
                      <div onMouseDown={(e) => handleColMouseDown(e, 'fileName')} className="absolute right-0 top-0 bottom-0 w-[14px] cursor-col-resize flex justify-center z-20 group" style={{ transform: 'translateX(50%)' }}>
                        <div className="w-[1px] h-full bg-[var(--theme-border)] opacity-40 group-hover:bg-[var(--theme-accent)] group-hover:opacity-100 transition-colors" />
                      </div>
                    </div>

                    {/* trackNumber */}
                    <div onClick={() => handleSort('trackNumber')} className="w-10 flex-shrink-0 flex items-center justify-center gap-1 cursor-pointer hover:text-[var(--theme-textMain)]">
                      #No
                      {sortConfig.key === 'trackNumber' && (sortConfig.direction === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
                    </div>

                    {/* title */}
                    <div className="relative flex-shrink-0 min-w-0 pr-2 flex items-center" style={{ width: colWidths.title }}>
                      <div onClick={() => handleSort('title')} className="flex-1 min-w-0 flex items-center gap-1 cursor-pointer hover:text-[var(--theme-textMain)]">
                        <span className="truncate">タイトル</span>
                        {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? <ChevronUp size={10} className="shrink-0" /> : <ChevronDown size={10} className="shrink-0" />)}
                      </div>
                      <div onMouseDown={(e) => handleColMouseDown(e, 'title')} className="absolute right-0 top-0 bottom-0 w-[14px] cursor-col-resize flex justify-center z-20 group" style={{ transform: 'translateX(50%)' }}>
                        <div className="w-[1px] h-full bg-[var(--theme-border)] opacity-40 group-hover:bg-[var(--theme-accent)] group-hover:opacity-100 transition-colors" />
                      </div>
                    </div>

                    {/* artist */}
                    <div className="relative flex-shrink-0 min-w-0 pr-2 flex items-center" style={{ width: colWidths.artist }}>
                      <div onClick={() => handleSort('artist')} className="flex-1 min-w-0 flex items-center gap-1 cursor-pointer hover:text-[var(--theme-textMain)]">
                        <span className="truncate">参加アーティスト</span>
                        {sortConfig.key === 'artist' && (sortConfig.direction === 'asc' ? <ChevronUp size={10} className="shrink-0" /> : <ChevronDown size={10} className="shrink-0" />)}
                      </div>
                      <div onMouseDown={(e) => handleColMouseDown(e, 'artist')} className="absolute right-0 top-0 bottom-0 w-[14px] cursor-col-resize flex justify-center z-20 group" style={{ transform: 'translateX(50%)' }}>
                        <div className="w-[1px] h-full bg-[var(--theme-border)] opacity-40 group-hover:bg-[var(--theme-accent)] group-hover:opacity-100 transition-colors" />
                      </div>
                    </div>

                    {/* album */}
                    <div className="relative flex-shrink-0 min-w-0 pr-2 flex items-center" style={{ width: colWidths.album }}>
                      <div onClick={() => handleSort('album')} className="flex-1 min-w-0 flex items-center gap-1 cursor-pointer hover:text-[var(--theme-textMain)]">
                        <span className="truncate">アルバム</span>
                        {sortConfig.key === 'album' && (sortConfig.direction === 'asc' ? <ChevronUp size={10} className="shrink-0" /> : <ChevronDown size={10} className="shrink-0" />)}
                      </div>
                      <div onMouseDown={(e) => handleColMouseDown(e, 'album')} className="absolute right-0 top-0 bottom-0 w-[14px] cursor-col-resize flex justify-center z-20 group" style={{ transform: 'translateX(50%)' }}>
                        <div className="w-[1px] h-full bg-[var(--theme-border)] opacity-40 group-hover:bg-[var(--theme-accent)] group-hover:opacity-100 transition-colors" />
                      </div>
                    </div>
                  </div>
                  <div className="w-24 flex-shrink-0 text-center ml-auto">操作</div>
                </div>

                {/* List Items */}
                <div className="flex flex-col flex-1 pb-4">
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
                                       {track.fileName} {track.file && track.file.size ? `[${(track.file.size / 1024 / 1024).toFixed(1)}MB]` : ''}
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

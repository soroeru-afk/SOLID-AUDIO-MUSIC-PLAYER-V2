import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Play, CheckSquare, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX,
  Folder, FolderOpen, ListMusic, Plus, Search, ChevronUp, ChevronDown, 
  ChevronsUp, ChevronsDown, Palette, Activity, Check, X, Trash2, ListPlus, AlertCircle,
  Minimize2, Maximize2, Layers, Minus, PanelTop, GripVertical, Type, Eye, EyeOff,
  LayoutGrid, List, Disc, User, ChevronRight, ArrowLeft, PanelLeftClose, PanelLeftOpen, Edit2,
  ArrowLeftRight, FileText, FolderPlus, FolderTree, Tag, Move,
  Bookmark, BookmarkPlus, BookmarkCheck, RotateCcw
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { get, set, del } from 'idb-keyval';
import * as mm from 'music-metadata-browser';
import { AlbumArt3D } from './components/AlbumArt3D';
import { AlbumCardView, AlbumGroup, ArtistGroup } from './components/AlbumCardView';

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
  folderPath?: string;
}

interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  category?: string;
}

const THEMES = [
  { 
    id: 'NAVY', 
    dotColor: '#2563eb',
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
    dotColor: '#252932',
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
    dotColor: '#64748b',
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
    dotColor: '#0284c7',
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
    dotColor: '#b45309',
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
    id: 'MOCHA', 
    dotColor: '#c4a48b',
    bg: '#46382c', 
    surface: '#59483a',
    surfaceLighter: '#685646',
    border: '#78685a', 
    borderActive: '#c4a48b',
    textMain: '#f7ece1',
    textMuted: '#d4bfae',
    textDim: '#a39081',
    accent: '#c4a48b',
    accentDark: '#947864',
    accentMuted: '#3d3025',
    sliderTrackBg: '#382c22',
    sliderTrackBorder: '#78685a',
    controlBoxBg: '#46382c',
    // 04 & 05 ヘッダーバー (#59483A / #78685A)
    listHeaderBg: '#59483a',
    listHeaderBorder: '#78685a',
    listHeaderText: '#f7ece1',
    listHeaderTextMuted: '#c4a48b',
    // 04 & 05 LIST AREA (プレイリスト一覧 & トラックリスト: #F7ECE1 クリーム背景 & 濃いめモカ文字)
    listBg: '#f7ece1',
    listSurface: '#efe2d5',
    listSurfaceLighter: '#e5d6c7',
    listBorder: '#dec8b7',
    listBorderActive: '#78685a',
    listTextMain: '#2b2018',
    listTextMuted: '#59483a',
    listTextDim: '#78685a',
    listAccent: '#59483a',
    listAccentMuted: '#dfcdbd',
    listIconColor: '#2b2018',
  },
  { 
    id: 'OLIVE', 
    dotColor: '#84cc16',
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
    dotColor: '#ef4444',
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

export const FONT_OPTIONS = [
  { 
    id: 'GOTHIC', 
    label: 'GOTHIC', 
    fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', Meiryo, sans-serif" 
  },
  { 
    id: 'MARU', 
    label: 'MARU', 
    fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'Kosugi Maru', sans-serif" 
  },
  { 
    id: 'MEIRYO', 
    label: 'MEIRYO', 
    fontFamily: "'Meiryo', 'メイリオ', 'BIZ UDPGothic', sans-serif" 
  },
  { 
    id: 'MONO', 
    label: 'MONO', 
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace" 
  },
] as const;

const DEFAULT_WINDOW_SIZES: Record<'full' | 'mini' | 'slim', { width: number; height: number }> = {
  full: { width: 1700, height: 1200 },
  mini: { width: 500, height: 720 },
  slim: { width: 720, height: 160 }
};

// --- Utils ---
const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Map Windows-1252 / Latin-1 byte signatures back to raw byte values
const WINDOWS_1252_MAP: Record<string, number> = {
  '\u20AC': 0x80, '\u201A': 0x82, '\u0192': 0x83, '\u201E': 0x84,
  '\u2026': 0x85, '\u2020': 0x86, '\u2021': 0x87, '\u02C6': 0x88,
  '\u2030': 0x89, '\u0160': 0x8A, '\u2039': 0x8B, '\u0152': 0x8C,
  '\u017D': 0x8E, '\u2018': 0x91, '\u2019': 0x92, '\u201C': 0x93,
  '\u201D': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
  '\u02DC': 0x98, '\u2122': 0x99, '\u0161': 0x9A, '\u203A': 0x9B,
  '\u0153': 0x9C, '\u017E': 0x9E, '\u0178': 0x9F
};

// Convert full-width alphanumeric (全角英数) to standard half-width (半角英数) and normalize full-width spaces
export const normalizeZenkakuAlphanumeric = (str: string | undefined): string => {
  if (!str || typeof str !== 'string') return str || '';
  return str
    // Convert full-width ASCII chars (！-～ : \uFF01-\uFF5E) to standard ASCII (!-~ : \u0021-\u007E)
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    // Convert full-width space to standard space
    .replace(/\u3000/g, ' ')
    // Normalize repeated whitespace
    .replace(/[ \t]+/g, ' ')
    .trim();
};

// Detect typical Latin-1/Windows-1252 Shift_JIS/UTF-8 mojibake signatures
export const looksLikeMojibake = (text: string | undefined): boolean => {
  if (!text || typeof text !== 'string') return false;
  if (text.includes('\uFFFD')) return true;
  const mojibakeCount = (text.match(/[\u0080-\u00FF\u0152\u0153\u0160\u0161\u017D\u017E\u0178\u0192\u02C6\u02DC\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2020\u2021\u2022\u2026\u2030\u2039\u203A\u20AC\u2122]/g) || []).length;
  return mojibakeCount >= 2;
};

// Attempt to repair mojibake by converting characters back to raw bytes and decoding as Shift_JIS (CP932) or UTF-8
export const repairMojibake = (text: string | undefined): string => {
  if (!text || typeof text !== 'string') return text || '';
  if (!looksLikeMojibake(text)) {
    return normalizeZenkakuAlphanumeric(text);
  }

  // Extract raw byte array from Latin-1 / Windows-1252 misinterpreted string
  const rawBytes = new Uint8Array(
    [...text].map(c => {
      if (WINDOWS_1252_MAP[c] !== undefined) return WINDOWS_1252_MAP[c];
      return c.charCodeAt(0) & 0xFF;
    })
  );

  // Attempt 1: Decode as Shift_JIS (CP932 / Windows-31J)
  try {
    const sjisDecoder = new TextDecoder('shift-jis', { fatal: false });
    const decodedSjis = sjisDecoder.decode(rawBytes);
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(decodedSjis);
    const replacementCount = (decodedSjis.match(/\uFFFD/g) || []).length;
    if (hasJapanese && replacementCount === 0) {
      return normalizeZenkakuAlphanumeric(decodedSjis);
    }
  } catch (e) {}

  // Attempt 2: Decode as UTF-8 (when UTF-8 was misinterpreted as Latin-1)
  try {
    const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
    const decodedUtf8 = utf8Decoder.decode(rawBytes);
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(decodedUtf8);
    const replacementCount = (decodedUtf8.match(/\uFFFD/g) || []).length;
    if (hasJapanese && replacementCount === 0) {
      return normalizeZenkakuAlphanumeric(decodedUtf8);
    }
  } catch (e) {}

  return normalizeZenkakuAlphanumeric(text);
};

// Clean title/artist/album text: repairs mojibake + normalizes full-width English/numbers
export const cleanAudioTag = (rawText: string | undefined): string => {
  if (!rawText) return '';
  const repaired = repairMojibake(rawText.trim());
  return normalizeZenkakuAlphanumeric(repaired);
};

const parseFilename = (
  filename: string, 
  existingArtist?: string, 
  existingAlbum?: string,
  playlistName?: string
): { title: string, artist: string, trackNumber?: string } => {
  let s = filename.replace(/\.[a-zA-Z0-9]{2,5}$/, "").trim();
  s = normalizeZenkakuAlphanumeric(s);

  // 1. Strip bracketed version/quality tags anywhere in the string
  s = s.replace(/[\(\[\{【〔]\s*(?:(?:\d{4}\s*)?(?:Digital\s*)?Remaster(?:ed)?|リマスター(?:版)?|Live(?: Version)?|Instrumental|Off\s*Vocal|Karaoke|カラオケ|Demo|Official(?: Audio)?|Audio|Video|MV|PV|\d+k(?:bps)?|Hi-Res|ハイレゾ|HQ|HD|Bonus\s*Track|\d+kHz[/\s]*\d+bit|FLAC|MP3|WAV|AAC)\s*[\)\]\}】〕]/gi, '').trim();
  // Strip trailing version suffixes (e.g. "- リマスター版", "- Remastered", "_128k")
  s = s.replace(/[\s._-]+(リマスター版?|Remaster(?:ed)?|Digital Remaster|Live(?: Version)?|Instrumental|Off Vocal|Karaoke|Demo|Bonus Track)$/i, '').trim();
  s = s.replace(/_\d+k(?:bps)?$/i, '').trim();

  // 1b. Strip trailing duplicate copy counters added by OS/downloaders (e.g. " 1", " (1)", " [1]", "_1")
  // PROTECT: 3+ digit numbers like "1990", "1991", "2000" (e.g. COMPLEX - 1990)
  // PROTECT: Series/Parts/Volumes like "Part 1", "Pt. 1", "Vol 1", "No 1", "Take 1", "Track 1"
  // PROTECT: Alphanumeric words like "21c", "AKB48", "B'z", "'90"
  
  // Rule A: Bracketed single/double-digit copy suffix, e.g. "Song (1)", "Song [1]" (NOT "(Part 1)", "(1990)")
  const bracketNumMatch = s.match(/^(.*?)\s*[\(\[\{]\s*(\d{1,2})\s*[\)\]\}]$/);
  if (bracketNumMatch) {
    const base = bracketNumMatch[1].trim();
    if (base.length >= 2 && !/(?:^|[\s._・\-])(?:part|pt|vol|volume|no|number|track|trk|cd|disc|take|act|op|suite|movement)[\s.]*$/i.test(base)) {
      s = base;
    }
  }

  // Rule B: Space or underscore followed by single-digit copy number (e.g. "美・来 1", "Song_1", "Song 2")
  // Only 1 digit (1-9) or 01-09. NEVER matches 1990, 1991, 2000, 100, etc.
  const trailingCopyMatch = s.match(/^(.*?)(?:[\s_]+)(?:0?[1-9])$/);
  if (trailingCopyMatch) {
    const base = trailingCopyMatch[1].trim();
    // Only strip if base has at least 2 characters, and does NOT end with a series/number word
    if (base.length >= 2 && !/(?:^|[\s._・\-])(?:part|pt|vol|volume|no|number|track|trk|cd|disc|take|act|op|suite|movement|phase|session|section)[\s.]*$/i.test(base)) {
      s = base;
    }
  }

  // 2. Extract track number & strip leading track/disc prefixes
  let trackNumber = '';
  // Case A: Disc-Track (e.g. "1-01", "1.01", "CD1-01", "Disc 1 - 01", "[01-01]")
  const discMatch = s.match(/^[\(\[\<【〔]?(?:cd|disc)?\s*\d{1,2}[-_.:]\s*(\d{1,3})[\)\]\>】〕]?[\s._・-]*(.+)$/i);
  if (discMatch) {
    trackNumber = discMatch[1];
    s = discMatch[2].trim();
  } else {
    // Case B: Bracketed number (e.g. "[01]", "(01)", "【01】", "〔01〕")
    const bracketMatch = s.match(/^[\(\[\<【〔]\s*(\d{1,4})\s*[\)\]\>】〕][\s._・-]*(.+)$/);
    if (bracketMatch) {
      trackNumber = bracketMatch[1];
      s = bracketMatch[2].trim();
    } else {
      // Case C: Vinyl / Track / Number prefix (e.g. "Track 01", "Trk 01", "#01", "No.01", "A1.", "B02")
      const trkMatch = s.match(/^(?:track|trk|tr|side|[#№no]\.?|[a-dA-D]\.?)\s*([a-zA-Z]?\d{1,4})[\s._・-]*(.+)$/i);
      if (trkMatch) {
        trackNumber = trkMatch[1];
        s = trkMatch[2].trim();
      } else {
        // Case D: Standard leading numbers with delimiters (e.g. "04.", "04 - ", "04_", "04 ")
        const numMatch = s.match(/^(\d{1,4})[\s._・-]+(.+)$/);
        if (numMatch) {
          trackNumber = numMatch[1];
          s = numMatch[2].trim();
        } else {
          // Case E: Number directly followed by Japanese or text without space (e.g. "04スローモーション", "01飾りじゃないのよ涙は")
          const attachMatch = s.match(/^(\d{1,3})([^\d\s].*)$/);
          if (attachMatch) {
            trackNumber = attachMatch[1];
            s = attachMatch[2].trim();
          } else {
            // Case F: Number followed by whitespace (e.g. "04 スローモーション")
            const spaceNumMatch = s.match(/^(\d{1,3})\s+(.+)$/);
            if (spaceNumMatch) {
              trackNumber = spaceNumMatch[1];
              s = spaceNumMatch[2].trim();
            }
          }
        }
      }
    }
  }

  // 3. Collect artist candidates from existing metadata
  const artistCandidates: string[] = [];
  if (existingArtist && existingArtist !== 'Unknown Artist' && existingArtist !== 'Marcia') {
    artistCandidates.push(existingArtist.trim());
  }
  for (const src of [existingAlbum, playlistName]) {
    if (src && src !== 'Unknown Album') {
      const cleanSrc = src.replace(/^[■□◆◇●▲▼★☆\s\-_・/]+/, '').trim();
      if (cleanSrc.includes(' - ')) {
        artistCandidates.push(cleanSrc.split(' - ')[0].trim());
      } else if (cleanSrc.includes(' / ')) {
        artistCandidates.push(cleanSrc.split(' / ')[0].trim());
      } else {
        const strippedDesc = cleanSrc.replace(/\s*(?:ベスト|ベストアルバム|best|album|collection|シングル|ライヴ|live|全曲集|complete).*$/i, '').trim();
        if (strippedDesc && strippedDesc.length >= 2) {
          artistCandidates.push(strippedDesc);
        }
        artistCandidates.push(cleanSrc);
      }
    }
  }

  // Also strip album suffix from filename if it ends with album name
  for (const src of [existingAlbum, playlistName]) {
    if (src && src !== 'Unknown Album') {
      const cleanSrc = src.replace(/^[■□◆◇●▲▼★☆\s\-_・/]+/, '').trim();
      if (cleanSrc.includes(' - ')) {
        const subPart = cleanSrc.split(' - ').pop()?.trim();
        if (subPart && s.endsWith(subPart)) {
          s = s.substring(0, s.length - subPart.length).replace(/[\s._・-]+$/, '').trim();
        }
      }
      if (cleanSrc && s.toLowerCase().endsWith(cleanSrc.toLowerCase())) {
        s = s.substring(0, s.length - cleanSrc.length).replace(/[\s._・-]+$/, '').trim();
      }
    }
  }

  // 3b. Extract leading bracketed artist tag, e.g. "[T-SQUARE] TRUTH - THE SQUARE"
  let matchedArtist = '';
  const leadingBracketArtist = s.match(/^\[([a-zA-Z0-9\s._・\-–—&]+)\]\s*(.+)$/);
  if (leadingBracketArtist) {
    const candArtist = leadingBracketArtist[1].trim();
    if (candArtist.length >= 2 && !/^\d+$/.test(candArtist)) {
      matchedArtist = candArtist;
      artistCandidates.push(candArtist);
      s = leadingBracketArtist[2].trim();
    }
  }

  // 4. Remove artist name from song title so ONLY the song title remains!
  const filteredCandidates = Array.from(new Set(artistCandidates.filter(a => a.length >= 2 && !a.startsWith('Track') && a !== 'Unknown Artist')));
  filteredCandidates.sort((a, b) => b.length - a.length);
  for (const cand of filteredCandidates) {
    const escaped = cand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Case: "Artist - Title" or "Artist ・ Title" or "Artist / Title"
    const prefixReg = new RegExp(`^${escaped}\\s*[\\s._・/-]+\\s*`, 'i');
    if (prefixReg.test(s)) {
      s = s.replace(prefixReg, '').trim();
      if (!matchedArtist) matchedArtist = cand;
      break;
    }
    // Case: "Title - Artist" or "Title Artist"
    const suffixReg = new RegExp(`\\s*[\\s._・/-]+\\s*${escaped}$`, 'i');
    if (suffixReg.test(s)) {
      s = s.replace(suffixReg, '').trim();
      if (!matchedArtist) matchedArtist = cand;
      break;
    }
    // Case: "Title (Artist)"
    const parenReg = new RegExp(`[\\(\\[]\\s*${escaped}\\s*[\\)\\]]`, 'i');
    if (parenReg.test(s)) {
      s = s.replace(parenReg, '').trim();
      if (!matchedArtist) matchedArtist = cand;
      break;
    }
  }

  // 5. If " - " or " / " is still in string, check if one side is artist
  if (s.includes(' - ')) {
    const parts = s.split(' - ').map(p => p.trim()).filter(Boolean);
    if (parts.length === 2) {
      const p0 = parts[0];
      const p1 = parts[1];
      const p0Lower = p0.toLowerCase();
      const p1Lower = p1.toLowerCase();

      // Check for exact candidate match first
      const p0IsArtist = filteredCandidates.some(c => c.toLowerCase() === p0Lower) || (matchedArtist && matchedArtist.toLowerCase() === p0Lower);
      const p1IsArtist = filteredCandidates.some(c => c.toLowerCase() === p1Lower) || (matchedArtist && matchedArtist.toLowerCase() === p1Lower);

      if (p0IsArtist && !p1IsArtist) {
        s = p1;
        if (!matchedArtist) matchedArtist = p0;
      } else if (p1IsArtist && !p0IsArtist) {
        s = p0;
        if (!matchedArtist) matchedArtist = p1;
      } else if (matchedArtist) {
        // One side is artist variant (e.g. THE SQUARE vs T-SQUARE)
        if (p1Lower.includes('square') || p1Lower.includes(matchedArtist.toLowerCase())) {
          s = p0;
        } else if (p0Lower.includes('square') || p0Lower.includes(matchedArtist.toLowerCase())) {
          s = p1;
        }
      }
    }
  }

  // 6. After removing artist prefix, strip any newly exposed track numbers (e.g. "Artist - 01 - Title" -> "01 - Title" -> "Title")
  const secondPassNum = s.match(/^(?:track|trk|tr|[#№no]\.?|\d{1,4})[\s._・-]+(.+)$/i);
  if (secondPassNum) {
    if (!trackNumber) trackNumber = secondPassNum[0].replace(/\D/g, '');
    s = secondPassNum[1].trim();
  }

  // 7. Final cleanup of leading/trailing punctuation and trailing duplicate counters
  s = s.replace(/^[\s._・\-–—/]+|[\s._・\-–—/]+$/g, '').trim();
  
  // Re-check trailing copy counter after all strippings (e.g. if something exposed "美・来 1")
  const finalCopyMatch = s.match(/^(.*?)(?:[\s_]+)(?:0?[1-9])$/);
  if (finalCopyMatch) {
    const base = finalCopyMatch[1].trim();
    if (base.length >= 2 && !/(?:^|[\s._・\-])(?:part|pt|vol|volume|no|number|track|trk|cd|disc|take|act|op|suite|movement|phase|session|section)[\s.]*$/i.test(base)) {
      s = base;
    }
  }

  if (!s) s = filename.replace(/\.[^/.]+$/, '').trim();
  return {
    title: s,
    artist: matchedArtist || existingArtist || 'Unknown Artist',
    trackNumber: trackNumber || undefined
  };
};

// Comprehensive cleaner for Song Titles (cleans both existing track.title and track.fileName)
export const cleanSongTitle = (
  track: Track, 
  currentPlName?: string
): { title: string, artist?: string, trackNumber?: string } => {
  let bestTitle = '';
  let bestArtist = track.artist;
  let bestTrackNumber = track.trackNumber;

  // 1. Try cleaning the existing title (Request 9: already set as title with numbers/cruft)
  if (track.title && track.title.trim()) {
    const fromTitle = parseFilename(track.title.trim(), track.artist, track.album, currentPlName);
    if (fromTitle.title && fromTitle.title.trim().length > 0) {
      bestTitle = fromTitle.title.trim();
      if (fromTitle.trackNumber && !bestTrackNumber) bestTrackNumber = fromTitle.trackNumber;
      if (fromTitle.artist && fromTitle.artist !== 'Unknown Artist') bestArtist = fromTitle.artist;
    }
  }

  // 2. Try cleaning from fileName (especially if title was empty or generic)
  if (track.fileName && track.fileName.trim()) {
    const fromFile = parseFilename(track.fileName.trim(), track.artist, track.album, currentPlName);
    if (fromFile.title && fromFile.title.trim().length > 0) {
      if (!bestTitle || bestTitle.toLowerCase().startsWith('track ') || /^\d+$/.test(bestTitle)) {
        bestTitle = fromFile.title.trim();
      }
      if (fromFile.trackNumber && !bestTrackNumber) bestTrackNumber = fromFile.trackNumber;
      if (fromFile.artist && fromFile.artist !== 'Unknown Artist' && (!bestArtist || bestArtist === 'Unknown Artist')) {
        bestArtist = fromFile.artist;
      }
    }
  }

  return {
    title: bestTitle || track.title || track.fileName.replace(/\.[a-zA-Z0-9]{2,5}$/, '').trim(),
    artist: bestArtist,
    trackNumber: bestTrackNumber
  };
};

const COL_LABELS: Record<string, string> = {
  fileName: '名前',
  trackNumber: '#No',
  title: 'タイトル',
  artist: '参加アーティスト',
  album: 'アルバム'
};

const PanelBlock = ({ title, children, className = "", styleVars, action }: { title: string, children: React.ReactNode, className?: string, styleVars?: React.CSSProperties, action?: React.ReactNode }) => (
  <div className={`border flex flex-col relative ${className}`} style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', ...styleVars }}>
    {title && (
      <div className="absolute -top-2 left-2 px-1 z-10" style={{ backgroundColor: 'var(--theme-surface)' }}>
         <span className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--theme-textMuted)' }}>{title}</span>
      </div>
    )}
    {action && (
      <div className="absolute -top-2.5 right-2 px-1 z-10 flex items-center" style={{ backgroundColor: 'var(--theme-bg)' }}>
        {action}
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
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);

  // Font Selection State (GOTHIC, MARU, MEIRYO, MONO)
  const [fontFamilyId, setFontFamilyId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('v2_solidFontFamily');
      if (saved && FONT_OPTIONS.some(f => f.id === saved)) return saved;
    } catch {}
    return 'MONO';
  });
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
  const fontMenuRef = useRef<HTMLDivElement | null>(null);

  const activeFont = useMemo(() => {
    return FONT_OPTIONS.find(f => f.id === fontFamilyId) || FONT_OPTIONS[3];
  }, [fontFamilyId]);

  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-family', activeFont.fontFamily);
    try {
      localStorage.setItem('v2_solidFontFamily', fontFamilyId);
    } catch {}
  }, [fontFamilyId, activeFont]);

  // 04 DATA BANKS View Mode ('tracks' | 'card' | 'list' | 'album'), Card Size, Grouping, Drill-down, and Sidebar Collapse
  const [bankViewMode, setBankViewMode] = useState<'tracks' | 'card' | 'list' | 'album'>(() => {
    try {
      return (localStorage.getItem('v2_solid_bank_view_mode') as 'tracks' | 'card' | 'list' | 'album') || 'tracks';
    } catch {
      return 'tracks';
    }
  });
  const [cardSize, setCardSize] = useState<'sm' | 'md' | 'lg' | 'xl'>(() => {
    try {
      return (localStorage.getItem('v2_solid_card_size') as 'sm' | 'md' | 'lg' | 'xl') || 'md';
    } catch {
      return 'md';
    }
  });
  const [cardScale, setCardScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('v2_solid_card_scale');
      return saved ? parseInt(saved, 10) : 190;
    } catch {
      return 190;
    }
  });
  const [groupByArtist, setGroupByArtist] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('v2_solid_group_by_artist_v2');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });
  const [drillDownAlbum, setDrillDownAlbum] = useState<{ artist: string; album: string } | null>(null);
  const [focusedAlbumId, setFocusedAlbumId] = useState<string | null>(null);
  const [expandedSidebarFolderIds, setExpandedSidebarFolderIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('v2_solid_expandedSidebarFolderIds');
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set();
  });
  const [sidebarDragAlbum, setSidebarDragAlbum] = useState<{ playlistId: string; albumId: string } | null>(null);
  const [sidebarDragOverAlbum, setSidebarDragOverAlbum] = useState<{ playlistId: string; albumId: string } | null>(null);
  const [catalogFilter, setCatalogFilter] = useState<string>('all');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const prevSidebarWidthRef = useRef<number>(240);

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
  const [showMoveToAlbum, setShowMoveToAlbum] = useState(false);
  const [newAlbumInputName, setNewAlbumInputName] = useState('');

  interface TitleUndoState {
    tracks: {
      id: string;
      title: string;
      artist: string;
      trackNumber?: string;
    }[];
    timestamp: number;
  }
  const [titleUndoState, setTitleUndoState] = useState<TitleUndoState | null>(null);

  // Auto-dismiss undo prompt after 20 seconds
  useEffect(() => {
    if (!titleUndoState) return;
    const timer = setTimeout(() => {
      setTitleUndoState(null);
    }, 20000);
    return () => clearTimeout(timer);
  }, [titleUndoState]);
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
  const [editFileName, setEditFileName] = useState('');
  
  // Playlist Rename & Delete State
  const [renamingPlaylistId, setRenamingPlaylistId] = useState<string | null>(null);
  const [renamingPlaylistName, setRenamingPlaylistName] = useState('');
  const [renamingSubAlbumKey, setRenamingSubAlbumKey] = useState<string | null>(null);
  const [renamingSubAlbumName, setRenamingSubAlbumName] = useState('');
  const [editingDrillDownAlbum, setEditingDrillDownAlbum] = useState(false);
  const [drillDownAlbumNameInput, setDrillDownAlbumNameInput] = useState('');
  const [draggedPlaylistId, setDraggedPlaylistId] = useState<string | null>(null);
  const [dragOverPlaylistId, setDragOverPlaylistId] = useState<string | null>(null);
  const [confirmDeletePlaylistId, setConfirmDeletePlaylistId] = useState<string | null>(null);
  const [confirmDeleteSubAlbumKey, setConfirmDeleteSubAlbumKey] = useState<string | null>(null);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<string>>(new Set());
  const [isPlaylistSelectionMode, setIsPlaylistSelectionMode] = useState(false);
  const lastSelectedPlaylistIdRef = useRef<string | null>(null);
  const [confirmDeleteSelectedPlaylists, setConfirmDeleteSelectedPlaylists] = useState(false);

  // --- Category Management State ---
  const [categories, setCategories] = useState<string[]>([]);
  const [sidebarCategoryMode, setSidebarCategoryMode] = useState<'dropdown' | 'tree'>(() => {
    try {
      const saved = localStorage.getItem('v2_solidSidebarCategoryMode');
      if (saved === 'dropdown' || saved === 'tree') return saved;
    } catch {}
    return 'tree';
  });
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('v2_solidSelectedCategoryFilter');
      if (saved) return saved;
    } catch {}
    return '__ALL__';
  });
  const [expandedCategoryNames, setExpandedCategoryNames] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('v2_solid_expandedCategoryNames');
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set();
  });
  const [treeExpansionStage, setTreeExpansionStage] = useState<'collapsed' | 'cats-only' | 'full' | 'custom'>(() => {
    try {
      const saved = localStorage.getItem('v2_solid_tree_expand_stage') as any;
      if (saved === 'collapsed' || saved === 'cats-only' || saved === 'full' || saved === 'custom') return saved;
    } catch {}
    return 'cats-only';
  });
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [renamingCategoryName, setRenamingCategoryName] = useState<string | null>(null);
  const [editCategoryNameInput, setEditCategoryNameInput] = useState('');
  const [confirmDeleteCategoryName, setConfirmDeleteCategoryName] = useState<string | null>(null);
  const [dragOverCategoryTarget, setDragOverCategoryTarget] = useState<string | null>(null);
  const [draggedCategoryName, setDraggedCategoryName] = useState<string | null>(null);
  const [dragOverCategoryReorderTarget, setDragOverCategoryReorderTarget] = useState<string | null>(null);
  const [categoryDropPosition, setCategoryDropPosition] = useState<'above' | 'below' | null>(null);
  const [activeCategoryMenuPlaylistId, setActiveCategoryMenuPlaylistId] = useState<string | null>(null);
  const [showBatchMoveCategoryModal, setShowBatchMoveCategoryModal] = useState(false);
  const [isCategoryCascadeMenuOpen, setIsCategoryCascadeMenuOpen] = useState(false);
  const [hoveredCategoryInMenu, setHoveredCategoryInMenu] = useState<string | null>(null);
  const [hoveredPlaylistInMenu, setHoveredPlaylistInMenu] = useState<string | null>(null);
  const categoryCascadeMenuRef = useRef<HTMLDivElement>(null);

  // Cascading Category Menu column widths with hand-grip resizing support
  const [cascadeColWidths, setCascadeColWidths] = useState<{ cat: number; pl: number; album: number }>(() => {
    try {
      const saved = localStorage.getItem('v2_solidCascadeColWidths');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          cat: typeof parsed.cat === 'number' ? parsed.cat : 192,
          pl: typeof parsed.pl === 'number' ? parsed.pl : 280,
          album: typeof parsed.album === 'number' ? parsed.album : 280,
        };
      }
    } catch {}
    return { cat: 192, pl: 280, album: 280 };
  });

  // Cascading Category Menu height with vertical resizing support
  const [cascadeHeight, setCascadeHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('v2_solidCascadeHeight');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 240) return val;
      }
    } catch {}
    return 520; // デフォルト高さを従来の320pxから520pxへ大幅拡張
  });

  // Cascading Category Menu frosted glass opacity/blur level (0: full transparency -> 50: standard frosted -> 100: opaque)
  const [cascadeFrostLevel, setCascadeFrostLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('v2_solidCascadeFrostLevel');
      if (saved !== null) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 0 && val <= 100) return val;
      }
    } catch {}
    return 50; // デフォルトは中間（50%）の標準曇りガラス状態
  });

  const handleCascadeGripMouseDown = (e: React.MouseEvent, target: 'cat' | 'pl' | 'album' | 'all') => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const initialWidths = { ...cascadeColWidths };

    const onMouseMove = (ev: MouseEvent) => {
      const deltaX = ev.clientX - startX;
      setCascadeColWidths(prev => {
        let updated = { ...prev };
        if (target === 'cat') {
          updated.cat = Math.max(140, Math.min(500, initialWidths.cat + deltaX));
        } else if (target === 'pl') {
          updated.pl = Math.max(180, Math.min(800, initialWidths.pl + deltaX));
        } else if (target === 'album') {
          updated.album = Math.max(180, Math.min(800, initialWidths.album + deltaX));
        } else if (target === 'all') {
          updated.pl = Math.max(180, Math.min(800, initialWidths.pl + Math.round(deltaX * 0.5)));
          updated.album = Math.max(180, Math.min(800, initialWidths.album + Math.round(deltaX * 0.5)));
        }
        return updated;
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setCascadeColWidths(latest => {
        try { localStorage.setItem('v2_solidCascadeColWidths', JSON.stringify(latest)); } catch {}
        return latest;
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleCascadeHeightMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const initialH = cascadeHeight;

    const onMouseMove = (ev: MouseEvent) => {
      const deltaY = ev.clientY - startY;
      const maxHeightAllowed = typeof window !== 'undefined' ? Math.max(300, window.innerHeight - 120) : 900;
      setCascadeHeight(Math.max(240, Math.min(maxHeightAllowed, initialH + deltaY)));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setCascadeHeight(latest => {
        try { localStorage.setItem('v2_solidCascadeHeight', latest.toString()); } catch {}
        return latest;
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleCascadeCornerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialWidths = { ...cascadeColWidths };
    const initialH = cascadeHeight;

    const onMouseMove = (ev: MouseEvent) => {
      const deltaX = ev.clientX - startX;
      const deltaY = ev.clientY - startY;
      const maxHeightAllowed = typeof window !== 'undefined' ? Math.max(300, window.innerHeight - 120) : 900;
      
      setCascadeHeight(Math.max(240, Math.min(maxHeightAllowed, initialH + deltaY)));
      setCascadeColWidths(prev => {
        let updated = { ...prev };
        updated.pl = Math.max(180, Math.min(800, initialWidths.pl + Math.round(deltaX * 0.5)));
        updated.album = Math.max(180, Math.min(800, initialWidths.album + Math.round(deltaX * 0.5)));
        return updated;
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setCascadeHeight(latestH => {
        try { localStorage.setItem('v2_solidCascadeHeight', latestH.toString()); } catch {}
        return latestH;
      });
      setCascadeColWidths(latestW => {
        try { localStorage.setItem('v2_solidCascadeColWidths', JSON.stringify(latestW)); } catch {}
        return latestW;
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Duplicates & Mini Mode State
  const [duplicateGroups, setDuplicateGroups] = useState<Track[][]>([]);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [viewMode, setViewMode] = useState<'full' | 'mini' | 'slim'>(() => {
    try {
      const saved = localStorage.getItem('v2_solidViewMode');
      if (saved === 'mini' || saved === 'slim' || saved === 'full') return saved;
    } catch (e) {}
    return 'full';
  });

  const [windowSizes, setWindowSizes] = useState<Record<'full' | 'mini' | 'slim', { width: number; height: number }>>(() => {
    try {
      const saved = localStorage.getItem('v2_solidWindowSizes');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          full: parsed.full && parsed.full.width ? parsed.full : DEFAULT_WINDOW_SIZES.full,
          mini: parsed.mini && parsed.mini.width ? parsed.mini : DEFAULT_WINDOW_SIZES.mini,
          slim: parsed.slim && parsed.slim.width ? parsed.slim : DEFAULT_WINDOW_SIZES.slim,
        };
      }
    } catch (e) {}
    return DEFAULT_WINDOW_SIZES;
  });

  // Track window resizing and persist custom dimensions per viewMode
  useEffect(() => {
    let resizeTimer: any;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (typeof document !== 'undefined' && document.fullscreenElement) return;
        const w = window.outerWidth || window.innerWidth;
        const h = window.outerHeight || window.innerHeight;
        if (w > 100 && h > 100) {
          setWindowSizes(prev => {
            const updated = {
              ...prev,
              [viewMode]: { width: w, height: h }
            };
            try {
              localStorage.setItem('v2_solidWindowSizes', JSON.stringify(updated));
              set('v2_solidWindowSizes', updated).catch(() => {});
            } catch (e) {}
            return updated;
          });
        }
      }, 300);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [viewMode]);

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

  // Resize window according to current viewMode
  useEffect(() => {
    try {
      localStorage.setItem('v2_solidViewMode', viewMode);
      set('v2_solidViewMode', viewMode).catch(() => {});
    } catch (e) {}

    // Skip window.resizeTo if currently in fullscreen to prevent OS window frame restoration
    if (typeof document !== 'undefined' && document.fullscreenElement) return;

    try {
      if (typeof window !== 'undefined' && window.resizeTo) {
        const target = windowSizes[viewMode] || DEFAULT_WINDOW_SIZES[viewMode];
        if (target && target.width && target.height) {
          window.resizeTo(target.width, target.height);
        }
      }
    } catch (e) {
      console.warn("window.resizeTo is restricted by browser context", e);
    }
  }, [viewMode, windowSizes]);

  // Fullscreen state and handler
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Guard window.resizeTo during fullscreen to prevent OS window borders from reappearing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const originalResizeTo = typeof window.resizeTo === 'function' ? window.resizeTo.bind(window) : null;
    (window as any).resizeTo = (width: number, height: number) => {
      if (document.fullscreenElement) {
        // Skip window resize when in fullscreen mode to prevent OS borders from reappearing
        return;
      }
      if (originalResizeTo) {
        originalResizeTo(width, height);
      }
    };
    return () => {
      if (originalResizeTo) {
        window.resizeTo = originalResizeTo;
      }
    };
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions);
        } else if ((docEl as any).webkitRequestFullscreen) {
          await (docEl as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      // Fallback if navigationUI: 'hide' is not supported by older engines
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (fallbackErr) {
        console.warn('Fullscreen toggle request:', fallbackErr);
      }
    }
  };

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
        const savedWindowSizes = await get('v2_solidWindowSizes');
        
        if (savedWindowSizes && typeof savedWindowSizes === 'object') {
          setWindowSizes(prev => ({
            full: savedWindowSizes.full && savedWindowSizes.full.width ? savedWindowSizes.full : prev.full,
            mini: savedWindowSizes.mini && savedWindowSizes.mini.width ? savedWindowSizes.mini : prev.mini,
            slim: savedWindowSizes.slim && savedWindowSizes.slim.width ? savedWindowSizes.slim : prev.slim,
          }));
        }
        
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
        const savedFontFamily = await get('v2_solidFontFamily');
        if (savedFontFamily && FONT_OPTIONS.some(f => f.id === savedFontFamily)) {
          setFontFamilyId(savedFontFamily);
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
            // Sanitize and clean tag text (repair mojibake & convert full-width English)
            t.title = cleanAudioTag(t.title);
            t.artist = cleanAudioTag(t.artist);
            t.album = cleanAudioTag(t.album);
            libraryMap.set(t.id, t);
            return t;
          }));
          
          setLibrary(newLibrary);


          // Restore playlists
          const validPlaylists = savedPlaylists.map((p: any) => ({
            ...p,
            category: p.category || undefined,
            tracks: p.tracks.map((pt: Track) => libraryMap.get(pt.id)).filter(Boolean) as Track[]
          }));
          setPlaylists(validPlaylists);

          const savedCategories = await get('v2_solidCategories');
          const discoveredCats = new Set<string>();
          if (Array.isArray(savedCategories)) {
            savedCategories.forEach(c => { if (typeof c === 'string' && c.trim()) discoveredCats.add(c.trim()); });
          }
          validPlaylists.forEach((p: any) => {
            if (p.category && typeof p.category === 'string' && p.category.trim()) discoveredCats.add(p.category.trim());
          });
          const catList = Array.from(discoveredCats);
          setCategories(catList);

          const savedTreeStage = localStorage.getItem('v2_solid_tree_expand_stage') as any;
          const savedCatNames = localStorage.getItem('v2_solid_expandedCategoryNames');
          const savedFolderIds = localStorage.getItem('v2_solid_expandedSidebarFolderIds');

          if (savedTreeStage === 'collapsed') {
            setExpandedCategoryNames(new Set());
            setExpandedSidebarFolderIds(new Set());
          } else if (savedTreeStage === 'cats-only') {
            setExpandedCategoryNames(new Set([...catList, '__UNCATEGORIZED__']));
            setExpandedSidebarFolderIds(new Set());
          } else if (savedTreeStage === 'full') {
            setExpandedCategoryNames(new Set([...catList, '__UNCATEGORIZED__']));
            const expFolderIds = validPlaylists
              .filter((p: any) => p.id !== 'all-tracks' && (playlistAlbumsMap[p.id]?.length || 0) > 1)
              .map((p: any) => p.id);
            setExpandedSidebarFolderIds(new Set(expFolderIds));
          } else if (savedCatNames || savedFolderIds) {
            if (savedCatNames) {
              try { setExpandedCategoryNames(new Set(JSON.parse(savedCatNames))); } catch {}
            }
            if (savedFolderIds) {
              try { setExpandedSidebarFolderIds(new Set(JSON.parse(savedFolderIds))); } catch {}
            }
          } else {
            setExpandedCategoryNames(new Set([...catList, '__UNCATEGORIZED__']));
            setExpandedSidebarFolderIds(new Set());
          }

          const savedCategoryMode = await get('v2_solidSidebarCategoryMode');
          if (savedCategoryMode === 'dropdown' || savedCategoryMode === 'tree') {
            setSidebarCategoryMode(savedCategoryMode);
          }
          const savedSelectedCat = await get('v2_solidSelectedCategoryFilter');
          if (savedSelectedCat) {
            setSelectedCategoryFilter(savedSelectedCat);
          }

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
        set('v2_solidFontFamily', fontFamilyId).catch(console.error);
        set('v2_solidListFontSize', listFontSize).catch(console.error);
        set('v2_solidActivePlaylistId', activePlaylistId).catch(console.error);
        set('v2_solidPlayingPlaylistId', playingPlaylistId).catch(console.error);
        set('v2_solidPlaybackQueueIds', playbackQueue.map(t => t.id)).catch(console.error);
        set('v2_solidCurrentTrackIndex', currentTrackIndex).catch(console.error);
        set('v2_solidCategories', categories).catch(console.error);
        set('v2_solidSidebarCategoryMode', sidebarCategoryMode).catch(console.error);
        set('v2_solidSelectedCategoryFilter', selectedCategoryFilter).catch(console.error);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [library, playlists, sidebarWidth, colWidths, colVisibility, colOrder, themeIndex, fontFamilyId, listFontSize, activePlaylistId, playingPlaylistId, playbackQueue, currentTrackIndex, categories, sidebarCategoryMode, selectedCategoryFilter, isInitialized]);

  // Close theme menu on outside click or Escape key
  useEffect(() => {
    if (!isThemeMenuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsThemeMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isThemeMenuOpen]);

  // Close font menu on outside click or Escape key
  useEffect(() => {
    if (!isFontMenuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (fontMenuRef.current && !fontMenuRef.current.contains(e.target as Node)) {
        setIsFontMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFontMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFontMenuOpen]);

  // Close Category Cascade Menu on outside click or Escape key
  useEffect(() => {
    if (!isCategoryCascadeMenuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (categoryCascadeMenuRef.current && !categoryCascadeMenuRef.current.contains(e.target as Node)) {
        setIsCategoryCascadeMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCategoryCascadeMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCategoryCascadeMenuOpen]);


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

  // Dynamically update browser theme-color meta tag
  useEffect(() => {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    const themeBgColors: Record<number, string> = {
      0: '#0a0d12', // Black
      1: '#0d0404', // Red
      2: '#0d131f', // Dark
      3: '#e2e8f0', // Light
    };
    const newColor = themeBgColors[themeIndex] || theme.bg || '#0a0d12';
    metaThemeColor.setAttribute('content', newColor);
  }, [themeIndex]);
  const isLightTheme = theme.id === 'LIGHT';
  const iconColor = isLightTheme ? '#1a2530' : '#ffffff';
  const listIconColor = (theme as any).listIconColor || iconColor;
  
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
    t.album.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  ));

  // Helper to resolve track album and artist with folderPath & playlist hierarchy
  // Ensures tracks inside the same folder (or single-folder playlist) are grouped into ONE unified album by folder name,
  // without being split apart by inconsistent MP3 internal album tags (release dates, singles, etc.)!
  const getTrackAlbumArtist = (track: Track, currentPlaylist?: Playlist) => {
    let albumName = track.album?.trim() || '';
    let artistName = track.artist?.trim() || '';

    const ownerPlaylist = (currentPlaylist && currentPlaylist.id !== 'all-tracks')
      ? currentPlaylist
      : playlists.find(p => p.id !== 'all-tracks' && p.tracks.some(pt => pt.id === track.id));

    // If track already has an explicit, valid album name assigned (e.g. moved by user or parsed), respect that track.album!
    const hasExplicitAlbum = Boolean(albumName && albumName !== 'Unknown Album');

    if (track.folderPath) {
      const parts = track.folderPath.split('/').filter(Boolean);
      // Case 1: Inside a subfolder of a dropped parent folder (e.g. "■ - T-SQUARE ベストアルバム集 / T-SQUARE - BLUE IN RED / song.mp3")
      if (parts.length >= 3) {
        const subFolderName = parts[parts.length - 2];
        const parentFolderName = parts[parts.length - 3];
        if (!hasExplicitAlbum) {
          albumName = subFolderName;
        }
        if (!artistName || artistName === 'Unknown Artist') {
          artistName = parentFolderName;
        }
      } else if (parts.length === 2) {
        // Case 2: Direct file inside a single dropped folder
        const rootFolderName = parts[0];
        if (!hasExplicitAlbum) {
          albumName = ownerPlaylist?.name || rootFolderName;
        }
        if (!artistName || artistName === 'Unknown Artist') {
          artistName = rootFolderName;
        }
      }
    } else if (ownerPlaylist && ownerPlaylist.name) {
      // Case 3: Already-imported playlist without folderPath
      if (!hasExplicitAlbum) {
        if (ownerPlaylist.name.includes(' / ')) {
          const [plArtist, plAlbum] = ownerPlaylist.name.split(' / ').map(s => s.trim());
          albumName = plAlbum || ownerPlaylist.name;
          if (!artistName || artistName === 'Unknown Artist') artistName = plArtist || artistName;
        } else {
          albumName = ownerPlaylist.name;
          if (!artistName || artistName === 'Unknown Artist') {
            artistName = ownerPlaylist.name;
          }
        }
      }
    }

    if (!albumName) albumName = 'Unknown Album';
    if (!artistName) artistName = 'Unknown Artist';

    return { album: albumName, artist: artistName };
  };

  // Compute Album Groups from displayTracks
  // When viewing a specific parent folder playlist (e.g. "■ - T-SQUARE ベストアルバム集"), group by Album (subfolder) so all albums inside this folder appear cleanly!
  const albumGroups = useMemo<AlbumGroup[]>(() => {
    const map = new Map<string, AlbumGroup>();
    const isSpecificPlaylist = activePlaylistId !== 'all-tracks';

    for (const track of displayTracks) {
      const { album: albumName, artist: artistName } = getTrackAlbumArtist(track, activePlaylist);
      const cleanArtist = (artistName || 'Unknown Artist').trim();
      const cleanAlbum = (albumName || 'Unknown Album').trim();

      // In a specific folder playlist, group strictly by album name so tracks in the same folder/album stay in one card even if individual track artist tags vary
      const key = isSpecificPlaylist
        ? `album___${cleanAlbum.toLowerCase()}`
        : `${cleanArtist.toLowerCase()}___${cleanAlbum.toLowerCase()}`;

      let group = map.get(key);
      if (!group) {
        group = {
          id: key,
          album: cleanAlbum,
          artist: cleanArtist,
          coverUrl: track.coverUrl,
          tracks: [],
          totalDuration: 0,
        };
        map.set(key, group);
      }

      // Avoid adding duplicate track references if any
      if (!group.tracks.some(t => t.id === track.id)) {
        group.tracks.push(track);
        group.totalDuration += track.duration || 0;
      }
      if (!group.coverUrl && track.coverUrl) {
        group.coverUrl = track.coverUrl;
      }
      // Prefer a real artist name over 'Unknown Artist' for the album header
      if (group.artist === 'Unknown Artist' && cleanArtist !== 'Unknown Artist') {
        group.artist = cleanArtist;
      }
    }

    return Array.from(map.values());
  }, [displayTracks, activePlaylistId, activePlaylist, playlists]);

  // Compute Artist Groups (grouping albums under their respective artists, preserving order)
  const artistGroups = useMemo<ArtistGroup[]>(() => {
    const map = new Map<string, ArtistGroup>();

    for (const album of albumGroups) {
      const cleanArtist = (album.artist || 'Unknown Artist').trim();
      const key = cleanArtist.toLowerCase();
      let artist = map.get(key);
      if (!artist) {
        artist = {
          artist: cleanArtist,
          albums: [],
          totalTracks: 0,
          totalDuration: 0,
          coverUrl: album.coverUrl,
        };
        map.set(key, artist);
      }
      artist.albums.push(album);
      artist.totalTracks += album.tracks.length;
      artist.totalDuration += album.totalDuration;
      if (!artist.coverUrl && album.coverUrl) {
        artist.coverUrl = album.coverUrl;
      }
    }

    return Array.from(map.values());
  }, [albumGroups]);

  // When drillDownAlbum is selected (e.g. from sidebar TREE sub-album), filter to that album so ALBUM / CARDS / LIST displays only that album
  const displayedAlbumGroups = useMemo<AlbumGroup[]>(() => {
    if (drillDownAlbum) {
      const filtered = albumGroups.filter(a => {
        if (activePlaylistId !== 'all-tracks') {
          return a.album.toLowerCase() === drillDownAlbum.album.toLowerCase();
        }
        return a.album.toLowerCase() === drillDownAlbum.album.toLowerCase() &&
               a.artist.toLowerCase() === drillDownAlbum.artist.toLowerCase();
      });
      if (filtered.length > 0) return filtered;
    }
    return albumGroups;
  }, [albumGroups, drillDownAlbum, activePlaylistId]);

  const displayedArtistGroups = useMemo<ArtistGroup[]>(() => {
    if (drillDownAlbum) {
      const map = new Map<string, ArtistGroup>();
      for (const album of displayedAlbumGroups) {
        const cleanArtist = (album.artist || 'Unknown Artist').trim();
        const key = cleanArtist.toLowerCase();
        let artist = map.get(key);
        if (!artist) {
          artist = {
            artist: cleanArtist,
            albums: [],
            totalTracks: 0,
            totalDuration: 0,
            coverUrl: album.coverUrl,
          };
          map.set(key, artist);
        }
        artist.albums.push(album);
        artist.totalTracks += album.tracks.length;
        artist.totalDuration += album.totalDuration;
        if (!artist.coverUrl && album.coverUrl) {
          artist.coverUrl = album.coverUrl;
        }
      }
      return Array.from(map.values());
    }
    return artistGroups;
  }, [artistGroups, displayedAlbumGroups, drillDownAlbum]);

  // Catalog tracks: when catalogFilter === 'all', takes all tracks across the entire library!
  const catalogTracks = useMemo(() => {
    const base = catalogFilter === 'all' 
      ? library 
      : (playlists.find(p => p.id === catalogFilter)?.tracks || library);
    if (!searchQuery) return base;
    const q = searchQuery.toLowerCase();
    return base.filter(t => 
      t.title.toLowerCase().includes(q) || 
      t.artist.toLowerCase().includes(q) ||
      t.album.toLowerCase().includes(q) ||
      t.fileName.toLowerCase().includes(q)
    );
  }, [library, playlists, catalogFilter, searchQuery]);

  // Compute Album Groups from catalogTracks (all albums across the whole collection)
  const catalogAlbumGroups = useMemo<AlbumGroup[]>(() => {
    const map = new Map<string, AlbumGroup>();

    for (const track of catalogTracks) {
      const { album: albumName, artist: artistName } = getTrackAlbumArtist(track);
      const key = `${artistName}___${albumName}`;

      let group = map.get(key);
      if (!group) {
        group = {
          id: key,
          album: albumName,
          artist: artistName,
          coverUrl: track.coverUrl,
          tracks: [],
          totalDuration: 0,
        };
        map.set(key, group);
      }

      group.tracks.push(track);
      group.totalDuration += track.duration || 0;
      if (!group.coverUrl && track.coverUrl) {
        group.coverUrl = track.coverUrl;
      }
    }

    const list = Array.from(map.values());
    list.sort((a, b) => a.album.localeCompare(b.album, undefined, { sensitivity: 'base' }));
    return list;
  }, [catalogTracks]);

  // Compute Artist Groups for catalog (grouping albums under their respective artists)
  const catalogArtistGroups = useMemo<ArtistGroup[]>(() => {
    const map = new Map<string, ArtistGroup>();

    for (const album of catalogAlbumGroups) {
      let artist = map.get(album.artist);
      if (!artist) {
        artist = {
          artist: album.artist,
          albums: [],
          totalTracks: 0,
          totalDuration: 0,
          coverUrl: album.coverUrl,
        };
        map.set(album.artist, artist);
      }
      artist.albums.push(album);
      artist.totalTracks += album.tracks.length;
      artist.totalDuration += album.totalDuration;
      if (!artist.coverUrl && album.coverUrl) {
        artist.coverUrl = album.coverUrl;
      }
    }

    const list = Array.from(map.values());
    list.sort((a, b) => a.artist.localeCompare(b.artist, undefined, { sensitivity: 'base' }));
    return list;
  }, [catalogAlbumGroups]);

  // Drill-down tracks when an album is selected (e.g. from sidebar subfolder or album card)
  const drillDownTracks = useMemo<Track[]>(() => {
    if (!drillDownAlbum) return [];
    return displayTracks.filter(t => {
      const { album, artist } = getTrackAlbumArtist(t, activePlaylist);
      if (activePlaylistId !== 'all-tracks') {
        return album.toLowerCase() === drillDownAlbum.album.toLowerCase();
      }
      return album.toLowerCase() === drillDownAlbum.album.toLowerCase() && artist.toLowerCase() === drillDownAlbum.artist.toLowerCase();
    });
  }, [displayTracks, drillDownAlbum, activePlaylist, activePlaylistId, playlists]);

  // Compute sub-albums for each sidebar playlist so parent folders (like T-SQUARE ベストアルバム集) can be expanded in the sidebar
  const playlistAlbumsMap = useMemo<Record<string, AlbumGroup[]>>(() => {
    const result: Record<string, AlbumGroup[]> = {};
    for (const pl of playlists) {
      if (pl.id === 'all-tracks') continue;
      const map = new Map<string, AlbumGroup>();
      for (const track of pl.tracks) {
        const { album: albumName, artist: artistName } = getTrackAlbumArtist(track, pl);
        const cleanAlbum = (albumName || 'Unknown Album').trim();
        const cleanArtist = (artistName || 'Unknown Artist').trim();
        const key = `album___${cleanAlbum.toLowerCase()}`;
        let group = map.get(key);
        if (!group) {
          group = {
            id: key,
            album: cleanAlbum,
            artist: cleanArtist,
            coverUrl: track.coverUrl,
            tracks: [],
            totalDuration: 0,
          };
          map.set(key, group);
        }
        if (!group.tracks.some(t => t.id === track.id)) {
          group.tracks.push(track);
          group.totalDuration += track.duration || 0;
        }
        if (!group.coverUrl && track.coverUrl) {
          group.coverUrl = track.coverUrl;
        }
      }
      result[pl.id] = Array.from(map.values());
    }
    return result;
  }, [playlists]);

  const currentTrack = playbackQueue[currentTrackIndex] || null;

  // Jump to currently playing track's album / playlist in the bottom bank
  const handleLocateCurrentTrack = React.useCallback(() => {
    if (!currentTrack) return;

    // 1. Identify target playlist
    let targetPl = playlists.find(p => p.id === playingPlaylistId && p.tracks.some(t => t.id === currentTrack.id));
    if (!targetPl) {
      targetPl = playlists.find(p => p.id !== 'all-tracks' && p.tracks.some(t => t.id === currentTrack.id));
    }
    if (!targetPl) {
      targetPl = playlists.find(p => p.tracks.some(t => t.id === currentTrack.id)) || playlists.find(p => p.id === 'all-tracks');
    }
    if (!targetPl) return;

    // 2. Set active playlist
    setActivePlaylistId(targetPl.id);

    // 3. Expand category and sidebar folder if applicable
    if (targetPl.category) {
      setExpandedCategoryNames(prev => new Set([...prev, targetPl.category!]));
      if (selectedCategoryFilter && selectedCategoryFilter !== targetPl.category) {
        setSelectedCategoryFilter(null);
      }
    }
    setExpandedSidebarFolderIds(prev => new Set([...prev, targetPl.id]));

    // 4. Drill down to specific album or focus album
    const subAlbums = playlistAlbumsMap[targetPl.id] || [];
    const targetAlbumName = (currentTrack.album || '').trim().toLowerCase();
    
    // Check if there is a matching sub-album in this playlist
    const matchedSub = subAlbums.find(a => 
      (targetAlbumName && targetAlbumName !== 'unknown album' && a.album.toLowerCase() === targetAlbumName) ||
      a.tracks.some(t => t.id === currentTrack.id)
    );

    if (matchedSub && subAlbums.length > 1) {
      // If playlist has multiple albums (like "T-SQUARE ベストアルバム集"), drill down to the exact sub-album
      setDrillDownAlbum({ artist: matchedSub.artist, album: matchedSub.album });
      setFocusedAlbumId(matchedSub.album);
    } else if (matchedSub) {
      setFocusedAlbumId(matchedSub.album);
      setDrillDownAlbum(null);
    } else if (currentTrack.album && currentTrack.album !== 'Unknown Album') {
      setFocusedAlbumId(currentTrack.album);
    } else {
      setDrillDownAlbum(null);
      setFocusedAlbumId(null);
    }

    // 5. Select the track
    setSelectedTrackIds(new Set([currentTrack.id]));
    lastSelectedTrackIdRef.current = currentTrack.id;

    // 6. Scroll into view
    setTimeout(() => {
      const el = document.getElementById(`track-row-${currentTrack.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  }, [currentTrack, playingPlaylistId, playlists, playlistAlbumsMap, selectedCategoryFilter]);

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
    const cleanTitle = normalizeZenkakuAlphanumeric(editTitle.trim());
    const cleanArtist = normalizeZenkakuAlphanumeric(editArtist.trim());
    const cleanFileName = normalizeZenkakuAlphanumeric(editFileName.trim());

    setLibrary(prev => prev.map(t => {
      if (t.id === trackId) {
        return { 
          ...t, 
          title: cleanTitle || t.title, 
          artist: cleanArtist || t.artist,
          fileName: cleanFileName || t.fileName,
        };
      }
      return t;
    }));
    
    setPlaylists(prev => prev.map(p => ({
      ...p,
      tracks: p.tracks.map(t => {
        if (t.id === trackId) {
           return { 
             ...t, 
             title: cleanTitle || t.title, 
             artist: cleanArtist || t.artist,
             fileName: cleanFileName || t.fileName,
           };
        }
        return t;
      })
    })));

    setPlaybackQueue(prev => prev.map(t => {
      if (t.id === trackId) {
        return { 
          ...t, 
          title: cleanTitle || t.title, 
          artist: cleanArtist || t.artist,
          fileName: cleanFileName || t.fileName,
        };
      }
      return t;
    }));

    setEditingTrackId(null);
  };

  // Generate and apply clean title from file name / existing title for a single track
  const handleApplyFilenameToTitle = (trackId: string) => {
    const track = displayTracks.find(t => t.id === trackId);
    if (track) {
      setTitleUndoState({
        tracks: [{
          id: track.id,
          title: track.title,
          artist: track.artist,
          trackNumber: track.trackNumber,
        }],
        timestamp: Date.now(),
      });
    }

    const currentPlName = activePlaylist?.name;
    const applyFilename = (t: Track): Track => {
      if (t.id !== trackId) return t;
      const parsed = cleanSongTitle(t, currentPlName);
      return {
        ...t,
        title: parsed.title || t.title,
        ...(parsed.artist && parsed.artist !== 'Unknown Artist' ? { artist: parsed.artist } : {}),
        ...(parsed.trackNumber ? { trackNumber: parsed.trackNumber } : {}),
      };
    };

    setLibrary(prev => prev.map(applyFilename));
    setPlaylists(prev => prev.map(p => ({
      ...p,
      tracks: p.tracks.map(applyFilename)
    })));
    setPlaybackQueue(prev => prev.map(applyFilename));
  };

  // Batch generate clean Title from filename & existing title for all selected tracks (Pure Song Title Extraction)
  const handleBatchUseFilenameAsTitle = () => {
    if (selectedTrackIds.size === 0) return;
    const selectedTracks = displayTracks.filter(t => selectedTrackIds.has(t.id));
    if (selectedTracks.length === 0) return;

    // Save undo history before applying clean title
    setTitleUndoState({
      tracks: selectedTracks.map(t => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        trackNumber: t.trackNumber,
      })),
      timestamp: Date.now(),
    });

    const currentPlName = activePlaylist?.name;
    const applyFilename = (t: Track): Track => {
      if (!selectedTrackIds.has(t.id)) return t;
      const parsed = cleanSongTitle(t, currentPlName);
      return {
        ...t,
        title: parsed.title || t.title,
        ...(parsed.artist && parsed.artist !== 'Unknown Artist' ? { artist: parsed.artist } : {}),
        ...(parsed.trackNumber ? { trackNumber: parsed.trackNumber } : {}),
      };
    };

    setLibrary(prev => prev.map(applyFilename));
    setPlaylists(prev => prev.map(p => ({
      ...p,
      tracks: p.tracks.map(applyFilename)
    })));
    setPlaybackQueue(prev => prev.map(applyFilename));
    setSelectedTrackIds(new Set());
    lastSelectedTrackIdRef.current = null;
  };

  // Undo the last Title Clean / Title Modification operation
  const handleUndoTitleClean = () => {
    if (!titleUndoState || titleUndoState.tracks.length === 0) return;
    const undoMap = new Map<string, { id: string; title: string; artist: string; trackNumber?: string }>(
      titleUndoState.tracks.map(t => [t.id, t])
    );

    const revertTrack = (t: Track): Track => {
      const prev = undoMap.get(t.id);
      if (!prev) return t;
      return {
        ...t,
        title: prev.title,
        artist: prev.artist,
        trackNumber: prev.trackNumber,
      };
    };

    setLibrary(prev => prev.map(revertTrack));
    setPlaylists(prev => prev.map(p => ({
      ...p,
      tracks: p.tracks.map(revertTrack),
    })));
    setPlaybackQueue(prev => prev.map(revertTrack));
    setTitleUndoState(null);
  };

  // Reset selected tracks' titles directly back to their raw file name (without extension)
  const handleBatchResetToFilename = () => {
    if (selectedTrackIds.size === 0) return;
    const selectedTracks = displayTracks.filter(t => selectedTrackIds.has(t.id));
    if (selectedTracks.length === 0) return;

    // Save undo history first
    setTitleUndoState({
      tracks: selectedTracks.map(t => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        trackNumber: t.trackNumber,
      })),
      timestamp: Date.now(),
    });

    const resetToFilename = (t: Track): Track => {
      if (!selectedTrackIds.has(t.id)) return t;
      const rawName = t.fileName.replace(/\.[a-zA-Z0-9]{2,5}$/, '').trim();
      return {
        ...t,
        title: rawName || t.title,
      };
    };

    setLibrary(prev => prev.map(resetToFilename));
    setPlaylists(prev => prev.map(p => ({
      ...p,
      tracks: p.tracks.map(resetToFilename),
    })));
    setPlaybackQueue(prev => prev.map(resetToFilename));
    setSelectedTrackIds(new Set());
    lastSelectedTrackIdRef.current = null;
  };

  const removeArtwork = (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    setLibrary(prev => prev.map(t => t.id === trackId ? { ...t, coverUrl: undefined } : t));
    setPlaylists(prev => prev.map(p => ({
      ...p,
      tracks: p.tracks.map(t => t.id === trackId ? { ...t, coverUrl: undefined } : t)
    })));
  };

  const getArtworkTargetTracks = (track: Track): Track[] => {
    const idSet = new Set<string>();
    idSet.add(track.id);

    // 1. If currently playing a specific playlist
    if (playingPlaylistId !== 'all-tracks' && playingPlaylist) {
      playingPlaylist.tracks.forEach(t => idSet.add(t.id));
    } else {
      // 2. If in all-tracks or playback queue:
      playbackQueue.forEach(t => idSet.add(t.id));

      // Also if track has a designated album, include all tracks with that album
      const hasAlbum = track.album && track.album !== 'Unknown Album' && track.album.trim() !== '';
      if (hasAlbum) {
        library.forEach(t => {
          if (t.album && t.album.toLowerCase() === track.album.toLowerCase()) {
            idSet.add(t.id);
          }
        });
      }
    }

    // Collect full track references
    const targetMap = new Map<string, Track>();
    library.forEach(t => { if (idSet.has(t.id)) targetMap.set(t.id, t); });
    playbackQueue.forEach(t => { if (idSet.has(t.id)) targetMap.set(t.id, t); });
    if (playingPlaylist) {
      playingPlaylist.tracks.forEach(t => { if (idSet.has(t.id)) targetMap.set(t.id, t); });
    }
    return Array.from(targetMap.values());
  };

  const handleUpdateArtwork = async (file: File): Promise<number> => {
    if (!currentTrack) return 0;
    try {
      const targetTracks = getArtworkTargetTracks(currentTrack);
      const buffer = await file.arrayBuffer();
      const mimeType = file.type || 'image/jpeg';
      const sharedCoverUrl = URL.createObjectURL(new Blob([buffer], { type: mimeType }));

      // 1. For all target tracks, ensure original cover is backed up, then set new cover
      await Promise.all(targetTracks.map(async (t) => {
        try {
          const existingOrig = await get(`v2_track_original_cover_${t.id}`);
          if (!existingOrig) {
            const currentCoverData = await get(`v2_track_cover_${t.id}`);
            if (currentCoverData && currentCoverData.buffer) {
              await set(`v2_track_original_cover_${t.id}`, currentCoverData);
            } else {
              let audioBlob: Blob | null = t.file || null;
              if (!audioBlob) {
                const audioData = await get(`v2_track_audio_${t.id}`);
                if (audioData && audioData.buffer) {
                  audioBlob = new Blob([audioData.buffer], { type: audioData.type });
                }
              }
              if (audioBlob) {
                try {
                  const meta = await mm.parseBlob(audioBlob, { skipCovers: false });
                  const pic = meta.common.picture?.[0];
                  if (pic) {
                    let mime = pic.format;
                    if (!mime.startsWith('image/')) mime = `image/${mime}`;
                    const origBuf = pic.data.buffer.slice(pic.data.byteOffset, pic.data.byteOffset + pic.data.byteLength);
                    await set(`v2_track_original_cover_${t.id}`, { buffer: origBuf, type: mime });
                  }
                } catch (e) {
                  // Ignore parse error on backup
                }
              }
            }
          }
          // Set new custom cover for this track
          await set(`v2_track_cover_${t.id}`, { buffer, type: mimeType });
        } catch (e) {
          console.error(`Failed to update cover for track ${t.id}`, e);
        }
      }));

      // 2. Update React states atomically across library, playlists, and queue
      const targetIds = new Set(targetTracks.map(t => t.id));
      const updateCover = (t: Track) => targetIds.has(t.id) ? { ...t, coverUrl: sharedCoverUrl } : t;
      setLibrary(prev => prev.map(updateCover));
      setPlaylists(prev => prev.map(p => ({ ...p, tracks: p.tracks.map(updateCover) })));
      setPlaybackQueue(prev => prev.map(updateCover));

      return targetTracks.length;
    } catch (err) {
      console.error('Failed to update cover artwork for list:', err);
      return 0;
    }
  };

  const handleResetArtwork = async (): Promise<number | boolean> => {
    if (!currentTrack) return false;
    try {
      const targetTracks = getArtworkTargetTracks(currentTrack);
      const restoredUrlMap = new Map<string, string | undefined>();

      // Restore each track's own original embedded cover
      await Promise.all(targetTracks.map(async (t) => {
        try {
          let originalCover = await get(`v2_track_original_cover_${t.id}`);
          if (!originalCover || !originalCover.buffer) {
            let audioBlob: Blob | null = t.file || null;
            if (!audioBlob) {
              const audioData = await get(`v2_track_audio_${t.id}`);
              if (audioData && audioData.buffer) {
                audioBlob = new Blob([audioData.buffer], { type: audioData.type });
              }
            }
            if (audioBlob) {
              try {
                const meta = await mm.parseBlob(audioBlob, { skipCovers: false });
                const pic = meta.common.picture?.[0];
                if (pic) {
                  let mime = pic.format;
                  if (!mime.startsWith('image/')) mime = `image/${mime}`;
                  const origBuf = pic.data.buffer.slice(pic.data.byteOffset, pic.data.byteOffset + pic.data.byteLength);
                  originalCover = { buffer: origBuf, type: mime };
                  await set(`v2_track_original_cover_${t.id}`, originalCover);
                }
              } catch (e) {
                // Ignore
              }
            }
          }

          if (originalCover && originalCover.buffer) {
            await set(`v2_track_cover_${t.id}`, originalCover);
            const restoredUrl = URL.createObjectURL(new Blob([originalCover.buffer], { type: originalCover.type }));
            restoredUrlMap.set(t.id, restoredUrl);
          } else {
            await del(`v2_track_cover_${t.id}`);
            restoredUrlMap.set(t.id, undefined);
          }
        } catch (e) {
          console.error(`Failed to restore cover for track ${t.id}`, e);
        }
      }));

      // Update React state for all target tracks
      const updateCover = (t: Track) => {
        if (restoredUrlMap.has(t.id)) {
          return { ...t, coverUrl: restoredUrlMap.get(t.id) };
        }
        return t;
      };
      setLibrary(prev => prev.map(updateCover));
      setPlaylists(prev => prev.map(p => ({ ...p, tracks: p.tracks.map(updateCover) })));
      setPlaybackQueue(prev => prev.map(updateCover));

      return targetTracks.length;
    } catch (err) {
      console.error('Failed to restore original artwork for list:', err);
      return false;
    }
  };

  const startEditTrack = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    setEditingTrackId(track.id);
    setEditTitle(track.title);
    setEditArtist(track.artist);
    setEditFileName(track.fileName);
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
      const rawTitle = metadata.common.title || '';
      const rawArtist = metadata.common.artist || metadata.common.albumartist || '';
      const rawAlbum = metadata.common.album || '';

      title = cleanAudioTag(rawTitle);
      artist = cleanAudioTag(rawArtist) || 'Unknown Artist';
      album = cleanAudioTag(rawAlbum) || 'Unknown Album';
      trackNumber = metadata.common.track?.no?.toString() || '';
      duration = metadata.format.duration || 0;

      const picture = metadata.common.picture?.[0];
      if (picture) {
        let mimeType = picture.format;
        if (!mimeType.startsWith('image/')) mimeType = `image/${mimeType}`;
        const coverBuffer = picture.data.buffer.slice(picture.data.byteOffset, picture.data.byteOffset + picture.data.byteLength);
        await set(`v2_track_cover_${trackId}`, { buffer: coverBuffer, type: mimeType });
        await set(`v2_track_original_cover_${trackId}`, { buffer: coverBuffer, type: mimeType });
        coverUrl = URL.createObjectURL(new Blob([coverBuffer], { type: mimeType }));
      }
    } catch (err) {
      console.error("Error reading metadata:", file.name, err);
    }

    // If title was missing or still looks like garbled mojibake, safely fall back to the clean filename
    if (!title || looksLikeMojibake(title)) {
      const parsed = parseFilename(file.name);
      title = parsed.title;
      if (artist === 'Unknown Artist' && parsed.artist !== 'Unknown Artist') {
        artist = parsed.artist;
      }
      if (!trackNumber && parsed.trackNumber) {
        trackNumber = parsed.trackNumber;
      }
    } else {
      title = normalizeZenkakuAlphanumeric(title);
    }
    artist = normalizeZenkakuAlphanumeric(artist);
    album = normalizeZenkakuAlphanumeric(album);

    // Deduce Album and Artist from Directory Structure (e.g. "Artist/Album/Song.mp3" or "Folder/Song.mp3")
    // Always prioritize the immediate folder name as the Album name so tracks in the same folder aren't split by varying MP3 album tags!
    const relPath = (file as any).webkitRelativePath || '';
    if (relPath) {
      const parts = relPath.split('/').filter(Boolean);
      // Immediate parent folder = Album
      if (parts.length >= 2) {
        album = parts[parts.length - 2];
      }
      // Grandparent folder = Artist (if not already set)
      if (parts.length >= 3 && (!artist || artist === 'Unknown Artist')) {
        artist = parts[parts.length - 3];
      }
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
      lastModified: file.lastModified,
      folderPath: relPath || undefined
    };
  };

  const processFiles = async (files: FileList | File[], targetPlaylistName?: string, targetCategory?: string) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsLoadingFiles(true);
    setLoadingProgress({ done: 0, total: fileArray.length });

    // Determine target category
    const effectiveCategory = targetCategory !== undefined 
      ? targetCategory 
      : (selectedCategoryFilter !== '__ALL__' && selectedCategoryFilter !== '__UNCATEGORIZED__' ? selectedCategoryFilter : undefined);

    if (effectiveCategory && !categories.includes(effectiveCategory)) {
      setCategories(prev => prev.includes(effectiveCategory) ? prev : [...prev, effectiveCategory]);
    }

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
         // Even if the audio file is already in the library, if the user dropped a parent folder,
         // ensure its folderPath is updated and it is added to the target parent folder playlist!
         const relPath = (file as any).webkitRelativePath || '';
         const matchedExisting = existingTracks.find(t => t.size === file.size && t.lastModified === file.lastModified) || existingTracks[0];
         if (matchedExisting && (targetPlaylistName || relPath)) {
           let updatedTrack = { ...matchedExisting };
           if (relPath && !updatedTrack.folderPath) {
             updatedTrack.folderPath = relPath;
             const parts = relPath.split('/').filter(Boolean);
             if (parts.length >= 2 && (!updatedTrack.album || updatedTrack.album === 'Unknown Album')) {
               updatedTrack.album = parts[parts.length - 2];
             }
             if (parts.length >= 3 && (!updatedTrack.artist || updatedTrack.artist === 'Unknown Artist')) {
               updatedTrack.artist = parts[parts.length - 3];
             }
             setLibrary(prev => prev.map(t => t.id === updatedTrack.id ? updatedTrack : t));
           }
           if (targetPlaylistName) {
             setPlaylists(prev => {
               let updatedPlaylists = [...prev];
               let existingPl = updatedPlaylists.find(p => p.name === targetPlaylistName);
               if (!existingPl) {
                 existingPl = { id: uuidv4(), name: targetPlaylistName, tracks: [], category: effectiveCategory };
                 updatedPlaylists.push(existingPl);
               } else if (effectiveCategory && !existingPl.category) {
                 existingPl = { ...existingPl, category: effectiveCategory };
                 const targetIdx = updatedPlaylists.findIndex(p => p.name === targetPlaylistName);
                 if (targetIdx !== -1) updatedPlaylists[targetIdx] = existingPl;
               }
               const targetId = existingPl.id;
               return updatedPlaylists.map(p => {
                 const refreshedTracks = p.tracks.map(t => t.id === updatedTrack.id ? updatedTrack : t);
                 if (p.id === targetId && !refreshedTracks.some(t => t.id === updatedTrack.id)) {
                   return { ...p, tracks: [...refreshedTracks, updatedTrack] };
                 }
                 return { ...p, tracks: refreshedTracks };
               });
             });
           }
         }
         setLoadingProgress({ done: i + 1, total: fileArray.length });
         continue;
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
              existing = { id: uuidv4(), name: targetPlaylistName, tracks: [], category: effectiveCategory };
              updatedPlaylists.push(existing);
            } else if (effectiveCategory && !existing.category) {
              existing = { ...existing, category: effectiveCategory };
              const targetIdx = updatedPlaylists.findIndex(p => p.name === targetPlaylistName);
              if (targetIdx !== -1) updatedPlaylists[targetIdx] = existing;
            }
            currentTargetId = existing.id;
          }

          return updatedPlaylists.map(p => {
            if (existingTrackToUpdate) {
               const idx = p.tracks.findIndex(t => t.id === existingTrackToUpdate!.id);
               if (idx !== -1) {
                  const newTracks = [...p.tracks];
                  newTracks[idx] = result;
                  if (p.id === currentTargetId && !newTracks.some(t => t.id === result.id)) {
                    newTracks.push(result);
                  }
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
      const fileArray = Array.from(e.target.files) as File[];
      if (fileInputRef.current) fileInputRef.current.value = '';

      const targetCat = (selectedCategoryFilter !== '__ALL__' && selectedCategoryFilter !== '__UNCATEGORIZED__')
        ? selectedCategoryFilter
        : undefined;

      // Group files by the top-level selected folder name so the entire parent folder (including all its album subfolders)
      // becomes a single item in the sidebar and unfolds all its subfolder albums inside the right pane!
      const folderGroups = new Map<string | undefined, File[]>();
      for (const file of fileArray) {
        const relPath = (file as any).webkitRelativePath || '';
        const parts = relPath.split('/').filter(Boolean);
        // parts[0] is the root directory selected by the user (e.g. "■ - T-SQUARE ベストアルバム集")
        const rootFolderName = parts.length >= 2 ? parts[0] : undefined;
        const list = folderGroups.get(rootFolderName) || [];
        list.push(file);
        folderGroups.set(rootFolderName, list);
      }

      for (const [playlistName, files] of Array.from(folderGroups.entries())) {
        if (files.length > 0) {
          await processFiles(files, playlistName, targetCat);
        }
      }
    }
  };

  const dragCounterRef = useRef(0);
  const dragTimeoutRef = useRef<any>(null);

  const resetDragOverState = () => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    dragCounterRef.current = 0;
    setIsDragOver(false);
    setDragOverPlaylistId(null);
    setDraggedPlaylistId(null);
    setDragOverCategoryTarget(null);
    setDraggedCategoryName(null);
    setDragOverCategoryReorderTarget(null);
    setCategoryDropPosition(null);
    setSidebarDragAlbum(null);
    setSidebarDragOverAlbum(null);
  };

  const isExternalFileDrag = (e: React.DragEvent | DragEvent) => {
    if (!e.dataTransfer) return false;
    const types = e.dataTransfer.types;
    if (!types) return false;
    return Array.from(types).includes('Files') || Array.from(types).includes('application/x-moz-file');
  };

  const handleDrop = async (e: React.DragEvent, dropTargetCategory?: string) => {
    e.preventDefault();
    e.stopPropagation();
    resetDragOverState();

    const targetCat = dropTargetCategory !== undefined
      ? dropTargetCategory
      : (selectedCategoryFilter !== '__ALL__' && selectedCategoryFilter !== '__UNCATEGORIZED__' ? selectedCategoryFilter : undefined);

    const items = e.dataTransfer.items;
    
    // Group files by the dropped top-level folder name so dropping "■ - T-SQUARE ベストアルバム集"
    // creates ONE folder entry in the sidebar containing all tracks from its subfolders,
    // while preserving each subfolder's path so they expand as distinct albums in the right view!
    const fileGroups = new Map<string | undefined, File[]>();

    // Try webkitGetAsEntry first (supports nested Artist / Album directories)
    if (items && items.length > 0) {
      let hasEntries = false;

      const traverseFileTree = async (item: any, rootFolderName?: string): Promise<void> => {
        if (item.isFile) {
          return new Promise<void>((resolve) => {
            item.file((file: File) => {
              if (item.fullPath) {
                const rel = item.fullPath.replace(/^\//, '');
                try {
                  Object.defineProperty(file, 'webkitRelativePath', {
                    value: rel,
                    writable: false,
                    configurable: true,
                  });
                } catch {
                  (file as any).webkitRelativePath = rel;
                }
              }
              const group = fileGroups.get(rootFolderName) || [];
              group.push(file);
              fileGroups.set(rootFolderName, group);
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
                    // Always pass down the top-level dropped folder name (rootFolderName || item.name)
                    await traverseFileTree(entry, rootFolderName || item.name);
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
              await processFiles(files, playlistName, targetCat);
           }
        }
        return;
      }
    }

    // Fallback: use dataTransfer.files directly
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files, undefined, targetCat);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isExternalFileDrag(e)) return;

    dragCounterRef.current += 1;
    setIsDragOver(true);

    if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
    dragTimeoutRef.current = setTimeout(() => {
      resetDragOverState();
    }, 1500);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isExternalFileDrag(e)) return;

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    if (!isDragOver) {
      setIsDragOver(true);
    }

    if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
    dragTimeoutRef.current = setTimeout(() => {
      resetDragOverState();
    }, 1500);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isExternalFileDrag(e)) return;

    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      resetDragOverState();
    }
  };

  // Global listeners to safely cancel drag & drop overlay when user drops outside, hits Esc, or cancels
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      resetDragOverState();
    };

    const handleGlobalDrop = () => {
      resetDragOverState();
    };

    const handleGlobalDragLeave = (e: DragEvent) => {
      // If pointer leaves the browser window
      if (!e.relatedTarget && (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) {
        resetDragOverState();
      }
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc' || e.code === 'Escape') {
        resetDragOverState();
      }
    };

    const handleGlobalPointerDown = () => {
      if (isDragOver) {
        resetDragOverState();
      }
    };

    window.addEventListener('dragend', handleGlobalDragEnd, true);
    window.addEventListener('drop', handleGlobalDrop, true);
    window.addEventListener('dragleave', handleGlobalDragLeave);
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    window.addEventListener('keyup', handleGlobalKeyDown, true);
    window.addEventListener('pointerdown', handleGlobalPointerDown, true);
    window.addEventListener('mousedown', handleGlobalPointerDown, true);

    return () => {
      window.removeEventListener('dragend', handleGlobalDragEnd, true);
      window.removeEventListener('drop', handleGlobalDrop, true);
      window.removeEventListener('dragleave', handleGlobalDragLeave);
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
      window.removeEventListener('keyup', handleGlobalKeyDown, true);
      window.removeEventListener('pointerdown', handleGlobalPointerDown, true);
      window.removeEventListener('mousedown', handleGlobalPointerDown, true);
    };
  }, [isDragOver]);

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
      
      if (activePlaylistId === 'all-tracks') {
        setLibrary(prev => prev.filter(t => !selectedTrackIds.has(t.id)));
      }

      setPlaylists(prev => prev.map(p => {
          if (p.id === activePlaylistId) {
              return { ...p, tracks: p.tracks.filter(t => !selectedTrackIds.has(t.id)) };
          }
          if (activePlaylistId === 'all-tracks') {
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
      lastSelectedTrackIdRef.current = null;
  };

  const toggleTrackSelection = (e: React.MouseEvent, trackId: string, index?: number) => {
      e.stopPropagation();
      const isShift = e.shiftKey;
      const currentList = drillDownAlbum ? drillDownTracks : displayTracks;
      
      if (isShift) {
        e.preventDefault();
        window.getSelection()?.removeAllRanges();

        const currentIndex = index !== undefined && index >= 0 && index < currentList.length && currentList[index].id === trackId
          ? index 
          : currentList.findIndex(t => t.id === trackId);

        let anchorIndex = -1;
        if (lastSelectedTrackIdRef.current) {
          const found = currentList.findIndex(t => t.id === lastSelectedTrackIdRef.current);
          if (found !== -1) anchorIndex = found;
        }
        if (anchorIndex === -1) {
          const firstSelected = currentList.findIndex(t => selectedTrackIds.has(t.id));
          if (firstSelected !== -1) {
            anchorIndex = firstSelected;
            lastSelectedTrackIdRef.current = currentList[firstSelected]?.id || null;
          } else {
            anchorIndex = currentIndex !== -1 ? currentIndex : 0;
            lastSelectedTrackIdRef.current = currentList[anchorIndex]?.id || trackId;
          }
        }

        if (currentIndex !== -1 && anchorIndex !== -1) {
          const start = Math.min(anchorIndex, currentIndex);
          const end = Math.max(anchorIndex, currentIndex);
          const rangeIds = new Set<string>();
          if (e.ctrlKey || e.metaKey) {
            selectedTrackIds.forEach(id => rangeIds.add(id));
          }
          for (let i = start; i <= end; i++) {
            if (currentList[i]) {
              rangeIds.add(currentList[i].id);
            }
          }
          setSelectedTrackIds(rangeIds);
          if (!lastSelectedTrackIdRef.current) {
            lastSelectedTrackIdRef.current = currentList[anchorIndex]?.id || trackId;
          }
          return;
        }
      }

      if (e.ctrlKey || e.metaKey) {
        setSelectedTrackIds(prev => {
          const next = new Set(prev);
          if (next.has(trackId)) next.delete(trackId);
          else next.add(trackId);
          return next;
        });
        lastSelectedTrackIdRef.current = trackId;
        return;
      }

      setSelectedTrackIds(prev => {
        const next = new Set(prev);
        if (next.has(trackId)) next.delete(trackId);
        else next.add(trackId);
        return next;
      });
      lastSelectedTrackIdRef.current = trackId;
  };

  useEffect(() => {
    setSelectedTrackIds(new Set());
    lastSelectedTrackIdRef.current = null;
  }, [activePlaylistId]);

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
    const list = drillDownAlbum ? drillDownTracks : displayTracks;
    const trackToPlay = list[index];
    if (!trackToPlay) return;

    // If already playing this track from the same view, just toggle
    if (currentTrack?.id === trackToPlay.id && playingPlaylistId === activePlaylistId) {
      togglePlay();
      return;
    }

    // Snapshot the current view as the playback queue
    setPlaybackQueue(list);
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
      const targetCat = (selectedCategoryFilter !== '__ALL__' && selectedCategoryFilter !== '__UNCATEGORIZED__')
        ? selectedCategoryFilter
        : undefined;
      const newPlaylist: Playlist = { 
        id: uuidv4(), 
        name: newPlaylistName.trim().toUpperCase(), 
        tracks: [],
        category: targetCat
      };
      setPlaylists([playlists[0], newPlaylist, ...playlists.slice(1)]);
      setActivePlaylistId(newPlaylist.id);
    }
    setIsCreatingPlaylist(false);
    setNewPlaylistName('');
  };

  const cycleTheme = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setThemeIndex((prev) => {
      const next = (prev + 1) % THEMES.length;
      try {
        localStorage.setItem('v2_solidThemeId', THEMES[next].id);
      } catch {}
      return next;
    });
  };

  // --- Category Handlers ---
  const handleCreateCategory = (nameToCreate?: string) => {
    const raw = (nameToCreate !== undefined ? nameToCreate : newCategoryName).trim();
    if (!raw) {
      setIsCreatingCategory(false);
      setNewCategoryName('');
      return;
    }
    const cleanName = normalizeZenkakuAlphanumeric(raw);
    if (!categories.includes(cleanName)) {
      setCategories(prev => [...prev, cleanName]);
      setExpandedCategoryNames(prev => new Set([...prev, cleanName]));
      setSelectedCategoryFilter(cleanName);
    }
    setIsCreatingCategory(false);
    setNewCategoryName('');
  };

  const handleRenameCategory = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setRenamingCategoryName(null);
      return;
    }
    const cleanName = normalizeZenkakuAlphanumeric(trimmed);
    setCategories(prev => prev.map(c => c === oldName ? cleanName : c));
    setPlaylists(prev => prev.map(p => p.category === oldName ? { ...p, category: cleanName } : p));
    setExpandedCategoryNames(prev => {
      const next = new Set(prev);
      if (next.has(oldName)) {
        next.delete(oldName);
        next.add(cleanName);
      }
      return next;
    });
    if (selectedCategoryFilter === oldName) {
      setSelectedCategoryFilter(cleanName);
    }
    setRenamingCategoryName(null);
  };

  const handleDeleteCategory = (catToDelete: string) => {
    // Belonging playlists safely revert to Uncategorized
    setCategories(prev => prev.filter(c => c !== catToDelete));
    setPlaylists(prev => prev.map(p => p.category === catToDelete ? { ...p, category: undefined } : p));
    setExpandedCategoryNames(prev => {
      const next = new Set(prev);
      next.delete(catToDelete);
      return next;
    });
    if (selectedCategoryFilter === catToDelete) {
      setSelectedCategoryFilter('__ALL__');
    }
    setConfirmDeleteCategoryName(null);
  };

  const handleMovePlaylistToCategory = (playlistId: string, targetCat: string | undefined) => {
    setPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, category: targetCat } : p));
    setActiveCategoryMenuPlaylistId(null);
    setSelectedPlaylistIds(new Set());
    setIsPlaylistSelectionMode(false);
    lastSelectedPlaylistIdRef.current = null;
  };

  const moveSelectedPlaylistsToCategory = (targetCat: string | undefined) => {
    if (selectedPlaylistIds.size === 0) return;
    setPlaylists(prev => prev.map(p => selectedPlaylistIds.has(p.id) ? { ...p, category: targetCat } : p));
    setSelectedPlaylistIds(new Set());
    lastSelectedPlaylistIdRef.current = null;
    setShowBatchMoveCategoryModal(false);
  };

  const toggleCategoryExpand = (catName: string) => {
    setExpandedCategoryNames(prev => {
      const next = new Set(prev);
      if (next.has(catName)) {
        next.delete(catName);
      } else {
        next.add(catName);
      }
      try {
        localStorage.setItem('v2_solid_expandedCategoryNames', JSON.stringify(Array.from(next)));
        localStorage.setItem('v2_solid_tree_expand_stage', 'custom');
      } catch {}
      return next;
    });
  };

  const handlePlaylistDropOnCategory = (e: React.DragEvent, targetCategory: string | undefined) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCategoryTarget(null);
    setDragOverPlaylistId(null);

    if (!draggedPlaylistId || draggedPlaylistId === 'all-tracks') return;

    setPlaylists(prev => prev.map(p => {
      if (p.id === draggedPlaylistId || selectedPlaylistIds.has(p.id)) {
        return { ...p, category: targetCategory };
      }
      return p;
    }));
    setSelectedPlaylistIds(new Set());
    lastSelectedPlaylistIdRef.current = null;
    setDraggedPlaylistId(null);
  };

  const handleCategoryFolderDrop = async (e: React.DragEvent, catName: string | undefined) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCategoryTarget(null);
    setIsDragOver(false);

    if (draggedPlaylistId) {
      handlePlaylistDropOnCategory(e, catName);
      return;
    }

    await handleDrop(e, catName);
  };

  // --- Category Reorder Drag and Drop ---
  const handleCategoryDragStart = (e: React.DragEvent, cat: string) => {
    if (renamingCategoryName === cat) {
      e.preventDefault();
      return;
    }
    setDraggedCategoryName(cat);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('application/x-solid-category', cat);
      e.dataTransfer.setData('text/plain', cat);
    } catch {}
  };

  const handleCategoryDragOverForReorder = (e: React.DragEvent, cat: string) => {
    if (!draggedCategoryName) return;
    e.preventDefault();
    e.stopPropagation();
    if (draggedCategoryName === cat) {
      setDragOverCategoryReorderTarget(null);
      setCategoryDropPosition(null);
      return;
    }
    e.dataTransfer.dropEffect = 'move';
    setDragOverCategoryReorderTarget(cat);
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const pos = relY < rect.height / 2 ? 'above' : 'below';
    setCategoryDropPosition(pos);
  };

  const handleCategoryDropForReorder = (e: React.DragEvent, targetCat: string) => {
    if (!draggedCategoryName) return;
    e.preventDefault();
    e.stopPropagation();

    const sourceCat = draggedCategoryName;
    const pos = categoryDropPosition || 'above';

    setDraggedCategoryName(null);
    setDragOverCategoryReorderTarget(null);
    setCategoryDropPosition(null);

    if (sourceCat === targetCat) return;

    setCategories(prev => {
      const copy = [...prev];
      const fromIdx = copy.indexOf(sourceCat);
      if (fromIdx === -1) return prev;
      copy.splice(fromIdx, 1);

      let toIdx = copy.indexOf(targetCat);
      if (toIdx === -1) return prev;
      if (pos === 'below') toIdx += 1;
      copy.splice(toIdx, 0, sourceCat);

      try {
        set('v2_solidCategories', copy).catch(console.error);
      } catch {}

      return copy;
    });
  };

  const handleCategoryDragEnd = () => {
    setDraggedCategoryName(null);
    setDragOverCategoryReorderTarget(null);
    setCategoryDropPosition(null);
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
    if (!draggedPlaylistId || id === 'all-tracks' || id === draggedPlaylistId) {
      if (dragOverPlaylistId !== null) setDragOverPlaylistId(null);
      return;
    }
    e.dataTransfer.dropEffect = 'move';
    setDragOverPlaylistId(id);
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
    setDragOverCategoryTarget(null);
    setDraggedCategoryName(null);
    setDragOverCategoryReorderTarget(null);
    setCategoryDropPosition(null);
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

  const moveSelectedPlaylists = (direction: 'top' | 'up' | 'down' | 'bottom') => {
    setPlaylists(prev => {
      const allTracksPl = prev[0];
      const otherPlaylists = prev.slice(1);

      if (direction === 'top') {
        const selected = otherPlaylists.filter(p => selectedPlaylistIds.has(p.id));
        const unselected = otherPlaylists.filter(p => !selectedPlaylistIds.has(p.id));
        return [allTracksPl, ...selected, ...unselected];
      }
      if (direction === 'bottom') {
        const selected = otherPlaylists.filter(p => selectedPlaylistIds.has(p.id));
        const unselected = otherPlaylists.filter(p => !selectedPlaylistIds.has(p.id));
        return [allTracksPl, ...unselected, ...selected];
      }

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

  // --- Track Ordering (Supports both full playlist view and single-album drillDownAlbum view) ---
  const moveTrack = (e: React.MouseEvent, fromIndex: number, toIndex: number) => {
    e.stopPropagation();

    // Reset column sorting so manual ordering takes effect
    setSortConfig({ key: 'none', direction: 'asc' });

    const currentRenderList = drillDownAlbum ? drillDownTracks : displayTracks;
    if (toIndex < 0) toIndex = 0;
    if (toIndex >= currentRenderList.length) toIndex = currentRenderList.length - 1;
    if (fromIndex === toIndex) return;

    const playingTrackId = playbackQueue[currentTrackIndex]?.id;

    if (drillDownAlbum) {
      // Reorder within the drilled-down album while keeping the album's position in the parent playlist intact
      const reorderedSub = [...currentRenderList];
      const [itemMove] = reorderedSub.splice(fromIndex, 1);
      reorderedSub.splice(toIndex, 0, itemMove);
      const subIdSet = new Set(currentRenderList.map(t => t.id));

      setPlaylists(prev => prev.map(p => {
        if (p.id !== activePlaylistId) return p;
        let subCursor = 0;
        const newTracks = p.tracks.map(t => {
          if (subIdSet.has(t.id)) {
            return reorderedSub[subCursor++];
          }
          return t;
        });
        return { ...p, tracks: newTracks };
      }));

      if (activePlaylistId === playingPlaylistId) {
        setPlaybackQueue(prevQueue => {
          let subCursor = 0;
          const newQueue = prevQueue.map(t => {
            if (subIdSet.has(t.id) && subCursor < reorderedSub.length) {
              return reorderedSub[subCursor++];
            }
            return t;
          });
          if (playingTrackId) {
            const newIdx = newQueue.findIndex(t => t.id === playingTrackId);
            if (newIdx !== -1) setCurrentTrackIndex(newIdx);
          }
          return newQueue;
        });
      }
      return;
    }

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

  const currentRenderList = drillDownAlbum ? drillDownTracks : displayTracks;
  const canMoveSelectedTop = useMemo(() => {
    if (selectedTrackIds.size === 0) return false;
    return !currentRenderList.slice(0, selectedTrackIds.size).every(t => selectedTrackIds.has(t.id));
  }, [currentRenderList, selectedTrackIds]);

  const canMoveSelectedBottom = useMemo(() => {
    if (selectedTrackIds.size === 0) return false;
    return !currentRenderList.slice(currentRenderList.length - selectedTrackIds.size).every(t => selectedTrackIds.has(t.id));
  }, [currentRenderList, selectedTrackIds]);

  const canMoveSelectedUp = useMemo(() => {
    if (selectedTrackIds.size === 0) return false;
    return currentRenderList.some((t, i) => i > 0 && selectedTrackIds.has(t.id) && !selectedTrackIds.has(currentRenderList[i - 1].id));
  }, [currentRenderList, selectedTrackIds]);

  const canMoveSelectedDown = useMemo(() => {
    if (selectedTrackIds.size === 0) return false;
    return currentRenderList.some((t, i) => i < currentRenderList.length - 1 && selectedTrackIds.has(t.id) && !selectedTrackIds.has(currentRenderList[i + 1].id));
  }, [currentRenderList, selectedTrackIds]);

  // Move multiple selected tracks together: Top, Up, Down, Bottom (Supports both full playlist and drillDownAlbum)
  const moveSelectedTracks = (direction: 'top' | 'up' | 'down' | 'bottom') => {
    if (selectedTrackIds.size === 0) return;

    // Reset column sorting so custom manual ordering takes direct effect
    setSortConfig({ key: 'none', direction: 'asc' });

    const playingTrackId = playbackQueue[currentTrackIndex]?.id;

    const applyDirection = (tracks: Track[]): Track[] => {
      if (direction === 'top') {
        const selected = tracks.filter(t => selectedTrackIds.has(t.id));
        const unselected = tracks.filter(t => !selectedTrackIds.has(t.id));
        return [...selected, ...unselected];
      } else if (direction === 'bottom') {
        const selected = tracks.filter(t => selectedTrackIds.has(t.id));
        const unselected = tracks.filter(t => !selectedTrackIds.has(t.id));
        return [...unselected, ...selected];
      } else if (direction === 'up') {
        const newTracks = [...tracks];
        for (let i = 1; i < newTracks.length; i++) {
          if (selectedTrackIds.has(newTracks[i].id) && !selectedTrackIds.has(newTracks[i - 1].id)) {
            const temp = newTracks[i];
            newTracks[i] = newTracks[i - 1];
            newTracks[i - 1] = temp;
          }
        }
        return newTracks;
      } else {
        const newTracks = [...tracks];
        for (let i = newTracks.length - 2; i >= 0; i--) {
          if (selectedTrackIds.has(newTracks[i].id) && !selectedTrackIds.has(newTracks[i + 1].id)) {
            const temp = newTracks[i];
            newTracks[i] = newTracks[i + 1];
            newTracks[i + 1] = temp;
          }
        }
        return newTracks;
      }
    };

    if (drillDownAlbum) {
      const subIdSet = new Set(drillDownTracks.map(t => t.id));
      const reorderedSub = applyDirection(drillDownTracks);

      setPlaylists(prev => prev.map(p => {
        if (p.id !== activePlaylistId) return p;
        let subCursor = 0;
        const newTracks = p.tracks.map(t => subIdSet.has(t.id) ? reorderedSub[subCursor++] : t);
        return { ...p, tracks: newTracks };
      }));

      if (activePlaylistId === playingPlaylistId) {
        setPlaybackQueue(prevQueue => {
          let subCursor = 0;
          const newQueue = prevQueue.map(t => (subIdSet.has(t.id) && subCursor < reorderedSub.length) ? reorderedSub[subCursor++] : t);
          if (playingTrackId) {
            const newIdx = newQueue.findIndex(t => t.id === playingTrackId);
            if (newIdx !== -1) setCurrentTrackIndex(newIdx);
          }
          return newQueue;
        });
      }
      // Deselect after move
      setSelectedTrackIds(new Set());
      lastSelectedTrackIdRef.current = null;
      return;
    }

    if (activePlaylistId === 'all-tracks') {
      const reordered = applyDirection(displayTracks);
      setLibrary(reordered);
      setPlaylists(prev => prev.map(p => {
        if (p.id !== 'all-tracks') return p;
        return { ...p, tracks: reordered };
      }));
    } else {
      const reordered = applyDirection(displayTracks);
      setPlaylists(prev => {
        return prev.map(p => {
          if (p.id !== activePlaylistId) return p;
          const reorderedIdSet = new Set(reordered.map(t => t.id));
          const remaining = p.tracks.filter(t => !reorderedIdSet.has(t.id));
          return { ...p, tracks: [...reordered, ...remaining] };
        });
      });
    }

    if (activePlaylistId === playingPlaylistId) {
      setPlaybackQueue(prevQueue => {
        const newQueue = applyDirection(prevQueue);
        if (playingTrackId) {
          const newIdx = newQueue.findIndex(t => t.id === playingTrackId);
          if (newIdx !== -1) {
            setCurrentTrackIndex(newIdx);
          }
        }
        return newQueue;
      });
    }
    // Deselect after move
    setSelectedTrackIds(new Set());
    lastSelectedTrackIdRef.current = null;
  };

  // --- Album Ordering (Top, Up, Down, Bottom & Drag-and-Drop) ---
  const applyReorderedAlbumsToPlaylist = (targetPlaylistId: string, reorderedAlbums: AlbumGroup[]) => {
    setSortConfig({ key: 'none', direction: 'asc' });
    const playingTrackId = playbackQueue[currentTrackIndex]?.id;

    // Flatten tracks in the new album order
    const orderedTracks = reorderedAlbums.flatMap(a => a.tracks);
    const orderedIds = new Set(orderedTracks.map(t => t.id));

    setPlaylists(prev => prev.map(p => {
      if (p.id !== targetPlaylistId) return p;
      const remaining = p.tracks.filter(t => !orderedIds.has(t.id));
      return { ...p, tracks: [...orderedTracks, ...remaining] };
    }));

    if (targetPlaylistId === playingPlaylistId) {
      setPlaybackQueue(prevQueue => {
        const remaining = prevQueue.filter(t => !orderedIds.has(t.id));
        const newQueue = [...orderedTracks, ...remaining];
        if (playingTrackId) {
          const newIdx = newQueue.findIndex(t => t.id === playingTrackId);
          if (newIdx !== -1) setCurrentTrackIndex(newIdx);
        }
        return newQueue;
      });
    }
  };

  const handleMoveAlbum = (albumId: string, direction: 'top' | 'up' | 'down' | 'bottom', targetPlaylistId: string = activePlaylistId) => {
    const currentAlbums = targetPlaylistId === activePlaylistId
      ? albumGroups
      : (playlistAlbumsMap[targetPlaylistId] || []);
    const idx = currentAlbums.findIndex(a => a.id === albumId);
    if (idx === -1) return;

    const copy = [...currentAlbums];
    const [target] = copy.splice(idx, 1);

    if (direction === 'top') {
      copy.unshift(target);
    } else if (direction === 'bottom') {
      copy.push(target);
    } else if (direction === 'up') {
      const nextIdx = Math.max(0, idx - 1);
      copy.splice(nextIdx, 0, target);
    } else if (direction === 'down') {
      const nextIdx = Math.min(copy.length, idx + 1);
      copy.splice(nextIdx, 0, target);
    }

    applyReorderedAlbumsToPlaylist(targetPlaylistId, copy);
  };

  const handleReorderAlbum = (sourceAlbumId: string, targetAlbumId: string, targetPlaylistId: string = activePlaylistId) => {
    if (sourceAlbumId === targetAlbumId) return;
    const currentAlbums = targetPlaylistId === activePlaylistId
      ? albumGroups
      : (playlistAlbumsMap[targetPlaylistId] || []);
    const fromIdx = currentAlbums.findIndex(a => a.id === sourceAlbumId);
    const toIdx = currentAlbums.findIndex(a => a.id === targetAlbumId);
    if (fromIdx === -1 || toIdx === -1) return;

    const copy = [...currentAlbums];
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);

    applyReorderedAlbumsToPlaylist(targetPlaylistId, copy);
  };

  // --- Album Card View Handlers ---
  const handlePlayAlbumTrack = async (track: Track, album: AlbumGroup) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
      return;
    }
    setPlayingPlaylistId(activePlaylistId);
    setPlaybackQueue(album.tracks);
    const trackIndex = album.tracks.findIndex(t => t.id === track.id);
    const targetIdx = trackIndex !== -1 ? trackIndex : 0;
    setCurrentTrackIndex(targetIdx);
    setIsPlaying(true);

    let playUrl = track.url;
    if (!playUrl && !track.missing) {
      try {
        const audioData = await get(`v2_track_audio_${track.id}`);
        if (audioData && audioData.buffer) {
          const memoryBlob = new Blob([audioData.buffer], { type: audioData.type });
          playUrl = URL.createObjectURL(memoryBlob);
          const updateTrack = (t: Track) => t.id === track.id ? { ...t, url: playUrl } : t;
          setLibrary(prev => prev.map(updateTrack));
          setPlaylists(prev => prev.map(p => ({ ...p, tracks: p.tracks.map(updateTrack) })));
          setPlaybackQueue(prev => prev.map(updateTrack));
        }
      } catch (err) {
        console.error('Error loading audio from IDB:', err);
      }
    }

    if (audioRef.current && playUrl) {
      audioRef.current.src = playUrl;
      audioRef.current.play().catch(console.error);
    }
  };

  const handlePlayAlbum = async (album: AlbumGroup) => {
    if (album.tracks.length === 0) return;
    const isThisAlbumActive = currentTrack && album.tracks.some(t => t.id === currentTrack.id);
    if (isThisAlbumActive) {
      togglePlay();
      return;
    }
    setPlayingPlaylistId(activePlaylistId);
    setPlaybackQueue(album.tracks);
    setCurrentTrackIndex(0);
    setIsPlaying(true);
    const firstTrack = album.tracks[0];
    let playUrl = firstTrack.url;
    if (!playUrl && !firstTrack.missing) {
      try {
        const audioData = await get(`v2_track_audio_${firstTrack.id}`);
        if (audioData && audioData.buffer) {
          const memoryBlob = new Blob([audioData.buffer], { type: audioData.type });
          playUrl = URL.createObjectURL(memoryBlob);
          const updateTrack = (t: Track) => t.id === firstTrack.id ? { ...t, url: playUrl } : t;
          setLibrary(prev => prev.map(updateTrack));
          setPlaylists(prev => prev.map(p => ({ ...p, tracks: p.tracks.map(updateTrack) })));
          setPlaybackQueue(prev => prev.map(updateTrack));
        }
      } catch (err) {
        console.error('Error loading audio from IDB:', err);
      }
    }
    if (audioRef.current && playUrl) {
      audioRef.current.src = playUrl;
      audioRef.current.play().catch(console.error);
    }
  };

  const handlePlayArtist = async (artist: ArtistGroup) => {
    const allTracks = artist.albums.flatMap(a => a.tracks);
    if (allTracks.length === 0) return;
    const isThisArtistActive = currentTrack && allTracks.some(t => t.id === currentTrack.id);
    if (isThisArtistActive) {
      togglePlay();
      return;
    }
    setPlayingPlaylistId(activePlaylistId);
    setPlaybackQueue(allTracks);
    setCurrentTrackIndex(0);
    setIsPlaying(true);
    const firstTrack = allTracks[0];
    let playUrl = firstTrack.url;
    if (!playUrl && !firstTrack.missing) {
      try {
        const audioData = await get(`v2_track_audio_${firstTrack.id}`);
        if (audioData && audioData.buffer) {
          const memoryBlob = new Blob([audioData.buffer], { type: audioData.type });
          playUrl = URL.createObjectURL(memoryBlob);
          const updateTrack = (t: Track) => t.id === firstTrack.id ? { ...t, url: playUrl } : t;
          setLibrary(prev => prev.map(updateTrack));
          setPlaylists(prev => prev.map(p => ({ ...p, tracks: p.tracks.map(updateTrack) })));
          setPlaybackQueue(prev => prev.map(updateTrack));
        }
      } catch (err) {
        console.error('Error loading audio from IDB:', err);
      }
    }
    if (audioRef.current && playUrl) {
      audioRef.current.src = playUrl;
      audioRef.current.play().catch(console.error);
    }
  };

  const handleOpenAlbum = (album: AlbumGroup) => {
    setDrillDownAlbum({ artist: album.artist, album: album.album });
    setSelectedTrackIds(new Set());
    setBankViewMode('tracks');
    localStorage.setItem('v2_solid_bank_view_mode', 'tracks');
  };

  // Move one or more tracks into a specific target AlbumGroup within the current playlist/library
  const handleMoveTracksToAlbum = (trackIds: string[], targetAlbum: AlbumGroup | { album: string; artist?: string; coverUrl?: string }) => {
    if (trackIds.length === 0 || !targetAlbum) return;
    const targetSet = new Set(trackIds);
    const newAlbumName = targetAlbum.album.trim();
    const newArtistName = targetAlbum.artist?.trim();

    // Derive target folderPath prefix from an existing track in the target album so getTrackAlbumArtist groups it seamlessly
    const existingTargetTracks = (targetAlbum as AlbumGroup).tracks || [];
    const refTrack = existingTargetTracks.find(t => !targetSet.has(t.id)) || existingTargetTracks[0];
    let refFolderPrefix: string | null = null;
    if (refTrack && refTrack.folderPath) {
      const parts = refTrack.folderPath.split('/').filter(Boolean);
      if (parts.length >= 2) {
        refFolderPrefix = parts.slice(0, parts.length - 1).join('/');
      }
    }

    const updateTrackToTargetAlbum = (t: Track): Track => {
      if (!targetSet.has(t.id)) return t;
      let nextFolderPath = t.folderPath;
      if (refFolderPrefix) {
        nextFolderPath = `${refFolderPrefix}/${t.fileName}`;
      } else if (activePlaylist && activePlaylistId !== 'all-tracks') {
        nextFolderPath = `${activePlaylist.name.trim()}/${newAlbumName}/${t.fileName}`;
      } else {
        nextFolderPath = `${newArtistName || t.artist || 'Artist'}/${newAlbumName}/${t.fileName}`;
      }
      return {
        ...t,
        album: newAlbumName,
        artist: (!t.artist || t.artist === 'Unknown Artist') && newArtistName ? newArtistName : t.artist,
        folderPath: nextFolderPath,
        coverUrl: t.coverUrl || targetAlbum.coverUrl,
      };
    };

    setLibrary(prev => prev.map(updateTrackToTargetAlbum));
    setPlaylists(prev => prev.map(p => ({
      ...p,
      tracks: p.tracks.map(updateTrackToTargetAlbum),
    })));
    setPlaybackQueue(prev => prev.map(updateTrackToTargetAlbum));
    setShowMoveToAlbum(false);
    setSelectedTrackIds(new Set());
    lastSelectedTrackIdRef.current = null;
  };

  // One-click unify all tracks in the currently active playlist into a single album named after the folder/playlist
  const handleUnifyPlaylistAlbum = () => {
    if (activePlaylistId === 'all-tracks' || !activePlaylist) return;
    const unifiedAlbumName = activePlaylist.name.trim();
    const targetTrackIds = new Set(activePlaylist.tracks.map(t => t.id));
    if (targetTrackIds.size === 0) return;

    const updateTrackAlbum = (t: Track): Track => {
      if (!targetTrackIds.has(t.id)) return t;
      return {
        ...t,
        album: unifiedAlbumName,
        folderPath: `${unifiedAlbumName}/${t.fileName}`,
      };
    };

    setLibrary(prev => prev.map(updateTrackAlbum));
    setPlaylists(prev => prev.map(p => ({
      ...p,
      tracks: p.tracks.map(updateTrackAlbum),
    })));
    setPlaybackQueue(prev => prev.map(updateTrackAlbum));
    setDrillDownAlbum(null);
  };

  // Delete an entire AlbumGroup from the target playlist (or everywhere if targetPlaylistId === 'all-tracks')
  const handleDeleteAlbum = (album: AlbumGroup, targetPlaylistId: string = activePlaylistId) => {
    const albumTrackIds = new Set(album.tracks.map(t => t.id));
    if (albumTrackIds.size === 0) return;

    if (targetPlaylistId === 'all-tracks') {
      setLibrary(prev => prev.filter(t => !albumTrackIds.has(t.id)));
      setPlaylists(prev => prev.map(p => ({
        ...p,
        tracks: p.tracks.filter(t => !albumTrackIds.has(t.id)),
      })));
    } else {
      setPlaylists(prev => prev.map(p => {
        if (p.id !== targetPlaylistId) return p;
        return {
          ...p,
          tracks: p.tracks.filter(t => !albumTrackIds.has(t.id)),
        };
      }));
    }

    // Stop playback if the currently playing track belonged to the deleted album
    const playingTrack = playbackQueue[currentTrackIndex];
    if (playingTrack && albumTrackIds.has(playingTrack.id) && (targetPlaylistId === 'all-tracks' || playingPlaylistId === targetPlaylistId)) {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setCurrentTrackIndex(-1);
    }

    if (drillDownAlbum && drillDownAlbum.album.toLowerCase() === album.album.toLowerCase()) {
      setDrillDownAlbum(null);
    }
    setSelectedTrackIds(prev => {
      const next = new Set(prev);
      albumTrackIds.forEach(id => next.delete(id));
      return next;
    });
    setConfirmDeleteSubAlbumKey(null);
  };

  // Delete multiple AlbumGroups from the target playlist (or everywhere if targetPlaylistId === 'all-tracks')
  const handleDeleteMultipleAlbums = (albumsToDelete: AlbumGroup[], targetPlaylistId: string = activePlaylistId) => {
    if (albumsToDelete.length === 0) return;
    const allTrackIds = new Set<string>();
    albumsToDelete.forEach(a => a.tracks.forEach(t => allTrackIds.add(t.id)));
    if (allTrackIds.size === 0) return;

    if (targetPlaylistId === 'all-tracks') {
      setLibrary(prev => prev.filter(t => !allTrackIds.has(t.id)));
      setPlaylists(prev => prev.map(p => ({
        ...p,
        tracks: p.tracks.filter(t => !allTrackIds.has(t.id)),
      })));
    } else {
      setPlaylists(prev => prev.map(p => {
        if (p.id !== targetPlaylistId) return p;
        return {
          ...p,
          tracks: p.tracks.filter(t => !allTrackIds.has(t.id)),
        };
      }));
    }

    // Stop playback if the currently playing track belonged to any deleted album
    const playingTrack = playbackQueue[currentTrackIndex];
    if (playingTrack && allTrackIds.has(playingTrack.id) && (targetPlaylistId === 'all-tracks' || playingPlaylistId === targetPlaylistId)) {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setCurrentTrackIndex(-1);
    }

    if (drillDownAlbum && albumsToDelete.some(a => a.album.toLowerCase() === drillDownAlbum.album.toLowerCase())) {
      setDrillDownAlbum(null);
    }
    setSelectedTrackIds(prev => {
      const next = new Set(prev);
      allTrackIds.forEach(id => next.delete(id));
      return next;
    });
    setConfirmDeleteSubAlbumKey(null);
  };

  // Rename a sidebar folder/playlist AND update single-folder album name if all tracks share one album
  const handleRenamePlaylist = (playlistId: string, rawNewName: string) => {
    const cleanNewName = rawNewName.trim();
    setRenamingPlaylistId(null);
    if (!cleanNewName || playlistId === 'all-tracks') return;

    const targetPl = playlists.find(p => p.id === playlistId);
    if (!targetPl || targetPl.name === cleanNewName) return;

    const subAlbums = playlistAlbumsMap[playlistId] || [];
    const isSingleAlbumFolder = subAlbums.length <= 1;
    const trackIdSet = new Set(targetPl.tracks.map(t => t.id));

    const updateTrackForPlaylistRename = (t: Track): Track => {
      if (!trackIdSet.has(t.id)) return t;
      let nextFolderPath = t.folderPath;
      if (t.folderPath) {
        const parts = t.folderPath.split('/').filter(Boolean);
        if (parts.length >= 3) {
          parts[0] = cleanNewName;
          nextFolderPath = parts.join('/');
        } else if (parts.length === 2) {
          parts[0] = cleanNewName;
          nextFolderPath = parts.join('/');
        }
      }
      return {
        ...t,
        album: isSingleAlbumFolder ? cleanNewName : t.album,
        folderPath: nextFolderPath,
      };
    };

    if (trackIdSet.size > 0) {
      setLibrary(prev => prev.map(updateTrackForPlaylistRename));
      setPlaybackQueue(prev => prev.map(updateTrackForPlaylistRename));
    }

    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        return {
          ...p,
          name: cleanNewName,
          tracks: p.tracks.map(updateTrackForPlaylistRename),
        };
      }
      return {
        ...p,
        tracks: p.tracks.map(updateTrackForPlaylistRename),
      };
    }));
  };

  // Rename an AlbumGroup (updates track.album, track.folderPath, and syncs single-album playlist name if applicable)
  const handleRenameAlbum = (album: AlbumGroup, rawNewName: string, targetPlaylistId: string = activePlaylistId) => {
    const cleanNewName = rawNewName.trim();
    setRenamingSubAlbumKey(null);
    setEditingDrillDownAlbum(false);
    if (!cleanNewName || cleanNewName === album.album) return;

    const albumTrackIds = new Set(album.tracks.map(t => t.id));
    if (albumTrackIds.size === 0) return;

    const targetPl = playlists.find(p => p.id === targetPlaylistId);
    const subAlbumsInPlaylist = targetPlaylistId !== 'all-tracks' ? (playlistAlbumsMap[targetPlaylistId] || []) : [];
    const shouldSyncPlaylistName =
      targetPl &&
      targetPlaylistId !== 'all-tracks' &&
      subAlbumsInPlaylist.length === 1;

    const updateTrackAlbumName = (t: Track): Track => {
      if (!albumTrackIds.has(t.id)) return t;
      let nextFolderPath = t.folderPath;
      if (t.folderPath) {
        const parts = t.folderPath.split('/').filter(Boolean);
        if (parts.length >= 3) {
          parts[parts.length - 2] = cleanNewName;
          nextFolderPath = parts.join('/');
        } else if (parts.length === 2) {
          if (shouldSyncPlaylistName) {
            parts[0] = cleanNewName;
            nextFolderPath = parts.join('/');
          } else {
            nextFolderPath = `${parts[0]}/${cleanNewName}/${parts[1]}`;
          }
        } else {
          nextFolderPath = `${cleanNewName}/${t.fileName}`;
        }
      } else {
        const parentPrefix = targetPl && targetPlaylistId !== 'all-tracks' && !shouldSyncPlaylistName
          ? `${targetPl.name.trim()}/${cleanNewName}`
          : cleanNewName;
        nextFolderPath = `${parentPrefix}/${t.fileName}`;
      }

      return {
        ...t,
        album: cleanNewName,
        folderPath: nextFolderPath,
      };
    };

    setLibrary(prev => prev.map(updateTrackAlbumName));
    setPlaylists(prev => prev.map(p => {
      const updatedTracks = p.tracks.map(updateTrackAlbumName);
      if (shouldSyncPlaylistName && p.id === targetPlaylistId) {
        return { ...p, name: cleanNewName, tracks: updatedTracks };
      }
      return { ...p, tracks: updatedTracks };
    }));
    setPlaybackQueue(prev => prev.map(updateTrackAlbumName));

    if (drillDownAlbum && drillDownAlbum.album.toLowerCase() === album.album.toLowerCase()) {
      setDrillDownAlbum({ ...drillDownAlbum, album: cleanNewName });
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
    '--app-font-family': activeFont.fontFamily,
    '--list-font-size': `${listFontSize}px`,
    '--list-font-size-sm': `${Math.max(8, listFontSize - 1)}px`,
    '--list-font-size-xs': `${Math.max(8, listFontSize - 2)}px`,
  } as React.CSSProperties;

  const tracksToRender = drillDownAlbum ? drillDownTracks : displayTracks;

  // --- UI Components ---
  const memoizedTrackList = React.useMemo(() => {
    return tracksToRender.map((track, idx) => {
      const isActive = (activePlaylistId === playingPlaylistId && currentTrackIndex === idx) || 
                       (currentTrack && track.id === currentTrack.id);
      const isSelected = selectedTrackIds.has(track.id);

      return (
        <div
          key={`${track.id}-${idx}`}
          id={`track-row-${track.id}`}
          onClick={(e) => {
            if (editingTrackId === track.id) return;
            if (e.shiftKey) {
              e.preventDefault();
              window.getSelection()?.removeAllRanges();
              toggleTrackSelection(e, track.id, idx);
            } else if (e.ctrlKey || e.metaKey) {
              toggleTrackSelection(e, track.id, idx);
            } else {
              if (!track.missing) playTrack(idx);
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
            <div 
              className="w-8 flex-shrink-0 flex items-center justify-center cursor-pointer" 
              onClick={(e) => toggleTrackSelection(e, track.id, idx)}
              title={isSelected ? "選択解除 (Shiftキーで範囲選択)" : "選択 (Shiftキーで範囲選択)"}
            >
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
                 value={editFileName}
                 onChange={e => setEditFileName(e.target.value)}
                 className="w-1/3 bg-transparent border-b outline-none font-mono"
                 style={{ borderColor: 'var(--theme-list-borderActive)', color: 'var(--theme-list-textMuted)', fontSize: 'var(--list-font-size-sm)' }}
                 placeholder="名前(ファイル名)"
                 onKeyDown={e => { if (e.key === 'Enter') saveTrackEdit(track.id); }}
              />
              <button 
                type="button"
                onClick={() => {
                  const parsed = parseFilename(editFileName);
                  setEditTitle(parsed.title);
                  if (parsed.artist !== 'Unknown Artist' && (!editArtist || editArtist === 'Unknown Artist')) {
                    setEditArtist(parsed.artist);
                  }
                }}
                className="px-1.5 py-0.5 border rounded-[1px] hover:opacity-80 transition-opacity flex items-center gap-1 text-[8px] font-mono shrink-0 cursor-pointer"
                style={{ backgroundColor: 'var(--theme-list-surfaceLighter)', borderColor: 'var(--theme-list-borderActive)', color: 'var(--theme-accent)' }}
                title="ファイル名から綺麗なタイトルを生成してタイトル欄に反映します"
              >
                <FileText size={10} />
                <span>名前→タイトル</span>
              </button>
              <input
                 type="text"
                 value={editTitle}
                 onChange={e => setEditTitle(e.target.value)}
                 className="flex-1 bg-transparent border-b outline-none font-mono"
                 style={{ borderColor: 'var(--theme-list-borderActive)', color: 'var(--theme-list-textMain)', fontSize: 'var(--list-font-size)' }}
                 placeholder="タイトル"
                 autoFocus
                 onKeyDown={e => { if (e.key === 'Enter') saveTrackEdit(track.id); }}
              />
              <input
                 type="text"
                 value={editArtist}
                 onChange={e => setEditArtist(e.target.value)}
                 className="w-1/4 bg-transparent border-b outline-none font-mono"
                 style={{ borderColor: 'var(--theme-list-borderActive)', color: 'var(--theme-list-textMain)', fontSize: 'var(--list-font-size)' }}
                 placeholder="アーティスト"
                 onKeyDown={e => { if (e.key === 'Enter') saveTrackEdit(track.id); }}
              />
              <button onClick={() => saveTrackEdit(track.id)} className="px-1 cursor-pointer" title="保存" style={{ color: 'var(--theme-list-accent)' }}><Check size={12} /></button>
              <button title="Remove Artwork" onClick={(e) => removeArtwork(e, track.id)} className="px-1 cursor-pointer" style={{ color: 'var(--theme-list-textDim)' }}><Trash2 size={12} /></button>
              <button onClick={() => setEditingTrackId(null)} className="px-1 cursor-pointer" title="キャンセル" style={{ color: 'var(--theme-list-textDim)' }}><X size={12} /></button>
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
            <div className="w-28 flex-shrink-0 flex items-center justify-end gap-1 transition-opacity pr-2">
              {editingTrackId !== track.id && (
                <>
                  <button onClick={(e) => startEditTrack(e, track)} title="タイトル・名前(データ名)・アーティストを編集" className="w-5 h-5 flex items-center justify-center border rounded-[2px] transition-colors hover:opacity-80 active:scale-95 cursor-pointer" style={{ backgroundColor: 'var(--theme-list-accentMuted)', borderColor: 'var(--theme-list-borderActive)', color: listIconColor }}>
                    <Palette size={10} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleApplyFilenameToTitle(track.id); }} title="ファイル名から綺麗なタイトルを生成して反映" className="w-5 h-5 flex items-center justify-center border rounded-[2px] transition-colors hover:opacity-80 active:scale-95 cursor-pointer" style={{ backgroundColor: 'var(--theme-list-surfaceLighter)', borderColor: 'var(--theme-list-border)', color: listIconColor }}>
                    <FileText size={10} />
                  </button>
                </>
              )}
            {(() => {
              const isSelected = selectedTrackIds.has(track.id);
              const hasMultipleSelected = selectedTrackIds.size > 1;
              const isBatchRow = hasMultipleSelected && isSelected;

              const isTopBtnDisabled = isBatchRow ? !canMoveSelectedTop : idx === 0;
              const isUpBtnDisabled = isBatchRow ? !canMoveSelectedUp : idx === 0;
              const isDownBtnDisabled = isBatchRow ? !canMoveSelectedDown : idx === tracksToRender.length - 1;
              const isBottomBtnDisabled = isBatchRow ? !canMoveSelectedBottom : idx === tracksToRender.length - 1;

              return (
                <>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isBatchRow) {
                        moveSelectedTracks('top');
                      } else {
                        moveTrack(e, idx, 0);
                      }
                    }} 
                    title={isBatchRow ? `選択した${selectedTrackIds.size}曲を一括で一番上へ移動 (TOP)` : '一番上へ移動 (TOP)'} 
                    className="w-5 h-5 flex items-center justify-center border rounded-[2px] transition-colors hover:opacity-80 active:scale-95 disabled:opacity-20 cursor-pointer" 
                    disabled={isTopBtnDisabled} 
                    style={{ backgroundColor: isSelected ? 'var(--theme-accentMuted)' : 'var(--theme-list-surfaceLighter)', borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-list-border)', color: listIconColor }}
                  >
                    <ChevronsUp size={10} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isBatchRow) {
                        moveSelectedTracks('up');
                      } else {
                        moveTrack(e, idx, idx - 1);
                      }
                    }} 
                    title={isBatchRow ? `選択した${selectedTrackIds.size}曲を一括で一つ上へ移動 (UP)` : '一つ上へ移動 (UP)'} 
                    className="w-5 h-5 flex items-center justify-center border rounded-[2px] transition-colors hover:opacity-80 active:scale-95 disabled:opacity-20 cursor-pointer" 
                    disabled={isUpBtnDisabled} 
                    style={{ backgroundColor: isSelected ? 'var(--theme-accentMuted)' : 'var(--theme-list-surfaceLighter)', borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-list-border)', color: listIconColor }}
                  >
                    <ChevronUp size={10} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isBatchRow) {
                        moveSelectedTracks('down');
                      } else {
                        moveTrack(e, idx, idx + 1);
                      }
                    }} 
                    title={isBatchRow ? `選択した${selectedTrackIds.size}曲を一括で一つ下へ移動 (DOWN)` : '一つ下へ移動 (DOWN)'} 
                    className="w-5 h-5 flex items-center justify-center border rounded-[2px] transition-colors hover:opacity-80 active:scale-95 disabled:opacity-20 cursor-pointer" 
                    disabled={isDownBtnDisabled} 
                    style={{ backgroundColor: isSelected ? 'var(--theme-accentMuted)' : 'var(--theme-list-surfaceLighter)', borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-list-border)', color: listIconColor }}
                  >
                    <ChevronDown size={10} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isBatchRow) {
                        moveSelectedTracks('bottom');
                      } else {
                        moveTrack(e, idx, tracksToRender.length - 1);
                      }
                    }} 
                    title={isBatchRow ? `選択した${selectedTrackIds.size}曲を一括で一番下へ移動 (BOTTOM)` : '一番下へ移動 (BOTTOM)'} 
                    className="w-5 h-5 flex items-center justify-center border rounded-[2px] transition-colors hover:opacity-80 active:scale-95 disabled:opacity-20 cursor-pointer" 
                    disabled={isBottomBtnDisabled} 
                    style={{ backgroundColor: isSelected ? 'var(--theme-accentMuted)' : 'var(--theme-list-surfaceLighter)', borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-list-border)', color: listIconColor }}
                  >
                    <ChevronsDown size={10} />
                  </button>
                </>
              );
            })()}
          </div>
          )}
        </div>
      );
    });
  }, [tracksToRender, drillDownAlbum, drillDownTracks, displayTracks, activePlaylistId, playingPlaylistId, currentTrackIndex, currentTrack?.id, selectedTrackIds, editingTrackId, editTitle, editArtist, editFileName, listIconColor, activeSortConfig.key, colWidths, colVisibility]);

  // Replace old PanelBlock definition location
  return (
    <div 
      className="h-screen w-screen relative flex flex-col font-mono box-border overflow-hidden transition-colors duration-300"
      style={{ ...styleVars, backgroundColor: 'var(--theme-bg)', color: 'var(--theme-textMain)' }}
    >
      {/* Hidden Inputs */}
      <audio 
        ref={audioRef} 
        src={currentTrack?.url || undefined} 
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
                className="w-[660px] max-w-[95vw] rounded-xl flex items-center overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)] border p-2 gap-4 pointer-events-auto" 
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
      <div className={`flex flex-col h-full w-full ${isFullscreen ? 'p-1.5 gap-3' : 'p-4 gap-6'} box-border transition-all duration-300 ${viewMode !== 'full' ? 'opacity-0 pointer-events-none absolute' : 'opacity-100 relative'}`}>

      {/* Top Header Row */}
      <header className="flex justify-between items-center px-1 relative z-50">
        <div className="flex items-center gap-3">
          <Activity size={18} style={{ color: 'var(--theme-accent)' }} />
          <h1 className="text-xl font-bold tracking-widest uppercase">SOLID AUDIO MUSIC PLAYER</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            {/* Full Screen Toggle Button */}
            <button 
              onClick={toggleFullscreen}
              className="flex items-center justify-center border h-6 px-2 transition-colors hover:opacity-80"
              style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)', color: isFullscreen ? 'var(--theme-accent)' : 'var(--theme-textMuted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--theme-textMain)'}
              onMouseLeave={e => e.currentTarget.style.color = isFullscreen ? 'var(--theme-accent)' : 'var(--theme-textMuted)'}
              title={isFullscreen ? "Full Screen 解除 (閉じる)" : "Full Screen 表示"}
            >
              {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>

            {/* Card Mode Button */}
            <button 
              onClick={() => setViewMode('mini')}
              className="flex items-center justify-center border h-6 px-2 transition-colors hover:opacity-80"
              style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)', color: 'var(--theme-textMuted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--theme-textMain)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--theme-textMuted)'}
              title="Card Mode (カード型ミニプレーヤー)"
            >
              <PanelTop size={12} />
            </button>

            {/* Slim Bar Mode Button */}
            <button 
              onClick={() => setViewMode('slim')}
              className="flex items-center justify-center border h-6 px-2 transition-colors hover:opacity-80"
              style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)', color: 'var(--theme-textMuted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--theme-textMain)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--theme-textMuted)'}
              title="Slim Bar Mode (スリムバー型ミニプレーヤー)"
            >
              <Minus size={12} />
            </button>
          </div>
          
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

          {/* Font Control: Dropdown (GOTHIC, MARU, MEIRYO, MONO) */}
          <div className="relative flex items-center" ref={fontMenuRef}>
            <div 
              className="flex items-center h-6 border rounded-[1px] select-none pl-2.5 pr-2 gap-2 cursor-pointer transition-colors"
              style={{
                borderColor: isFontMenuOpen ? 'var(--theme-accent)' : 'var(--theme-border)',
                backgroundColor: 'var(--theme-surface)',
              }}
              onClick={() => setIsFontMenuOpen(prev => !prev)}
              title="フォント切り替え"
            >
              <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color: 'var(--theme-textMuted)' }}>FONT:</span>
              <div className="flex items-center gap-1.5 min-w-[56px] justify-between">
                <span className="text-[10px] font-bold tracking-wider" style={{ color: 'var(--theme-textMain)', fontFamily: activeFont.fontFamily }}>
                  {activeFont.label}
                </span>
                <ChevronDown size={11} className={`transition-transform duration-150 ${isFontMenuOpen ? 'rotate-180' : ''}`} style={{ color: isFontMenuOpen ? 'var(--theme-accent)' : 'var(--theme-textMuted)' }} />
              </div>
            </div>

            {/* Dropdown Menu Popup matching screenshot */}
            {isFontMenuOpen && (
              <div 
                className="absolute right-0 top-full mt-1 z-[100] w-32 border shadow-2xl rounded-[1px] py-1 select-none animate-fade-in"
                style={{
                  backgroundColor: 'var(--theme-surfaceLighter)',
                  borderColor: 'var(--theme-borderActive)',
                  color: 'var(--theme-textMain)',
                }}
              >
                <div className="flex flex-col">
                  {FONT_OPTIONS.map((f) => {
                    const isSelected = f.id === fontFamilyId;
                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          setFontFamilyId(f.id);
                          setIsFontMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold tracking-wider text-left transition-colors cursor-pointer"
                        style={{
                          backgroundColor: isSelected ? 'var(--theme-accent, #2563eb)' : 'transparent',
                          color: isSelected ? '#ffffff' : 'var(--theme-textMain)',
                          fontFamily: f.fontFamily,
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'var(--theme-surface)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <span>{f.label}</span>
                        {isSelected && (
                          <Check size={11} style={{ color: '#ffffff' }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Theme Control: Split Button (Click name = Cycle next theme, Click arrow = Dropdown list) */}
          <div className="relative flex items-center" ref={themeMenuRef}>
            <div 
              className="flex items-center h-6 border rounded-[1px] select-none overflow-hidden"
              style={{
                borderColor: isThemeMenuOpen ? 'var(--theme-accent)' : 'var(--theme-border)',
                backgroundColor: 'var(--theme-surface)',
              }}
            >
              {/* Left Button: Click name to cycle to next theme in sequence (Fixed width prevents layout shift) */}
              <button
                onClick={cycleTheme}
                className="flex items-center h-full pl-2 pr-1.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer w-[78px] justify-start"
                title={`クリックで次のテーマへ順送り (${theme.id})`}
                style={{ color: 'var(--theme-textMain)' }}
              >
                {/* Current Theme Dot */}
                <span 
                  className="w-2.5 h-2.5 rounded-full mr-1.5 shrink-0 border"
                  style={{
                    backgroundColor: theme.dotColor || theme.accent,
                    borderColor: 'rgba(0,0,0,0.3)',
                    boxShadow: '0 0 2px rgba(0,0,0,0.3)',
                  }}
                />
                {/* Current Theme Name */}
                <span className="text-[10px] font-mono font-bold tracking-wider truncate">
                  {theme.id}
                </span>
              </button>

              {/* Right Button: Click arrow to toggle dropdown list */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsThemeMenuOpen(prev => !prev);
                }}
                className="flex items-center justify-center h-full w-5 border-l transition-colors hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                style={{
                  borderColor: 'var(--theme-border)',
                  color: isThemeMenuOpen ? 'var(--theme-accent)' : 'var(--theme-textMuted)',
                  backgroundColor: isThemeMenuOpen ? 'var(--theme-surfaceLighter)' : 'transparent',
                }}
                title="テーマ一覧メニューを開く"
              >
                <span className="text-[7px]">▼</span>
              </button>
            </div>

            {/* Dropdown Menu Popup */}
            {isThemeMenuOpen && (
              <div 
                className="absolute right-0 top-full mt-1 z-[100] w-44 border shadow-2xl rounded-[1px] py-1 select-none animate-fade-in"
                style={{
                  backgroundColor: 'var(--theme-surfaceLighter)',
                  borderColor: 'var(--theme-borderActive)',
                  color: 'var(--theme-textMain)',
                }}
              >
                {/* Header: 🎨 テーマ切り替え */}
                <div 
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold border-b tracking-wider select-none"
                  style={{
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-textMain)',
                  }}
                >
                  <span className="text-[11px]">🎨</span>
                  <span>テーマ切り替え</span>
                </div>

                {/* Theme List */}
                <div className="py-1">
                  {THEMES.map((t, idx) => {
                    const isSelected = idx === themeIndex;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setThemeIndex(idx);
                          try {
                            localStorage.setItem('v2_solidThemeId', t.id);
                          } catch {}
                          setIsThemeMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-[10.5px] font-mono font-bold tracking-wider text-left transition-colors cursor-pointer"
                        style={{
                          backgroundColor: isSelected ? 'var(--theme-surface)' : 'transparent',
                          color: isSelected ? 'var(--theme-accent)' : 'var(--theme-textMain)',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'var(--theme-surface)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Theme Color Dot */}
                          <span 
                            className="w-3 h-3 rounded-full shrink-0 border"
                            style={{
                              backgroundColor: t.dotColor || t.accent,
                              borderColor: 'rgba(0,0,0,0.3)',
                              boxShadow: isSelected ? `0 0 4px ${t.dotColor || t.accent}` : 'none',
                            }}
                          />
                          <span className="truncate">{t.id}</span>
                        </div>
                        {isSelected && (
                          <Check size={12} style={{ color: 'var(--theme-accent)' }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="text-xs tracking-widest font-mono" style={{ color: 'var(--theme-textMuted)' }}>v2.1.0 OS</div>
        </div>
      </header>

      {/* Main Control Surface - Top half */}
      <div className="grid grid-cols-12 gap-4 h-[200px] shrink-0">
        
        {/* 01 TRACK INFO */}
        <PanelBlock 
          title="01 TRACK INFO" 
          className="col-span-4 p-4 relative"
          action={currentTrack ? (
            <button
              type="button"
              onClick={handleLocateCurrentTrack}
              className="flex items-center gap-1 px-1.5 py-0.5 border text-[9px] font-mono tracking-wider transition-all hover:opacity-80 active:scale-95 cursor-pointer shadow-sm group rounded-[1px]"
              style={{
                backgroundColor: 'var(--theme-surface)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-textMain)',
              }}
              title="現在再生中の曲のアルバム／歌手の場所へ移動 (LOCATE PLAYING TRACK)"
            >
              <Disc size={11} className="group-hover:rotate-45 transition-transform shrink-0" style={{ color: 'var(--theme-accent)' }} />
              <span className="text-[8.5px] font-mono uppercase" style={{ color: 'var(--theme-accent)' }}>LOCATE</span>
            </button>
          ) : undefined}
        >
          {currentTrack ? (
            <div className="flex h-full gap-4 overflow-hidden relative">
              <div className="h-full aspect-square shrink-0 relative border shadow-inner" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)' }}>
                <AlbumArt3D
                  coverUrl={currentTrack.coverUrl}
                  title={currentTrack.title}
                  artist={currentTrack.artist}
                  album={currentTrack.album}
                  duration={currentTrack.duration}
                  fileName={currentTrack.fileName}
                  isPlaying={isPlaying}
                  onDropImage={handleUpdateArtwork}
                  onResetArtwork={handleResetArtwork}
                />
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
          className="border flex flex-col shrink-0 relative transition-all duration-200" 
          style={{ 
            width: isSidebarCollapsed ? 34 : sidebarWidth, 
            minWidth: isSidebarCollapsed ? 34 : 120, 
            maxWidth: isSidebarCollapsed ? 34 : 800, 
            backgroundColor: isDragOver ? 'var(--theme-accentMuted)' : 'var(--theme-list-bg)', 
            borderColor: isDragOver ? 'var(--theme-accent)' : 'var(--theme-border)',
            boxShadow: isDragOver ? 'inset 0 0 0 2px var(--theme-accent)' : 'none'
          }}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => {
            resetDragOverState();
            handleDrop(e);
          }}
        >
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center py-2 h-full justify-between" style={{ backgroundColor: 'var(--theme-listHeader-bg)' }}>
              <button
                onClick={() => {
                  setIsSidebarCollapsed(false);
                  setSidebarWidth(prevSidebarWidthRef.current || 240);
                }}
                className="p-1 border rounded-[2px] hover:opacity-80 transition-colors"
                style={{ backgroundColor: 'var(--theme-surfaceLighter)', borderColor: 'var(--theme-border)', color: 'var(--theme-accent)' }}
                title="サイドバーを展開"
              >
                <PanelLeftOpen size={12} />
              </button>
              <span className="text-[9px] font-mono tracking-widest uppercase [writing-mode:vertical-rl] rotate-180 select-none py-2" style={{ color: 'var(--theme-listHeader-textMuted)' }}>
                INDEX MAP ({playlists.length})
              </span>
              <div className="h-4" />
            </div>
          ) : (
            <>
              <div className="border-b px-2 py-1 flex items-center justify-between h-8 shrink-0 gap-1 overflow-x-auto no-scrollbar whitespace-nowrap" style={{ backgroundColor: 'var(--theme-listHeader-bg)', borderColor: 'var(--theme-listHeader-border)' }}>
                <div className="flex items-center gap-1 min-w-0 shrink-0">
                  <span className="uppercase tracking-wider text-[11px] truncate font-medium" style={{ color: 'var(--theme-listHeader-textMuted)' }}>INDEX MAP</span>
                  {selectedPlaylistIds.size > 0 && (
                    <span className="text-[9px] font-mono px-1 border rounded-[2px] shrink-0 font-semibold" style={{ borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)', backgroundColor: 'var(--theme-accentMuted)' }}>
                      {selectedPlaylistIds.size}
                    </span>
                  )}
                </div>

                {selectedPlaylistIds.size > 0 ? (
                  /* Inline Batch Selection Toolbar inside 32px fixed header */
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setShowBatchMoveCategoryModal(true)}
                      className="flex items-center gap-0.5 border rounded-[2px] px-1.5 h-5 text-[9px] font-mono tracking-wider transition-colors hover:opacity-80 active:scale-95 cursor-pointer"
                      style={{ backgroundColor: 'var(--theme-accentMuted)', borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)' }}
                      title="選択したリストをカテゴリーへ一括移動 (BATCH MOVE TO CATEGORY)"
                    >
                      <Move size={10} />
                      <span>MOVE</span>
                    </button>

                    <button 
                      onClick={() => moveSelectedPlaylists('top')}
                      className="flex items-center justify-center border rounded-[2px] w-5 h-5 transition-colors hover:opacity-80 active:scale-95 cursor-pointer"
                      style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-listHeader-border)' }}
                      title="選択したリストを一番上へ移動 (TOP)"
                    >
                      <ChevronsUp size={11} style={{ color: 'var(--theme-listHeader-text)' }} />
                    </button>

                    <button 
                      onClick={() => moveSelectedPlaylists('up')}
                      className="flex items-center justify-center border rounded-[2px] w-5 h-5 transition-colors hover:opacity-80 active:scale-95 cursor-pointer"
                      style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-listHeader-border)' }}
                      title="選択したリストを上に移動 (UP)"
                    >
                      <ChevronUp size={11} style={{ color: 'var(--theme-listHeader-text)' }} />
                    </button>

                    <button 
                      onClick={() => moveSelectedPlaylists('down')}
                      className="flex items-center justify-center border rounded-[2px] w-5 h-5 transition-colors hover:opacity-80 active:scale-95 cursor-pointer"
                      style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-listHeader-border)' }}
                      title="選択したリストを下に移動 (DOWN)"
                    >
                      <ChevronDown size={11} style={{ color: 'var(--theme-listHeader-text)' }} />
                    </button>

                    <button 
                      onClick={() => moveSelectedPlaylists('bottom')}
                      className="flex items-center justify-center border rounded-[2px] w-5 h-5 transition-colors hover:opacity-80 active:scale-95 cursor-pointer"
                      style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-listHeader-border)' }}
                      title="選択したリストを一番下へ移動 (BOTTOM)"
                    >
                      <ChevronsDown size={11} style={{ color: 'var(--theme-listHeader-text)' }} />
                    </button>

                    {confirmDeleteSelectedPlaylists ? (
                      <div className="flex items-center gap-0.5 px-1 py-0.5 border rounded-[2px]" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-borderActive)' }} onClick={e => e.stopPropagation()}>
                        <span className="text-[8px] uppercase tracking-tighter" style={{ color: 'var(--theme-accent)' }}>DEL?</span>
                        <button
                          onClick={deleteSelectedPlaylists}
                          className="p-0.5 hover:opacity-80 cursor-pointer"
                          title="選択したリストを削除"
                          style={{ color: 'var(--theme-accent)' }}
                        >
                          <Trash2 size={10} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteSelectedPlaylists(false)}
                          className="p-0.5 hover:opacity-80 cursor-pointer"
                          title="キャンセル"
                          style={{ color: 'var(--theme-textDim)' }}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setConfirmDeleteSelectedPlaylists(true)}
                        className="flex items-center justify-center border rounded-[2px] w-5 h-5 transition-colors hover:opacity-80 active:scale-95 cursor-pointer"
                        style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-listHeader-border)' }}
                        title="選択したリストを削除"
                      >
                        <Trash2 size={10} style={{ color: 'var(--theme-accent)' }} />
                      </button>
                    )}

                    <button 
                      onClick={() => { 
                        setSelectedPlaylistIds(new Set()); 
                        setIsPlaylistSelectionMode(false);
                        lastSelectedPlaylistIdRef.current = null;
                        setConfirmDeleteSelectedPlaylists(false); 
                      }}
                      className="flex items-center justify-center border rounded-[2px] w-5 h-5 transition-colors hover:opacity-80 active:scale-95 cursor-pointer"
                      style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-listHeader-border)' }}
                      title="選択をキャンセルして選択モードを終了"
                    >
                      <X size={10} style={{ color: 'var(--theme-listHeader-textMuted)' }} />
                    </button>
                  </div>
                ) : (
                  /* Standard Header Actions */
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Category View Mode Switch: LIST vs TREE */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSidebarCategoryMode('dropdown');
                          try { localStorage.setItem('v2_solidSidebarCategoryMode', 'dropdown'); } catch {}
                        }}
                        className="px-1.5 h-5 flex items-center justify-center text-[9px] font-mono tracking-wider transition-colors border rounded-[2px] hover:opacity-80 active:scale-95 focus:outline-none cursor-pointer"
                        style={
                          sidebarCategoryMode === 'dropdown'
                            ? { backgroundColor: 'var(--theme-accentMuted)', borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)' }
                            : { backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-listHeader-border)', color: 'var(--theme-listHeader-textMuted)' }
                        }
                        title="リスト表示モード (選択したカテゴリーのリストのみ表示・ホイールスクロール不要)"
                      >
                        <FileText size={11} className="mr-0.5 shrink-0" />
                        <span>LIST</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSidebarCategoryMode('tree');
                          try { localStorage.setItem('v2_solidSidebarCategoryMode', 'tree'); } catch {}
                        }}
                        className="px-1.5 h-5 flex items-center justify-center text-[9px] font-mono tracking-wider transition-colors border rounded-[2px] hover:opacity-80 active:scale-95 focus:outline-none cursor-pointer"
                        style={
                          sidebarCategoryMode === 'tree'
                            ? { backgroundColor: 'var(--theme-accentMuted)', borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)' }
                            : { backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-listHeader-border)', color: 'var(--theme-listHeader-textMuted)' }
                        }
                        title="フォルダツリー展開モード (全カテゴリーをフォルダ階層で展開・D&Dで整理)"
                      >
                        <FolderTree size={11} className="mr-0.5" />
                        <span>TREE</span>
                      </button>
                    </div>

                    {/* Add New Category button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingCategory(true);
                        setNewCategoryName('');
                      }}
                      className="flex items-center gap-0.5 justify-center border rounded-[2px] px-1.5 h-5 text-[9px] font-mono tracking-wider transition-colors hover:opacity-80 active:scale-95 cursor-pointer"
                      style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-listHeader-border)', color: 'var(--theme-listHeader-text)' }}
                      title="新規カテゴリーを作成 (+ CATEGORY)"
                    >
                      <BookmarkPlus size={10} />
                      <span>+CAT</span>
                    </button>

                    {/* OPEN / CLOSE all folder playlists toggle button with 3-stage cycling */}
                    {(() => {
                      const expandableFolderIds = playlists
                        .filter(p => p.id !== 'all-tracks' && (playlistAlbumsMap[p.id]?.length || 0) > 1)
                        .map(p => p.id);
                      const isTreeMode = sidebarCategoryMode === 'tree';
                      const uncategorizedCount = playlists.filter(p => p.id !== 'all-tracks' && !p.category).length;
                      const allTreeCatKeys: string[] = categories.length > 0
                        ? (uncategorizedCount > 0 ? [...categories, '__UNCATEGORIZED__'] : [...categories])
                        : (uncategorizedCount > 0 ? ['__UNCATEGORIZED__'] : []);

                      const isAllTreeCatsOpen = allTreeCatKeys.length > 0 && allTreeCatKeys.every(cat => expandedCategoryNames.has(cat));
                      const isAllFoldersOpen = expandableFolderIds.length > 0 && expandableFolderIds.every(id => expandedSidebarFolderIds.has(id));
                      const isAllCatsCollapsed = allTreeCatKeys.length > 0 && allTreeCatKeys.every(cat => !expandedCategoryNames.has(cat));

                      const isFullOpen = isTreeMode
                        ? (allTreeCatKeys.length > 0 && expandableFolderIds.length > 0
                            ? (isAllTreeCatsOpen && isAllFoldersOpen)
                            : allTreeCatKeys.length > 0
                            ? isAllTreeCatsOpen
                            : isAllFoldersOpen)
                        : isAllFoldersOpen;

                      const isCatsOnlyOpen = isTreeMode && isAllTreeCatsOpen && !isAllFoldersOpen && expandableFolderIds.length > 0;
                      const isFullyCollapsed = isTreeMode ? isAllCatsCollapsed : (expandedSidebarFolderIds.size === 0);

                      const isDisabled = isTreeMode
                        ? (allTreeCatKeys.length === 0 && expandableFolderIds.length === 0)
                        : (expandableFolderIds.length === 0);

                      let btnLabel = 'OPEN';
                      let btnTitle = '';
                      let btnIcon = <Folder size={10} className="shrink-0" />;

                      if (isFullOpen) {
                        btnLabel = 'CLOSE';
                        btnIcon = <FolderOpen size={10} className="shrink-0" />;
                        btnTitle = isTreeMode ? 'すべて閉じる (カテゴリーのみ表示)' : 'すべてのアルバムフォルダを閉じる';
                      } else if (isCatsOnlyOpen) {
                        btnLabel = 'OPEN+';
                        btnIcon = <FolderTree size={10} className="shrink-0" />;
                        btnTitle = 'サブカテゴリー（アルバムフォルダ）もすべて開く (全開)';
                      } else {
                        btnLabel = 'OPEN';
                        btnIcon = <Folder size={10} className="shrink-0" />;
                        btnTitle = isTreeMode ? 'カテゴリーを開く (サブカテゴリーは閉じた状態)' : 'すべてのアルバムフォルダを開く';
                      }

                      const handleToggleCycle = () => {
                        if (isTreeMode) {
                          if (isFullOpen) {
                            setExpandedCategoryNames(new Set());
                            setExpandedSidebarFolderIds(new Set());
                            setTreeExpansionStage('collapsed');
                            try {
                              localStorage.setItem('v2_solid_tree_expand_stage', 'collapsed');
                              localStorage.setItem('v2_solid_expandedCategoryNames', JSON.stringify([]));
                              localStorage.setItem('v2_solid_expandedSidebarFolderIds', JSON.stringify([]));
                            } catch {}
                          } else if (isFullyCollapsed) {
                            setExpandedCategoryNames(new Set(allTreeCatKeys));
                            setExpandedSidebarFolderIds(new Set());
                            setTreeExpansionStage('cats-only');
                            try {
                              localStorage.setItem('v2_solid_tree_expand_stage', 'cats-only');
                              localStorage.setItem('v2_solid_expandedCategoryNames', JSON.stringify(allTreeCatKeys));
                              localStorage.setItem('v2_solid_expandedSidebarFolderIds', JSON.stringify([]));
                            } catch {}
                          } else {
                            setExpandedCategoryNames(new Set(allTreeCatKeys));
                            setExpandedSidebarFolderIds(new Set(expandableFolderIds));
                            setTreeExpansionStage('full');
                            try {
                              localStorage.setItem('v2_solid_tree_expand_stage', 'full');
                              localStorage.setItem('v2_solid_expandedCategoryNames', JSON.stringify(allTreeCatKeys));
                              localStorage.setItem('v2_solid_expandedSidebarFolderIds', JSON.stringify(expandableFolderIds));
                            } catch {}
                          }
                        } else {
                          if (isFullOpen) {
                            setExpandedSidebarFolderIds(new Set());
                            try {
                              localStorage.setItem('v2_solid_expandedSidebarFolderIds', JSON.stringify([]));
                            } catch {}
                          } else {
                            setExpandedSidebarFolderIds(new Set(expandableFolderIds));
                            try {
                              localStorage.setItem('v2_solid_expandedSidebarFolderIds', JSON.stringify(expandableFolderIds));
                            } catch {}
                          }
                        }
                      };

                      return (
                        <button
                          type="button"
                          disabled={isDisabled}
                          onClick={handleToggleCycle}
                          className="flex items-center gap-1 justify-center border rounded-[2px] w-[56px] h-5 text-[9px] font-mono tracking-wider transition-colors hover:opacity-80 active:scale-95 disabled:opacity-35 shrink-0 cursor-pointer"
                          style={
                            isFullOpen
                              ? { backgroundColor: 'var(--theme-accentMuted)', borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)' }
                              : isCatsOnlyOpen
                              ? { backgroundColor: 'var(--theme-surfaceLighter)', borderColor: 'var(--theme-listHeader-border)', color: 'var(--theme-listHeader-text)' }
                              : { backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-listHeader-border)', color: 'var(--theme-listHeader-textMuted)' }
                          }
                          title={isDisabled ? '展開可能な項目がありません' : btnTitle}
                        >
                          {btnIcon}
                          <span>{btnLabel}</span>
                        </button>
                      );
                    })()}

                    {/* SELECT / CANCEL button for selection mode */}
                    {isPlaylistSelectionMode ? (
                      <button 
                        type="button"
                        onClick={() => {
                          setIsPlaylistSelectionMode(false);
                          setSelectedPlaylistIds(new Set());
                          lastSelectedPlaylistIdRef.current = null;
                          setConfirmDeleteSelectedPlaylists(false);
                        }}
                        className="flex items-center justify-center border rounded-[2px] w-[54px] h-5 text-[9px] font-mono tracking-wider transition-colors hover:opacity-80 active:scale-95 shrink-0 cursor-pointer"
                        style={{ 
                          backgroundColor: 'var(--theme-accentMuted)', 
                          borderColor: 'var(--theme-accent)', 
                          color: 'var(--theme-accent)' 
                        }}
                        title="選択をキャンセルして選択モードを終了 (チェックボックス非表示)"
                      >
                        CANCEL
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => {
                          setIsPlaylistSelectionMode(true);
                          setSelectedPlaylistIds(new Set());
                          lastSelectedPlaylistIdRef.current = null;
                          setConfirmDeleteSelectedPlaylists(false);
                        }}
                        className="flex items-center justify-center border rounded-[2px] w-[54px] h-5 text-[9px] font-mono tracking-wider transition-colors hover:opacity-80 active:scale-95 shrink-0 cursor-pointer"
                        style={{ 
                          backgroundColor: 'var(--theme-bg)', 
                          borderColor: 'var(--theme-listHeader-border)', 
                          color: 'var(--theme-listHeader-text)' 
                        }}
                        title="プレイリスト選択モード (チェックボックスを表示して一括操作・SETリピート)"
                      >
                        SELECT
                      </button>
                    )}

                    <button 
                      onClick={() => { setIsCreatingPlaylist(true); setNewPlaylistName(''); }}
                      className="flex items-center justify-center border rounded-[2px] w-5 h-5 transition-colors hover:opacity-80 active:scale-95 cursor-pointer"
                      style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-listHeader-border)' }}
                      title="CREATE LIST"
                    >
                      <Plus size={10} style={{ color: 'var(--theme-listHeader-text)' }} />
                    </button>
                  </div>
                )}
              </div>

              {/* Inline Create Category Form */}
              {isCreatingCategory && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b" style={{ backgroundColor: 'var(--theme-list-surface)', borderColor: 'var(--theme-list-border)' }}>
                  <BookmarkPlus size={12} className="shrink-0" style={{ color: 'var(--theme-list-accent)' }} />
                  <input
                    autoFocus
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="CATEGORY NAME..."
                    className="flex-1 min-w-0 bg-transparent text-[10px] font-mono outline-none border-b px-1 py-0.5"
                    style={{ borderColor: 'var(--theme-list-accent)', color: 'var(--theme-list-textMain)' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateCategory();
                      else if (e.key === 'Escape') setIsCreatingCategory(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleCreateCategory()}
                    className="p-1 hover:opacity-80"
                    style={{ color: 'var(--theme-list-accent)' }}
                    title="カテゴリーを作成"
                  >
                    <Check size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(false)}
                    className="p-1 hover:opacity-80"
                    style={{ color: 'var(--theme-list-textDim)' }}
                    title="キャンセル"
                  >
                    <X size={11} />
                  </button>
                </div>
              )}

              {/* Mode-specific category selector / toolbar */}
              {sidebarCategoryMode === 'dropdown' ? (
                <div className="flex items-center justify-between px-2.5 h-[32px] border-b shrink-0 relative" style={{ backgroundColor: 'var(--theme-listHeader-bg)', borderColor: 'var(--theme-listHeader-border)' }}>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-1">
                    <span className="text-[9px] font-mono uppercase tracking-wider shrink-0" style={{ color: 'var(--theme-listHeader-textMuted)' }}>CAT:</span>
                    
                    {/* Cascading Category & Playlist Direct Selection Dropdown Trigger */}
                    <div className="relative flex-1 min-w-0" ref={categoryCascadeMenuRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCategoryCascadeMenuOpen(prev => {
                            const willOpen = !prev;
                            if (willOpen) {
                              const initialCat = selectedCategoryFilter !== '__ALL__' 
                                ? selectedCategoryFilter 
                                : (categories[0] || '__ALL__');
                              setHoveredCategoryInMenu(initialCat);
                              setHoveredPlaylistInMenu(activePlaylistId !== 'all-tracks' ? activePlaylistId : null);
                            } else {
                              setHoveredPlaylistInMenu(null);
                            }
                            return willOpen;
                          });
                        }}
                        className="w-full h-5 flex items-center justify-between font-mono border rounded-[2px] px-1.5 truncate cursor-pointer transition-colors hover:opacity-90 focus:outline-none"
                        style={{
                          borderColor: isCategoryCascadeMenuOpen ? 'var(--theme-accent)' : 'var(--theme-listHeader-border)',
                          backgroundColor: 'var(--theme-surface)',
                          color: 'var(--theme-textMain)',
                          fontSize: `${Math.min(12, Math.max(9, listFontSize))}px`
                        }}
                        title="カテゴリー・プレイリストをプルダウン＆ダイレクト選択 (SIZE連動)"
                      >
                        <span className="truncate font-medium flex items-center gap-1">
                          <Bookmark size={10} style={{ color: selectedCategoryFilter !== '__ALL__' ? 'var(--theme-accent)' : 'var(--theme-listHeader-textMuted)' }} />
                          <span className="truncate">
                            {selectedCategoryFilter === '__ALL__'
                              ? `ALL PLAYLISTS (${playlists.filter(p => p.id !== 'all-tracks').length})`
                              : selectedCategoryFilter === '__UNCATEGORIZED__'
                              ? `UNCATEGORIZED (${playlists.filter(p => p.id !== 'all-tracks' && !p.category).length})`
                              : `${selectedCategoryFilter} (${playlists.filter(p => p.id !== 'all-tracks' && p.category === selectedCategoryFilter).length})`}
                          </span>
                        </span>
                        <ChevronDown size={10} className={`shrink-0 ml-1 transition-transform ${isCategoryCascadeMenuOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--theme-listHeader-textMuted)' }} />
                      </button>

                      {/* Cascading Dropdown Popover with Hand-Grip Resizing */}
                      {isCategoryCascadeMenuOpen && (
                        <div
                          className="absolute left-0 top-full mt-1 z-50 flex flex-col border shadow-2xl font-mono rounded-[2px] overflow-hidden"
                          style={{
                            backgroundColor: 'transparent',
                            borderColor: 'var(--theme-border)',
                            color: 'var(--theme-textMain)',
                            fontSize: `${listFontSize}px`,
                            maxHeight: `${cascadeHeight + 65}px`
                          }}
                        >
                          <div className="flex overflow-hidden">
                            {/* Primary Column: Categories */}
                            <div 
                              className="border-r py-1 flex flex-col overflow-y-auto shrink-0" 
                              style={{ 
                                width: `${cascadeColWidths.cat}px`, 
                                minWidth: '140px',
                                height: `${cascadeHeight}px`,
                                maxHeight: `${cascadeHeight}px`,
                                backgroundColor: 'var(--theme-surface)',
                                borderColor: 'var(--theme-border)' 
                              }}
                            >
                              <div className="px-2.5 py-1 uppercase tracking-wider font-semibold border-b flex items-center justify-between" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-textDim)', fontSize: `${Math.max(9, listFontSize - 2)}px` }}>
                                <span>CATEGORIES</span>
                                <span className="opacity-70">{categories.length + 1}</span>
                              </div>

                              {/* 1. ALL PLAYLISTS */}
                              <div
                                onMouseEnter={() => {
                                  setHoveredCategoryInMenu('__ALL__');
                                  setHoveredPlaylistInMenu(null);
                                }}
                                onClick={() => {
                                  setSelectedCategoryFilter('__ALL__');
                                  try { localStorage.setItem('v2_solidSelectedCategoryFilter', '__ALL__'); } catch {}
                                  setHoveredCategoryInMenu('__ALL__');
                                  setHoveredPlaylistInMenu(null);
                                  setIsCategoryCascadeMenuOpen(false);
                                }}
                                className="px-2.5 py-1.5 flex items-center justify-between cursor-pointer transition-colors"
                                style={{
                                  backgroundColor: hoveredCategoryInMenu === '__ALL__' ? 'var(--theme-accentMuted)' : (selectedCategoryFilter === '__ALL__' ? 'var(--theme-surfaceLighter)' : 'transparent'),
                                  color: hoveredCategoryInMenu === '__ALL__' ? 'var(--theme-accent)' : 'inherit',
                                  fontSize: `${listFontSize}px`
                                }}
                              >
                                <span className="truncate">ALL PLAYLISTS</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="opacity-70 font-mono" style={{ fontSize: `${Math.max(8.5, listFontSize - 2.5)}px` }}>({playlists.filter(p => p.id !== 'all-tracks').length})</span>
                                  <ChevronRight size={10} className="opacity-70" />
                                </div>
                              </div>

                              {/* 2. User defined Categories */}
                              {categories.map(cat => {
                                const count = playlists.filter(p => p.id !== 'all-tracks' && p.category === cat).length;
                                const isCurrentActive = hoveredCategoryInMenu === cat;
                                const isSelected = selectedCategoryFilter === cat;
                                const isBeingDragged = draggedCategoryName === cat;
                                const isReorderTarget = dragOverCategoryReorderTarget === cat;
                                const isDropAbove = isReorderTarget && categoryDropPosition === 'above';
                                const isDropBelow = isReorderTarget && categoryDropPosition === 'below';

                                return (
                                  <div
                                    key={cat}
                                    onDragOver={(e) => {
                                      if (draggedCategoryName) {
                                        handleCategoryDragOverForReorder(e, cat);
                                      }
                                    }}
                                    onDragLeave={() => {
                                      if (dragOverCategoryReorderTarget === cat) {
                                        setDragOverCategoryReorderTarget(null);
                                        setCategoryDropPosition(null);
                                      }
                                    }}
                                    onDrop={(e) => {
                                      if (draggedCategoryName) {
                                        handleCategoryDropForReorder(e, cat);
                                      }
                                    }}
                                    onMouseEnter={() => {
                                      setHoveredCategoryInMenu(cat);
                                      setHoveredPlaylistInMenu(null);
                                    }}
                                    onClick={() => {
                                      setSelectedCategoryFilter(cat);
                                      try { localStorage.setItem('v2_solidSelectedCategoryFilter', cat); } catch {}
                                      setHoveredCategoryInMenu(cat);
                                      setHoveredPlaylistInMenu(null);
                                      setIsCategoryCascadeMenuOpen(false);
                                    }}
                                    className={`px-2.5 py-1.5 flex items-center justify-between cursor-pointer transition-colors relative ${isBeingDragged ? 'opacity-30' : ''}`}
                                    style={{
                                      backgroundColor: isCurrentActive ? 'var(--theme-accentMuted)' : (isSelected ? 'var(--theme-surfaceLighter)' : 'transparent'),
                                      color: isCurrentActive ? 'var(--theme-accent)' : 'inherit',
                                      fontSize: `${listFontSize}px`
                                    }}
                                    title={`${cat} (${count} lists) - 前端グリップで上下並べ替え可能`}
                                  >
                                    {isDropAbove && (
                                      <div 
                                        className="absolute top-0 left-0 right-0 h-[2px] z-30 pointer-events-none" 
                                        style={{ backgroundColor: 'var(--theme-accent)' }} 
                                      />
                                    )}

                                    <span className="truncate flex items-center gap-1.5 font-medium">
                                      <div
                                        draggable
                                        onDragStart={(e) => {
                                          e.stopPropagation();
                                          handleCategoryDragStart(e, cat);
                                        }}
                                        onDragEnd={(e) => {
                                          e.stopPropagation();
                                          handleCategoryDragEnd();
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                        }}
                                        className="p-1 -ml-1 -my-1 rounded-[2px] flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-black/10 dark:hover:bg-white/10 shrink-0 transition-colors"
                                        title="ドラッグしてカテゴリーを並べ替え"
                                      >
                                        <GripVertical size={10} className="shrink-0 opacity-30 hover:opacity-100 transition-opacity" style={{ color: 'var(--theme-textDim)' }} />
                                      </div>
                                      <Bookmark size={listFontSize >= 13 ? 11 : 9.5} style={{ color: 'var(--theme-accent)' }} fill={isCurrentActive || isSelected ? 'currentColor' : 'none'} />
                                      <span className="truncate">{cat}</span>
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className="opacity-70 font-mono" style={{ fontSize: `${Math.max(8.5, listFontSize - 2.5)}px` }}>({count})</span>
                                      <ChevronRight size={10} className="opacity-70" />
                                    </div>

                                    {isDropBelow && (
                                      <div 
                                        className="absolute bottom-0 left-0 right-0 h-[2px] z-30 pointer-events-none" 
                                        style={{ backgroundColor: 'var(--theme-accent)' }} 
                                      />
                                    )}
                                  </div>
                                );
                              })}

                              {/* 3. UNCATEGORIZED */}
                              <div
                                onMouseEnter={() => {
                                  setHoveredCategoryInMenu('__UNCATEGORIZED__');
                                  setHoveredPlaylistInMenu(null);
                                }}
                                onClick={() => {
                                  setSelectedCategoryFilter('__UNCATEGORIZED__');
                                  try { localStorage.setItem('v2_solidSelectedCategoryFilter', '__UNCATEGORIZED__'); } catch {}
                                  setHoveredCategoryInMenu('__UNCATEGORIZED__');
                                  setHoveredPlaylistInMenu(null);
                                  setIsCategoryCascadeMenuOpen(false);
                                }}
                                className="px-2.5 py-1.5 flex items-center justify-between cursor-pointer transition-colors border-t"
                                style={{
                                  borderColor: 'var(--theme-border)',
                                  backgroundColor: hoveredCategoryInMenu === '__UNCATEGORIZED__' ? 'var(--theme-accentMuted)' : (selectedCategoryFilter === '__UNCATEGORIZED__' ? 'var(--theme-surfaceLighter)' : 'transparent'),
                                  color: hoveredCategoryInMenu === '__UNCATEGORIZED__' ? 'var(--theme-accent)' : 'inherit',
                                  fontSize: `${listFontSize}px`
                                }}
                              >
                                <span className="truncate flex items-center gap-1.5 font-medium">
                                  {/* Invisible spacer matching the category grip handle dimensions so mark and text align perfectly */}
                                  <div
                                    className="p-1 -ml-1 -my-1 rounded-[2px] flex items-center justify-center shrink-0 pointer-events-none select-none"
                                    aria-hidden="true"
                                  >
                                    <div className="w-[10px] h-[10px]" />
                                  </div>
                                  <Bookmark size={listFontSize >= 13 ? 11 : 9.5} style={{ color: 'var(--theme-listHeader-textMuted)' }} strokeDasharray="2 2" />
                                  <span className="truncate">UNCATEGORIZED</span>
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="opacity-70 font-mono" style={{ fontSize: `${Math.max(8.5, listFontSize - 2.5)}px` }}>({playlists.filter(p => p.id !== 'all-tracks' && !p.category).length})</span>
                                  <ChevronRight size={10} className="opacity-70" />
                                </div>
                              </div>
                            </div>

                            {/* Resizer Handle between Column 1 & Column 2 */}
                            <div
                              onMouseDown={(e) => handleCascadeGripMouseDown(e, 'cat')}
                              className="w-1.5 hover:w-2 hover:bg-[var(--theme-accent)] transition-all cursor-col-resize shrink-0 flex items-center justify-center select-none group"
                              style={{ backgroundColor: 'var(--theme-border)' }}
                              title="カテゴリー列の横幅をドラッグで調整 (DRAG TO RESIZE)"
                            >
                              <div className="w-[1px] h-4 bg-[var(--theme-textDim)] group-hover:bg-white" />
                            </div>

                            {/* Secondary Cascading Column: Direct Playlists in Hovered Category */}
                            {hoveredCategoryInMenu && (() => {
                              const subPlaylists = playlists.filter(p => {
                                if (p.id === 'all-tracks') return false;
                                if (hoveredCategoryInMenu === '__ALL__') return true;
                                if (hoveredCategoryInMenu === '__UNCATEGORIZED__') return !p.category;
                                return p.category === hoveredCategoryInMenu;
                              });

                              const catDisplayName = hoveredCategoryInMenu === '__ALL__' 
                                ? 'ALL PLAYLISTS' 
                                : hoveredCategoryInMenu === '__UNCATEGORIZED__' 
                                ? 'UNCATEGORIZED' 
                                : hoveredCategoryInMenu;

                              return (
                                <>
                                  <div 
                                    className="py-1 flex flex-col overflow-y-auto shrink-0" 
                                    style={{ 
                                      width: `${cascadeColWidths.pl}px`, 
                                      minWidth: '180px',
                                      height: `${cascadeHeight}px`,
                                      maxHeight: `${cascadeHeight}px`,
                                      backgroundColor: 'var(--theme-bg)' 
                                    }}
                                  >
                                    <div className="px-2.5 py-1 uppercase tracking-wider font-semibold border-b flex justify-between items-center" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-textDim)', fontSize: `${Math.max(9, listFontSize - 2)}px` }}>
                                      <span className="truncate font-bold text-ellipsis flex items-center gap-1.5">
                                        <Bookmark size={listFontSize >= 13 ? 11 : 9.5} style={{ color: 'var(--theme-accent)' }} />
                                        <span className="truncate">{catDisplayName}</span>
                                      </span>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <span>{subPlaylists.length} ITEMS</span>
                                        {hoveredCategoryInMenu !== selectedCategoryFilter && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedCategoryFilter(hoveredCategoryInMenu);
                                              try { localStorage.setItem('v2_solidSelectedCategoryFilter', hoveredCategoryInMenu); } catch {}
                                              setIsCategoryCascadeMenuOpen(false);
                                            }}
                                            className="px-1 border rounded-[2px] text-[8px] hover:opacity-80"
                                            style={{ borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)' }}
                                            title="このカテゴリーのみをサイドバーに表示"
                                          >
                                            VIEW
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {subPlaylists.length === 0 ? (
                                      <div className="p-4 text-center italic opacity-60" style={{ fontSize: `${Math.max(9, listFontSize - 2)}px`, color: 'var(--theme-textDim)' }}>
                                        NO FOLDERS / LISTS
                                      </div>
                                    ) : (
                                      subPlaylists.map(pl => {
                                        const isCurrentActive = activePlaylistId === pl.id;
                                        const isCurrentHovered = hoveredPlaylistInMenu === pl.id;
                                        const subAlbums = pl.id !== 'all-tracks' ? (playlistAlbumsMap[pl.id] || []) : [];
                                        const hasMultipleSubAlbums = subAlbums.length > 1;

                                        return (
                                          <button
                                            key={pl.id}
                                            type="button"
                                            onMouseEnter={() => setHoveredPlaylistInMenu(pl.id)}
                                            onClick={() => {
                                              setActivePlaylistId(pl.id);
                                              setFocusedAlbumId(null);
                                              setDrillDownAlbum(null);
                                              if (hoveredCategoryInMenu !== '__ALL__') {
                                                setSelectedCategoryFilter(hoveredCategoryInMenu);
                                                try { localStorage.setItem('v2_solidSelectedCategoryFilter', hoveredCategoryInMenu); } catch {}
                                              }
                                              setIsCategoryCascadeMenuOpen(false);
                                            }}
                                            className="text-left px-2.5 py-1.5 flex items-center justify-between hover:opacity-80 transition-colors border-b last:border-b-0 cursor-pointer focus:outline-none"
                                            style={{
                                              borderColor: 'var(--theme-list-border)',
                                              backgroundColor: (isCurrentHovered || isCurrentActive) ? 'var(--theme-accentMuted)' : 'transparent',
                                              color: (isCurrentHovered || isCurrentActive) ? 'var(--theme-accent)' : 'var(--theme-textMain)',
                                              fontSize: `${listFontSize}px`
                                            }}
                                            title={`ダイレクト選択: ${pl.name} (${pl.tracks.length}曲)`}
                                          >
                                            <span className="truncate flex items-center gap-2 flex-1 pr-1 font-medium">
                                              {hasMultipleSubAlbums ? (
                                                <Folder size={listFontSize >= 13 ? 12 : 10.5} className="shrink-0" style={{ color: (isCurrentHovered || isCurrentActive) ? 'var(--theme-accent)' : 'var(--theme-list-textDim)' }} />
                                              ) : (
                                                <ListMusic size={listFontSize >= 13 ? 12 : 10.5} className="shrink-0" style={{ color: (isCurrentHovered || isCurrentActive) ? 'var(--theme-accent)' : 'var(--theme-list-textDim)' }} />
                                              )}
                                              <span className="truncate">{pl.name}</span>
                                            </span>
                                            <div className="flex items-center gap-1.5 shrink-0 font-mono" style={{ fontSize: `${Math.max(8.5, listFontSize - 2.5)}px` }}>
                                              {hasMultipleSubAlbums && (
                                                <span className="text-[8.5px] px-1 border rounded-[2px]" style={{ borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)', backgroundColor: 'var(--theme-accentMuted)' }}>
                                                  {subAlbums.length} ALB
                                                </span>
                                              )}
                                              <span className="opacity-70">{pl.tracks.length}曲</span>
                                              {hasMultipleSubAlbums && <ChevronRight size={10} className="opacity-70" />}
                                            </div>
                                          </button>
                                        );
                                      })
                                    )}
                                  </div>

                                  {/* Resizer Handle between Column 2 & Column 3 */}
                                  <div
                                    onMouseDown={(e) => handleCascadeGripMouseDown(e, 'pl')}
                                    className="w-1.5 hover:w-2 hover:bg-[var(--theme-accent)] transition-all cursor-col-resize shrink-0 flex items-center justify-center select-none group border-l"
                                    style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-border)' }}
                                    title="リスト列の横幅をドラッグで調整 (DRAG TO RESIZE)"
                                  >
                                    <div className="w-[1px] h-4 bg-[var(--theme-textDim)] group-hover:bg-white" />
                                  </div>
                                </>
                              );
                            })()}

                            {/* Tertiary Cascading Column: Direct Sub-folders / Albums in Hovered Playlist (Always rendered; frosted glass when empty) */}
                            {(() => {
                              const targetPl = hoveredPlaylistInMenu ? playlists.find(p => p.id === hoveredPlaylistInMenu) : null;
                              const subAlbums = (targetPl && targetPl.id !== 'all-tracks') ? (playlistAlbumsMap[targetPl.id] || []) : [];
                              const hasMultiple = subAlbums.length > 1;

                              if (hasMultiple && targetPl) {
                                return (
                                  <div 
                                    className="border-l py-1 flex flex-col overflow-y-auto shrink-0 shadow-xl" 
                                    style={{ 
                                      width: `${cascadeColWidths.album}px`, 
                                      minWidth: '180px',
                                      height: `${cascadeHeight}px`,
                                      maxHeight: `${cascadeHeight}px`,
                                      borderColor: 'var(--theme-border)', 
                                      backgroundColor: 'var(--theme-surface)' 
                                    }}
                                  >
                                    <div className="px-2.5 py-1 uppercase tracking-wider font-semibold border-b flex justify-between items-center shrink-0" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-textDim)', fontSize: `${Math.max(9, listFontSize - 2)}px` }}>
                                      <span className="truncate flex items-center gap-1.5" title={targetPl.name}>
                                        <Folder size={listFontSize >= 13 ? 11 : 9.5} className="shrink-0 opacity-60" style={{ color: 'var(--theme-textDim)' }} />
                                        <span className="truncate opacity-80">{targetPl.name}</span>
                                      </span>
                                      <span className="font-mono opacity-70 shrink-0 text-[8.5px] px-1 border rounded-[2px]" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-textDim)' }}>
                                        {subAlbums.length} ALBUMS
                                      </span>
                                    </div>

                                    {subAlbums.map((group, idx) => {
                                      const isCurrentAlbumSelected = (focusedAlbumId && (focusedAlbumId === group.id || focusedAlbumId.toLowerCase() === group.album.toLowerCase())) ||
                                        (drillDownAlbum && drillDownAlbum.album.toLowerCase() === group.album.toLowerCase());

                                      return (
                                        <button
                                          key={group.id || idx}
                                          type="button"
                                          onClick={() => {
                                            setActivePlaylistId(targetPl.id);
                                            setFocusedAlbumId(group.id || group.album);
                                            setDrillDownAlbum(null);
                                            if (hoveredCategoryInMenu && hoveredCategoryInMenu !== '__ALL__') {
                                              setSelectedCategoryFilter(hoveredCategoryInMenu);
                                              try { localStorage.setItem('v2_solidSelectedCategoryFilter', hoveredCategoryInMenu); } catch {}
                                            }
                                            setIsCategoryCascadeMenuOpen(false);
                                          }}
                                          className="text-left px-2.5 py-1.5 flex items-center justify-between hover:opacity-80 transition-colors border-b last:border-b-0 cursor-pointer focus:outline-none"
                                          style={{
                                            borderColor: 'var(--theme-list-border)',
                                            backgroundColor: isCurrentAlbumSelected ? 'var(--theme-accentMuted)' : 'transparent',
                                            color: isCurrentAlbumSelected ? 'var(--theme-accent)' : 'var(--theme-textMain)',
                                            fontSize: `${listFontSize}px`
                                          }}
                                          title={`アルバム選択: ${group.album} (${group.tracks.length}曲)`}
                                        >
                                          <span className="truncate flex items-center gap-1.5 flex-1 pr-1 font-medium">
                                            <ListMusic size={listFontSize >= 13 ? 12 : 10.5} className="shrink-0" style={{ color: isCurrentAlbumSelected ? 'var(--theme-accent)' : 'var(--theme-list-textDim)' }} />
                                            <span className="truncate">{group.album}</span>
                                          </span>
                                          <span className="font-mono shrink-0 opacity-70" style={{ fontSize: `${Math.max(8.5, listFontSize - 2.5)}px` }}>
                                            {group.tracks.length}曲
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                );
                              }

                              // Frosted Glass Empty Panel (曇りガラス表示: 枠は維持し、中身はスライダーで透明度・曇り度を調整可能)
                              // 0〜50: 0%〜35% に推移, 50〜100: 35%〜100% に推移
                              const frostSurfacePercent = cascadeFrostLevel <= 50
                                ? Math.round((cascadeFrostLevel / 50) * 35)
                                : Math.round(35 + ((cascadeFrostLevel - 50) / 50) * 65);

                              // blur: 0%のとき0px, 50%のとき16px, 100%のとき24px
                              const frostBlurPx = cascadeFrostLevel <= 50
                                ? Math.round((cascadeFrostLevel / 50) * 16)
                                : Math.round(16 + ((cascadeFrostLevel - 50) / 50) * 8);

                              const frostedFgColor = isLightTheme ? '#1e293b' : '#ffffff';
                              const frostedSubColor = isLightTheme ? '#475569' : 'rgba(255, 255, 255, 0.75)';
                              const frostedBorderColor = isLightTheme ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.85)';
                              const frostedBgHighlight = isLightTheme ? 'rgba(30, 41, 59, 0.08)' : 'rgba(255, 255, 255, 0.12)';

                              return (
                                <div 
                                  className="border-l py-1 flex flex-col shrink-0 select-none transition-all relative overflow-hidden" 
                                  style={{ 
                                    width: `${cascadeColWidths.album}px`, 
                                    minWidth: '180px',
                                    height: `${cascadeHeight}px`,
                                    maxHeight: `${cascadeHeight}px`,
                                    borderColor: 'var(--theme-border)', 
                                    backgroundColor: frostSurfacePercent === 100 
                                      ? 'var(--theme-surface)' 
                                      : (frostSurfacePercent === 0 ? 'transparent' : `color-mix(in srgb, var(--theme-surface) ${frostSurfacePercent}%, transparent)`),
                                    backdropFilter: frostBlurPx > 0 ? `blur(${frostBlurPx}px)` : 'none',
                                    WebkitBackdropFilter: frostBlurPx > 0 ? `blur(${frostBlurPx}px)` : 'none'
                                  }}
                                >
                                  {/* Subdued header matching Column 1 (CATEGORIES) and Column 2 (ALL PLAYLISTS) */}
                                  <div className="px-2.5 py-1 uppercase tracking-wider font-semibold border-b flex justify-between items-center shrink-0" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-textDim)', fontSize: `${Math.max(9, listFontSize - 2)}px` }}>
                                    <span className="truncate flex items-center gap-1.5" title={targetPl ? targetPl.name : 'SUB-ALBUMS'}>
                                      <Folder size={listFontSize >= 13 ? 11 : 9.5} className="shrink-0 opacity-60" style={{ color: 'var(--theme-textDim)' }} />
                                      <span className="truncate opacity-80">{targetPl ? targetPl.name : 'SUB-ALBUMS'}</span>
                                    </span>
                                    <span className="font-mono opacity-60 text-[8px] px-1 border rounded-[2px]" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-textDim)' }}>
                                      {targetPl ? (targetPl.tracks.length > 0 ? '1 ALBUM' : 'EMPTY') : '—'}
                                    </span>
                                  </div>

                                  {/* Frosted Glass Body */}
                                  <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                                    <div 
                                      className="w-10 h-10 rounded-full border-[1.5px] flex items-center justify-center mb-2.5 shadow-sm transition-colors" 
                                      style={{ 
                                        borderColor: frostedBorderColor, 
                                        backgroundColor: frostedBgHighlight,
                                        color: frostedFgColor 
                                      }}
                                    >
                                      <Folder size={15} style={{ color: frostedFgColor }} strokeWidth={2} />
                                    </div>
                                    <span 
                                      className="text-[9.5px] font-mono tracking-widest uppercase font-semibold" 
                                      style={{ color: frostedFgColor }}
                                    >
                                      {targetPl ? 'NO SUB-CATEGORIES' : 'SELECT PLAYLIST'}
                                    </span>
                                    <span 
                                      className="text-[8px] font-mono mt-1 font-medium tracking-wide" 
                                      style={{ color: frostedSubColor }}
                                    >
                                      {targetPl ? '(SINGLE ALBUM)' : '(HOVER TO PREVIEW)'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Tactile Industrial Hand-Grip Resize Strip at the right edge of popover */}
                            <div
                              onMouseDown={(e) => handleCascadeGripMouseDown(e, 'all')}
                              className="w-4 hover:w-5 active:w-5 transition-all cursor-ew-resize shrink-0 flex flex-col items-center justify-center gap-1.5 select-none group border-l hover:bg-[var(--theme-accentMuted)]"
                              style={{ height: `${cascadeHeight}px`, backgroundColor: 'var(--theme-surfaceLighter)', borderColor: 'var(--theme-border)' }}
                              title="プルダウン全体の横幅をドラッグして自由に拡大・調整 (DRAG TO RESIZE WIDTH)"
                            >
                              <div className="flex flex-col items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                <GripVertical size={13} style={{ color: 'var(--theme-accent)' }} />
                                <div className="w-[3px] h-3 rounded-full bg-[var(--theme-textDim)] group-hover:bg-[var(--theme-accent)] transition-colors" />
                                <div className="w-[3px] h-3 rounded-full bg-[var(--theme-textDim)] group-hover:bg-[var(--theme-accent)] transition-colors" />
                                <div className="w-[3px] h-3 rounded-full bg-[var(--theme-textDim)] group-hover:bg-[var(--theme-accent)] transition-colors" />
                              </div>
                            </div>
                          </div>

                          {/* Industrial Footer with width & height controls, frosted glass slider, & tactile grip indicator */}
                          <div 
                            className="border-t px-2 py-1 flex items-center justify-between text-[8px] font-mono shrink-0 select-none gap-2" 
                            style={{ backgroundColor: 'var(--theme-listHeader-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-listHeader-textMuted)' }}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <GripVertical size={10} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                              <span className="truncate">W: CAT {cascadeColWidths.cat} • LIST {cascadeColWidths.pl} • ALB {cascadeColWidths.album} • H: {cascadeHeight}px</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {/* Frosted Glass / Transparency adjustment slider */}
                              <div 
                                className="flex items-center gap-1.5 px-2 py-0.5 border rounded-[1px]" 
                                style={{ borderColor: 'var(--theme-listHeader-border)', backgroundColor: 'var(--theme-surface)' }}
                                title="第3列（空枠）の曇りガラス・透明度を調整 (0%: 完全透明 〜 50%: 標準曇り 〜 100%: 不透明)"
                              >
                                <span className="opacity-70 text-[7.5px] font-mono tracking-wider">FROST:</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="5"
                                  value={cascadeFrostLevel}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setCascadeFrostLevel(val);
                                    try { localStorage.setItem('v2_solidCascadeFrostLevel', val.toString()); } catch {}
                                  }}
                                  className="w-14 h-1 cursor-pointer accent-[var(--theme-accent)]"
                                  style={{ accentColor: 'var(--theme-accent)' }}
                                />
                                <span className="w-5 text-right font-mono text-[7.5px] font-bold" style={{ color: 'var(--theme-accent)' }}>
                                  {cascadeFrostLevel}%
                                </span>
                              </div>

                              <span className="opacity-30 mx-0.5">|</span>

                              {/* Width controls */}
                              <button
                                type="button"
                                onClick={() => {
                                  setCascadeColWidths(prev => {
                                    const next = { cat: Math.max(140, prev.cat - 30), pl: Math.max(180, prev.pl - 40), album: Math.max(180, prev.album - 40) };
                                    try { localStorage.setItem('v2_solidCascadeColWidths', JSON.stringify(next)); } catch {}
                                    return next;
                                  });
                                }}
                                className="px-1.5 py-0.5 border rounded-[1px] hover:opacity-80 active:scale-95"
                                style={{ borderColor: 'var(--theme-listHeader-border)', backgroundColor: 'var(--theme-surface)', color: 'var(--theme-textMain)' }}
                                title="プルダウン横幅を縮小 (-)"
                              >
                                - W
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCascadeColWidths(prev => {
                                    const next = { cat: Math.min(500, prev.cat + 40), pl: Math.min(800, prev.pl + 60), album: Math.min(800, prev.album + 60) };
                                    try { localStorage.setItem('v2_solidCascadeColWidths', JSON.stringify(next)); } catch {}
                                    return next;
                                  });
                                }}
                                className="px-1.5 py-0.5 border rounded-[1px] hover:opacity-80 active:scale-95"
                                style={{ borderColor: 'var(--theme-listHeader-border)', backgroundColor: 'var(--theme-surface)', color: 'var(--theme-accent)' }}
                                title="プルダウン横幅を拡大 (+)"
                              >
                                + W
                              </button>

                              <span className="opacity-30 mx-0.5">|</span>

                              {/* Height controls */}
                              <button
                                type="button"
                                onClick={() => {
                                  setCascadeHeight(prev => {
                                    const next = Math.max(240, prev - 60);
                                    try { localStorage.setItem('v2_solidCascadeHeight', next.toString()); } catch {}
                                    return next;
                                  });
                                }}
                                className="px-1.5 py-0.5 border rounded-[1px] hover:opacity-80 active:scale-95"
                                style={{ borderColor: 'var(--theme-listHeader-border)', backgroundColor: 'var(--theme-surface)', color: 'var(--theme-textMain)' }}
                                title="プルダウンの高さを縮小 (短くする)"
                              >
                                - H
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCascadeHeight(prev => {
                                    const maxHeightAllowed = typeof window !== 'undefined' ? Math.max(300, window.innerHeight - 120) : 900;
                                    const next = Math.min(maxHeightAllowed, prev + 80);
                                    try { localStorage.setItem('v2_solidCascadeHeight', next.toString()); } catch {}
                                    return next;
                                  });
                                }}
                                className="px-1.5 py-0.5 border rounded-[1px] hover:opacity-80 active:scale-95"
                                style={{ borderColor: 'var(--theme-listHeader-border)', backgroundColor: 'var(--theme-surface)', color: 'var(--theme-accent)' }}
                                title="プルダウンの高さを拡大 (下に伸ばす)"
                              >
                                + H
                              </button>

                              {/* Reset */}
                              <button
                                type="button"
                                onClick={() => {
                                  const nextW = { cat: 192, pl: 280, album: 280 };
                                  setCascadeColWidths(nextW);
                                  try { localStorage.setItem('v2_solidCascadeColWidths', JSON.stringify(nextW)); } catch {}
                                  setCascadeHeight(520);
                                  try { localStorage.setItem('v2_solidCascadeHeight', '520'); } catch {}
                                  setCascadeFrostLevel(50);
                                  try { localStorage.setItem('v2_solidCascadeFrostLevel', '50'); } catch {}
                                }}
                                className="px-1 py-0.5 border rounded-[1px] hover:opacity-80 active:scale-95 ml-0.5"
                                style={{ borderColor: 'var(--theme-listHeader-border)', backgroundColor: 'var(--theme-surface)', color: 'var(--theme-listHeader-textMuted)' }}
                                title="標準サイズ（幅・高さ）および曇り度をリセット (RESET)"
                              >
                                RESET
                              </button>
                            </div>
                          </div>

                          {/* Bottom Height Resize Strip: ドラッグで下方向に自由に拡大・縮小 */}
                          <div
                            onMouseDown={handleCascadeHeightMouseDown}
                            className="h-2 w-full hover:h-2.5 bg-[var(--theme-surfaceLighter)] hover:bg-[var(--theme-accentMuted)] border-t transition-all cursor-ns-resize flex items-center justify-between px-2 select-none group shrink-0"
                            style={{ borderColor: 'var(--theme-border)' }}
                            title="ここを上下にドラッグしてプルダウンの高さを自由に調整 (DRAG TO RESIZE HEIGHT)"
                          >
                            <div className="flex-1 flex justify-center items-center">
                              <div className="w-12 h-[2px] rounded-full bg-[var(--theme-textDim)] group-hover:bg-[var(--theme-accent)] transition-colors" />
                            </div>
                            {/* Bottom-right Corner Diagonal Grip for simultaneous Width & Height resize */}
                            <div
                              onMouseDown={handleCascadeCornerMouseDown}
                              className="w-3 h-3 -mr-1 cursor-se-resize flex items-end justify-end p-0.5 opacity-60 hover:opacity-100 transition-opacity"
                              title="右下の角を斜めにドラッグして横幅と高さを同時に調整 (DRAG CORNER TO RESIZE)"
                            >
                              <div className="w-1.5 h-1.5 border-r border-b" style={{ borderColor: 'var(--theme-accent)' }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions for current selected category & sidebar collapse button */}
                  <div className="flex items-center gap-1 shrink-0">
                    {selectedCategoryFilter !== '__ALL__' && selectedCategoryFilter !== '__UNCATEGORIZED__' && (
                      <div className="flex items-center gap-0.5">
                        {confirmDeleteCategoryName === selectedCategoryFilter ? (
                          <div className="flex items-center gap-0.5 px-1 py-0.5 border rounded-[2px]" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-borderActive)' }}>
                            <span className="text-[7.5px] uppercase" style={{ color: 'var(--theme-accent)' }}>DEL?</span>
                            <button
                              onClick={() => handleDeleteCategory(selectedCategoryFilter)}
                              className="p-0.5 hover:opacity-80"
                              style={{ color: 'var(--theme-accent)' }}
                              title="カテゴリーを削除（所属リストは未分類になります）"
                            >
                              <Trash2 size={9} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteCategoryName(null)}
                              className="p-0.5 hover:opacity-80"
                              style={{ color: 'var(--theme-textDim)' }}
                              title="キャンセル"
                            >
                              <X size={9} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setRenamingCategoryName(selectedCategoryFilter);
                                setEditCategoryNameInput(selectedCategoryFilter);
                              }}
                              className="p-1 hover:opacity-80"
                              style={{ color: 'var(--theme-listHeader-textMuted)' }}
                              title="カテゴリー名を変更"
                            >
                              <Edit2 size={10} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteCategoryName(selectedCategoryFilter)}
                              className="p-1 hover:opacity-80"
                              style={{ color: 'var(--theme-listHeader-textMuted)' }}
                              title="カテゴリーを削除（所属リストは未分類になります）"
                            >
                              <Trash2 size={10} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    <button 
                      type="button"
                      onClick={() => {
                        prevSidebarWidthRef.current = sidebarWidth || 240;
                        setIsSidebarCollapsed(true);
                      }}
                      className="flex items-center justify-center border rounded-[2px] w-5 h-5 transition-colors hover:opacity-80 active:scale-95 shrink-0"
                      style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-listHeader-border)', color: 'var(--theme-listHeader-textMuted)' }}
                      title="サイドバーを折りたたむ（全画面表示）"
                    >
                      <PanelLeftClose size={11} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Tree mode toolbar (Seamlessly matched with LIST mode: h-[32px] px-2.5) */
                <div className="flex items-center justify-between px-2.5 h-[32px] border-b shrink-0 relative" style={{ backgroundColor: 'var(--theme-listHeader-bg)', borderColor: 'var(--theme-listHeader-border)' }}>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-mono tracking-wider font-semibold" style={{ color: 'var(--theme-listHeader-textMuted)' }}>
                      CATEGORIES ({categories.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const allCats = new Set([...categories, '__UNCATEGORIZED__']);
                        if (expandedCategoryNames.size >= allCats.size) {
                          setExpandedCategoryNames(new Set());
                          setTreeExpansionStage('collapsed');
                          try {
                            localStorage.setItem('v2_solid_tree_expand_stage', 'collapsed');
                            localStorage.setItem('v2_solid_expandedCategoryNames', JSON.stringify([]));
                          } catch {}
                        } else {
                          setExpandedCategoryNames(allCats);
                          setTreeExpansionStage('cats-only');
                          try {
                            localStorage.setItem('v2_solid_tree_expand_stage', 'cats-only');
                            localStorage.setItem('v2_solid_expandedCategoryNames', JSON.stringify(Array.from(allCats)));
                          } catch {}
                        }
                      }}
                      className="px-1.5 h-5 text-[8.5px] font-mono border rounded-[2px] hover:opacity-80 transition-colors flex items-center justify-center"
                      style={{
                        borderColor: 'var(--theme-listHeader-border)',
                        color: 'var(--theme-listHeader-textMuted)',
                        backgroundColor: 'var(--theme-bg)'
                      }}
                      title="すべてのカテゴリーフォルダーを一括開閉"
                    >
                      {expandedCategoryNames.size >= categories.length + 1 ? 'COLLAPSE CATS' : 'EXPAND CATS'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        prevSidebarWidthRef.current = sidebarWidth || 240;
                        setIsSidebarCollapsed(true);
                      }}
                      className="flex items-center justify-center border rounded-[2px] w-5 h-5 transition-colors hover:opacity-80 active:scale-95 shrink-0"
                      style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-listHeader-border)', color: 'var(--theme-listHeader-textMuted)' }}
                      title="サイドバーを折りたたむ（全画面表示）"
                    >
                      <PanelLeftClose size={11} />
                    </button>
                  </div>
                </div>
              )}
          <div className="flex flex-col h-full overflow-y-auto w-full relative" style={{ backgroundColor: 'var(--theme-list-bg)', scrollbarGutter: 'stable' }}>
            {(() => {
              const renderPlaylistItem = (pl: Playlist, plIdx: number, isSubItem: boolean = false) => {
              const isSelected = pl.id !== 'all-tracks' && selectedPlaylistIds.has(pl.id);
              const isActive = activePlaylistId === pl.id;
              const subAlbums = pl.id !== 'all-tracks' ? (playlistAlbumsMap[pl.id] || []) : [];
              const hasSubAlbums = subAlbums.length > 1;
              const isFolderExpanded = expandedSidebarFolderIds.has(pl.id);

              return (
              <React.Fragment key={pl.id}>
              <div
                draggable={pl.id !== 'all-tracks' && renamingPlaylistId !== pl.id}
                onDragStart={(e) => handlePlaylistDragStart(e, pl.id)}
                onDragOver={(e) => handlePlaylistDragOver(e, pl.id)}
                onDragLeave={() => {
                  if (dragOverPlaylistId === pl.id) {
                    setDragOverPlaylistId(null);
                  }
                }}
                onDrop={(e) => handlePlaylistDrop(e, pl.id)}
                onDragEnd={handlePlaylistDragEnd}
                onClick={(e) => {
                  if (pl.id === 'all-tracks') {
                    setActivePlaylistId('all-tracks');
                    setDrillDownAlbum(null);
                    setSelectedPlaylistIds(new Set());
                    lastSelectedPlaylistIdRef.current = null;
                    return;
                  }
                  if (isPlaylistSelectionMode) {
                    togglePlaylistSelection(e, pl.id);
                    setActivePlaylistId(pl.id);
                    setDrillDownAlbum(null);
                    return;
                  }
                  if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    togglePlaylistSelection(e, pl.id);
                  } else {
                    // Clicking the title/row ONLY selects this folder for the main view (showing all albums in main view)
                    // without expanding or collapsing the sidebar tree!
                    setActivePlaylistId(pl.id);
                    setFocusedAlbumId(null);
                    setDrillDownAlbum(null);
                  }
                }}
                onDoubleClick={() => {
                  if (pl.id !== 'all-tracks') {
                    setRenamingPlaylistId(pl.id);
                    setRenamingPlaylistName(pl.name);
                  }
                }}
                className={`text-left ${isSubItem ? 'pl-5 pr-3' : 'px-3'} py-2 tracking-widest flex items-center justify-between border-b transition-colors cursor-pointer group select-none ${pl.id !== 'all-tracks' && renamingPlaylistId !== pl.id ? 'cursor-grab active:cursor-grabbing' : ''}`}
                style={{
                  backgroundColor: isSelected 
                    ? 'var(--theme-list-accentMuted)' 
                    : (isActive && !drillDownAlbum ? 'var(--theme-list-accentMuted)' : (dragOverPlaylistId === pl.id ? 'var(--theme-list-surfaceLighter)' : 'transparent')),
                  borderBottomColor: dragOverPlaylistId === pl.id ? 'var(--theme-list-accent)' : 'var(--theme-list-border)',
                  borderLeft: `2px solid ${isSelected || isActive ? 'var(--theme-list-accent)' : 'transparent'}`,
                  color: isSelected || isActive ? 'var(--theme-list-textMain)' : 'var(--theme-list-textMuted)',
                  opacity: draggedPlaylistId === pl.id ? 0.5 : 1,
                  fontSize: 'var(--list-font-size)'
                }}
                onMouseEnter={e => {
                  if (!isSelected && !(isActive && !drillDownAlbum) && dragOverPlaylistId !== pl.id) {
                    e.currentTarget.style.backgroundColor = 'var(--theme-list-surfaceLighter)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected && !(isActive && !drillDownAlbum) && dragOverPlaylistId !== pl.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {renamingPlaylistId === pl.id ? (
                  <div className="flex-1 flex items-center gap-1 mr-1" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      type="text"
                      className="w-full bg-transparent border-b outline-none font-mono px-1"
                      style={{ borderColor: 'var(--theme-list-accent)', color: 'var(--theme-list-textMain)' }}
                      value={renamingPlaylistName}
                      onChange={(e) => setRenamingPlaylistName(e.target.value)}
                      onBlur={() => handleRenamePlaylist(pl.id, renamingPlaylistName)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRenamePlaylist(pl.id, renamingPlaylistName);
                        } else if (e.key === 'Escape') {
                          setRenamingPlaylistId(null);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRenamePlaylist(pl.id, renamingPlaylistName);
                      }}
                      className="p-0.5 hover:opacity-80 shrink-0"
                      style={{ color: 'var(--theme-list-accent)' }}
                      title="名前変更を確定"
                    >
                      <Check size={10} />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setRenamingPlaylistId(null);
                      }}
                      className="p-0.5 hover:opacity-80 shrink-0"
                      style={{ color: 'var(--theme-list-textDim)' }}
                      title="キャンセル"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 truncate min-w-0 flex-1 pr-1">
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
                    ) : hasSubAlbums ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedSidebarFolderIds(prev => {
                            const next = new Set(prev);
                            if (next.has(pl.id)) next.delete(pl.id);
                            else next.add(pl.id);
                            try {
                              localStorage.setItem('v2_solid_expandedSidebarFolderIds', JSON.stringify(Array.from(next)));
                              localStorage.setItem('v2_solid_tree_expand_stage', 'custom');
                            } catch {}
                            return next;
                          });
                        }}
                        className="flex items-center justify-center shrink-0 transition-transform hover:opacity-80 active:scale-95"
                        title={isFolderExpanded ? "フォルダを閉じる" : `フォルダを開く (${subAlbums.length} ALBUMS)`}
                      >
                        {isFolderExpanded ? (
                          <FolderOpen size={12} className="shrink-0" style={{ color: 'var(--theme-list-accent)' }} />
                        ) : (
                          <Folder size={12} className="shrink-0" style={{ color: isSelected || isActive ? 'var(--theme-list-accent)' : 'var(--theme-list-textDim)' }} />
                        )}
                      </button>
                    ) : (
                      <>
                        {isSelected ? (
                          <Check size={12} className="shrink-0" style={{ color: 'var(--theme-list-accent)' }} />
                        ) : (
                          <ListMusic size={12} className="shrink-0" style={{ color: isActive ? 'var(--theme-list-accent)' : 'var(--theme-list-textDim)' }} />
                        )}
                      </>
                    )}
                    <span className="truncate" title={`${pl.name}（ダブルクリックまたは右のペンアイコンで名前変更）`}>{pl.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 shrink-0">
                  {hasSubAlbums && (
                    <span
                      className="text-[8px] font-mono px-1 py-0.2 border rounded-[1px] tracking-normal"
                      style={{
                        borderColor: isFolderExpanded ? 'var(--theme-list-accent)' : 'var(--theme-list-border)',
                        color: isFolderExpanded || isSelected || isActive ? 'var(--theme-list-accent)' : 'var(--theme-list-textMuted)',
                        backgroundColor: 'var(--theme-list-surface)'
                      }}
                      title={`${subAlbums.length}個のアルバムフォルダが含まれています（左端のフォルダアイコンをクリックで開閉）`}
                    >
                      {subAlbums.length} ALB
                    </span>
                  )}
                  <span className="text-[9px] font-mono font-medium" style={{ color: isSelected || isActive ? 'var(--theme-list-textMain)' : 'var(--theme-list-textDim)' }}>
                    {pl.tracks.length.toString().padStart(3, '0')}
                  </span>
                  {pl.id !== 'all-tracks' && renamingPlaylistId !== pl.id && (
                    <>
                    {/* Category quick assign badge / popover */}
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCategoryMenuPlaylistId(prev => prev === pl.id ? null : pl.id);
                        }}
                        className={`hover:opacity-80 transition-opacity p-0.5 rounded-[1px] flex items-center gap-0.5 ${pl.category ? 'opacity-90' : 'opacity-0 group-hover:opacity-80'}`}
                        style={{
                          color: pl.category ? 'var(--theme-accent)' : 'var(--theme-list-textDim)',
                          backgroundColor: pl.category ? 'var(--theme-accentMuted)' : 'transparent',
                        }}
                        title={pl.category ? `カテゴリー: ${pl.category} (クリックで移動・変更)` : "カテゴリーを設定 (MOVE TO CATEGORY)"}
                      >
                        <Bookmark size={8.5} fill={pl.category ? 'currentColor' : 'none'} />
                        {pl.category && sidebarCategoryMode === 'dropdown' && (
                          <span className="text-[7.5px] font-mono truncate max-w-[44px]">{pl.category}</span>
                        )}
                      </button>

                      {activeCategoryMenuPlaylistId === pl.id && (
                        <div
                          className="absolute right-0 top-full mt-1 w-36 z-50 border rounded-[2px] shadow-2xl py-1 flex flex-col font-mono text-[9px]"
                          style={{
                            backgroundColor: 'var(--theme-surface)',
                            borderColor: 'var(--theme-border)',
                            color: 'var(--theme-textMain)'
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="px-2 py-0.5 text-[8px] uppercase tracking-wider border-b font-semibold" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-textDim)' }}>
                            MOVE TO CATEGORY
                          </div>
                          <button
                            type="button"
                            onClick={() => handleMovePlaylistToCategory(pl.id, undefined)}
                            className="text-left px-2 py-1 hover:opacity-80 flex items-center justify-between transition-colors"
                            style={{ backgroundColor: !pl.category ? 'var(--theme-accentMuted)' : 'transparent' }}
                          >
                            <span className="truncate flex items-center gap-1">
                              <Bookmark size={9} style={{ color: 'var(--theme-listHeader-textMuted)' }} strokeDasharray="2 2" />
                              <span>UNCATEGORIZED (未分類)</span>
                            </span>
                            {!pl.category && <Check size={9} style={{ color: 'var(--theme-accent)' }} />}
                          </button>
                          {categories.map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleMovePlaylistToCategory(pl.id, cat)}
                              className="text-left px-2 py-1 hover:opacity-80 flex items-center justify-between truncate transition-colors"
                              style={{ backgroundColor: pl.category === cat ? 'var(--theme-accentMuted)' : 'transparent' }}
                            >
                              <span className="truncate flex items-center gap-1">
                                <Bookmark size={9} style={{ color: 'var(--theme-accent)' }} />
                                {cat}
                              </span>
                              {pl.category === cat && <Check size={9} style={{ color: 'var(--theme-accent)' }} />}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreatingCategory(true);
                              setActiveCategoryMenuPlaylistId(null);
                            }}
                            className="text-left px-2 py-1 border-t hover:opacity-80 flex items-center gap-1 font-semibold"
                            style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-accent)' }}
                          >
                            <Plus size={8} />
                            <span>+ NEW CATEGORY</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <div className={`flex items-center space-x-0.5 transition-opacity ${confirmDeletePlaylistId === pl.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
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
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingPlaylistId(pl.id);
                              setRenamingPlaylistName(pl.name);
                            }}
                            className="hover:opacity-80 transition-opacity p-0.5"
                            title="フォルダ/リスト名を編集"
                          >
                            <Edit2 size={9.5} style={{ color: isSelected || isActive ? 'var(--theme-list-textMain)' : 'var(--theme-list-textDim)' }} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeletePlaylistId(pl.id);
                            }}
                            className="hover:opacity-80 transition-opacity p-0.5"
                            title="リストを削除（クリックで確認）"
                          >
                            <X size={10} style={{ color: isSelected || isActive ? 'var(--theme-list-textMain)' : 'var(--theme-list-textDim)' }} />
                          </button>
                        </>
                      )}
                    </div>
                    </>
                  )}
                </div>
              </div>

              {/* Collapsible Sub-Albums List inside this Folder Playlist */}
              {hasSubAlbums && isFolderExpanded && (
                <div
                  className="flex flex-col border-b"
                  style={{
                    backgroundColor: 'var(--theme-list-surface)',
                    borderColor: 'var(--theme-list-border)'
                  }}
                >
                  {/* Header row inside expanded folder */}
                  <div
                    onClick={() => {
                      setActivePlaylistId(pl.id);
                      setDrillDownAlbum(null);
                    }}
                    className="flex items-center justify-between pl-6 pr-2.5 py-1 border-b cursor-pointer transition-colors hover:opacity-90"
                    style={{
                      backgroundColor: isActive && !drillDownAlbum ? 'var(--theme-list-accentMuted)' : 'transparent',
                      borderColor: 'var(--theme-list-border)',
                      color: isActive && !drillDownAlbum ? 'var(--theme-list-accent)' : 'var(--theme-list-textDim)',
                      fontSize: 'var(--list-font-size-xs)'
                    }}
                    title="フォルダ内の全アルバムを表示"
                  >
                    <div className="flex items-center gap-1.5 truncate font-mono font-bold tracking-wider">
                      <LayoutGrid size={9} />
                      <span>ALL ALBUMS IN FOLDER ({subAlbums.length})</span>
                    </div>
                  </div>

                  {subAlbums.map((subAlb, subIdx) => {
                    const isSubActive = isActive && drillDownAlbum?.album.toLowerCase() === subAlb.album.toLowerCase();
                    const isSubPlaying = isPlaying && currentTrack && subAlb.tracks.some(t => t.id === currentTrack.id);
                    const isSubDragging = sidebarDragAlbum?.playlistId === pl.id && sidebarDragAlbum?.albumId === subAlb.id;
                    const isSubDragOver = sidebarDragOverAlbum?.playlistId === pl.id && sidebarDragOverAlbum?.albumId === subAlb.id;
                    const subKey = `${pl.id}::${subAlb.id}`;
                    const isRenamingThisSub = renamingSubAlbumKey === subKey;

                    return (
                      <div
                        key={subAlb.id}
                        draggable={!isRenamingThisSub}
                        onDragStart={(e) => {
                          if (isRenamingThisSub) {
                            e.preventDefault();
                            return;
                          }
                          e.stopPropagation();
                          setSidebarDragAlbum({ playlistId: pl.id, albumId: subAlb.id });
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (sidebarDragAlbum && sidebarDragAlbum.playlistId === pl.id && sidebarDragAlbum.albumId !== subAlb.id) {
                            setSidebarDragOverAlbum({ playlistId: pl.id, albumId: subAlb.id });
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (sidebarDragAlbum && sidebarDragAlbum.playlistId === pl.id && sidebarDragAlbum.albumId !== subAlb.id) {
                            handleReorderAlbum(sidebarDragAlbum.albumId, subAlb.id, pl.id);
                          }
                          setSidebarDragAlbum(null);
                          setSidebarDragOverAlbum(null);
                        }}
                        onDragEnd={(e) => {
                          e.stopPropagation();
                          setSidebarDragAlbum(null);
                          setSidebarDragOverAlbum(null);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isRenamingThisSub) return;
                          setActivePlaylistId(pl.id);
                          setDrillDownAlbum({ artist: subAlb.artist, album: subAlb.album });
                          setSelectedTrackIds(new Set());
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setRenamingSubAlbumKey(subKey);
                          setRenamingSubAlbumName(subAlb.album);
                        }}
                        className="group/sub flex items-center justify-between pl-6 pr-2 py-1.5 border-b last:border-b-0 cursor-pointer select-none transition-colors"
                        style={{
                          backgroundColor: isSubActive
                            ? 'var(--theme-list-accentMuted)'
                            : isSubDragOver
                            ? 'var(--theme-list-surfaceLighter)'
                            : 'transparent',
                          borderColor: isSubDragOver ? 'var(--theme-list-accent)' : 'var(--theme-list-border)',
                          borderLeft: `3px solid ${isSubActive ? 'var(--theme-list-accent)' : 'transparent'}`,
                          color: isSubActive ? 'var(--theme-list-textMain)' : 'var(--theme-list-textMuted)',
                          opacity: isSubDragging ? 0.45 : 1,
                          fontSize: 'var(--list-font-size-sm)'
                        }}
                        onMouseEnter={e => {
                          if (!isSubActive && !isSubDragOver) {
                            e.currentTarget.style.backgroundColor = 'var(--theme-list-surfaceLighter)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSubActive && !isSubDragOver) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                        title={`${subAlb.album} (${subAlb.tracks.length}曲) - クリックでアルバム表示 / ダブルクリックまたはペンアイコンでタイトル変更`}
                      >
                        {isRenamingThisSub ? (
                          <div
                            className="flex-1 flex items-center gap-1 mr-1"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => e.stopPropagation()}
                          >
                            <input
                              autoFocus
                              type="text"
                              className="w-full bg-transparent border-b outline-none font-mono px-1"
                              style={{ borderColor: 'var(--theme-list-accent)', color: 'var(--theme-list-textMain)' }}
                              value={renamingSubAlbumName}
                              onChange={(e) => setRenamingSubAlbumName(e.target.value)}
                              onBlur={() => handleRenameAlbum(subAlb, renamingSubAlbumName, pl.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleRenameAlbum(subAlb, renamingSubAlbumName, pl.id);
                                } else if (e.key === 'Escape') {
                                  setRenamingSubAlbumKey(null);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRenameAlbum(subAlb, renamingSubAlbumName, pl.id);
                              }}
                              className="p-0.5 hover:opacity-80 shrink-0"
                              style={{ color: 'var(--theme-list-accent)' }}
                              title="アルバム名変更を確定"
                            >
                              <Check size={9} />
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setRenamingSubAlbumKey(null);
                              }}
                              className="p-0.5 hover:opacity-80 shrink-0"
                              style={{ color: 'var(--theme-list-textDim)' }}
                              title="キャンセル"
                            >
                              <X size={9} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePlaylistId(pl.id);
                                handlePlayAlbum(subAlb);
                              }}
                              className="w-4 h-4 rounded-[1px] border flex items-center justify-center shrink-0 transition-colors hover:opacity-80"
                              style={{
                                backgroundColor: isSubPlaying ? 'var(--theme-list-accent)' : 'var(--theme-list-bg)',
                                borderColor: isSubPlaying || isSubActive ? 'var(--theme-list-accent)' : 'var(--theme-list-border)',
                                color: isSubPlaying ? '#ffffff' : 'var(--theme-list-accent)'
                              }}
                              title="このアルバムを今すぐ再生"
                            >
                              {isSubPlaying ? <Pause size={8} /> : <Play size={8} className="translate-x-[0.5px]" />}
                            </button>
                            {subAlb.coverUrl ? (
                              <img src={subAlb.coverUrl} alt="" className="w-4 h-4 object-cover border rounded-[1px] shrink-0" style={{ borderColor: 'var(--theme-list-border)' }} />
                            ) : (
                              <Disc size={10} className="shrink-0" style={{ color: isSubActive ? 'var(--theme-list-accent)' : 'var(--theme-list-textDim)' }} />
                            )}
                            <span className="truncate font-mono">{subAlb.album}</span>
                          </div>
                        )}

                        {!isRenamingThisSub && (
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Reorder Album Buttons + Edit Title Button inside Sidebar on hover */}
                            {confirmDeleteSubAlbumKey !== subKey && (
                              <div className="hidden group-hover/sub:flex items-center gap-0.5 mr-0.5" onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRenamingSubAlbumKey(subKey);
                                    setRenamingSubAlbumName(subAlb.album);
                                  }}
                                  className="w-3.5 h-3.5 border rounded-[1px] flex items-center justify-center hover:opacity-80"
                                  style={{ backgroundColor: 'var(--theme-list-bg)', borderColor: 'var(--theme-list-border)', color: 'var(--theme-list-textMain)' }}
                                  title="このアルバム名を編集"
                                >
                                  <Edit2 size={7.5} />
                                </button>
                                <button
                                  type="button"
                                  disabled={subIdx === 0}
                                  onClick={() => handleMoveAlbum(subAlb.id, 'top', pl.id)}
                                  className="w-3.5 h-3.5 border rounded-[1px] flex items-center justify-center disabled:opacity-20 hover:opacity-80"
                                  style={{ backgroundColor: 'var(--theme-list-bg)', borderColor: 'var(--theme-list-border)', color: 'var(--theme-list-textMain)' }}
                                  title="一番上へ移動 (Top)"
                                >
                                  <ChevronsUp size={8} />
                                </button>
                                <button
                                  type="button"
                                  disabled={subIdx === 0}
                                  onClick={() => handleMoveAlbum(subAlb.id, 'up', pl.id)}
                                  className="w-3.5 h-3.5 border rounded-[1px] flex items-center justify-center disabled:opacity-20 hover:opacity-80"
                                  style={{ backgroundColor: 'var(--theme-list-bg)', borderColor: 'var(--theme-list-border)', color: 'var(--theme-list-textMain)' }}
                                  title="一つ上へ移動 (Up)"
                                >
                                  <ChevronUp size={8} />
                                </button>
                                <button
                                  type="button"
                                  disabled={subIdx === subAlbums.length - 1}
                                  onClick={() => handleMoveAlbum(subAlb.id, 'down', pl.id)}
                                  className="w-3.5 h-3.5 border rounded-[1px] flex items-center justify-center disabled:opacity-20 hover:opacity-80"
                                  style={{ backgroundColor: 'var(--theme-list-bg)', borderColor: 'var(--theme-list-border)', color: 'var(--theme-list-textMain)' }}
                                  title="一つ下へ移動 (Down)"
                                >
                                  <ChevronDown size={8} />
                                </button>
                                <button
                                  type="button"
                                  disabled={subIdx === subAlbums.length - 1}
                                  onClick={() => handleMoveAlbum(subAlb.id, 'bottom', pl.id)}
                                  className="w-3.5 h-3.5 border rounded-[1px] flex items-center justify-center disabled:opacity-20 hover:opacity-80"
                                  style={{ backgroundColor: 'var(--theme-list-bg)', borderColor: 'var(--theme-list-border)', color: 'var(--theme-list-textMain)' }}
                                  title="一番下へ移動 (Bottom)"
                                >
                                  <ChevronsDown size={8} />
                                </button>
                              </div>
                            )}
                            <span className="text-[8.5px] font-mono" style={{ color: isSubActive ? 'var(--theme-list-textMain)' : 'var(--theme-list-textDim)' }}>
                              {subAlb.tracks.length.toString().padStart(2, '0')}
                            </span>
                            {/* Delete Sub-Album Button inside Sidebar */}
                            <div
                              className={`flex items-center transition-opacity ${
                                confirmDeleteSubAlbumKey === subKey
                                  ? 'opacity-100'
                                  : 'opacity-0 group-hover/sub:opacity-100'
                              }`}
                              onClick={e => e.stopPropagation()}
                            >
                              {confirmDeleteSubAlbumKey === subKey ? (
                                <div
                                  className="flex items-center gap-0.5 px-1 py-0.5 border rounded-[2px] ml-0.5"
                                  style={{
                                    backgroundColor: 'var(--theme-list-bg)',
                                    borderColor: 'var(--theme-list-borderActive)',
                                  }}
                                >
                                  <span className="text-[7.5px] uppercase tracking-tighter" style={{ color: 'var(--theme-list-accent)' }}>
                                    DEL?
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteAlbum(subAlb, pl.id);
                                    }}
                                    className="hover:opacity-80 p-0.5"
                                    title="このアルバムを削除"
                                    style={{ color: 'var(--theme-list-accent)' }}
                                  >
                                    <Trash2 size={9} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmDeleteSubAlbumKey(null);
                                    }}
                                    className="hover:opacity-80 p-0.5"
                                    title="キャンセル"
                                    style={{ color: 'var(--theme-list-textDim)' }}
                                  >
                                    <X size={9} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteSubAlbumKey(subKey);
                                  }}
                                  className="hover:opacity-80 ml-0.5 p-0.5"
                                  title="このアルバムを削除（クリックで確認）"
                                >
                                  <X size={9} style={{ color: isSubActive ? 'var(--theme-list-textMain)' : 'var(--theme-list-textDim)' }} />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

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
          };

          // Mode 1: DROPDOWN (案1)
              if (sidebarCategoryMode === 'dropdown') {
                const filteredPlaylists = playlists.filter(pl => {
                  if (pl.id === 'all-tracks') return true;
                  if (selectedCategoryFilter === '__ALL__') return true;
                  if (selectedCategoryFilter === '__UNCATEGORIZED__') return !pl.category;
                  return pl.category === selectedCategoryFilter;
                });

                return (
                  <>
                    {filteredPlaylists.map((pl, idx) => renderPlaylistItem(pl, idx, false))}
                    {filteredPlaylists.length === 1 && (
                      <div className="p-4 text-center font-mono text-[9px] tracking-wide" style={{ color: 'var(--theme-list-textDim)' }}>
                        NO PLAYLISTS IN THIS CATEGORY.<br />
                        DROP AUDIO BELOW TO ADD.
                      </div>
                    )}
                  </>
                );
              }

              // Mode 2: TREE (案2)
              const uncategorizedPlaylists = playlists.filter(p => p.id !== 'all-tracks' && !p.category);

              return (
                <>
                  {/* 1. ALL TRACKS Master Playlist */}
                  {playlists[0] && renderPlaylistItem(playlists[0], 0, false)}

                  {/* 2. CATEGORY FOLDERS */}
                  {categories.map((cat) => {
                    const catPlaylists = playlists.filter(p => p.id !== 'all-tracks' && p.category === cat);
                    const isExpanded = expandedCategoryNames.has(cat);
                    const isDragOver = dragOverCategoryTarget === cat;
                    const isRenaming = renamingCategoryName === cat;
                    const isBeingDragged = draggedCategoryName === cat;
                    const isReorderTarget = dragOverCategoryReorderTarget === cat;
                    const isDropAbove = isReorderTarget && categoryDropPosition === 'above';
                    const isDropBelow = isReorderTarget && categoryDropPosition === 'below';

                    return (
                      <div 
                        key={cat} 
                        className={`flex flex-col border-b last:border-b-0 relative transition-opacity ${isBeingDragged ? 'opacity-30' : ''}`} 
                        style={{ borderColor: 'var(--theme-list-border)' }}
                      >
                        {/* Reorder Drop Indicator Line (Above) */}
                        {isDropAbove && (
                          <div 
                            className="absolute top-0 left-0 right-0 h-[2px] z-30 pointer-events-none" 
                            style={{ backgroundColor: 'var(--theme-accent)' }} 
                          />
                        )}

                        {/* Category Folder Row */}
                        <div
                          onDragOver={(e) => {
                            if (draggedCategoryName) {
                              handleCategoryDragOverForReorder(e, cat);
                            } else {
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = 'copy';
                              if (dragOverCategoryTarget !== cat) setDragOverCategoryTarget(cat);
                            }
                          }}
                          onDragLeave={(e) => {
                            e.stopPropagation();
                            if (draggedCategoryName) {
                              if (dragOverCategoryReorderTarget === cat) {
                                setDragOverCategoryReorderTarget(null);
                                setCategoryDropPosition(null);
                              }
                            } else {
                              if (dragOverCategoryTarget === cat) setDragOverCategoryTarget(null);
                            }
                          }}
                          onDrop={(e) => {
                            if (draggedCategoryName) {
                              handleCategoryDropForReorder(e, cat);
                            } else {
                              handleCategoryFolderDrop(e, cat);
                            }
                          }}
                          onClick={() => toggleCategoryExpand(cat)}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setRenamingCategoryName(cat);
                            setEditCategoryNameInput(cat);
                          }}
                          className="flex items-center justify-between px-2 py-1.5 cursor-pointer select-none transition-colors group"
                          style={{
                            backgroundColor: isDragOver ? 'var(--theme-accentMuted)' : (isReorderTarget ? 'var(--theme-surfaceLighter)' : 'var(--theme-listHeader-bg)'),
                            borderLeft: isDragOver ? '3px solid var(--theme-accent)' : '3px solid transparent',
                            color: isDragOver ? 'var(--theme-accent)' : 'var(--theme-listHeader-text)'
                          }}
                          title={`${cat} (${catPlaylists.length} lists) - 前端グリップをドラッグして上下並べ替え / クリックで開閉 / ダブルクリックで名前変更 / リストや音源をD&Dで所属`}
                        >
                          <div className="flex items-center gap-1 truncate min-w-0 flex-1">
                            {/* Grip handle: Only this front area is draggable with grab cursor */}
                            <div
                              draggable={!isRenaming}
                              onDragStart={(e) => {
                                e.stopPropagation();
                                handleCategoryDragStart(e, cat);
                              }}
                              onDragEnd={(e) => {
                                e.stopPropagation();
                                handleCategoryDragEnd();
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className="p-1 -ml-1 -my-1 rounded-[2px] flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-black/10 dark:hover:bg-white/10 shrink-0 transition-colors"
                              title="ドラッグしてカテゴリーを並べ替え"
                            >
                              <GripVertical size={11} className="shrink-0 opacity-30 group-hover:opacity-80 hover:opacity-100 transition-opacity" style={{ color: 'var(--theme-listHeader-textMuted)' }} />
                            </div>
                            
                            <span className="text-[10px] shrink-0" style={{ color: 'var(--theme-listHeader-textMuted)' }}>
                              {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                            </span>
                            <Bookmark size={12} className="shrink-0" style={{ color: isExpanded ? 'var(--theme-accent)' : 'var(--theme-listHeader-textMuted)' }} fill={isExpanded ? 'currentColor' : 'none'} />
                            
                            {isRenaming ? (
                              <div className="flex items-center gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                                <input
                                  autoFocus
                                  type="text"
                                  value={editCategoryNameInput}
                                  onChange={e => setEditCategoryNameInput(e.target.value)}
                                  onBlur={() => handleRenameCategory(cat, editCategoryNameInput)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleRenameCategory(cat, editCategoryNameInput);
                                    else if (e.key === 'Escape') setRenamingCategoryName(null);
                                  }}
                                  className="w-full bg-transparent border-b outline-none font-mono px-1"
                                  style={{ borderColor: 'var(--theme-accent)', color: 'var(--theme-textMain)', fontSize: 'var(--list-font-size)' }}
                                />
                                <button onClick={() => handleRenameCategory(cat, editCategoryNameInput)} className="p-0.5 hover:opacity-80">
                                  <Check size={10} style={{ color: 'var(--theme-accent)' }} />
                                </button>
                                <button onClick={() => setRenamingCategoryName(null)} className="p-0.5 hover:opacity-80">
                                  <X size={10} style={{ color: 'var(--theme-textDim)' }} />
                                </button>
                              </div>
                            ) : (
                              <span className="font-mono font-semibold tracking-wider uppercase truncate" style={{ fontSize: 'var(--list-font-size)' }}>
                                {cat}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isDragOver ? (
                              <span className="text-[7.5px] font-mono px-1 border rounded-[1px]" style={{ borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)', backgroundColor: 'var(--theme-accentMuted)' }}>
                                ↳ DROP INTO
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono" style={{ color: 'var(--theme-listHeader-textMuted)' }}>
                                {catPlaylists.length.toString().padStart(2, '0')}
                              </span>
                            )}

                            {!isRenaming && (
                              <div className="hidden group-hover:flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRenamingCategoryName(cat);
                                    setEditCategoryNameInput(cat);
                                  }}
                                  className="p-0.5 hover:opacity-80"
                                  title="カテゴリー名を変更"
                                  style={{ color: 'var(--theme-listHeader-textMuted)' }}
                                >
                                  <Edit2 size={9} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat)}
                                  className="p-0.5 hover:opacity-80"
                                  title="カテゴリーを削除 (所属リストは未分類に戻ります)"
                                  style={{ color: 'var(--theme-listHeader-textMuted)' }}
                                >
                                  <Trash2 size={9} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Reorder Drop Indicator Line (Below) */}
                        {isDropBelow && (
                          <div 
                            className="absolute bottom-0 left-0 right-0 h-[2px] z-30 pointer-events-none" 
                            style={{ backgroundColor: 'var(--theme-accent)' }} 
                          />
                        )}

                        {/* Playlists in this category when expanded */}
                        {isExpanded && (
                          <div className="flex flex-col border-l ml-1" style={{ borderColor: 'var(--theme-list-border)' }}>
                            {catPlaylists.length === 0 ? (
                              <div
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (dragOverCategoryTarget !== cat) setDragOverCategoryTarget(cat);
                                }}
                                onDrop={(e) => handleCategoryFolderDrop(e, cat)}
                                className="px-3 py-1.5 text-[8.5px] font-mono italic tracking-wide"
                                style={{ color: 'var(--theme-list-textDim)' }}
                              >
                                EMPTY (リストまたは音源をD&Dで追加)
                              </div>
                            ) : (
                              catPlaylists.map((pl, idx) => renderPlaylistItem(pl, idx + 1, true))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* 3. UNCATEGORIZED FOLDER */}
                  {(() => {
                    if (uncategorizedPlaylists.length === 0 && categories.length === 0) return null;
                    const isExpanded = expandedCategoryNames.has('__UNCATEGORIZED__');
                    const isDragOver = dragOverCategoryTarget === '__UNCATEGORIZED__';

                    return (
                      <div className="flex flex-col border-b last:border-b-0" style={{ borderColor: 'var(--theme-list-border)' }}>
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.dataTransfer.dropEffect = 'copy';
                            if (dragOverCategoryTarget !== '__UNCATEGORIZED__') setDragOverCategoryTarget('__UNCATEGORIZED__');
                          }}
                          onDragLeave={(e) => {
                            e.stopPropagation();
                            if (dragOverCategoryTarget === '__UNCATEGORIZED__') setDragOverCategoryTarget(null);
                          }}
                          onDrop={(e) => handleCategoryFolderDrop(e, undefined)}
                          onClick={() => toggleCategoryExpand('__UNCATEGORIZED__')}
                          className="flex items-center justify-between px-2 py-1.5 cursor-pointer select-none transition-colors group"
                          style={{
                            backgroundColor: isDragOver ? 'var(--theme-accentMuted)' : 'var(--theme-listHeader-bg)',
                            borderLeft: isDragOver ? '3px solid var(--theme-accent)' : '3px solid transparent',
                            color: isDragOver ? 'var(--theme-accent)' : 'var(--theme-listHeader-textMuted)'
                          }}
                          title="UNCATEGORIZED (未分類) - クリックで開閉 / ドロップで未分類に移動"
                        >
                          <div className="flex items-center gap-1 truncate min-w-0 flex-1">
                            {/* Invisible spacer matching the category grip handle dimensions so Chevron, Bookmark mark and text align perfectly */}
                            <div
                              className="p-1 -ml-1 -my-1 rounded-[2px] flex items-center justify-center shrink-0 pointer-events-none select-none"
                              aria-hidden="true"
                            >
                              <div className="w-[11px] h-[11px]" />
                            </div>

                            <span className="text-[10px] shrink-0" style={{ color: 'var(--theme-listHeader-textMuted)' }}>
                              {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                            </span>
                            <Bookmark size={12} className="shrink-0" style={{ color: 'var(--theme-listHeader-textMuted)' }} strokeDasharray="2 2" />
                            <span className="font-mono font-semibold tracking-wider uppercase truncate" style={{ fontSize: 'var(--list-font-size)' }}>
                              UNCATEGORIZED
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isDragOver ? (
                              <span className="text-[7.5px] font-mono px-1 border rounded-[1px]" style={{ borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)', backgroundColor: 'var(--theme-accentMuted)' }}>
                                ↳ TO UNCATEGORIZED
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono" style={{ color: 'var(--theme-listHeader-textMuted)' }}>
                                {uncategorizedPlaylists.length.toString().padStart(2, '0')}
                              </span>
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="flex flex-col border-l ml-1" style={{ borderColor: 'var(--theme-list-border)' }}>
                            {uncategorizedPlaylists.length === 0 ? (
                              <div className="px-3 py-1.5 text-[8.5px] font-mono italic" style={{ color: 'var(--theme-list-textDim)' }}>
                                NO UNCATEGORIZED LISTS
                              </div>
                            ) : (
                              uncategorizedPlaylists.map((pl, idx) => renderPlaylistItem(pl, idx + 1, true))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              );
            })()}

            {/* Dedicated Industrial Drag & Drop Zone Box at bottom of list */}
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                resetDragOverState();
                const targetCat = sidebarCategoryMode === 'dropdown' && selectedCategoryFilter !== '__ALL__' && selectedCategoryFilter !== '__UNCATEGORIZED__'
                  ? selectedCategoryFilter
                  : undefined;
                handleDrop(e, targetCat);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="m-2 p-3 border-2 border-dashed rounded-[2px] flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer select-none relative overflow-hidden"
              style={{
                borderColor: isDragOver ? 'var(--theme-accent)' : 'var(--theme-listHeader-border)',
                backgroundColor: isDragOver ? 'var(--theme-accentMuted)' : 'var(--theme-list-surface)',
                color: isDragOver ? 'var(--theme-accent)' : 'var(--theme-list-textMuted)',
                boxShadow: isDragOver ? '0 0 12px rgba(0, 0, 0, 0.2), inset 0 0 8px var(--theme-accentMuted)' : 'none'
              }}
              title="クリックまたはドラッグ＆ドロップで音楽フォルダ・音源ファイルを追加"
            >
              <FolderPlus size={isDragOver ? 18 : 14} className={`transition-transform ${isDragOver ? 'scale-110 animate-bounce' : ''}`} style={{ color: 'var(--theme-accent)' }} />
              <span className="text-[9.5px] font-mono tracking-wider font-bold uppercase text-center" style={{ color: isDragOver ? 'var(--theme-accent)' : 'var(--theme-list-textMain)' }}>
                {isDragOver ? '■ RELEASE TO IMPORT AUDIO' : '+ DROP AUDIO FOLDERS / FILES'}
              </span>
              <span className="text-[8px] font-mono text-center leading-tight font-medium" style={{ color: isDragOver ? 'var(--theme-textMain)' : 'var(--theme-list-textDim)' }}>
                {isDragOver 
                  ? 'ここにドロップして音源フォルダ・ファイルを読み込み'
                  : sidebarCategoryMode === 'tree'
                  ? 'ここにD&Dで新規リスト作成 (上の各カテゴリー枠へ直接D&Dも可能)'
                  : (selectedCategoryFilter === '__ALL__' || selectedCategoryFilter === '__UNCATEGORIZED__'
                    ? 'ここにD&Dで新規リスト作成'
                    : `「${selectedCategoryFilter}」カテゴリーに追加`)}
              </span>
            </div>
          </div>
          {/* Resize Handle */}
          <div
            onMouseDown={handleSidebarMouseDown}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-20 transition-colors"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--theme-list-accent)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          />
          </>
          )}
        </div>

        {/* 05 PLAYLIST (Tracks) */}
        <div 
           className="flex-1 border flex flex-col relative w-full overflow-hidden transition-colors" 
           style={{ 
             backgroundColor: isDragOver ? 'var(--theme-accentMuted)' : 'var(--theme-list-bg)', 
             borderColor: isDragOver ? 'var(--theme-accent)' : 'var(--theme-border)',
             boxShadow: isDragOver ? 'inset 0 0 0 2px var(--theme-accent)' : 'none'
           }}
           onDragEnter={handleDragEnter}
           onDragOver={handleDragOver}
           onDragLeave={handleDragLeave}
           onDrop={(e) => {
             resetDragOverState();
             handleDrop(e);
           }}
        >
          {/* Drag & Drop Industrial Visual Overlay Guide */}
          {isDragOver && (
            <div 
              onClick={() => resetDragOverState()}
              onDragOver={handleDragOver}
              onDrop={(e) => {
                resetDragOverState();
                handleDrop(e);
              }}
              className="absolute inset-2 border-2 border-dashed z-50 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px] transition-all rounded-[2px] cursor-pointer"
              style={{
                borderColor: 'var(--theme-accent)',
                backgroundColor: 'var(--theme-surface)',
                boxShadow: '0 0 24px rgba(0,0,0,0.5), inset 0 0 15px var(--theme-accentMuted)'
              }}
              title="クリックまたはEscキーでドラッグ待機を解除"
            >
              <div 
                className="w-14 h-14 border-2 border-dashed rounded-full flex items-center justify-center transition-transform animate-pulse"
                style={{ borderColor: 'var(--theme-accent)', backgroundColor: 'var(--theme-accentMuted)' }}
              >
                <FolderPlus size={28} style={{ color: 'var(--theme-accent)' }} />
              </div>
              <div className="text-center font-mono flex flex-col gap-1 px-4 select-none">
                <div className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--theme-accent)' }}>
                  ■ RELEASE TO IMPORT AUDIO FOLDERS / FILES
                </div>
                <div className="text-[10px] tracking-wider font-semibold" style={{ color: 'var(--theme-textMain)' }}>
                  音源フォルダ・音楽ファイルをここにドロップしてください
                </div>
                <div className="text-[9px] tracking-wider opacity-70 mt-1" style={{ color: 'var(--theme-textMuted)' }}>
                  [ ALL MP3 / WAV / FLAC / M4A / AAC FILES SUPPORTED ]
                </div>
              </div>

              {/* Industrial Cancel Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  resetDragOverState();
                }}
                className="mt-2 flex items-center gap-1.5 px-3 py-1 border rounded-[2px] text-[9.5px] font-mono tracking-widest uppercase transition-colors hover:opacity-80 active:scale-95 cursor-pointer"
                style={{
                  backgroundColor: 'var(--theme-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-textMain)'
                }}
                title="ドラッグ待機をキャンセルして戻る (Escキーまたは画面クリックでも可能)"
              >
                <X size={11} style={{ color: 'var(--theme-accent)' }} />
                <span>CANCEL / RETURN [ESC]</span>
              </button>
            </div>
          )}
          <div className="border-b px-3 py-1 flex items-center h-9 min-h-[36px] max-h-[36px] justify-between shrink-0 relative z-30 font-mono text-[9px] gap-2 overflow-hidden whitespace-nowrap" style={{ backgroundColor: 'var(--theme-listHeader-bg)', borderColor: 'var(--theme-listHeader-border)' }}>
             <div className="flex items-center gap-2.5 min-w-0 shrink-0">
               <div className="flex items-center gap-1.5 shrink-0">
                 <button
                   onClick={() => {
                     if (isSidebarCollapsed) {
                       setIsSidebarCollapsed(false);
                       setSidebarWidth(prevSidebarWidthRef.current || 240);
                     } else {
                       prevSidebarWidthRef.current = sidebarWidth || 240;
                       setIsSidebarCollapsed(true);
                     }
                   }}
                   className="flex items-center gap-1 text-[8.5px] font-mono px-1.5 py-0.5 border rounded-[1px] transition-colors shrink-0 hover:opacity-80 active:scale-95"
                   style={{
                     backgroundColor: isSidebarCollapsed ? 'var(--theme-accentMuted)' : 'transparent',
                     borderColor: isSidebarCollapsed ? 'var(--theme-accent)' : 'var(--theme-listHeader-border)',
                     color: isSidebarCollapsed ? 'var(--theme-accent)' : 'var(--theme-listHeader-textMuted)'
                   }}
                   title={isSidebarCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ（全画面アルバム表示）"}
                 >
                   {isSidebarCollapsed ? <PanelLeftOpen size={9} /> : <PanelLeftClose size={9} />}
                   <span>{isSidebarCollapsed ? 'SHOW' : 'SIDEBAR'}</span>
                 </button>
                 <span className="text-[10px] uppercase tracking-wider pl-1" style={{ color: 'var(--theme-listHeader-textMuted)' }}>VIEW:</span>
                 <span className="text-[10px] uppercase tracking-wider font-bold truncate max-w-[130px]" style={{ color: 'var(--theme-accent)' }}>{activePlaylist.name}</span>
               </div>

               {/* View Mode Switcher: TRACKS | ALBUM | CARDS | LIST */}
               <div className="flex items-center gap-0.5 border-l pl-2 shrink-0" style={{ borderColor: 'var(--theme-listHeader-border)' }}>
                 <button
                   onClick={() => {
                     setBankViewMode('tracks');
                     localStorage.setItem('v2_solid_bank_view_mode', 'tracks');
                   }}
                   className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 border rounded-[1px] transition-colors font-bold"
                   style={bankViewMode === 'tracks'
                     ? { backgroundColor: 'var(--theme-accentMuted)', borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)' }
                     : { backgroundColor: 'transparent', borderColor: 'var(--theme-listHeader-border)', color: 'var(--theme-listHeader-textMuted)' }}
                   title="TRACKS モード（曲リスト・並び替え・編集）"
                 >
                   <ListMusic size={9} />
                   <span>TRACKS</span>
                 </button>
                 <button
                   onClick={() => {
                     setBankViewMode('album');
                     localStorage.setItem('v2_solid_bank_view_mode', 'album');
                   }}
                   className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 border rounded-[1px] transition-colors font-bold"
                   style={bankViewMode === 'album'
                     ? { backgroundColor: 'var(--theme-accentMuted)', borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)' }
                     : { backgroundColor: 'transparent', borderColor: 'var(--theme-listHeader-border)', color: 'var(--theme-listHeader-textMuted)' }}
                   title="ALBUM モード（ジャケット＋曲目リスト見開きカードを横にタイル敷き詰め表示）"
                 >
                   <Disc size={9} />
                   <span>ALBUM</span>
                 </button>
                 <button
                   onClick={() => {
                     setBankViewMode('card');
                     localStorage.setItem('v2_solid_bank_view_mode', 'card');
                   }}
                   className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 border rounded-[1px] transition-colors font-bold"
                   style={bankViewMode === 'card'
                     ? { backgroundColor: 'var(--theme-accentMuted)', borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)' }
                     : { backgroundColor: 'transparent', borderColor: 'var(--theme-listHeader-border)', color: 'var(--theme-listHeader-textMuted)' }}
                   title="CARD モード（アルバムジャケットを横にタイル敷き詰め表示）"
                 >
                   <LayoutGrid size={9} />
                   <span>CARDS</span>
                 </button>
                 <button
                   onClick={() => {
                     setBankViewMode('list');
                     localStorage.setItem('v2_solid_bank_view_mode', 'list');
                   }}
                   className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 border rounded-[1px] transition-colors"
                   style={bankViewMode === 'list'
                     ? { backgroundColor: 'var(--theme-accentMuted)', borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)' }
                     : { backgroundColor: 'transparent', borderColor: 'var(--theme-listHeader-border)', color: 'var(--theme-listHeader-textMuted)' }}
                   title="LIST モード（コンパクト行表示）"
                 >
                   <List size={9} />
                   <span>LIST</span>
                 </button>
               </div>

               {/* Album Mode Extra Controls: Global Tile Size Zoom & Artist Grouping */}
               {bankViewMode !== 'tracks' && (
                 <div className="flex items-center gap-1.5 border-l pl-2 shrink-0" style={{ borderColor: 'var(--theme-listHeader-border)' }}>
                   {(bankViewMode === 'card' || bankViewMode === 'album') && (
                     <div className="flex items-center gap-1.5">
                       <span className="text-[8.5px] font-mono font-bold tracking-wider" style={{ color: 'var(--theme-listHeader-textMuted)' }}>
                         SIZE:
                       </span>
                       
                       <button
                         onClick={() => {
                           const next = Math.max(90, cardScale - 20);
                           setCardScale(next);
                           localStorage.setItem('v2_solid_card_scale', String(next));
                         }}
                         className="w-4 h-4 flex items-center justify-center text-[10px] font-mono border rounded-[1px] hover:opacity-80 active:scale-95 transition-colors"
                         style={{
                           backgroundColor: 'var(--theme-bg)',
                           borderColor: 'var(--theme-listHeader-border)',
                           color: 'var(--theme-listHeader-text)',
                         }}
                         title="全体のタイルサイズを一括縮小（横の列数を増やす）"
                       >
                         -
                       </button>

                       <input
                         type="range"
                         min="90"
                         max="360"
                         step="10"
                         value={cardScale}
                         onChange={(e) => {
                           const val = parseInt(e.target.value, 10);
                           setCardScale(val);
                           localStorage.setItem('v2_solid_card_scale', String(val));
                         }}
                         className="w-20 sq-slider cursor-pointer"
                         title={`全体のタイル表示サイズ: ${cardScale}px`}
                       />

                       <button
                         onClick={() => {
                           const next = Math.min(360, cardScale + 20);
                           setCardScale(next);
                           localStorage.setItem('v2_solid_card_scale', String(next));
                         }}
                         className="w-4 h-4 flex items-center justify-center text-[10px] font-mono border rounded-[1px] hover:opacity-80 active:scale-95 transition-colors"
                         style={{
                           backgroundColor: 'var(--theme-bg)',
                           borderColor: 'var(--theme-listHeader-border)',
                           color: 'var(--theme-listHeader-text)',
                         }}
                         title="全体のタイルサイズを一括拡大"
                       >
                         +
                       </button>

                       <span className="text-[8.5px] font-mono w-8 text-right font-bold" style={{ color: 'var(--theme-accent)' }}>
                         {cardScale}px
                       </span>
                     </div>
                   )}

                   <button
                     onClick={() => {
                       const next = !groupByArtist;
                       setGroupByArtist(next);
                       localStorage.setItem('v2_solid_group_by_artist_v2', String(next));
                     }}
                     className="flex items-center gap-1 text-[8.5px] font-mono px-1.5 py-0.5 border rounded-[1px] transition-colors ml-1"
                     style={groupByArtist
                       ? { backgroundColor: 'var(--theme-accentMuted)', borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)' }
                       : { backgroundColor: 'transparent', borderColor: 'var(--theme-listHeader-border)', color: 'var(--theme-listHeader-textMuted)' }}
                     title={groupByArtist ? "現在：アーティスト別カードで横並びタイル表示（クリックでアルバム単体タイル表示へ切替）" : "現在：全アルバムを横並びタイル敷き詰め表示（クリックでアーティスト別タイル表示へ切替）"}
                   >
                     <User size={9} />
                     <span>BY ARTIST</span>
                   </button>

                   {activePlaylistId !== 'all-tracks' && albumGroups.length > 1 && (
                     <button
                       onClick={handleUnifyPlaylistAlbum}
                       className="flex items-center gap-1 text-[8.5px] font-mono px-1.5 py-0.5 border rounded-[1px] transition-colors hover:opacity-80 active:scale-95 ml-1"
                       style={{
                         backgroundColor: 'var(--theme-bg)',
                         borderColor: 'var(--theme-accent)',
                         color: 'var(--theme-accent)',
                       }}
                       title={`このリスト内の全曲を「${activePlaylist.name}」の1つのアルバムに統一してまとめる`}
                     >
                       <Layers size={9} />
                       <span>1 ALBUMに統一</span>
                     </button>
                   )}
                 </div>
               )}

               {/* Drill-down Breadcrumb */}
               {drillDownAlbum && (
                 <div className="flex items-center gap-2 border-l pl-2 shrink-0" style={{ borderColor: 'var(--theme-listHeader-border)' }}>
                   <button
                     onClick={() => setDrillDownAlbum(null)}
                     className="flex items-center gap-1 text-[8.5px] font-mono px-1.5 py-0.5 border rounded-[1px] transition-colors hover:opacity-80 active:scale-95"
                     style={{ backgroundColor: 'var(--theme-accentMuted)', borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)' }}
                     title="フォルダ全体の全曲/全アルバム表示へ戻る"
                   >
                     <ArrowLeft size={9} />
                     <span>ALL IN FOLDER</span>
                   </button>
                   <span className="text-[9px] font-mono font-bold truncate max-w-[160px]" style={{ color: 'var(--theme-listHeader-text)' }}>
                     {drillDownAlbum.album}
                   </span>
                 </div>
               )}
              </div>

             <div className="flex items-center gap-3 shrink-0">
               {(bankViewMode === 'tracks' || drillDownAlbum) && (
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
               )}
                {activeSortConfig.key !== 'none' && (bankViewMode === 'tracks' || drillDownAlbum) && (
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
                <span className="text-[9px] font-mono tracking-widest" style={{ color: 'var(--theme-listHeader-textMuted)' }}>
                  {drillDownAlbum ? `${drillDownTracks.length} TRACKS` : bankViewMode !== 'tracks' ? `${albumGroups.length} ALBUMS • ${displayTracks.length} TRACKS` : `${displayTracks.length} ITEMS`}
                </span>
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
            <div className="flex-1 flex flex-col items-center justify-center gap-4 select-none" style={{ color: 'var(--theme-list-textDim)' }}>
              <span className="tracking-widest text-[10px] uppercase font-mono">NO DATA STORES LINKED</span>
              <span className="tracking-widest text-[9px] uppercase font-mono" style={{ color: 'var(--theme-list-textDim)', opacity: 0.6 }}>DRAG &amp; DROP FILES OR FOLDER HERE</span>
              {activePlaylistId === 'all-tracks' ? (
                <button 
                  onClick={handleSelectFolder}
                  className="h-8 px-6 border transition-colors text-[10px] tracking-widest uppercase hover:opacity-80 rounded-[1px] font-mono"
                  style={{ borderColor: 'var(--theme-list-border)', color: 'var(--theme-list-textMuted)', backgroundColor: 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--theme-list-surfaceLighter)'; e.currentTarget.style.color = 'var(--theme-list-textMain)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--theme-list-textMuted)'; }}
                >
                  INITIALIZE FOLDER READ
                </button>
              ) : (
                <div className="flex items-center gap-3 mt-1">
                  <button 
                    onClick={() => setActivePlaylistId('all-tracks')}
                    className="flex items-center gap-1.5 h-8 px-4 border transition-colors text-[9.5px] font-mono tracking-widest uppercase hover:opacity-80 active:scale-95 rounded-[1px] cursor-pointer"
                    style={{ borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)', backgroundColor: 'var(--theme-accentMuted)' }}
                    title="全曲リスト (ALL TRACKS) へ戻る"
                  >
                    <ArrowLeft size={11} />
                    <span>RETURN TO ALL TRACKS</span>
                  </button>
                  <button 
                    onClick={handleSelectFolder}
                    className="flex items-center gap-1.5 h-8 px-4 border transition-colors text-[9.5px] font-mono tracking-widest uppercase hover:opacity-80 active:scale-95 rounded-[1px] cursor-pointer"
                    style={{ borderColor: 'var(--theme-list-border)', color: 'var(--theme-list-textMuted)', backgroundColor: 'transparent' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--theme-list-surfaceLighter)'; e.currentTarget.style.color = 'var(--theme-list-textMain)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--theme-list-textMuted)'; }}
                    title="音楽フォルダ・ファイルを追加"
                  >
                    <FolderOpen size={11} />
                    <span>READ DIRECTORY</span>
                  </button>
                </div>
              )}
            </div>
          ) : bankViewMode !== 'tracks' ? (
            <AlbumCardView
              activePlaylistId={activePlaylistId}
              albums={displayedAlbumGroups}
              artists={displayedArtistGroups}
              cardSize={cardSize}
              cardScale={cardScale}
              displayMode={bankViewMode}
              groupByArtist={groupByArtist}
              onPlayAlbum={handlePlayAlbum}
              onPlayTrack={handlePlayAlbumTrack}
              onPlayArtist={handlePlayArtist}
              onOpenAlbum={handleOpenAlbum}
              onMoveAlbum={(albumId, direction) => handleMoveAlbum(albumId, direction, activePlaylistId)}
              onReorderAlbum={(sourceId, targetId) => handleReorderAlbum(sourceId, targetId, activePlaylistId)}
              onMoveTracksToAlbum={handleMoveTracksToAlbum}
              onDeleteAlbum={(album) => handleDeleteAlbum(album, activePlaylistId)}
              onDeleteAlbums={(albumsToDelete) => handleDeleteMultipleAlbums(albumsToDelete, activePlaylistId)}
              onRenameAlbum={(album, newName) => handleRenameAlbum(album, newName, activePlaylistId)}
              focusedAlbumId={focusedAlbumId}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
            />
          ) : (
            <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden relative w-full" style={{ backgroundColor: 'var(--theme-list-bg)' }}>
              {drillDownAlbum && (
                <div className="flex items-center justify-between px-3 py-2 border-b shrink-0" style={{ backgroundColor: 'var(--theme-list-surfaceLighter)', borderColor: 'var(--theme-list-border)' }}>
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    <button
                      onClick={() => setDrillDownAlbum(null)}
                      className="flex items-center gap-1 px-2 py-1 border text-[9px] font-mono font-bold tracking-wider rounded-[1px] hover:opacity-80 active:scale-95 transition-colors shrink-0"
                      style={{ backgroundColor: 'var(--theme-list-bg)', borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)' }}
                      title="フォルダ全体の全曲表示へ戻る"
                    >
                      <ArrowLeft size={10} />
                      <span>フォルダ全体 ({activePlaylist.name}) に戻る</span>
                    </button>
                    <button
                      onClick={() => {
                        setDrillDownAlbum(null);
                        setBankViewMode('album');
                        localStorage.setItem('v2_solid_bank_view_mode', 'album');
                      }}
                      className="flex items-center gap-1 px-2 py-1 border text-[9px] font-mono font-bold tracking-wider rounded-[1px] hover:opacity-80 active:scale-95 transition-colors shrink-0"
                      style={{ backgroundColor: 'var(--theme-list-bg)', borderColor: 'var(--theme-list-border)', color: 'var(--theme-list-textMain)' }}
                      title="ALBUM カード一覧へ戻る"
                    >
                      <Disc size={10} />
                      <span>ALBUM一覧へ</span>
                    </button>
                    {albumGroups.find(a => a.album.toLowerCase() === drillDownAlbum.album.toLowerCase())?.coverUrl && (
                      <img 
                        src={albumGroups.find(a => a.album.toLowerCase() === drillDownAlbum.album.toLowerCase())?.coverUrl} 
                        alt="" 
                        className="w-7 h-7 object-cover border rounded-[1px] shrink-0" 
                        style={{ borderColor: 'var(--theme-list-border)' }} 
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      {editingDrillDownAlbum ? (
                        <div className="flex items-center gap-1.5 max-w-md" onClick={e => e.stopPropagation()}>
                          <input
                            autoFocus
                            type="text"
                            value={drillDownAlbumNameInput}
                            onChange={e => setDrillDownAlbumNameInput(e.target.value)}
                            onBlur={() => {
                              const targetAlb = albumGroups.find(a => a.album.toLowerCase() === drillDownAlbum.album.toLowerCase());
                              if (targetAlb) handleRenameAlbum(targetAlb, drillDownAlbumNameInput, activePlaylistId);
                              else setEditingDrillDownAlbum(false);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                const targetAlb = albumGroups.find(a => a.album.toLowerCase() === drillDownAlbum.album.toLowerCase());
                                if (targetAlb) handleRenameAlbum(targetAlb, drillDownAlbumNameInput, activePlaylistId);
                                else setEditingDrillDownAlbum(false);
                              } else if (e.key === 'Escape') {
                                setEditingDrillDownAlbum(false);
                              }
                            }}
                            className="w-full px-2 py-0.5 text-[11px] font-bold font-mono border outline-none rounded-[1px]"
                            style={{ backgroundColor: 'var(--theme-list-bg)', borderColor: 'var(--theme-accent)', color: 'var(--theme-list-textMain)' }}
                          />
                          <button
                            type="button"
                            onMouseDown={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              const targetAlb = albumGroups.find(a => a.album.toLowerCase() === drillDownAlbum.album.toLowerCase());
                              if (targetAlb) handleRenameAlbum(targetAlb, drillDownAlbumNameInput, activePlaylistId);
                              else setEditingDrillDownAlbum(false);
                            }}
                            className="p-1 border rounded-[1px] hover:opacity-80"
                            style={{ backgroundColor: 'var(--theme-list-bg)', borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)' }}
                            title="アルバム名変更を確定"
                          >
                            <Check size={10} />
                          </button>
                          <button
                            type="button"
                            onMouseDown={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditingDrillDownAlbum(false);
                            }}
                            className="p-1 border rounded-[1px] hover:opacity-80"
                            style={{ backgroundColor: 'var(--theme-list-bg)', borderColor: 'var(--theme-list-border)', color: 'var(--theme-list-textDim)' }}
                            title="キャンセル"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className="text-[11px] font-bold font-mono truncate cursor-pointer hover:opacity-80"
                            style={{ color: 'var(--theme-list-textMain)' }}
                            onDoubleClick={() => {
                              setEditingDrillDownAlbum(true);
                              setDrillDownAlbumNameInput(drillDownAlbum.album);
                            }}
                            title="ダブルクリックまたは右のボタンでアルバム名を編集"
                          >
                            {drillDownAlbum.album}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDrillDownAlbum(true);
                              setDrillDownAlbumNameInput(drillDownAlbum.album);
                            }}
                            className="px-1.5 py-0.5 border rounded-[1px] text-[8.5px] font-mono font-bold flex items-center gap-1 hover:opacity-80 shrink-0"
                            style={{ backgroundColor: 'var(--theme-list-bg)', borderColor: 'var(--theme-list-border)', color: 'var(--theme-list-textMain)' }}
                            title="このアルバムのタイトルを変更"
                          >
                            <Edit2 size={9} />
                            <span>名前変更</span>
                          </button>
                        </div>
                      )}
                      <div className="text-[9px] font-mono truncate mt-0.5" style={{ color: 'var(--theme-list-textMuted)' }}>
                        {drillDownAlbum.artist} • {drillDownTracks.length} TRACKS (曲順編集・再生モード)
                      </div>
                    </div>
                  </div>
                  {albumGroups.find(a => a.album.toLowerCase() === drillDownAlbum.album.toLowerCase()) && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handlePlayAlbum(albumGroups.find(a => a.album.toLowerCase() === drillDownAlbum.album.toLowerCase())!)}
                        className="flex items-center gap-1.5 px-3 py-1 border text-[9px] font-mono font-bold tracking-wider rounded-[1px] hover:opacity-80 active:scale-95 transition-colors"
                        style={{ backgroundColor: 'var(--theme-list-surface)', borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)' }}
                        title="このアルバムを再生"
                      >
                        <Play size={10} />
                        <span>PLAY ALBUM</span>
                      </button>
                      <button
                        onClick={() => handleDeleteAlbum(albumGroups.find(a => a.album.toLowerCase() === drillDownAlbum.album.toLowerCase())!, activePlaylistId)}
                        className="flex items-center gap-1 px-2 py-1 border text-[9px] font-mono font-bold tracking-wider rounded-[1px] hover:opacity-80 active:scale-95 transition-colors"
                        style={{ backgroundColor: 'var(--theme-list-bg)', borderColor: 'var(--theme-list-border)', color: 'var(--theme-list-textMuted)' }}
                        title="このアルバム自体を削除"
                      >
                        <Trash2 size={10} style={{ color: 'var(--theme-accent)' }} />
                        <span>ALBUM削除</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="w-full flex flex-col min-h-full">
                {/* List Header */}
                <div className="flex items-center uppercase tracking-normal px-2 h-8 border-b shrink-0 sticky top-0 z-20 text-[10px] w-full" style={{ backgroundColor: 'var(--theme-list-bg)', borderColor: 'var(--theme-list-border)', color: 'var(--theme-list-textMuted)' }}>
                  <div className="relative flex-shrink-0 flex items-center h-full" style={{ width: colWidths.index }}>
                    <div className="w-8 flex-shrink-0 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const allSelected = tracksToRender.length > 0 && tracksToRender.every(t => selectedTrackIds.has(t.id));
                          if (allSelected) {
                            setSelectedTrackIds(new Set());
                            lastSelectedTrackIdRef.current = null;
                          } else {
                            setSelectedTrackIds(new Set(tracksToRender.map(t => t.id)));
                          }
                        }}
                        className="w-3.5 h-3.5 border rounded-[1px] flex items-center justify-center hover:opacity-80 active:scale-95 transition-all cursor-pointer"
                        style={{
                          borderColor: (tracksToRender.length > 0 && tracksToRender.every(t => selectedTrackIds.has(t.id))) || tracksToRender.some(t => selectedTrackIds.has(t.id)) ? 'var(--theme-accent)' : 'var(--theme-list-border)',
                          backgroundColor: (tracksToRender.length > 0 && tracksToRender.every(t => selectedTrackIds.has(t.id))) ? 'var(--theme-accent)' : (tracksToRender.some(t => selectedTrackIds.has(t.id)) ? 'var(--theme-accentMuted)' : 'transparent'),
                        }}
                        title={tracksToRender.length > 0 && tracksToRender.every(t => selectedTrackIds.has(t.id)) ? "全選択を解除" : "表示中の全曲を一括選択 (全選択)"}
                      >
                        {tracksToRender.length > 0 && tracksToRender.every(t => selectedTrackIds.has(t.id)) && <Check size={10} style={{ color: '#ffffff' }} strokeWidth={3} />}
                        {tracksToRender.some(t => selectedTrackIds.has(t.id)) && !tracksToRender.every(t => selectedTrackIds.has(t.id)) && <Minus size={9} style={{ color: 'var(--theme-accent)' }} strokeWidth={3} />}
                      </button>
                    </div>
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
                <div className="flex flex-col flex-1 pb-16 w-full">
                  {memoizedTrackList}
                </div>

                {/* Floating / Sticky Industrial Batch Action Bar at bottom */}
                {selectedTrackIds.size > 0 && (
                  <div
                    className="sticky bottom-0 left-0 right-0 z-30 px-3 py-1.5 border-t flex items-center justify-between gap-2 font-mono shrink-0 select-none overflow-visible"
                    style={{
                      backgroundColor: 'var(--theme-surface)',
                      borderColor: 'var(--theme-border)',
                    }}
                  >
                    {/* Left: Selection Counter, Select All & Clear Button */}
                    <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 border rounded-[2px] flex items-center gap-1 shrink-0"
                        style={{
                          borderColor: 'var(--theme-accent)',
                          backgroundColor: 'var(--theme-accentMuted)',
                          color: 'var(--theme-accent)',
                        }}
                      >
                        <Check size={10} />
                        <span>{selectedTrackIds.size}曲 選択中</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTrackIds(new Set(tracksToRender.map(t => t.id)));
                        }}
                        className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 border rounded-[2px] hover:opacity-80 active:scale-95 transition-all cursor-pointer font-medium"
                        style={{
                          backgroundColor: 'var(--theme-bg)',
                          borderColor: 'var(--theme-border)',
                          color: 'var(--theme-textMain)',
                        }}
                        title="表示中の全曲を一括選択 (全選択)"
                      >
                        <CheckSquare size={10} style={{ color: 'var(--theme-accent)' }} />
                        <span>全選択</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedTrackIds(new Set()); lastSelectedTrackIdRef.current = null; }}
                        className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 border rounded-[2px] hover:opacity-80 active:scale-95 transition-all cursor-pointer font-medium"
                        style={{
                          backgroundColor: 'var(--theme-bg)',
                          borderColor: 'var(--theme-border)',
                          color: 'var(--theme-textMain)',
                        }}
                        title="選択をすべて解除"
                      >
                        <X size={10} style={{ color: 'var(--theme-textMain)' }} />
                        <span>解除</span>
                      </button>
                    </div>

                    {/* Right: Unified Square Icon Buttons (サイドバー上のボタンと同様に文字なし・同サイズのスクエアボタンで統一) */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Arrow Reorder Buttons */}
                      <div className="flex items-center gap-1 border-r pr-1.5 mr-0.5" style={{ borderColor: 'var(--theme-border)' }}>
                        <button
                          type="button"
                          disabled={!canMoveSelectedTop}
                          onClick={() => moveSelectedTracks('top')}
                          className="flex items-center justify-center border rounded-[2px] w-6 h-6 transition-colors hover:opacity-80 active:scale-95 disabled:opacity-25 cursor-pointer"
                          style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-textMain)' }}
                          title={`選択した${selectedTrackIds.size}曲を一番上へ移動 (TOP)`}
                        >
                          <ChevronsUp size={12} />
                        </button>
                        <button
                          type="button"
                          disabled={!canMoveSelectedUp}
                          onClick={() => moveSelectedTracks('up')}
                          className="flex items-center justify-center border rounded-[2px] w-6 h-6 transition-colors hover:opacity-80 active:scale-95 disabled:opacity-25 cursor-pointer"
                          style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-textMain)' }}
                          title={`選択した${selectedTrackIds.size}曲を上へ移動 (UP)`}
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          type="button"
                          disabled={!canMoveSelectedDown}
                          onClick={() => moveSelectedTracks('down')}
                          className="flex items-center justify-center border rounded-[2px] w-6 h-6 transition-colors hover:opacity-80 active:scale-95 disabled:opacity-25 cursor-pointer"
                          style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-textMain)' }}
                          title={`選択した${selectedTrackIds.size}曲を下へ移動 (DOWN)`}
                        >
                          <ChevronDown size={12} />
                        </button>
                        <button
                          type="button"
                          disabled={!canMoveSelectedBottom}
                          onClick={() => moveSelectedTracks('bottom')}
                          className="flex items-center justify-center border rounded-[2px] w-6 h-6 transition-colors hover:opacity-80 active:scale-95 disabled:opacity-25 cursor-pointer"
                          style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-textMain)' }}
                          title={`選択した${selectedTrackIds.size}曲を一番下へ移動 (BOTTOM)`}
                        >
                          <ChevronsDown size={12} />
                        </button>
                      </div>

                      {/* MOVE TO VIEW / ADD TO VIEW Popover */}
                      <div className="relative">
                        <button 
                          onClick={() => {
                            setShowAddToPlaylist(!showAddToPlaylist);
                            setShowMoveToAlbum(false);
                          }}
                          className="flex items-center justify-center border rounded-[2px] w-6 h-6 transition-colors hover:opacity-80 active:scale-95 cursor-pointer"
                          style={{
                            backgroundColor: showAddToPlaylist ? 'var(--theme-accentMuted)' : 'var(--theme-bg)',
                            borderColor: showAddToPlaylist ? 'var(--theme-accent)' : 'var(--theme-border)',
                            color: 'var(--theme-textMain)'
                          }}
                          title={activePlaylistId === 'all-tracks' ? "選択した曲を別のリストへ追加 (ADD TO VIEW)" : "選択した曲を別のリストへ移動 (MOVE TO VIEW)"}
                        >
                          <ListPlus size={12} style={{ color: 'var(--theme-accent)' }} />
                        </button>
                        {showAddToPlaylist && (
                          <div 
                            className="absolute bottom-full right-0 mb-1.5 w-72 max-w-[calc(100vw-32px)] border z-50 flex flex-col rounded-[2px] overflow-hidden shadow-2xl font-mono" 
                            style={{ 
                              backgroundColor: 'var(--theme-surface)', 
                              borderColor: 'var(--theme-border)',
                            }}
                          >
                            <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider border-b shrink-0 flex items-center justify-between" style={{ color: 'var(--theme-textMuted)', borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surfaceLighter)' }}>
                              <span>{activePlaylistId === 'all-tracks' ? '追加先のリストを選択' : '移動先のリストを選択'}</span>
                              <span className="font-bold" style={{ color: 'var(--theme-accent)' }}>{selectedTrackIds.size}曲</span>
                            </div>
                            <div className="flex flex-col overflow-y-auto max-h-60 w-full divide-y" style={{ borderColor: 'var(--theme-border)' }}>
                              {playlists.filter(p => p.id !== 'all-tracks' && p.id !== activePlaylistId).map(p => (
                                <button 
                                  key={p.id}
                                  onClick={() => {
                                    handleAddSelectedToPlaylist(p.id);
                                    setShowAddToPlaylist(false);
                                  }}
                                  className="text-left px-3 py-2 text-[10px] font-mono shrink-0 flex items-center gap-2 hover:opacity-80 transition-colors w-full cursor-pointer whitespace-nowrap min-h-[32px]"
                                  style={{ 
                                    color: 'var(--theme-textMain)',
                                    backgroundColor: 'transparent'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--theme-surfaceLighter)'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                  title={activePlaylistId === 'all-tracks' ? `ADD TO ${p.name}` : `MOVE TO ${p.name}`}
                                >
                                  <Bookmark size={11} className="shrink-0" style={{ color: 'var(--theme-accent)' }} />
                                  <span className="truncate flex-1 min-w-0 font-medium block whitespace-nowrap">{p.name}</span>
                                </button>
                              ))}
                              {playlists.filter(p => p.id !== 'all-tracks' && p.id !== activePlaylistId).length === 0 && (
                                <div className="px-3 py-3 text-[9px] uppercase tracking-wider opacity-50 text-center shrink-0" style={{ color: 'var(--theme-textMuted)' }}>NO OTHER VIEWS</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Move to another Album Popover (Always available when tracks are selected, with Create New Album support) */}
                      <div className="relative">
                        <button
                          onClick={() => {
                            setShowMoveToAlbum(!showMoveToAlbum);
                            setShowAddToPlaylist(false);
                          }}
                          className="flex items-center justify-center border rounded-[2px] w-6 h-6 transition-colors hover:opacity-80 active:scale-95 cursor-pointer"
                          style={{
                            backgroundColor: showMoveToAlbum ? 'var(--theme-accentMuted)' : 'var(--theme-bg)',
                            borderColor: showMoveToAlbum ? 'var(--theme-accent)' : 'var(--theme-border)',
                            color: 'var(--theme-textMain)',
                          }}
                          title="選択した曲を別のアルバムへ移動、または新規アルバムを作成して分離"
                        >
                          <Disc size={12} style={{ color: 'var(--theme-accent)' }} />
                        </button>
                        {showMoveToAlbum && (
                          <div
                            className="absolute bottom-full right-0 mb-1.5 w-80 max-w-[calc(100vw-32px)] border z-50 flex flex-col rounded-[2px] overflow-hidden shadow-2xl font-mono"
                            style={{ 
                              backgroundColor: 'var(--theme-surface)', 
                              borderColor: 'var(--theme-border)',
                            }}
                          >
                            <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider border-b shrink-0 flex items-center justify-between" style={{ color: 'var(--theme-textMuted)', borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surfaceLighter)' }}>
                              <span>移動先のアルバムを選択</span>
                              <span className="font-bold" style={{ color: 'var(--theme-accent)' }}>{selectedTrackIds.size}曲</span>
                            </div>

                            {/* Option to create a new album and move selected tracks into it */}
                            <div className="p-2 border-b flex items-center gap-1.5 shrink-0" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)' }}>
                              <input
                                type="text"
                                placeholder="新規アルバム名を作成して移動..."
                                value={newAlbumInputName}
                                onChange={e => setNewAlbumInputName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && newAlbumInputName.trim()) {
                                    handleMoveTracksToAlbum(Array.from(selectedTrackIds), { album: newAlbumInputName.trim() });
                                    setNewAlbumInputName('');
                                  }
                                }}
                                className="flex-1 min-w-0 text-[10px] font-mono px-2 py-1 border rounded-[1px] outline-none"
                                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-textMain)' }}
                              />
                              <button
                                type="button"
                                disabled={!newAlbumInputName.trim()}
                                onClick={() => {
                                  if (!newAlbumInputName.trim()) return;
                                  handleMoveTracksToAlbum(Array.from(selectedTrackIds), { album: newAlbumInputName.trim() });
                                  setNewAlbumInputName('');
                                }}
                                className="px-2 py-1 text-[9px] font-mono font-bold border rounded-[1px] hover:opacity-80 active:scale-95 disabled:opacity-40 transition-colors shrink-0"
                                style={{ backgroundColor: 'var(--theme-accentMuted)', borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)' }}
                                title="新しいアルバムを作成して選択曲を移動"
                              >
                                作成・移動
                              </button>
                            </div>

                            {/* Existing albums list */}
                            <div className="flex flex-col overflow-y-auto max-h-60 w-full divide-y" style={{ borderColor: 'var(--theme-border)' }}>
                              {albumGroups
                                .filter(a => !drillDownAlbum || a.album.toLowerCase() !== drillDownAlbum.album.toLowerCase())
                                .map(alb => (
                                  <button
                                    key={alb.id}
                                    onClick={() => {
                                      handleMoveTracksToAlbum(Array.from(selectedTrackIds), alb);
                                    }}
                                    className="text-left px-3 py-2 text-[10px] font-mono shrink-0 flex items-center justify-between gap-2.5 hover:opacity-80 transition-colors w-full cursor-pointer whitespace-nowrap min-h-[32px]"
                                    style={{ 
                                      color: 'var(--theme-textMain)',
                                      backgroundColor: 'transparent'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--theme-surfaceLighter)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                    title={`「${alb.album}」へ移動`}
                                  >
                                    <div className="flex-1 min-w-0 flex items-center gap-2">
                                      <Disc size={11} className="shrink-0 opacity-70" style={{ color: 'var(--theme-accent)' }} />
                                      <span className="truncate block font-bold font-mono whitespace-nowrap">{alb.album}</span>
                                    </div>
                                    <span className="text-[8.5px] shrink-0 opacity-70 font-mono whitespace-nowrap" style={{ color: 'var(--theme-textDim)' }}>{alb.tracks.length}曲</span>
                                  </button>
                                ))}
                              {albumGroups.filter(a => !drillDownAlbum || a.album.toLowerCase() !== drillDownAlbum.album.toLowerCase()).length === 0 && (
                                <div className="px-3 py-3 text-[9px] uppercase tracking-wider opacity-50 text-center shrink-0" style={{ color: 'var(--theme-textMuted)' }}>
                                  既存の別アルバムはありません。上の入力欄から新規アルバムを作成できます。
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Clean Filename to Title Tool */}
                      <button
                        onClick={handleBatchUseFilenameAsTitle}
                        className="flex items-center justify-center border rounded-[2px] w-6 h-6 transition-colors hover:opacity-80 active:scale-95 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--theme-bg)',
                          borderColor: 'var(--theme-border)',
                          color: 'var(--theme-textMain)',
                        }}
                        title="選択した曲のファイル名・既存タイトルから不要な番号等を除去した綺麗な曲名に整形 (CLEAN TITLE)"
                      >
                        <FileText size={12} style={{ color: 'var(--theme-accent)' }} />
                      </button>

                      {/* Reset Title to Raw Filename Tool */}
                      <button
                        onClick={handleBatchResetToFilename}
                        className="flex items-center justify-center border rounded-[2px] w-6 h-6 transition-colors hover:opacity-80 active:scale-95 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--theme-bg)',
                          borderColor: 'var(--theme-border)',
                          color: 'var(--theme-textMain)',
                        }}
                        title="選択した曲のタイトルを元のファイル名そのままに復元 (RESET TO FILENAME)"
                      >
                        <RotateCcw size={12} style={{ color: 'var(--theme-textMuted)' }} />
                      </button>

                      {/* Delete Selected Tracks */}
                      <button 
                        onClick={deleteSelectedTracks}
                        className="flex items-center justify-center border rounded-[2px] w-6 h-6 transition-colors hover:opacity-80 active:scale-95 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--theme-bg)',
                          borderColor: 'var(--theme-border)',
                          color: 'var(--theme-accent)',
                        }}
                        title="選択した曲を削除"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )}
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

      {/* Batch Move to Category Modal */}
      {showBatchMoveCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-mono select-none" onClick={() => setShowBatchMoveCategoryModal(false)}>
          <div className="w-full max-w-sm flex flex-col border shadow-2xl" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }} onClick={e => e.stopPropagation()}>
            <div className="px-3 py-2 border-b flex justify-between items-center" style={{ backgroundColor: 'var(--theme-listHeader-bg)', borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center gap-1.5">
                <Move size={12} style={{ color: 'var(--theme-accent)' }} />
                <span className="text-[11px] font-bold tracking-wider" style={{ color: 'var(--theme-textMain)' }}>
                  MOVE {selectedPlaylistIds.size} LISTS TO CATEGORY
                </span>
              </div>
              <button onClick={() => setShowBatchMoveCategoryModal(false)} className="hover:opacity-80 p-0.5" style={{ color: 'var(--theme-textMuted)' }}>
                <X size={12} />
              </button>
            </div>

            <div className="p-3 flex flex-col gap-2">
              <p className="text-[9.5px] leading-relaxed" style={{ color: 'var(--theme-textMuted)' }}>
                選択した {selectedPlaylistIds.size} 件のプレイリストの移動先カテゴリーを選択してください:
              </p>

              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => moveSelectedPlaylistsToCategory(undefined)}
                  className="text-left px-2.5 py-1.5 border rounded-[2px] text-[10px] tracking-wider transition-colors hover:opacity-80 flex items-center justify-between"
                  style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)', color: 'var(--theme-textMain)' }}
                >
                  <span className="truncate flex items-center gap-1.5">
                    <Bookmark size={10} style={{ color: 'var(--theme-textDim)' }} strokeDasharray="2 2" />
                    <span>UNCATEGORIZED (未分類に戻す)</span>
                  </span>
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => moveSelectedPlaylistsToCategory(cat)}
                    className="text-left px-2.5 py-1.5 border rounded-[2px] text-[10px] tracking-wider transition-colors hover:opacity-80 flex items-center justify-between"
                    style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)', color: 'var(--theme-textMain)' }}
                  >
                    <span className="truncate flex items-center gap-1.5">
                      <Bookmark size={10} style={{ color: 'var(--theme-accent)' }} />
                      {cat}
                    </span>
                    <span className="text-[8.5px] shrink-0 font-mono" style={{ color: 'var(--theme-textDim)' }}>
                      ({playlists.filter(p => p.id !== 'all-tracks' && p.category === cat).length} lists)
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-3 py-2 border-t flex justify-end gap-2" style={{ backgroundColor: 'var(--theme-listHeader-bg)', borderColor: 'var(--theme-border)' }}>
              <button
                type="button"
                onClick={() => setShowBatchMoveCategoryModal(false)}
                className="px-3 py-1 border rounded-[2px] text-[9.5px] font-mono tracking-wider hover:opacity-80 transition-colors"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-textDim)', backgroundColor: 'var(--theme-bg)' }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Title Clean / Modify Undo Notification Bar */}
      {titleUndoState && (
        <div 
          className="fixed bottom-3 right-4 z-50 flex items-center gap-2.5 px-3 py-1.5 border font-mono text-[10px] select-none shadow-2xl"
          style={{ 
            backgroundColor: 'var(--theme-surface)', 
            borderColor: 'var(--theme-accent)', 
            color: 'var(--theme-textMain)',
          }}
        >
          <div className="flex items-center gap-1.5">
            <FileText size={11} style={{ color: 'var(--theme-accent)' }} />
            <span>{titleUndoState.tracks.length}曲のタイトルを変更しました</span>
          </div>
          <button
            type="button"
            onClick={handleUndoTitleClean}
            className="px-2 py-0.5 border rounded-[1px] font-bold hover:opacity-80 active:scale-95 transition-colors flex items-center gap-1 cursor-pointer"
            style={{ 
              backgroundColor: 'var(--theme-accentMuted)', 
              borderColor: 'var(--theme-accent)', 
              color: 'var(--theme-accent)' 
            }}
            title="直前のタイトル変更を取り消して元のタイトル・アーティストに戻す"
          >
            <RotateCcw size={10} />
            <span>元に戻す (UNDO)</span>
          </button>
          <button
            type="button"
            onClick={() => setTitleUndoState(null)}
            className="p-0.5 hover:opacity-80 cursor-pointer"
            style={{ color: 'var(--theme-textMuted)' }}
            title="通知を閉じる"
          >
            <X size={11} />
          </button>
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

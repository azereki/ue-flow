/**
 * Bookmark hook — save and restore named viewport locations.
 * Stored in sessionStorage (per-session, keyed by origin).
 */
import { useState, useCallback } from 'react';

export interface Bookmark {
  id: string;
  label: string;
  graphName: string;
  viewport: { x: number; y: number; zoom: number };
}

const STORAGE_KEY = 'ueflow-bookmarks';

function loadBookmarks(): Bookmark[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks: Bookmark[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch { /* ignore quota errors */ }
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(loadBookmarks);

  const addBookmark = useCallback((label: string, graphName: string, viewport: { x: number; y: number; zoom: number }) => {
    setBookmarks((prev) => {
      const next = [...prev, {
        id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label,
        graphName,
        viewport,
      }];
      saveBookmarks(next);
      return next;
    });
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      saveBookmarks(next);
      return next;
    });
  }, []);

  const renameBookmark = useCallback((id: string, label: string) => {
    setBookmarks((prev) => {
      const next = prev.map((b) => b.id === id ? { ...b, label } : b);
      saveBookmarks(next);
      return next;
    });
  }, []);

  return { bookmarks, addBookmark, removeBookmark, renameBookmark };
}

import { useState, useCallback, useEffect } from 'react';
import { searchService } from '../services/SearchService';
import { SearchResult, SearchOptions, SearchHistoryEntry } from '../types/Search';
import { getDB } from '../../../hooks/useIndexedDB';

interface UseSearchReturn {
  search: (query: string, options?: SearchOptions) => Promise<SearchResult[]>;
  searchResults: SearchResult[];
  isLoading: boolean;
  searchHistory: SearchHistoryEntry[];
  addSearchToHistory: (query: string) => void;
  clearHistory: () => void;
}

export const useSearch = (): UseSearchReturn => {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);

  // Load search history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const db = await getDB();
        const tx = db.transaction('localCache', 'readonly');
        const store = tx.objectStore('localCache');
        const request = store.getAll();
        
        const entries = await new Promise<any[]>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        
        const history = entries
          .filter(e => e.key?.startsWith('search-history:'))
          .map(e => e.value)
          .sort((a, b) => b.timestamp - a.timestamp);
        
        setSearchHistory(history);
      } catch (error) {
        console.error('Error loading search history:', error);
      }
    };

    loadHistory();
  }, []);

  const search = useCallback(async (query: string, options?: SearchOptions): Promise<SearchResult[]> => {
    if (!query.trim()) {
      setSearchResults([]);
      return [];
    }

    setIsLoading(true);

    try {
      const results = await searchService.search(query, options);
      setSearchResults(results);
      return results;
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addSearchToHistory = useCallback(async (query: string) => {
    try {
      const db = await getDB();
      const tx = db.transaction('localCache', 'readwrite');
      const store = tx.objectStore('localCache');
      
      const key = `search-history:${query.toLowerCase()}`;
      
      // Get existing entry
      const getRequest = store.get(key);
      const entry = await new Promise<SearchHistoryEntry | null>((resolve, reject) => {
        getRequest.onsuccess = () => resolve(getRequest.result?.value || null);
        getRequest.onerror = () => reject(getRequest.error);
      });

      let newEntry: SearchHistoryEntry;

      if (entry) {
        // Update existing entry
        newEntry = {
          ...entry,
          timestamp: Date.now(),
          resultCount: searchResults.length
        };
      } else {
        // Create new entry
        newEntry = {
          query,
          timestamp: Date.now(),
          resultCount: searchResults.length
        };
      }

      await store.put({
        key,
        value: newEntry,
        timestamp: Date.now()
      });

      // Update local state
      setSearchHistory(prev => {
        const filtered = prev.filter(h => h.query !== query);
        return [newEntry, ...filtered].slice(0, 10);
      });
    } catch (error) {
      console.error('Error adding to search history:', error);
    }
  }, [searchResults]);

  const clearHistory = useCallback(async () => {
    try {
      const db = await getDB();
      const tx = db.transaction('localCache', 'readwrite');
      const store = tx.objectStore('localCache');
      
      // Get all keys starting with 'search-history:'
      const getAllRequest = store.getAll();
      const entries = await new Promise<any[]>((resolve, reject) => {
        getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      });

      for (const entry of entries) {
        if (entry.key?.startsWith('search-history:')) {
          store.delete(entry.key);
        }
      }

      setSearchHistory([]);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }, []);

  return {
    search,
    searchResults,
    isLoading,
    searchHistory,
    addSearchToHistory,
    clearHistory
  };
};

export default useSearch;
import { useState, useCallback, useEffect } from 'react';
import { searchService } from '../services/SearchService';
import { SearchResult, SearchOptions, SearchHistoryEntry } from '../types/Search';
import { deleteCloudRecord, getCloudRecords, upsertCloudRecord } from '../../../services/googleCloudStore';

type StoredSearchHistory = SearchHistoryEntry & { id: string };

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

  useEffect(() => {
    let active = true;
    getCloudRecords<StoredSearchHistory>('searchHistory')
      .then((entries) => {
        if (active) setSearchHistory(entries.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10));
      })
      .catch((error: unknown) => console.error('Error loading search history from Google Sheets:', error));
    return () => { active = false; };
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
      setSearchResults([]);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addSearchToHistory = useCallback(async (query: string) => {
    const id = `search-history:${query.toLowerCase()}`;
    const entry: StoredSearchHistory = {
      id,
      query,
      timestamp: Date.now(),
      resultCount: searchResults.length,
    };
    await upsertCloudRecord('searchHistory', entry);
    const all = await getCloudRecords<StoredSearchHistory>('searchHistory');
    setSearchHistory(all.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10));
  }, [searchResults]);

  const clearHistory = useCallback(async () => {
    const entries = await getCloudRecords<StoredSearchHistory>('searchHistory');
    await Promise.all(entries.map((entry) => deleteCloudRecord('searchHistory', entry.id)));
    setSearchHistory([]);
  }, []);

  return {
    search,
    searchResults,
    isLoading,
    searchHistory,
    addSearchToHistory,
    clearHistory,
  };
};

export default useSearch;

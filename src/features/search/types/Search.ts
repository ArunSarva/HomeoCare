// Search Result Types
export interface SearchResult {
  id: string;
  type: SearchType;
  title: string;
  subtitle?: string;
  highlight: string;
  matchType?: SearchMatchType;
}

export type SearchType = 'patient' | 'medicine' | 'prescription' | 'case' | 'followup' | 'appointment' | 'billing';
export type SearchMatchType = 'name' | 'id' | 'mobile' | 'medicine' | 'disease' | 'prescription' | 'notes' | 'symptoms';

// Search State
export interface SearchState {
  query: string;
  isOpen: boolean;
  results: SearchResult[];
  isLoading: boolean;
  searchHistory: string[];
  selectedResultId: string | null;
}

// Search Options
export interface SearchOptions {
  maxResults?: number;
  includeTypes?: SearchType[];
  excludeTypes?: SearchType[];
}

// Search Cache Entry
export interface SearchCacheEntry {
  query: string;
  results: SearchResult[];
  timestamp: number;
}

// Search History Entry
export interface SearchHistoryEntry {
  query: string;
  timestamp: number;
  resultCount: number;
}
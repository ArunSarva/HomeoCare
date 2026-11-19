import React, { useState, useRef, useEffect } from 'react';
import { useSearch } from '../hooks/useSearch';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  showHistory?: boolean;
  showShortcuts?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Search patients, medicines, cases...',
  showHistory = true,
  showShortcuts = true
}) => {
  const { search, searchHistory, clearHistory } = useSearch();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        search(query).then(results => {
          if (results.length > 0) {
            setShowResults(true);
          }
        });
      } else {
        setShowResults(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query, search]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K / Cmd+K to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowResults(false);
      setIsOpen(false);
    } else if (e.key === 'Enter' && query.trim()) {
      handleSearch(query.trim());
      setShowResults(false);
    }
  };

  const handleClearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearHistory();
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full max-w-md"
      role="search"
    >
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
          aria-label={placeholder}
        />
        
        {showShortcuts && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 border rounded text-gray-600">Ctrl</kbd>
              <span className="text-gray-400 text-sm">+</span>
              <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 border rounded text-gray-600">K</kbd>
            </div>
          </div>
        )}
      </div>

      {showResults && (isOpen || query) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto dark:bg-gray-800 dark:border-gray-600" role="listbox">
          {showHistory && searchHistory.length > 0 && (
            <div className="border-b border-gray-100 dark:border-gray-700">
              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Recent Searches</span>
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-primary hover:text-primary/80"
                  aria-label="Clear search history"
                >
                  Clear
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {searchHistory.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(item.query)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center justify-between dark:hover:bg-gray-700"
                    role="option"
                    aria-selected={query === item.query}
                  >
                    <span className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm">{item.query}</span>
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{item.resultCount} results</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showHistory && searchHistory.length > 0 && query && (
            <div className="border-b border-gray-100 dark:border-gray-700"></div>
          )}

          {query && (
            <div className="px-4 py-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Search Results</span>
            </div>
          )}

          {query && searchHistory.length === 0 && (
            <div className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
              <p>No recent searches</p>
              <p className="text-sm mt-1">Press Enter to search</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
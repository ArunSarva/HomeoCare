import React, { useState, useEffect } from 'react';
import { useSearch } from '../hooks/useSearch';
import { SearchResult, SearchType } from '../types/Search';

interface SearchResultsProps {
  query: string;
  onSelect?: (result: SearchResult) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ query, onSelect }) => {
  const { search, searchResults, isLoading } = useSearch();
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    if (query) {
      search(query);
    }
  }, [query, search]);

  const handleSelect = (result: SearchResult) => {
    if (onSelect) {
      onSelect(result);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, Math.max(searchResults.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      if (searchResults.length > 0) {
        handleSelect(searchResults[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      // Close results
    }
  };

  const getResultIcon = (type: SearchType) => {
    switch (type) {
      case 'patient':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'medicine':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        );
      case 'prescription':
        return (
          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'case':
        return (
          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'followup':
        return (
          <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'appointment':
        return (
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'billing':
        return (
          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
    }
  };

  const getTypeLabel = (type: SearchType) => {
    const labels: Record<SearchType, string> = {
      patient: 'Patient',
      medicine: 'Medicine',
      prescription: 'Prescription',
      case: 'Case',
      followup: 'Follow-up',
      appointment: 'Appointment',
      billing: 'Billing'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-2">
      {isLoading ? (
        <div className="text-center py-4 text-gray-500">
          <svg className="w-8 h-8 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-sm">Searching...</p>
        </div>
      ) : searchResults.length > 0 ? (
        <>
          <div className="px-4 py-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Search Results</span>
          </div>
          {searchResults.map((result, index) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              onKeyDown={handleKeyDown}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-start space-x-3 ${
                index === highlightedIndex ? 'bg-primary/5' : ''
              }`}
            >
              {getResultIcon(result.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-gray-900 truncate" dangerouslySetInnerHTML={{ __html: result.title }} />
                  <span className="text-xs font-medium text-gray-500 px-2 py-0.5 bg-gray-100 rounded-full">
                    {getTypeLabel(result.type)}
                  </span>
                </div>
                {result.subtitle && (
                  <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                )}
                <div 
                  className="text-xs text-gray-600 mt-1 line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: result.highlight }}
                />
              </div>
            </button>
          ))}
          <div className="px-4 py-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </>
      ) : (
        <div className="px-4 py-8 text-center text-gray-500">
          {query ? (
            <>
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-18 0 7 7 0 0118 0z" />
              </svg>
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-1">Try different keywords</p>
            </>
          ) : (
            <p className="text-sm">Start typing to search</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchResults;
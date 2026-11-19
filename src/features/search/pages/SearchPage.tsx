import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';
import { SearchResult } from '../types/Search';

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('query') || '';
  const [searchQuery, setSearchQuery] = useState(query);

  useEffect(() => {
    setSearchQuery(query);
  }, [query]);

  const handleSelectResult = useCallback((result: SearchResult) => {
    const routes: Record<string, string> = {
      patient: `/patients/${result.id}`, medicine: `/inventory/${result.id}`, prescription: `/prescriptions/${result.id}`,
      case: `/cases/${result.id}`, followup: '/followups', appointment: `/appointments/${result.id}`, billing: `/billing/${result.id}`,
    };
    navigate(routes[result.type] || '/search');
  }, [navigate]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Search</h1>
        <SearchBar 
          placeholder="Search patients, medicines, cases..."
          showHistory={true}
          showShortcuts={true}
          onSearch={(q) => navigate(`/search?query=${encodeURIComponent(q)}`)}
        />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <SearchResults query={searchQuery} onSelect={handleSelectResult} />
      </div>
    </div>
  );
};

export default SearchPage;
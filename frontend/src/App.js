import { useState } from 'react';
import './App.css';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setResults('Please enter a search query');
      return;
    }

    setIsLoading(true);
    setResults('Searching...');

    try {
      // Replace this URL with your backend API endpoint
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResults(JSON.stringify(data, null, 2));
    } catch (error) {
      setResults(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearResults = () => {
    setResults('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="App">
      <div className="search-container">
        <h1>Triagify Search</h1>
        
        <div className="input-group">
          <input
            type="text"
            className="search-input"
            placeholder="Enter your search query..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <button
            className="search-button"
            onClick={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        <div className="results-section">
          <div className="results-header">
            <h2>Results</h2>
            {results && (
              <button className="clear-button" onClick={handleClearResults}>
                Clear
              </button>
            )}
          </div>
          <textarea
            className="results-textarea"
            placeholder="Search results will appear here..."
            value={results}
            readOnly
          />
        </div>
      </div>
    </div>
  );
}

export default App;

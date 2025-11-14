import { useState } from 'react';
import './App.css';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setResults({ type: 'warning', message: 'Please enter a search query' });
      return;
    }

    setIsLoading(true);
    setResults({ type: 'loading' });

    try {
      console.log('Sending search request:', searchQuery);
      
      // Connect to your backend search API
      const response = await fetch('http://localhost:5000/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: searchQuery,
          searchFields: ['summary', 'description', 'comment']
        }),
      });
      
      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Format the results for better display with AI suggestions
      if (data.similarIssues && data.similarIssues.length > 0) {
        setResults({ type: 'success', data: data });
      } else {
        setResults({ type: 'empty', query: searchQuery });
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearResults = () => {
    setResults(null);
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
            placeholder="Enter your triagify query..."
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
          
          {!results && (
            <div className="results-placeholder">
              <p>🔍 Search results will appear here...</p>
              <p>Try searching for issue summaries, keywords, or descriptions</p>
            </div>
          )}
          
          {results?.type === 'loading' && (
            <div className="results-loading">
              <div className="loading-spinner"></div>
              <p>🔍 Searching for similar issues...</p>
            </div>
          )}
          
          {results?.type === 'warning' && (
            <div className="results-warning">
              <p>⚠️ {results.message}</p>
            </div>
          )}
          
          {results?.type === 'error' && (
            <div className="results-error">
              <h3>❌ Search Error</h3>
              <p>{results.message}</p>
              <p>Make sure your backend server is running on http://localhost:5000</p>
            </div>
          )}
          
          {results?.type === 'empty' && (
            <div className="results-empty">
              <h3>🤷‍♂️ No Issues Found</h3>
              <p>No similar issues found for: "{results.query}"</p>
              <div className="search-tips">
                <h4>Try searching for:</h4>
                <ul>
                  <li>Issue summaries</li>
                  <li>Keywords from descriptions</li>
                  <li>Error messages</li>
                  <li>Component names</li>
                </ul>
              </div>
            </div>
          )}
          
          {results?.type === 'success' && (
            <div className="results-success">
              <div className="search-summary">
                <h3>🔍 Triagified Results</h3>
                <p>Query: <strong>"{results.data.query}"</strong></p>
                <p>Found <strong>{results.data.total}</strong> similar issues</p>
              </div>
              
              <div className="similar-issues">
                <h4>📊 Similar Issues</h4>
                <div className="issues-grid">
                  {results.data.similarIssues.map((issue, index) => (
                    <div key={issue.key} className="issue-card">
                      <div className="issue-header">
                        <span className="issue-key">{issue.key}</span>
                        <span className="similarity-badge">{issue.similarityPercentage}</span>
                      </div>
                      <h5 className="issue-title">{issue.summary}</h5>
                      <div className="issue-meta">
                        <span className="status-badge status-{issue.status?.toLowerCase()}">
                          {issue.status}
                        </span>
                      </div>
                      <p className="issue-description">
                        {issue.text ? issue.text.substring(0, 150) + '...' : 'No description available'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              
              {results.data.aiSuggestion && (
                <div className="ai-suggestion">
                  <h4>🤖 AI Resolution Suggestion</h4>
                  <div className="suggestion-content">
                    {results.data.aiSuggestion.split('\n').map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                </div>
              )}
              
              <details className="raw-data">
                <summary>📋 View Raw API Response</summary>
                <pre>{JSON.stringify(results.data, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

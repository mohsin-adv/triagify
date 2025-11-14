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
        const formattedResults = ` Smart Search Results for: "${searchQuery}"\n` +
          `Found ${data.total} similar issues\n\n` +
          
          `SIMILAR ISSUES:\n` +
          `${'='.repeat(50)}\n` +
          data.similarIssues.map((issue, index) => 
            `${index + 1}. ${issue.key} - ${issue.summary}\n` +
            `   📈 Similarity: ${issue.similarityPercentage}\n` +
            `   📋 Status: ${issue.status}\n` +
            `   📝 Description: ${issue.text ? issue.text.substring(0, 150) + '...' : 'No description'}\n`
          ).join('\n') + 
          
          `\n🤖 AI RESOLUTION SUGGESTION:\n` +
          `${'='.repeat(50)}\n` +
          `${data.aiSuggestion || 'No AI suggestion available'}\n\n` +
          
          `📋 Raw API Response:\n` +
          `${'='.repeat(50)}\n` +
          JSON.stringify(data, null, 2);
        
        setResults(formattedResults);
      } else {
        setResults(`No issues found for query: "${searchQuery}"\n\nTry searching for:\n- Issue summaries\n- Keywords from descriptions\n- Assignee names\n- Status names`);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults(`Error: ${error.message}\n\nMake sure your backend server is running on http://localhost:5000`);
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

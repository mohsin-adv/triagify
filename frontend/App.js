import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("http://localhost:5000/api/jira/issues");
      setIssues(res.data.issues || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load issues. Please check your backend or API token.");
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch = issue.summary
      ?.toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus = status === "All" || issue.status === status;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-indigo-600">
          🧠 Triagify – Smart JIRA Reader
        </h1>
        <button
          onClick={fetchIssues}
          className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
        >
          Refresh
        </button>
      </header>

      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Search issues..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 p-2 rounded w-1/2"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-300 p-2 rounded"
        >
          <option value="All">All</option>
          <option value="To Do">To Do</option>
          <option value="In Progress">In Progress</option>
          <option value="Done">Done</option>
        </select>
      </div>

      {loading ? (
        <p>Loading issues...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <table className="w-full border-collapse border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Key</th>
              <th className="border p-2">Summary</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Priority</th>
            </tr>
          </thead>
          <tbody>
            {filteredIssues.length > 0 ? (
              filteredIssues.map((issue) => (
                <tr key={issue.key} className="hover:bg-gray-50">
                  <td className="border p-2">{issue.key}</td>
                  <td className="border p-2">{issue.summary}</td>
                  <td className="border p-2">{issue.status}</td>
                  <td className="border p-2">{issue.priority}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center p-4 text-gray-500">
                  No issues found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <footer className="mt-4 text-sm text-gray-500">
        Total Issues: {filteredIssues.length}
      </footer>
    </div>
  );
}

export default App;

import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { getAllIssues } from "../services/jiraService.js";

// Load environment variables
dotenv.config();

const router = express.Router();

const JIRA_BASE_URL = process.env.JIRA_BASE_URL || 'https://advancedcsg.atlassian.net';
const JIRA_EMAIL = process.env.JIRA_EMAIL || 'mohsin.vahora@oneadvanced.com';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN; 

router.get("/issues/:projectKey", async (req, res) => {
  const { projectKey } = req.params;

  // quick debug
  console.log("Fetching issues for:", projectKey);

  try {
    const result = await getAllIssues(projectKey);
    return res.json(result);
  } catch (err) {
    console.error("Error fetching issues:", err.message);
    res.status(500).json({
      error: "Failed to fetch project issues",
      details: err.message,
    });
  }
});

// 🔍 Smart Search API using Vector Similarity and AI Suggestions
router.post("/search", async (req, res) => {
  const { query, searchFields } = req.body;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: "Search query is required" });
  }

  const searchQuery = query.trim();
  console.log("🔍 Processing search query:", searchQuery);

  try {
    // Step 1: Import required functions
    const { findSimilarIssues } = await import("../services/vector.js");
    const { getResolutionSuggestion } = await import("../services/claude.js");

    // Step 2: Query for similar issues using vector similarity
    console.log("📊 Finding similar issues using vector similarity...");
    const similarIssues = await findSimilarIssues(searchQuery);
    
    console.log("Similar Issues found:", similarIssues.map(i => i.key));

    // Step 3: Get Claude's recommended resolution
    console.log("🧠 Getting AI resolution suggestion...");
    const suggestion = await getResolutionSuggestion(
      { query: searchQuery }, 
      similarIssues
    );

    console.log("\n🎯 Suggested Resolution:\n", suggestion);

    // Format response with similar issues and AI suggestion
    const response = {
      query: searchQuery,
      total: similarIssues.length,
      similarIssues: similarIssues.map(issue => ({
        key: issue.key,
        summary: issue.summary,
        text: issue.text,
        status: issue.status,
        similarity: Math.round(issue.similarity * 100) / 100, // Round to 2 decimal places
        similarityPercentage: `${Math.round(issue.similarity * 100)}%`
      })),
      aiSuggestion: suggestion,
      searchFields: searchFields || ['summary', 'description', 'comment']
    };

    res.json(response);

  } catch (err) {
    console.error("❌ Smart search error:", err.message);
    res.status(500).json({
      error: "Failed to process smart search",
      details: err.message,
      suggestion: "Make sure the issue vector database exists and AI services are configured"
    });
  }
});

export default router;

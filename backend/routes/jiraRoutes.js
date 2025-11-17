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

    // Step 2: Enhanced semantic search with clustering (VP's suggestion)
    console.log("📊 Finding similar issues using enhanced semantic search...");
    const { semanticSearchWithClusters } = await import("../services/vector.js");
    const searchResults = await semanticSearchWithClusters(searchQuery);
    const similarIssues = searchResults.similarIssues;
    
    console.log("Similar Issues found:", similarIssues.map(i => i.key));
    console.log("Relevant Clusters:", searchResults.relevantClusters.map(c => c.category));

    // Step 3: Get Claude's recommended resolution
    console.log("🧠 Getting AI resolution suggestion...");
    const suggestion = await getResolutionSuggestion(
      { query: searchQuery }, 
      similarIssues
    );

    console.log("\n🎯 Suggested Resolution:\n", suggestion);

    // Enhanced response with metadata, tags, and clustering (VP's suggestions)
    const response = {
      query: searchQuery,
      total: similarIssues.length,
      
      // Enhanced similar issues with metadata and tags
      similarIssues: similarIssues.map(issue => ({
        key: issue.key,
        summary: issue.summary,
        text: issue.text,
        status: issue.status,
        similarity: Math.round(issue.similarity * 100) / 100,
        similarityPercentage: `${Math.round(issue.similarity * 100)}%`,
        
        // VP requested metadata
        metadata: issue.metadata || {},
        tags: issue.tags || [],
        autoSummary: issue.autoSummary || issue.summary,
        clusterCategory: issue.clusterCategory
      })),
      
      // VP requested clustering information
      clusters: searchResults.relevantClusters || [],
      
      // AI suggestion
      aiSuggestion: suggestion,
      
      // Analytics for operationalization
      analytics: {
        searchFields: searchFields || ['summary', 'description', 'comment'],
        timestamp: new Date().toISOString(),
        clusterCount: searchResults.relevantClusters?.length || 0,
        avgSimilarity: similarIssues.length > 0 
          ? Math.round((similarIssues.reduce((sum, i) => sum + i.similarity, 0) / similarIssues.length) * 100) / 100 
          : 0
      }
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

// 🎯 Clustering Management API (VP's operationalization request)
router.post("/cluster", async (req, res) => {
  const { threshold = 0.7, regenerate = false } = req.body;

  try {
    const { clusterIssues } = await import("../services/vector.js");
    
    console.log("🎯 Generating issue clusters for operational insights...");
    const clusters = await clusterIssues(threshold);
    
    // Operational metrics for Platform Ops and Customer Support
    const metrics = {
      totalClusters: clusters.length,
      totalIssues: clusters.reduce((sum, c) => sum + c.members.length, 0),
      criticalClusters: clusters.filter(c => c.category === 'Critical Issues').length,
      bugClusters: clusters.filter(c => c.category === 'Bug Reports').length,
      performanceClusters: clusters.filter(c => c.category === 'Performance Issues').length,
      
      // Top categories for ops teams
      categorySummary: clusters.reduce((acc, c) => {
        acc[c.category] = (acc[c.category] || 0) + c.members.length;
        return acc;
      }, {}),
      
      // Largest clusters (potential operational focus areas)
      topClusters: clusters.slice(0, 5).map(c => ({
        id: c.id,
        category: c.category,
        size: c.members.length,
        commonTags: c.commonTags,
        avgSimilarity: Math.round(c.avgSimilarity * 100) / 100
      }))
    };

    res.json({
      message: "Issue clustering completed for operational analysis",
      clusters: clusters,
      operationalMetrics: metrics,
      recommendations: generateOperationalRecommendations(metrics)
    });

  } catch (err) {
    console.error("❌ Clustering error:", err.message);
    res.status(500).json({
      error: "Failed to generate issue clusters",
      details: err.message
    });
  }
});

function generateOperationalRecommendations(metrics) {
  const recommendations = [];
  
  if (metrics.criticalClusters > 0) {
    recommendations.push({
      priority: "HIGH",
      team: "Platform Ops",
      action: `Immediate attention needed: ${metrics.criticalClusters} critical issue clusters identified`,
      impact: "System Stability"
    });
  }
  
  if (metrics.bugClusters > 2) {
    recommendations.push({
      priority: "MEDIUM", 
      team: "Development",
      action: `Bug pattern analysis recommended: ${metrics.bugClusters} bug clusters found`,
      impact: "Product Quality"
    });
  }
  
  if (metrics.performanceClusters > 1) {
    recommendations.push({
      priority: "MEDIUM",
      team: "Platform Ops", 
      action: `Performance optimization needed: ${metrics.performanceClusters} performance clusters`,
      impact: "User Experience"
    });
  }
  
  // Customer Support recommendations
  const topCategory = Object.keys(metrics.categorySummary).reduce((a, b) => 
    metrics.categorySummary[a] > metrics.categorySummary[b] ? a : b
  );
  
  recommendations.push({
    priority: "LOW",
    team: "Customer Support",
    action: `Focus training on ${topCategory} - highest volume category`,
    impact: "Support Efficiency"
  });
  
  return recommendations;
}

export default router;

import express from "express";
import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const router = express.Router();

const JIRA_BASE_URL = process.env.JIRA_BASE_URL || 'https://advancedcsg.atlassian.net';
const JIRA_EMAIL = process.env.JIRA_EMAIL || 'mohsin.vahora@oneadvanced.com';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN; 

router.get("/issues/:projectKey", async (req, res) => {
  const { projectKey } = req.params;

  // quick debug
  console.log("API token :", JIRA_API_TOKEN ? `${JIRA_API_TOKEN.substring(0, 10)}...` : 'undefined');
  console.log("Fetching issues for:", projectKey);
  console.log("Using Jira URL:", JIRA_BASE_URL);
  console.log("Using Jira Email:", JIRA_EMAIL);

  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    return res
      .status(500)
      .json({ error: "JIRA credentials or base URL not configured properly." });
  }

  try {
    const response = await axios.post(
      `${JIRA_BASE_URL}/rest/api/3/search/jql`, // ✅ updated to new endpoint
      {
        jql: `project = ${projectKey} ORDER BY created DESC`,
        maxResults: 100,
        fields: ["summary", "status", "priority", "assignee", "comment", "worklog", "timespent", "timeoriginalestimate", "timeestimate", "workdone", "rootcause", "rootcauseresolution", "customfield_*"],
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${JIRA_EMAIL}:${JIRA_API_TOKEN}`
          ).toString("base64")}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    const issues = response.data.issues.map((i) => ({
      key: i.key,
      summary: i.fields.summary,
      status: i.fields.status?.name,
      priority: i.fields.priority?.name,
      assignee: i.fields.assignee?.displayName || "Unassigned",
      timeSpent: i.fields.timespent || 0, // Time spent in seconds
      timeEstimate: i.fields.timeestimate || 0, // Remaining estimate in seconds
      originalEstimate: i.fields.timeoriginalestimate || 0, // Original estimate in seconds
      workDone: i.fields.workdone || null, // Custom workdone field
      rootCause: i.fields.rootcause || null, // Root cause field
      rootCauseResolution: i.fields.rootcauseresolution || null, // Root cause resolution field
      worklog: i.fields.worklog?.worklogs?.map(work => ({
        id: work.id,
        author: work.author?.displayName,
        timeSpent: work.timeSpent,
        timeSpentSeconds: work.timeSpentSeconds,
        comment: work.comment,
        started: work.started,
        created: work.created,
        updated: work.updated
      })) || [],
      comments: i.fields.comment?.comments?.map(comment => ({
        id: comment.id,
        author: comment.author?.displayName,
        body: comment.body,
        created: comment.created,
        updated: comment.updated
      })) || []
    }));

    res.json({ issues });
  } catch (err) {
    console.error("Jira error:", err.response?.data || err.message);
    res.status(500).json({
      error: "Failed to fetch project issues",
      details: err.response?.data || err.message,
    });
  }
});

// 🔍 Helper route to discover available fields
router.get("/fields/:projectKey", async (req, res) => {
  const { projectKey } = req.params;

  try {
    // Get a single issue to see all available fields
    const response = await axios.post(
      `${JIRA_BASE_URL}/rest/api/3/search/jql`,
      {
        jql: `project = ${projectKey} ORDER BY created DESC`,
        maxResults: 1,
        fields: ["*all"], // Get all fields
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${JIRA_EMAIL}:${JIRA_API_TOKEN}`
          ).toString("base64")}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.issues.length > 0) {
      const issue = response.data.issues[0];
      const availableFields = Object.keys(issue.fields);
      
      // Filter fields that might be related to work done and root cause
      const workRelatedFields = availableFields.filter(field => 
        field.toLowerCase().includes('work') || 
        field.toLowerCase().includes('done') ||
        field.toLowerCase().includes('time') ||
        field.toLowerCase().includes('effort')
      );
      
      const rootCauseFields = availableFields.filter(field => 
        field.toLowerCase().includes('root') || 
        field.toLowerCase().includes('cause') ||
        field.toLowerCase().includes('resolution')
      );

      res.json({ 
        message: "Available fields in your Jira instance",
        allFields: availableFields,
        workRelatedFields: workRelatedFields,
        rootCauseFields: rootCauseFields,
        sampleIssue: issue.key
      });
    } else {
      res.json({ message: "No issues found in project", fields: [] });
    }
  } catch (err) {
    console.error("Error fetching fields:", err.response?.data || err.message);
    res.status(500).json({
      error: "Failed to fetch available fields",
      details: err.response?.data || err.message,
    });
  }
});

// 🔍 Search API for Jira issues
router.post("/search", async (req, res) => {
  const { query, projectKey, searchFields, maxResults = 50 } = req.body;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: "Search query is required" });
  }

  // Default to searching across all projects if no projectKey specified
  const jqlProject = projectKey ? `project = ${projectKey}` : "";
  
  // Build JQL search query
  let jqlSearch = "";
  const searchTerm = query.trim();
  
  // Define searchable fields
  const defaultSearchFields = ['summary', 'description', 'comment'];
  const fieldsToSearch = searchFields || defaultSearchFields;
  
  // Build search conditions
  const searchConditions = fieldsToSearch.map(field => {
    switch(field) {
      case 'summary':
        return `summary ~ "${searchTerm}"`;
      case 'description':
        return `description ~ "${searchTerm}"`;
      case 'comment':
        return `comment ~ "${searchTerm}"`;
      case 'assignee':
        return `assignee.displayName ~ "${searchTerm}"`;
      case 'status':
        return `status.name ~ "${searchTerm}"`;
      case 'key':
        return `key ~ "${searchTerm}"`;
      default:
        return `${field} ~ "${searchTerm}"`;
    }
  });
  
  jqlSearch = searchConditions.join(' OR ');
  
  // Combine project and search conditions
  const finalJql = projectKey 
    ? `${jqlProject} AND (${jqlSearch}) ORDER BY updated DESC`
    : `(${jqlSearch}) ORDER BY updated DESC`;

  console.log("Search query:", searchTerm);
  console.log("JQL query:", finalJql);

  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    return res.status(500).json({ error: "JIRA credentials not configured properly" });
  }

  try {
    const response = await axios.post(
      `${JIRA_BASE_URL}/rest/api/3/search/jql`,
      {
        jql: finalJql,
        maxResults: parseInt(maxResults),
        fields: [
          "summary", "status", "priority", "assignee", "comment", 
          "description", "created", "updated", "project",
          "worklog", "timespent", "timeoriginalestimate", "timeestimate", 
          "workdone", "rootcause", "rootcauseresolution"
        ],
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${JIRA_EMAIL}:${JIRA_API_TOKEN}`
          ).toString("base64")}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    const issues = response.data.issues.map((i) => ({
      key: i.key,
      summary: i.fields.summary,
      description: i.fields.description || null,
      status: i.fields.status?.name,
      priority: i.fields.priority?.name,
      assignee: i.fields.assignee?.displayName || "Unassigned",
      project: i.fields.project?.key,
      created: i.fields.created,
      updated: i.fields.updated,
      timeSpent: i.fields.timespent || 0,
      timeEstimate: i.fields.timeestimate || 0,
      originalEstimate: i.fields.timeoriginalestimate || 0,
      workDone: i.fields.workdone || null,
      rootCause: i.fields.rootcause || null,
      rootCauseResolution: i.fields.rootcauseresolution || null,
      worklog: i.fields.worklog?.worklogs?.map(work => ({
        id: work.id,
        author: work.author?.displayName,
        timeSpent: work.timeSpent,
        timeSpentSeconds: work.timeSpentSeconds,
        comment: work.comment,
        started: work.started,
        created: work.created,
        updated: work.updated
      })) || [],
      comments: i.fields.comment?.comments?.map(comment => ({
        id: comment.id,
        author: comment.author?.displayName,
        body: comment.body,
        created: comment.created,
        updated: comment.updated
      })) || []
    }));

    res.json({ 
      query: searchTerm,
      total: response.data.total,
      maxResults: response.data.maxResults,
      startAt: response.data.startAt,
      issues: issues
    });

  } catch (err) {
    console.error("Jira search error:", err.response?.data || err.message);
    res.status(500).json({
      error: "Failed to search Jira issues",
      details: err.response?.data || err.message,
    });
  }
});

export default router;

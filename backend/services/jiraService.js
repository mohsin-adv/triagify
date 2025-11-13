import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const jiraDomain = process.env.JIRA_BASE_URL;
const email = process.env.JIRA_EMAIL;
const apiToken = process.env.JIRA_API_TOKEN;

// Debug logging (remove in production)
console.log('JIRA Service - Environment Variables:');
console.log('JIRA_BASE_URL:', jiraDomain);
console.log('JIRA_EMAIL:', email ? 'configured' : 'missing');
console.log('JIRA_API_TOKEN:', apiToken ? 'configured (length: ' + apiToken.length + ')' : 'missing');

const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");

const axiosInstance = axios.create({
  baseURL: `${jiraDomain}/rest/api/3`,
  headers: {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Helper function to extract text from JIRA's Atlassian Document Format (ADF)
function extractTextFromADF(body) {
  if (typeof body === 'string') {
    return body;
  } else if (body && body.content) {
    return body.content.map(paragraph => {
      if (paragraph.content) {
        return paragraph.content.map(item => item.text || '').join('');
      }
      return '';
    }).join('\n');
  }
  return '';
}

// 🧾 Get issue by key
export async function getIssue(issueKey) {
  if (!jiraDomain || !email || !apiToken) {
    throw new Error("JIRA credentials or base URL not configured properly.");
  }

  try {
    const response = await axiosInstance.get(`/issue/${issueKey}`);
    const issue = response.data;
    
    return {
      key: issue.key,
      summary: issue.fields.summary,
      description: issue.fields.description || "",
      comments: (issue.fields.comment?.comments || []).map(c => extractTextFromADF(c.body)).filter(comment => comment.trim()).join("\n"),
      resolution: issue.fields.resolution?.name || "Unresolved",
    };
  } catch (err) {
    console.error("Jira error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.errorMessages?.[0] || err.message || "Failed to fetch issue");
  }
}

// 📋 Get all issues using JQL
export async function getAllIssues(projectKey, maxResults = 100) {
  if (!jiraDomain || !email || !apiToken) {
    throw new Error("JIRA credentials or base URL not configured properly.");
  }

  try {
    const response = await axiosInstance.post(
      `/search/jql`,
      {
        jql: `project = ${projectKey} ORDER BY created DESC`,
        maxResults: maxResults,
        fields: ["summary", "status", "priority", "assignee", "comment", "worklog", "timespent", "timeoriginalestimate", "timeestimate", "workdone", "rootcause", "rootcauseresolution", "customfield_*"],
      }
    );

    const issues = response.data.issues.map(i => ({
      key: i.key,
      summary: i.fields.summary,
      description: i.fields.description || "",
      comments: (i.fields.comment?.comments || []).map(c => extractTextFromADF(c.body)).filter(comment => comment.trim()).join("\n"),
      resolution: i.fields.resolution?.name || "Unresolved",
    }));

    return { issues };
  } catch (err) {
    console.error("Jira error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.errorMessages?.[0] || err.message || "Failed to fetch project issues");
  }
}

// 💬 Add a comment
export async function addComment(issueKey, comment) {
  const body = { body: comment };
  const res = await axiosInstance.post(`/issue/${issueKey}/comment`, body);
  return res.data;
}

// 🔄 Transition issue status
export async function transitionIssue(issueKey, transitionId) {
  const body = { transition: { id: transitionId } };
  const res = await axiosInstance.post(`/issue/${issueKey}/transitions`, body);
  return res.data;
}

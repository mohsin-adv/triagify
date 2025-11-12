import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const jiraDomain = process.env.JIRA_DOMAIN;
const email = process.env.JIRA_EMAIL;
const apiToken = process.env.JIRA_API_TOKEN;
const projectKey = process.env.JIRA_PROJECT_KEY;

const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");

const axiosInstance = axios.create({
  baseURL: `${jiraDomain}/rest/api/3`,
  headers: {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// 🧾 Get issue by key
export async function getIssue(issueKey) {
  const res = await axiosInstance.get(`/issue/${issueKey}`);
  return res.data;
}

// 📋 Get all issues using JQL
export async function getAllIssues(jql = `project=${projectKey}`) {
  const res = await axiosInstance.get(`/search?jql=${encodeURIComponent(jql)}`);
  return res.data.issues;
}

// ➕ Create a new issue
export async function createIssue(summary, description, issueType = "Task") {
  const body = {
    fields: {
      project: { key: projectKey },
      summary,
      description,
      issuetype: { name: issueType },
    },
  };
  const res = await axiosInstance.post(`/issue`, body);
  return res.data;
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

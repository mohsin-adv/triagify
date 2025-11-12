import { fetchAllIssues, fetchIssueDetails } from "../services/jiraService.js";

export const getAllIssues = async (req, res) => {
  try {
    const issues = await fetchAllIssues();
    res.json(issues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getIssueDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const issue = await fetchIssueDetails(id);
    res.json(issue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

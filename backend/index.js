import express from "express";
import bodyParser from "body-parser";
import jiraRoutes from "./routes/jiraRoutes.js";

const app = express();
app.use(bodyParser.json());

// ✅ This line is CRUCIAL
app.use("/api", jiraRoutes);

const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));

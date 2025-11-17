import { getCohereEmbedding } from "./embeddings.js";
import fs from "fs";
// import pkg from "compute-cosine-similarity";
// const { cosineSimilarity } = pkg;
import cosineSimilarity from "compute-cosine-similarity";

export async function buildIssueVectorDB(issues) {
    const db = [];
    for (const issue of issues) {
        const text = `${issue.summary ?? ""}\n${issue.description?.content?.[0]?.content?.[0]?.text ?? ""}\n${issue.comments ?? ""}`;
        const embedding = await getCohereEmbedding(text);
        
        // Enhanced metadata as suggested by VP
        const enhancedIssue = {
            key: issue.key,
            summary: issue.summary,
            text: text,
            embedding: embedding,
            status: issue.status,
            
            // METADATA ENHANCEMENTS
            metadata: {
                priority: issue.priority || 'Unknown',
                assignee: issue.assignee || 'Unassigned',
                project: issue.project || 'Unknown',
                created: issue.created,
                updated: issue.updated,
                component: issue.component || 'General',
                issueType: issue.issueType || 'Task',
                resolution: issue.resolution || 'Unresolved'
            },
            
            // AUTO-GENERATED TAGS (Dynamic tagging)
            tags: generateDynamicTags(issue),
            
            // AUTO-GENERATED SUMMARY
            autoSummary: generateAutoSummary(text),
            
            // CLUSTER PREPARATION
            clusterCategory: null, // Will be populated during clustering
            clusterConfidence: 0
        };
        
        db.push(enhancedIssue);
    }
    fs.writeFileSync("issue_vectors.json", JSON.stringify(db, null, 2));
}

// Dynamic tag generation based on issue content
function generateDynamicTags(issue) {
    const tags = new Set();
    const text = `${issue.summary || ''} ${issue.description?.content?.[0]?.content?.[0]?.text || ''}`.toLowerCase();
    
    // Technology tags
    const techKeywords = {
        'api': ['api', 'endpoint', 'rest', 'graphql'],
        'database': ['sql', 'database', 'db', 'mysql', 'postgres', 'mongodb'],
        'frontend': ['react', 'angular', 'vue', 'javascript', 'css', 'html'],
        'backend': ['server', 'backend', 'node', 'java', 'python', '.net'],
        'auth': ['authentication', 'login', 'auth', 'token', 'oauth'],
        'performance': ['slow', 'performance', 'timeout', 'latency', 'speed'],
        'error': ['error', 'exception', 'bug', 'crash', 'fail'],
        'security': ['security', 'vulnerability', 'breach', 'hack'],
        'ui': ['ui', 'interface', 'design', 'layout', 'responsive'],
        'integration': ['integration', 'webhook', 'third-party', 'external']
    };
    
    for (const [tag, keywords] of Object.entries(techKeywords)) {
        if (keywords.some(keyword => text.includes(keyword))) {
            tags.add(tag);
        }
    }
    
    // Priority-based tags
    if (issue.priority === 'High' || issue.priority === 'Critical') {
        tags.add('high-priority');
    }
    
    // Status-based tags
    if (issue.status === 'Open' || issue.status === 'New') {
        tags.add('needs-attention');
    }
    
    return Array.from(tags);
}

// Auto-summary generation
function generateAutoSummary(text) {
    if (!text || text.trim().length < 50) {
        return "Brief issue description";
    }
    
    // Simple extractive summary - take first meaningful sentence
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences[0]?.trim().substring(0, 150) + "..." || "No summary available";
}

export async function findSimilarIssues(queryText) {
    const db = JSON.parse(fs.readFileSync("issue_vectors.json"));
    const queryEmbedding = await getCohereEmbedding(queryText);

    const scored = db.map(issue => ({
        ...issue,
        similarity: cosineSimilarity(queryEmbedding, issue.embedding),
    }));

    return scored.sort((a, b) => b.similarity - a.similarity).slice(0, 4); // top 4
}

// NEW: CLUSTERING FUNCTIONALITY as requested by VP
export async function clusterIssues(threshold = 0.7) {
    const db = JSON.parse(fs.readFileSync("issue_vectors.json"));
    const clusters = [];
    const processed = new Set();

    for (let i = 0; i < db.length; i++) {
        if (processed.has(i)) continue;

        const cluster = {
            id: `cluster_${clusters.length + 1}`,
            centerIssue: db[i],
            members: [db[i]],
            commonTags: [...db[i].tags],
            avgSimilarity: 1.0,
            category: determineClusterCategory(db[i])
        };

        processed.add(i);

        // Find similar issues for this cluster
        for (let j = i + 1; j < db.length; j++) {
            if (processed.has(j)) continue;

            const similarity = cosineSimilarity(db[i].embedding, db[j].embedding);
            if (similarity >= threshold) {
                cluster.members.push(db[j]);
                cluster.commonTags = findCommonTags(cluster.commonTags, db[j].tags);
                processed.add(j);
            }
        }

        // Calculate average similarity within cluster
        if (cluster.members.length > 1) {
            let totalSim = 0;
            let comparisons = 0;
            for (let m1 = 0; m1 < cluster.members.length; m1++) {
                for (let m2 = m1 + 1; m2 < cluster.members.length; m2++) {
                    totalSim += cosineSimilarity(cluster.members[m1].embedding, cluster.members[m2].embedding);
                    comparisons++;
                }
            }
            cluster.avgSimilarity = comparisons > 0 ? totalSim / comparisons : 1.0;
        }

        clusters.push(cluster);
    }

    // Sort clusters by size and similarity
    clusters.sort((a, b) => {
        if (a.members.length !== b.members.length) {
            return b.members.length - a.members.length;
        }
        return b.avgSimilarity - a.avgSimilarity;
    });

    // Save clusters
    fs.writeFileSync("issue_clusters.json", JSON.stringify(clusters, null, 2));
    
    console.log(`🎯 Created ${clusters.length} clusters from ${db.length} issues`);
    clusters.forEach(c => {
        console.log(`📊 ${c.id}: ${c.members.length} issues, ${c.category}, tags: ${c.commonTags.join(', ')}`);
    });

    return clusters;
}

function determineClusterCategory(issue) {
    const tags = issue.tags || [];
    
    // Priority-based categorization
    if (tags.includes('high-priority')) return 'Critical Issues';
    if (tags.includes('error') || tags.includes('bug')) return 'Bug Reports';
    if (tags.includes('performance')) return 'Performance Issues';
    if (tags.includes('security')) return 'Security Concerns';
    if (tags.includes('api')) return 'API Issues';
    if (tags.includes('frontend') || tags.includes('ui')) return 'UI/UX Issues';
    if (tags.includes('database')) return 'Database Issues';
    if (tags.includes('auth')) return 'Authentication Issues';
    
    return 'General Issues';
}

function findCommonTags(tags1, tags2) {
    return tags1.filter(tag => tags2.includes(tag));
}

// SEMANTIC SEARCH with clustering context
export async function semanticSearchWithClusters(queryText) {
    const similarIssues = await findSimilarIssues(queryText);
    
    // Try to load clusters if they exist
    let clusters = [];
    try {
        clusters = JSON.parse(fs.readFileSync("issue_clusters.json"));
    } catch (error) {
        console.log("No clusters found, generating...");
        clusters = await clusterIssues();
    }
    
    // Find which clusters the similar issues belong to
    const relevantClusters = clusters.filter(cluster => 
        cluster.members.some(member => 
            similarIssues.some(similar => similar.key === member.key)
        )
    );

    return {
        similarIssues,
        relevantClusters: relevantClusters.map(c => ({
            id: c.id,
            category: c.category,
            memberCount: c.members.length,
            commonTags: c.commonTags,
            avgSimilarity: c.avgSimilarity
        }))
    };
}
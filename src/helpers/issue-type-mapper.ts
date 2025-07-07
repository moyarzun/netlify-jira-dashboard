import type { Task } from "@/data/schema";

export const mapJiraIssueType = (issueType: string): Task['label'] => {
    const labelMapping: { [key: string]: Task['label'] } = {
        "Bug": "bug",
        "Story": "feature",
        "Task": "feature",
        "Improvement": "feature",
        "New Feature": "feature",
        "Documentation": "documentation",
    };
    return labelMapping[issueType] || "feature";
};

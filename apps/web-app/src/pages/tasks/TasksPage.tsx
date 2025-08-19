import { useState } from "react";
import { z } from "zod";
import { type VisibilityState } from "@tanstack/react-table";

import { columns } from "../../components/columns";
import type { JiraContextType } from "../../contexts/JiraContext.types";
import { DataTable } from "../../components/data-table";
import { useJira } from "../../hooks/useJira";
import { taskSchema } from "../../data/schema";
export default function TasksPage() {
  const { tasksCache, loading: isLoading, sprints, sprintInfo } = useJira() as JiraContextType;
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Get tasks from cache for selected sprint
  const selectedSprintId = sprintInfo?.id?.toString() || '';
  const tasks = selectedSprintId ? (tasksCache[selectedSprintId] || []) : [];

  // Ensure tasks are validated against the schema
  const validatedTasks = z.array(taskSchema).parse(tasks);

  

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tasks</h2>
          <p className="text-muted-foreground">
            {sprintInfo ? `Tasks for ${sprintInfo.name} (${tasks.length} tasks)` : 'Select a sprint to view tasks'}
          </p>
        </div>
      </div>
      <DataTable
        data={validatedTasks}
        columns={columns}
        isLoading={isLoading}
        columnVisibility={columnVisibility}
        setColumnVisibility={setColumnVisibility}
        meta={{
          sprints: sprints,
          selectedSprintId: sprintInfo?.id?.toString(),
        }}
      />
    </div>
  );
}

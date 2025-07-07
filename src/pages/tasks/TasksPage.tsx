import { useState } from "react";
import { z } from "zod";
import { type VisibilityState } from "@tanstack/react-table";

import { columns } from "@/components/columns";
import { DataTable } from "@/components/data-table";
import { useJira } from "@/hooks/useJira";
import { taskSchema } from "@/data/schema";
import { statuses as allStatuses } from "@/data/data";

export default function TasksPage() {
  const { tasks, loading: isLoading, uniqueStatuses } = useJira();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Ensure tasks are validated against the schema
  const validatedTasks = z.array(taskSchema).parse(tasks);

  const statusOptions = uniqueStatuses.map((status) => {
    const staticStatus = allStatuses.find((s) => s.value === status);
    return {
      label: staticStatus?.label || status,
      value: status,
      icon: staticStatus?.icon,
    };
  });

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tasks</h2>
          <p className="text-muted-foreground">
            Here&apos;s a list of your tasks for this sprint!
          </p>
        </div>
      </div>
      <DataTable
        data={validatedTasks}
        columns={columns}
        isLoading={isLoading}
        columnVisibility={columnVisibility}
        setColumnVisibility={setColumnVisibility}
        statuses={statusOptions}
      />
    </div>
  );
}

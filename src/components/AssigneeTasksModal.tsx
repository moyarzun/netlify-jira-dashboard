import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { labels, priorities, statuses } from "@/data/data";
import type { Task } from "@/data/schema";

interface AssigneeTasksModalProps {
  assigneeName: string;
  tasks: Task[];
  children: React.ReactNode;
}

export function AssigneeTasksModal({ assigneeName, tasks, children }: AssigneeTasksModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Tasks Assigned to {assigneeName}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task ID</TableHead>
                <TableHead>Task Name</TableHead>
                <TableHead>Issue Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="text-right">Story Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const issueType = labels.find((l) => l.value === task.label);
                const status = statuses.find((s) => s.value === task.status);
                const priority = priorities.find((p) => p.value === task.priority);

                return (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.id}</TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="truncate max-w-[30ch] text-left">
                            {task.title}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{task.title}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span>{issueType?.label || task.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {status?.icon && (
                          <status.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{status?.label || task.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {priority?.icon && (
                          <priority.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{priority?.label || task.priority}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{task.storyPoints || 0}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

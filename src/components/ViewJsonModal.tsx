import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CodeIcon } from "@radix-ui/react-icons";
import type { Task } from "../data/schema";

interface ViewJsonModalProps {
  task: Task;
}

export const ViewJsonModal = ({ task }: ViewJsonModalProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <CodeIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Raw JSON for Task: {task.id}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[60vh]">
            <code>{JSON.stringify(task.raw, null, 2)}</code>
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
};

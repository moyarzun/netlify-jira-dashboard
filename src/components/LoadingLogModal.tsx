import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LoadingLogModalProps {
  isOpen: boolean;
  messages: string[];
}

export const LoadingLogModal = ({ isOpen, messages }: LoadingLogModalProps) => {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Loading Data from Jira...</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <ScrollArea className="h-48 w-full rounded-md border p-4">
            {messages.length > 0 ? (
              messages.map((msg, index) => (
                <p key={index} className="text-sm text-muted-foreground">
                  {msg}
                </p>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No loading messages yet.</p>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

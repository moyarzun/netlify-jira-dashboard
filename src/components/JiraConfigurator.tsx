import * as React from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useJira } from "@/contexts/JiraContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function JiraConfigurator() {
  const { formData, handleInputChange, setFormData, sprints, isSprintsLoading } = useJira();
  const [isOpen, setIsOpen] = React.useState(true);

  const handleSprintChange = (sprintId: string) => {
    setFormData((prev) => ({ ...prev, sprintId }));
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full space-y-2"
    >
      <div className="flex items-center justify-between space-x-4 px-1">
        <h4 className="text-sm font-semibold">Jira Configuration</h4>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-9 p-0">
            <ChevronsUpDown className="h-4 w-4" />
            <span className="sr-only">Toggle</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-4 border-t pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="baseUrl">Jira Base URL</Label>
            <Input id="baseUrl" name="baseUrl" value={formData.baseUrl} onChange={handleInputChange} placeholder="https://your-domain.atlassian.net" required />
          </div>
          <div>
            <Label htmlFor="email">Jira Email</Label>
            <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="user@example.com" required />
          </div>
          <div>
            <Label htmlFor="apiToken">API Token</Label>
            <Input id="apiToken" name="apiToken" type="password" value={formData.apiToken} onChange={handleInputChange} placeholder="Your Jira API Token" required />
          </div>
          <div>
            <Label htmlFor="projectKey">Project Key</Label>
            <Input id="projectKey" name="projectKey" value={formData.projectKey} onChange={handleInputChange} placeholder="PROJ" required />
          </div>
          <div>
            <Label htmlFor="sprintId">Sprint</Label>
            <Select onValueChange={handleSprintChange} value={formData.sprintId} disabled={isSprintsLoading}>
              <SelectTrigger id="sprintId">
                <SelectValue placeholder={isSprintsLoading ? "Loading sprints..." : "Select a sprint"} />
              </SelectTrigger>
              <SelectContent>
                {sprints.map((sprint) => (
                  <SelectItem key={sprint.id} value={sprint.id.toString()}>
                    {sprint.name} ({sprint.state})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

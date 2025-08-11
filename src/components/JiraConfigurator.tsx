"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function JiraConfigurator() {
  const [baseUrl, setBaseUrl] = useState("");
  const [email, setEmail] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [showApiToken, setShowApiToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/jira/config");
        if (response.ok) {
          const config = await response.json();
          if (config && config.config && config.config.baseUrl && config.config.email) {
            setBaseUrl(config.config.baseUrl);
            setEmail(config.config.email);
            // Set the actual API token, which will be masked by the input type
            setApiToken(config.config.apiToken);
          }
        }
      } catch (error) {
        // It's okay if this fails, it just means no config is set yet.
        console.warn("Could not fetch Jira configuration:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSave = async () => {
    if (!baseUrl || !email || !apiToken) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/jira/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl, email, apiToken }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Failed to save configuration.");
      }

      toast({
        title: "Success!",
        description: "Jira configuration saved securely.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <h4 className="font-medium leading-none">Jira Configuration</h4>
        <p className="text-sm text-muted-foreground">
          Your credentials will be stored securely.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="baseUrl">Jira Base URL</Label>
        <Input
          id="baseUrl"
          placeholder="https://your-domain.atlassian.net"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Jira User Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="apiToken">Jira API Token</Label>
        <div className="relative">
            <Input
              id="apiToken"
              type={showApiToken ? "text" : "password"}
              placeholder="Your API Token"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              className="pr-10" // Add padding for the eye icon
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowApiToken((prev) => !prev)}
            >
              {showApiToken ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
      </div>
      <Button onClick={handleSave} disabled={isLoading}>
        {isLoading ? "Saving..." : "Save Configuration"}
      </Button>
    </div>
  );
}

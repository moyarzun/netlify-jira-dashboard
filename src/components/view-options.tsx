"use client"

// import * as React from "react"
import { useContext } from "react";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu"
import { MixerHorizontalIcon } from "@radix-ui/react-icons"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { JiraContext } from "@/contexts/JiraContext";

export function ViewOptions() {
  const context = useContext(JiraContext);

  if (!context) {
    // Handle case where context is not yet available
    return null;
  }

  const { 
    excludeCarryover, 
    setExcludeCarryover, 
    treatReviewDoneAsDone, 
    setTreatReviewDoneAsDone 
  } = context;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto flex h-8"
        >
          <MixerHorizontalIcon className="mr-2 h-4 w-4" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuLabel>View options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          className="capitalize"
          checked={excludeCarryover}
          onCheckedChange={setExcludeCarryover}
        >
          Exclude Carryover tasks
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          className="capitalize"
          checked={treatReviewDoneAsDone}
          onCheckedChange={setTreatReviewDoneAsDone}
        >
          Review Done as Done
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

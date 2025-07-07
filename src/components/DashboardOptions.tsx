"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import { useJira } from "@/contexts/JiraContext";

export function DashboardOptions() {
  const {
    treatReviewDoneAsDone,
    setTreatReviewDoneAsDone,
    excludeCarryover,
    setExcludeCarryover,
  } = useJira();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
        >
          <MixerHorizontalIcon className="mr-2 h-4 w-4" />
          Opciones de Vista
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[260px]">
        <DropdownMenuLabel>Opciones de Métricas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          className="toggle"
          checked={treatReviewDoneAsDone}
          onCheckedChange={setTreatReviewDoneAsDone}
        >
          Considerar "Review Done" como "Done"
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          className="toggle"
          checked={excludeCarryover}
          onCheckedChange={setExcludeCarryover}
        >
          Excluir tareas Carryover
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

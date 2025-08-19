import { useContext, useState, useRef, useEffect } from "react";
import { JiraContext } from "../contexts/JiraContext";
import type { JiraContextType } from "../contexts/JiraContext.types";
import { isCarryover } from "../helpers/is-carryover";

// Componente visual y accesible para mostrar el estado carryover
export const CarryoverCell = ({ sprintHistory }: { sprintHistory: string[] }) => {
  const jiraContext = useContext(JiraContext) as JiraContextType;
  const selectedSprint = jiraContext?.sprintInfo;
  const allSprints = jiraContext?.sprints || [];
  const carryover = isCarryover({ task: { sprintHistory }, selectedSprint, allSprints });

  // Mapear los nombres de los sprints si están disponibles en el contexto
  const sprintNames = sprintHistory.map(id => {
    const sprint = jiraContext?.sprints?.find(s => s.id.toString() === id);
    return sprint ? `${sprint.name} (#${sprint.id})` : `Sprint #${id}`;
  });

  // Popover para mostrar la lista de sprints
  const [open, setOpen] = useState(false);
  const badgeRef = useRef<HTMLSpanElement>(null);

  // Cerrar popover al hacer click fuera
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (badgeRef.current && !badgeRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <span className="relative inline-block">
      <span
        ref={badgeRef}
        tabIndex={0}
        role="button"
        aria-label={carryover ? "Tarea carryover: ver detalle de sprints" : "No carryover: ver detalle de sprints"}
        className={carryover
          ? "bg-orange-100 text-orange-700 font-bold rounded px-2 py-0.5 cursor-pointer outline-none focus:ring-2 focus:ring-orange-400"
          : "bg-gray-100 text-gray-500 font-semibold rounded px-2 py-0.5 cursor-pointer outline-none focus:ring-2 focus:ring-gray-300"}
        onClick={() => setOpen(v => !v)}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") setOpen(v => !v);
          if (e.key === "Escape") setOpen(false);
        }}
      >
        {carryover ? "Sí" : "No"}
      </span>
      {open && (
        <div
          className="absolute z-20 left-1/2 -translate-x-1/2 mt-2 min-w-[220px] bg-white border border-gray-200 rounded shadow-lg p-3 text-sm text-gray-800"
          role="dialog"
          aria-modal="true"
        >
          <div className="mb-1 font-semibold text-gray-700">
            Sprints en la historia:
          </div>
          <ul className="list-disc pl-5">
            {sprintNames.length === 0 ? (
              <li className="text-gray-400">Sin sprints</li>
            ) : (
              sprintNames.map((name, i) => (
                <li key={i}>{name}</li>
              ))
            )}
          </ul>
          <div className="mt-2 text-xs text-gray-500">
            {carryover
              ? "Esta tarea es carryover porque estuvo en el sprint seleccionado y al menos un sprint cerrado distinto."
              : "No es carryover."}
          </div>
        </div>
      )}
    </span>
  );
};

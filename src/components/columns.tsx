
"use client";
import type { JiraSprint } from '@/helpers/sprint-history';

export type TableMeta = {
  sprints?: JiraSprint[];
  selectedSprintId?: string;
};

import type { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/components/data-table-column-header";
import { DataTableRowActions } from "@/components/data-table-row-actions";
import { statuses, priorities } from "@/data/data";
import type { Task } from "@/data/schema";
import { mapJiraStatus } from "@/helpers/status-mapper";
import { mapJiraPriority } from "@/helpers/priority-mapper";
import { CarryoverCell } from "@/components/CarryoverCell";
import { isCarryover } from "@/helpers/is-carryover";

export const columns: ColumnDef<Task>[] = [
{
  id: "taskState",
  header: ({ column }) => (
	<DataTableColumnHeader column={column} title="Estado de Tarea" />
  ),
  cell: ({ row, table }) => {
	const meta = table.options.meta as TableMeta | undefined;
	const allSprints = meta?.sprints ?? [];
	const selectedSprint = allSprints.find(s => String(s.id) === meta?.selectedSprintId) || null;
	const task = row.original;
	const isCarry = isCarryover({ task, selectedSprint, allSprints });
	const badgeClass = isCarry ? "bg-red-600 text-white" : "bg-green-600 text-white";
	const label = isCarry ? "Carryover" : "Nueva";
	return (
	  <span
		className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
		tabIndex={0}
		aria-label={label}
		role="status"
	  >
		{label}
	  </span>
	);
  },
  enableSorting: false,
  enableHiding: true,
},
	{
		id: "select",
		header: ({ table }) => (
			<Checkbox
				checked={
					table.getIsAllPageRowsSelected() ||
					(table.getIsSomePageRowsSelected() && "indeterminate")
				}
				onCheckedChange={(value: boolean) => table.toggleAllPageRowsSelected(!!value)}
				aria-label="Select all"
				className="translate-y-[2px]"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(value: boolean) => row.toggleSelected(!!value)}
				aria-label="Select row"
				className="translate-y-[2px]"
			/>
		),
		enableSorting: false,
		enableHiding: false,
	},
	{
		accessorKey: "id",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Task" />
		),
		cell: ({ row }) => <div className="w-[80px]">{row.getValue("id")}</div>,
		enableSorting: false,
		enableHiding: false,
	},
	{
		accessorKey: "title",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Title" />
		),
		cell: ({ row }) => {
			return (
				<div className="flex space-x-2">
					<span className="max-w-[500px] truncate font-medium">
						{row.getValue("title")}
					</span>
				</div>
			)
		},
	},
	{
		accessorKey: "status",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Status" />
		),
	cell: ({ row }) => {
	  const mappedStatus = mapJiraStatus(row.getValue("status"), false);
	  const status = statuses.find((status) => status.value === mappedStatus);
	  if (!status) {
		return (
		  <div className="flex w-[100px] items-center">
			<span>{row.getValue("status")}</span>
		  </div>
		);
	  }
	  return (
		<div className="flex w-[100px] items-center">
		  {status.icon && (
			<status.icon className="mr-2 h-4 w-4 text-muted-foreground" />
		  )}
		  <span>{status.label}</span>
		</div>
	  );
	},
		filterFn: (row, id, value) => {
			const mappedStatus = mapJiraStatus(row.getValue(id), false);
	  return value.includes(mappedStatus);
		},
	},
{
	accessorKey: "priority",
	header: ({ column }) => (
		<DataTableColumnHeader column={column} title="Priority" />
	),
	cell: ({ row }) => {
		const mappedPriority = mapJiraPriority(row.getValue("priority"));
		const priority = priorities.find(
			(priority) => priority.value === mappedPriority
		);
		if (!priority) {
			return null;
		}
		return (
			<div className="flex items-center">
				{priority.icon && (
					<priority.icon className="mr-2 h-4 w-4 text-muted-foreground" />
				)}
				<span>{priority.label}</span>
			</div>
		);
	},
	filterFn: (row, id, value) => {
		return value.includes(row.getValue(id));
	},
},
	{
		accessorKey: "storyPoints",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Story Points" />
		),
		cell: ({ row }) => {
			return (
				<div className="flex items-center">
					<span>{row.getValue("storyPoints")}</span>
				</div>
			)
		},
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
	},
{
  accessorKey: "userType",
  header: ({ column }) => (
	<DataTableColumnHeader column={column} title="Tipo de Usuario" />
  ),
  cell: ({ row }) => {
	const userType = row.original.userType || "Sin asignación";
	let badgeColor = "bg-gray-400 text-white";
	if (userType === "Desarrollador") badgeColor = "bg-blue-600 text-white";
	else if (userType === "QA") badgeColor = "bg-green-600 text-white";
	else if (userType !== "Sin asignación" && userType !== "Sin tipo") badgeColor = "bg-yellow-500 text-white";
	return (
	  <span
		className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${badgeColor}`}
		tabIndex={0}
		aria-label={`Tipo de usuario: ${userType}`}
		role="status"
	  >
		{userType}
	  </span>
	);
  },
},
{
  id: "lastSync",
  header: ({ column }) => (
	<DataTableColumnHeader column={column} title="Última Actualización" />
  ),
  cell: ({ row }) => {
	const syncKey = `lastSync_${row.original.id}`;
	let sync: string | null = null;
	if (typeof window !== "undefined") {
	  sync = localStorage.getItem(syncKey);
	}
	return (
	  <span className="text-xs text-muted-foreground">
		{sync
		  ? new Date(sync).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })
		  : "Sin registro"}
	  </span>
	);
  },
  enableSorting: false,
  enableHiding: true,
},
	{
		id: "carryover",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Carryover" />
		),
		cell: ({ row }) => {
			const { sprintHistory } = row.original as Task;
			return <CarryoverCell sprintHistory={sprintHistory ?? []} />;
		},
		enableSorting: false,
		enableHiding: true,
	},
	{
		id: "actions",
		cell: ({ row }) => (
			<div className="flex items-center justify-end space-x-2">
				<DataTableRowActions row={row} />
			</div>
		),
	},
]

"use client"

import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTableRowActions } from "@/components/data-table-row-actions"
import { statuses, priorities } from "@/data/data"
import type { Task } from "@/data/schema"
import { mapJiraStatus } from "@/helpers/status-mapper"
import { mapJiraPriority } from "@/helpers/priority-mapper";
import { CarryoverCell } from "@/components/CarryoverCell";

export const columns: ColumnDef<Task>[] = [
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
			const treatReviewDoneAsDone = false; // O la lógica que necesites
			const mappedStatus = mapJiraStatus(row.getValue("status"), treatReviewDoneAsDone);

			const status = statuses.find(
				(status) => status.value === mappedStatus
			)

			if (!status) {
				// Fallback to original status if no mapping is found
				return (
					<div className="flex w-[100px] items-center">
						<span>{row.getValue("status")}</span>
					</div>
				)
			}

			return (
				<div className="flex w-[100px] items-center">
					{status.icon && (
						<status.icon className="mr-2 h-4 w-4 text-muted-foreground" />
					)}
					<span>{status.label}</span>
				</div>
			)
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
			)

			if (!priority) {
				return null
			}

			return (
				<div className="flex items-center">
					{priority.icon && (
						<priority.icon className="mr-2 h-4 w-4 text-muted-foreground" />
					)}
					<span>{priority.label}</span>
				</div>
			)
		},
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
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

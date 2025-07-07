import { useJira } from "@/contexts/JiraContext";
import { columns } from "@/components/columns";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "@radix-ui/react-icons";
import Papa from "papaparse";

export default function TaskPage() {
  const { tasks, error } = useJira();

  const handleDownload = () => {
    if (!tasks.length) {
      alert("No tasks to download.");
      return;
    }

    const csv = Papa.unparse(tasks);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "jira-tasks.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Jira Tasks</h2>
          <p className="text-muted-foreground">
            Here&apos;s a list of your tasks from the selected sprint!
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleDownload} size="sm">
            <DownloadIcon className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
        </div>
      </div>
      {error && <p className="text-red-500 mt-4">Error: {error}</p>}
      <DataTable data={tasks} columns={columns} />
    </div>
  );
}

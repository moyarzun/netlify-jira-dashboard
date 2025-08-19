import fs from "fs"
import path from "path"
import type { Task } from "./schema"
import { taskSchema } from "./schema"

const tasksJsonPath = path.join(process.cwd(), "src/pages/tasks/data/tasks.json")

// Function to read and parse tasks from JSON file
function getTasksFromFile(): Task[] {
  try {
    const tasksJson = fs.readFileSync(tasksJsonPath, "utf-8")
    const tasksData = JSON.parse(tasksJson)
    return tasksData.map((task: unknown) => taskSchema.parse(task))
  } catch (error) {
    return []
  }
}

export const tasks = getTasksFromFile()

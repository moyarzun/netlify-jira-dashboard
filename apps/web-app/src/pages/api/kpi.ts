

interface AssigneeStat {
  name: string;
  totalTasks: number;
  totalStoryPoints: number;
  averageComplexity: number;
  qaRework: number;
  delaysMinutes: number;
}

interface KpiConfig {
  weightStoryPoints: number;
  weightTasks: number;
  weightComplexity: number;
  weightRework: number;
  weightDelays: number;
  perfectWorkKpiLimit: number;
  historicalReworkRate: number;
  weightsSum: number;
}

function calculateKpi(
  stat: AssigneeStat,
  config: KpiConfig
): number {
  const { weightStoryPoints, weightTasks, weightComplexity, weightRework, weightDelays, perfectWorkKpiLimit, historicalReworkRate, weightsSum } = config;
  const storyPoints = stat.totalStoryPoints;
  const tasksCount = stat.totalTasks;
  const avgComplexity = stat.averageComplexity;
  const qaRework = stat.qaRework;
  const delays = stat.delaysMinutes;
  const storyPointsPct = perfectWorkKpiLimit > 0 ? Math.min(storyPoints / perfectWorkKpiLimit, 1) : 0;
  const tasksPct = perfectWorkKpiLimit > 0 ? Math.min(tasksCount / perfectWorkKpiLimit, 1) : 0;
  const complexityPct = avgComplexity > 0 ? Math.min(1 / avgComplexity, 1) : 0;
  const reworkPct = historicalReworkRate > 0 ? Math.max(1 - (qaRework / historicalReworkRate), 0) : 1;
  const delaysPct = delays > 0 ? Math.max(1 - (delays / 60), 0) : 1;
  const kpiRaw =
    storyPointsPct * weightStoryPoints +
    tasksPct * weightTasks +
    complexityPct * weightComplexity +
    reworkPct * weightRework +
    delaysPct * weightDelays;
  const kpi = weightsSum > 0 ? Math.round((kpiRaw / weightsSum) * 100) : 0;
  return kpi;
}


// Vite/Express handler
import type { IncomingMessage, ServerResponse } from 'http';

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse & { statusCode?: number; setHeader: (name: string, value: string) => void; end: (data: string) => void }) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  let body = '';
  req.on('data', chunk => {
    body += chunk;
  });
  req.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      const { assigneeStats, config } = parsed;
      if (!Array.isArray(assigneeStats) || typeof config !== 'object') {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid input' }));
        return;
      }
      const kpis = assigneeStats.map((stat: AssigneeStat) => ({
        name: stat.name,
        kpi: calculateKpi(stat, config),
      }));
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ kpis }));
    } catch {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }
  });
}

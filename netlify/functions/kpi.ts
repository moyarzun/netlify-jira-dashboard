import type { Handler } from '@netlify/functions';

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

function calculateKpi(stat: AssigneeStat, config: KpiConfig): number {
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

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    const { assigneeStats, config } = body;
    if (!Array.isArray(assigneeStats) || typeof config !== 'object') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input' }),
      };
    }
    const kpis = assigneeStats.map((stat: AssigneeStat) => ({
      name: stat.name,
      kpi: calculateKpi(stat, config),
    }));
    return {
      statusCode: 200,
      body: JSON.stringify({ kpis }),
    };
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON' }),
    };
  }
};

// KPI Calculator Middlewares

export interface KpiInputs {
  userStoryPoints: number;
  userTasks: number;
  userQaRework: number;
  userDelaysMinutes: number;
  targetStoryPoints: number;
  targetTasks: number;
  historicalReworkRate: number;
  perfectWorkKpiLimit: number;
}

export interface KpiWeights {
  weightStoryPoints: number;
  weightTasks: number;
  weightComplexity: number;
  weightRework: number;
  weightDelays: number;
}

export interface KpiComponents {
  storyPointsKpi: number;
  tasksKpi: number;
  complexityKpi: number;
  reworkKpi: number;
  delaysKpi: number;
}

// Individual KPI calculators
export const calculateStoryPointsKpi = (inputs: KpiInputs, weights: KpiWeights): number => {
  const ratio = inputs.targetStoryPoints > 0 ? inputs.userStoryPoints / inputs.targetStoryPoints : 0;
  return ratio * (weights.weightStoryPoints / 100);
};

export const calculateTasksKpi = (inputs: KpiInputs, weights: KpiWeights): number => {
  const ratio = inputs.targetTasks > 0 ? inputs.userTasks / inputs.targetTasks : 0;
  return ratio * (weights.weightTasks / 100);
};

export const calculateComplexityKpi = (inputs: KpiInputs, weights: KpiWeights): number => {
  const userComplexity = inputs.userTasks > 0 ? inputs.userStoryPoints / inputs.userTasks : 0;
  const targetComplexity = inputs.targetTasks > 0 ? inputs.targetStoryPoints / inputs.targetTasks : 0;
  const ratio = targetComplexity > 0 ? userComplexity / targetComplexity : 0;
  return ratio * (weights.weightComplexity / 100);
};

export const calculateReworkKpi = (inputs: KpiInputs, weights: KpiWeights): number => {
  const reworkRatio = inputs.historicalReworkRate > 0 ? inputs.userQaRework / inputs.historicalReworkRate : 0;
  const reworkPct = Math.max((inputs.perfectWorkKpiLimit / 100) - reworkRatio, 0);
  return reworkPct * (weights.weightRework / 100);
};

export const calculateDelaysKpi = (inputs: KpiInputs, weights: KpiWeights): number => {
  const delaysRatio = inputs.userDelaysMinutes / 60;
  const delaysPct = Math.max(1 - delaysRatio, 0);
  return delaysPct * (weights.weightDelays / 100);
};

// KPI middleware pipeline
export const calculateKpiComponents = (inputs: KpiInputs, weights: KpiWeights): KpiComponents => {
  return {
    storyPointsKpi: calculateStoryPointsKpi(inputs, weights),
    tasksKpi: calculateTasksKpi(inputs, weights),
    complexityKpi: calculateComplexityKpi(inputs, weights),
    reworkKpi: calculateReworkKpi(inputs, weights),
    delaysKpi: calculateDelaysKpi(inputs, weights),
  };
};

// Final KPI consolidation
export const consolidateKpi = (components: KpiComponents): number => {
  const kpiRaw = components.storyPointsKpi + components.tasksKpi + components.complexityKpi + 
                 components.reworkKpi + components.delaysKpi;
  return Math.round(kpiRaw * 100);
};

// Complete KPI calculation pipeline
export const calculateFinalKpi = (inputs: KpiInputs, weights: KpiWeights): { 
  components: KpiComponents; 
  finalKpi: number; 
} => {
  const components = calculateKpiComponents(inputs, weights);
  const finalKpi = consolidateKpi(components);
  
  return { components, finalKpi };
};
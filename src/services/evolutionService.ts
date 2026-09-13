import { getEvolutionPoints, pointForYear, EVOLUTION_RANGE, type EvolutionPoint } from '@/data/evolution'

// Evolution Service（V0.3 §9）：页面不直接读数据文件。

export const evolutionService = {
  async getMilestones(): Promise<EvolutionPoint[]> {
    return getEvolutionPoints()
  },

  async getPointForYear(year: number): Promise<EvolutionPoint> {
    return pointForYear(year)
  },

  range: EVOLUTION_RANGE,
}

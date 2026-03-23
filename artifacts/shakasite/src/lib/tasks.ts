export interface TaskDefinition {
  code: string;
  name: string;
  category: 'CONCRETE' | 'CARPENTRY' | 'GENERAL';
}

export const TASKS: TaskDefinition[] = [
  // CONCRETE
  { code: 'CON-100', name: 'Concrete',                    category: 'CONCRETE' },
  { code: 'CON-101', name: 'Formwork',                    category: 'CONCRETE' },
  { code: 'CON-102', name: 'Reinforcing Supply',          category: 'CONCRETE' },
  { code: 'CON-103', name: 'Propping',                    category: 'CONCRETE' },
  { code: 'CON-104', name: 'Grouting for Steel',          category: 'CONCRETE' },
  { code: 'CON-105', name: 'Grouting for Facade',         category: 'CONCRETE' },
  { code: 'CON-106', name: 'Tanking & Waterproofing',     category: 'CONCRETE' },

  // CARPENTRY
  { code: 'CARP-200', name: 'External Walls',             category: 'CARPENTRY' },
  { code: 'CARP-201', name: 'Battens to Precast Panel',   category: 'CARPENTRY' },
  { code: 'CARP-202', name: 'Plate to External Walls',    category: 'CARPENTRY' },
  { code: 'CARP-203', name: 'Soffit Framing & Lining',    category: 'CARPENTRY' },
  { code: 'CARP-204', name: 'Internal Timber Framing',    category: 'CARPENTRY' },
  { code: 'CARP-205', name: 'Timber Wall Linings',        category: 'CARPENTRY' },
  { code: 'CARP-206', name: 'Cladding Substrate',         category: 'CARPENTRY' },
  { code: 'CARP-207', name: 'Roof Framing',               category: 'CARPENTRY' },
  { code: 'CARP-208', name: 'Timber Door Install',        category: 'CARPENTRY' },

  // GENERAL
  { code: 'GEN-300', name: 'Site Cleanup',                category: 'GENERAL' },
  { code: 'GEN-301', name: 'Plant Operation',             category: 'GENERAL' },
  { code: 'GEN-302', name: 'Safety Inspection',           category: 'GENERAL' },
  { code: 'GEN-303', name: 'Other',                       category: 'GENERAL' },
];

export const TASKS_BY_CODE = Object.fromEntries(TASKS.map(t => [t.code, t]));
export const TASKS_BY_NAME = Object.fromEntries(TASKS.map(t => [t.name, t]));

export const TASK_CATEGORIES: Record<string, TaskDefinition[]> = {
  CONCRETE:  TASKS.filter(t => t.category === 'CONCRETE'),
  CARPENTRY: TASKS.filter(t => t.category === 'CARPENTRY'),
  GENERAL:   TASKS.filter(t => t.category === 'GENERAL'),
};

/** Given a key that is either a code (CARP-203) or a legacy name, return the TaskDefinition or null */
export function resolveTask(key: string): TaskDefinition | null {
  return TASKS_BY_CODE[key] ?? TASKS_BY_NAME[key] ?? null;
}

/** Human-readable label: "CARP-203 · Soffit Framing & Lining" */
export function taskLabel(key: string): string {
  const t = resolveTask(key);
  if (!t) return key;
  return `${t.code} · ${t.name}`;
}

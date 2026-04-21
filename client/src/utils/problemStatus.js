/**
 * Canonical problem classification (if / else priority):
 *   1. Idea — no feedback yet
 *   2. Needs Review — any unresolved non-endorsement review
 *   3. Endorsed — all reviews closed + at least one endorsement (feedback or counter)
 *   4. Resolved — had non-endorsement reviews, all resolved, no endorsements
 *
 * @returns {'Idea'|'Needs Review'|'Endorsed'|'Resolved'|'Archived'}
 */
export function getProblemStatus(problem, feedbacks) {
  if (problem?.stage === 'Archived') return 'Archived';
  const fbs = feedbacks || problem?.feedbacks || [];
  if (fbs.length === 0) return 'Idea';
  if (fbs.some((fb) => !fb.isEndorsement && !fb.resolved)) return 'Needs Review';
  const hasEndorsement =
    fbs.some((fb) => fb.isEndorsement) || (Number(problem?.endorsements) || 0) > 0;
  if (hasEndorsement) return 'Endorsed';
  if (fbs.some((fb) => !fb.isEndorsement)) return 'Resolved';
  return 'Endorsed';
}

/** Badge styles: high contrast, UCLA-aligned */
export const STATUS_BADGE_CLASS = {
  Idea: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200 border border-yellow-300/60 dark:border-yellow-600/40',
  'Needs Review': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border border-red-300/60 dark:border-red-600/40',
  Endorsed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 border border-green-300/60 dark:border-green-600/40',
  Resolved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border border-blue-300/60 dark:border-blue-600/40',
  Archived: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-600',
};

export const STATUS_POINTS = {
  Idea: 2,
  'Needs Review': -2,
  Endorsed: 5,
  Resolved: 3,
};

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
  Idea: 'bg-[#DAEBFE] text-[#003B5C] dark:bg-[#003B5C] dark:text-white border border-[#2774AE]/25 dark:border-white/20',
  'Needs Review': 'bg-[#FFB81C]/25 text-[#003B5C] dark:bg-[#FFB81C]/20 dark:text-white border border-[#FFB81C]/50',
  Endorsed: 'bg-[#FFD100] text-[#001628] dark:bg-[#FFD100] dark:text-[#001628] border border-[#005587]/30',
  Resolved: 'bg-[#8BB8E8]/35 text-[#003B5C] dark:bg-[#2774AE] dark:text-white border border-[#2774AE]/40',
  Archived: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-600',
};

export const STATUS_POINTS = {
  Idea: 2,
  'Needs Review': -2,
  Endorsed: 5,
  Resolved: 3,
};

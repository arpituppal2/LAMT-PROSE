/**
 * Canonical problem classification.
 *
 * Priority (highest → lowest):
 *   1. Idea          – no feedback at all (freshly written)
 *   2. Needs Review  – has at least one unresolved, non-endorsement review
 *   3. Endorsed      – all feedback resolved + at least one endorsement
 *   4. Resolved      – all feedback resolved, none are endorsements
 *
 * @param {object}   problem   – the problem object (used only for fallback)
 * @param {Array}    feedbacks – array of feedback objects with { isEndorsement, resolved }
 * @returns {'Idea'|'Needs Review'|'Endorsed'|'Resolved'}
 */
export function getProblemStatus(problem, feedbacks) {
  const fbs = feedbacks || problem?.feedbacks || [];

  // 1. No feedback at all → Idea
  if (fbs.length === 0) return 'Idea';

  // 2. Any unresolved non-endorsement review → Needs Review
  const hasOpenReview = fbs.some(fb => !fb.isEndorsement && !fb.resolved);
  if (hasOpenReview) return 'Needs Review';

  // All feedback is now resolved or is an endorsement.
  // 3. At least one endorsement → Endorsed
  const hasEndorsement = fbs.some(fb => fb.isEndorsement);
  if (hasEndorsement) return 'Endorsed';

  // 4. Had reviews, all resolved, no endorsements → Resolved
  return 'Resolved';
}

/**
 * Tailwind badge classes for each status (light + dark).
 */
export const STATUS_BADGE_CLASS = {
  'Idea':         'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  'Needs Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  'Endorsed':     'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  'Resolved':     'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
};

/**
 * Leaderboard point values per status.
 */
export const STATUS_POINTS = {
  'Idea':         2,
  'Needs Review': -2,
  'Endorsed':     5,
  'Resolved':     3,
};

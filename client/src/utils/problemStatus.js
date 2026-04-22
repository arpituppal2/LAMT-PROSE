/**
 * Canonical problem classification (if / else priority):
 *   1. Idea         — no feedback yet
 *   2. Needs Review — any unresolved non-endorsement review
 *   3. Endorsed     — all reviews closed + at least one endorsement
 *   4. Resolved     — had non-endorsement reviews, all resolved, no endorsements
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

/**
 * Maps each status to the CSS classes defined in index.css.
 *
 * Base:     .status-badge          (shared geometry — padding, radius, font)
 * Modifier: .status-<slug>         (color pair from CSS variables, light + dark)
 *
 * Usage:
 *   <span className={STATUS_BADGE_CLASS[status]}>Needs Review</span>
 */
export const STATUS_BADGE_CLASS = {
  'Needs Review': 'status-badge status-needs-review',
  Endorsed:       'status-badge status-endorsed',
  Resolved:       'status-badge status-resolved',
  Idea:           'status-badge status-idea',
  Archived:       'status-badge status-archived',
};

export const STATUS_POINTS = {
  Idea:           2,
  'Needs Review': -2,
  Endorsed:       5,
  Resolved:       3,
};

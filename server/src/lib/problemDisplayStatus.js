/**
 * Canonical display stage (matches client getProblemStatus).
 * Order: Idea → Needs Review → Endorsed → Resolved
 */
export function computeDisplayStatus(problem) {
  if (!problem || problem.stage === 'Archived') return 'Archived';
  const fbs = problem.feedbacks || [];
  if (fbs.length === 0) return 'Idea';
  if (fbs.some((f) => !f.resolved && !f.isEndorsement)) return 'Needs Review';
  const hasEndorsement =
    fbs.some((f) => f.isEndorsement) || (problem.endorsements || 0) > 0;
  if (hasEndorsement) return 'Endorsed';
  if (fbs.some((f) => !f.isEndorsement)) return 'Resolved';
  return 'Endorsed';
}

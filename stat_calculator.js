// stat_calculator.js

/**
 * Estimate 1RM using Epley formula
 * @param {number} weight - weight lifted (kg or lbs)
 * @param {number} reps - number of reps performed
 * @returns {number} estimated 1RM
 */
function estimate1RM(weight, reps) {
  if (!weight || !reps) return 0;
  return weight * (1 + reps / 30);
}

// expose globally
window.estimate1RM = estimate1RM;

/**
 * Calculate 1RM for multiple sets
 * @param {Array} sets - array of { weight: number, reps: number }
 * @returns {Array} array of 1RM values per set
 */
function calculateSet1RMs(sets = []) {
  return sets.map(set => ({
    ...set,
    estimated1RM: estimate1RM(set.weight, set.reps)
  }));
}

/**
 * Get the best (highest) estimated 1RM from sets
 * @param {Array} sets - array of { weight, reps }
 * @returns {number} max estimated 1RM
 */
function getBest1RM(sets = []) {
  if (!sets.length) return 0;

  return Math.max(
    ...sets.map(set => estimate1RM(set.weight, set.reps))
  );
}

/**
 * Optional: average 1RM across sets
 * @param {Array} sets
 * @returns {number}
 */
function getAverage1RM(sets = []) {
  if (!sets.length) return 0;

  const total = sets.reduce(
    (sum, set) => sum + estimate1RM(set.weight, set.reps),
    0
  );

  return total / sets.length;
}
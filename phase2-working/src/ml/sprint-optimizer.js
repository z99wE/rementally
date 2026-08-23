/**
 * Sprint Optimizer — ML-Powered Adaptive Focus Periods
 *
 * Uses the user's KDE energy curve to recommend sprint durations and timing.
 * No fixed Pomodoro intervals — the app learns YOUR brain's rhythm.
 *
 * Algorithm:
 * 1. Query the user's energy curve from energy-estimator KDE
 * 2. Calculate remaining energy in current hour
 * 3. Find the next trough (predicted end of focus window)
 * 4. Recommend sprint duration = time until next trough
 * 5. Adjust for cognitive load and recent performance
 *
 * Cost: $0 — pure math on existing data.
 */

const { pool } = require('../db');
const { kde, gaussianKernel } = require('./energy-estimator');

/**
 * Recommend a sprint duration based on current energy and historical patterns.
 * Returns a recommendation object with duration, confidence, and reasoning.
 */
async function recommendSprint(userId, thoughtContent = '') {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  // Get energy curve
  let energyPattern;
  try {
    const { detectEnergyPattern } = require('./energy-estimator');
    energyPattern = await detectEnergyPattern(userId);
  } catch {
    energyPattern = { has_data: false, default_curve: getDefaultCurve() };
  }

  const curve = energyPattern.has_data ? energyPattern.energy_curve : energyPattern.default_curve;

  // Interpolate energy at current hour
  const hourFloor = Math.floor(currentHour);
  const hourCeil = (hourFloor + 1) % 24;
  const frac = currentHour - hourFloor;
  const currentEnergy = (curve[hourFloor] * (1 - frac) + curve[hourCeil] * frac) / 100;

  // Find the next trough (energy drop below 40%)
  let focusWindowMinutes = 25; // default
  const nextTroughHour = findNextTrough(curve, currentHour);
  if (nextTroughHour !== null) {
    focusWindowMinutes = Math.round((nextTroughHour - currentHour + 24) % 24 * 60);
    // Clamp between 10 and 90 minutes
    focusWindowMinutes = Math.max(10, Math.min(90, focusWindowMinutes));
  }

  // Adjust based on recent sprint performance
  const recentStats = await getRecentSprintStats(userId);
  let adjustmentFactor = 1.0;

  if (recentStats) {
    // If average focus score is high, user can handle longer sprints
    if (recentStats.avg_focus_score > 0.7) adjustmentFactor = 1.15;
    // If focus score is low, shorten sprints
    else if (recentStats.avg_focus_score < 0.3) adjustmentFactor = 0.75;

    // If interruption rate is high, shorten sprints
    if (recentStats.avg_interruptions > 2) adjustmentFactor *= 0.8;
  }

  const recommendedMinutes = Math.round(focusWindowMinutes * adjustmentFactor);
  const clampedMinutes = Math.max(10, Math.min(90, recommendedMinutes));

  // Build reasoning
  const reasoning = buildReasoning(currentEnergy, clampedMinutes, energyPattern, recentStats);

  return {
    recommended_minutes: clampedMinutes,
    current_energy: Math.round(currentEnergy * 100),
    peak_energy: energyPattern.has_data ? Math.max(...energyPattern.energy_curve) : 80,
    is_peak_window: currentEnergy > 0.6,
    next_trough_hour: nextTroughHour,
    confidence: energyPattern.has_data ? energyPattern.confidence || 0.5 : 0.2,
    reasoning,
    suggestions: generateSprintSuggestions(clampedMinutes, currentEnergy, thoughtContent),
    recent_performance: recentStats ? {
      avg_focus_score: Math.round(recentStats.avg_focus_score * 100),
      avg_completion_rate: Math.round(recentStats.avg_completion_rate * 100),
      total_sprints: recentStats.total_sprints,
    } : null,
  };
}

/**
 * Complete a sprint session, update stats, check for achievements.
 */
async function completeSprint(userId, sprintId, completedThoughts = 0) {
  const { rows } = await pool.query(
    'SELECT * FROM cognitive_sprints WHERE id = $1 AND user_id = $2',
    [sprintId, userId]
  );
  if (!rows.length) throw new Error('Sprint not found');
  if (rows[0].status !== 'active') throw new Error('Sprint already ended');

  const sprint = rows[0];
  const now = new Date();
  const actualMinutes = Math.round((now - new Date(sprint.started_at)) / 60000);

  // Calculate focus score (0-1)
  const focusScore = calculateFocusScore(sprint, actualMinutes, completedThoughts);

  // Update sprint
  await pool.query(
    `UPDATE cognitive_sprints
     SET status = 'completed', actual_minutes = $1, completed_thoughts = $2,
         focus_score = $3, energy_at_end = $4, ended_at = NOW()
     WHERE id = $5`,
    [actualMinutes, completedThoughts, focusScore, null, sprintId]
  );

  // Update aggregated stats
  await updateSprintStats(userId, actualMinutes, focusScore, completedThoughts);

  // Check for newly unlocked achievements
  const newAchievements = await checkAchievements(userId);

  return {
    sprint_id: sprintId,
    actual_minutes: actualMinutes,
    focus_score: focusScore,
    completed_thoughts: completedThoughts,
    new_achievements: newAchievements,
  };
}

/**
 * Abandon a sprint (user gave up or was interrupted).
 */
async function abandonSprint(userId, sprintId, reason = 'interrupted') {
  const actualMinutes = await pool.query(
    `SELECT EXTRACT(EPOCH FROM (NOW() - started_at)) / 60 AS minutes
     FROM cognitive_sprints WHERE id = $1 AND user_id = $2`,
    [sprintId, userId]
  );

  await pool.query(
    `UPDATE cognitive_sprints
     SET status = 'abandoned', actual_minutes = $1, ended_at = NOW(),
         metadata = jsonb_set(metadata, '{abandon_reason}', $3::jsonb)
     WHERE id = $3 AND user_id = $4`,
    [Math.round(actualMinutes.rows[0]?.minutes || 0), sprintId, JSON.stringify(reason), userId]
  );

  return { abandoned: true, minutes_wasted: Math.round(actualMinutes.rows[0]?.minutes || 0) };
}

// ── Helper Functions ────────────────────────────────────────────────────────

function findNextTrough(curve, currentHour) {
  for (let offset = 1; offset < 24; offset++) {
    const h = (currentHour + offset) % 24;
    const hPrev = (currentHour + offset - 1 + 24) % 24;
    const hNext = (currentHour + offset + 1) % 24;
    if (curve[h] < curve[hPrev] && curve[h] < curve[hNext] && curve[h] < 40) {
      return h;
    }
  }
  return null;
}

async function getRecentSprintStats(userId) {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) as total_sprints,
       AVG(focus_score) as avg_focus_score,
       AVG(completed_thoughts::float / GREATEST(actual_minutes, 1)) as avg_thoughts_per_min,
       AVG(completed_thoughts) as avg_completed,
       AVG((metadata->>'interruptions')::int) as avg_interruptions,
       AVG(CASE WHEN completed_thoughts > 0 THEN 1.0 ELSE 0.0 END) as avg_completion_rate
     FROM cognitive_sprints
     WHERE user_id = $1 AND status IN ('completed', 'abandoned')
       AND started_at > NOW() - INTERVAL '30 days'`,
    [userId]
  );
  if (!rows[0] || rows[0].total_sprints === 0) return null;
  return rows[0];
}

function calculateFocusScore(sprint, actualMinutes, completedThoughts) {
  let score = 0;

  // Duration adherence (did they finish the recommended sprint?)
  const durationRatio = actualMinutes / Math.max(sprint.recommended_minutes, 1);
  if (durationRatio >= 0.8 && durationRatio <= 1.2) score += 0.4;
  else if (durationRatio >= 0.5) score += 0.2;

  // Completion rate
  if (completedThoughts > 0) score += 0.3;
  if (completedThoughts >= 3) score += 0.1;

  // Energy alignment (started during peak?)
  if (sprint.energy_at_start > 0.6) score += 0.2;

  return Math.min(1, score);
}

async function updateSprintStats(userId, minutes, focusScore, thoughtsCompleted) {
  const { rows } = await pool.query(
    'SELECT * FROM user_sprint_stats WHERE user_id = $1', [userId]
  );
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  if (!rows.length) {
    // First sprint ever
    await pool.query(
      `INSERT INTO user_sprint_stats
       (user_id, total_sprints, total_focus_minutes, avg_focus_score,
        longest_sprint_minutes, thoughts_completed_in_sprints,
        consecutive_sprint_days, last_sprint_date, best_energy_at_start)
       VALUES ($1, 1, $2, $3, $2, $4, 1, $5, $3)`,
      [userId, minutes, focusScore, thoughtsCompleted, today]
    );
  } else {
    const prev = rows[0];
    const newTotal = prev.total_sprints + 1;
    const newMinutes = prev.total_focus_minutes + minutes;
    const newAvgScore = ((prev.avg_focus_score * prev.total_sprints) + focusScore) / newTotal;
    const newLongest = Math.max(prev.longest_sprint_minutes || 0, minutes);
    const newThoughts = (prev.thoughts_completed_in_sprints || 0) + thoughtsCompleted;

    // Consecutive days
    let newConsecutive = 1;
    if (prev.last_sprint_date) {
      const lastDate = new Date(prev.last_sprint_date);
      const diffDays = Math.round((now - lastDate) / 86400000);
      if (diffDays === 1) newConsecutive = (prev.consecutive_sprint_days || 0) + 1;
      else if (diffDays === 0) newConsecutive = prev.consecutive_sprint_days || 1;
    }

    await pool.query(
      `UPDATE user_sprint_stats SET
         total_sprints = $2, total_focus_minutes = $3, avg_focus_score = $4,
         longest_sprint_minutes = $5, thoughts_completed_in_sprints = $6,
         consecutive_sprint_days = $7, last_sprint_date = $8, updated_at = NOW()
       WHERE user_id = $1`,
      [userId, newTotal, newMinutes, newAvgScore, newLongest, newThoughts, newConsecutive, today]
    );
  }
}

async function checkAchievements(userId) {
  const { rows: stats } = await pool.query(
    'SELECT * FROM user_sprint_stats WHERE user_id = $1', [userId]
  );
  if (!stats.length) return [];

  const s = stats[0];
  const { rows: existing } = await pool.query(
    'SELECT achievement_key FROM achievements WHERE user_id = $1', [userId]
  );
  const unlocked = new Set(existing.map(r => r.achievement_key));

  const candidates = [];

  // Focus achievements
  if (s.total_sprints >= 1 && !unlocked.has('first_sprint')) {
    candidates.push({
      achievement_key: 'first_sprint',
      category: 'focus',
      title: 'First Sprint Completed',
      description: 'You completed your first Cognitive Sprint. Your brain has a rhythm — now you know it.',
      icon: 'play_arrow',
    });
  }
  if (s.total_sprints >= 10 && !unlocked.has('sprint_regular')) {
    candidates.push({
      achievement_key: 'sprint_regular',
      category: 'focus',
      title: 'Sprint Regular',
      description: '10 sprints completed. You are building a focus habit that compounds.',
      icon: 'repeat',
    });
  }
  if (s.longest_sprint_minutes >= 60 && !unlocked.has('deep_focus')) {
    candidates.push({
      achievement_key: 'deep_focus',
      category: 'focus',
      title: 'Deep Focus Session',
      description: 'You held focus for 60+ minutes. That is rare. Your prefrontal cortex is训练.',
      icon: 'psychology',
    });
  }
  if (s.consecutive_sprint_days >= 7 && !unlocked.has('weekly_streak')) {
    candidates.push({
      achievement_key: 'weekly_streak',
      category: 'consistency',
      title: '7-Day Sprint Streak',
      description: 'Seven consecutive days of sprints. Consistency is the compound interest of cognition.',
      icon: 'local_fire_department',
    });
  }
  if (s.avg_focus_score >= 0.8 && s.total_sprints >= 5 && !unlocked.has('focus_master')) {
    candidates.push({
      achievement_key: 'focus_master',
      category: 'focus',
      title: 'Focus Master',
      description: 'Average focus score above 80% across 5+ sprints. You have trained your attention.',
      icon: 'star',
    });
  }

  // Cognitive achievements
  if (s.thoughts_completed_in_sprints >= 20 && !unlocked.has('thought_accelerator')) {
    candidates.push({
      achievement_key: 'thought_accelerator',
      category: 'cognitive',
      title: 'Thought Accelerator',
      description: '20 thoughts completed during sprints. You process ideas faster than you think.',
      icon: 'speed',
    });
  }

  // Save new achievements
  for (const ach of candidates) {
    await pool.query(
      `INSERT INTO achievements (user_id, achievement_key, category, title, description, icon)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
      [userId, ach.achievement_key, ach.category, ach.title, ach.description, ach.icon]
    ).catch(() => {});
  }

  return candidates;
}

function buildReasoning(currentEnergy, minutes, energyPattern, recentStats) {
  const parts = [];

  if (energyPattern.has_data) {
    if (currentEnergy > 0.7) parts.push('You are in a high-energy window right now.');
    else if (currentEnergy > 0.4) parts.push('Moderate energy right now — a focused sprint will help you peak.');
    else parts.push('Energy is low. A shorter sprint keeps you engaged without burnout.');
  }

  if (recentStats) {
    if (recentStats.avg_focus_score > 0.7) parts.push('Your recent focus scores are strong. Pushing slightly longer.');
    else if (recentStats.avg_focus_score < 0.3) parts.push('Recent sprints were choppy. Shorter intervals help rebuild momentum.');
  }

  parts.push(`Recommended duration: ${minutes} minutes.`);

  return parts.join(' ');
}

function generateSprintSuggestions(minutes, currentEnergy, thoughtContent) {
  const suggestions = [];

  if (currentEnergy > 0.7) {
    suggestions.push('High energy detected — tackle your hardest task first.');
  } else if (currentEnergy > 0.4) {
    suggestions.push('Moderate energy — good for structured work. Break the task into steps.');
  } else {
    suggestions.push('Lower energy — start with something quick to build momentum.');
  }

  if (minutes >= 45) {
    suggestions.push('Long sprint ahead. Set one clear goal for this period.');
  } else {
    suggestions.push('Quick sprint — pick one specific thing to complete.');
  }

  return suggestions;
}

function getDefaultCurve() {
  return Array.from({ length: 24 }, (_, i) => {
    if (i >= 9 && i <= 11) return 80;
    if (i >= 14 && i <= 16) return 70;
    if (i >= 20 && i <= 22) return 60;
    if (i >= 12 && i <= 13) return 30;
    if (i >= 0 && i <= 5) return 10;
    return 50;
  });
}

module.exports = {
  recommendSprint,
  completeSprint,
  abandonSprint,
  checkAchievements,
};

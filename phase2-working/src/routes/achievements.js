/**
 * ACHIEVEMENTS API
 *
 * Behavior-change milestones — not login streaks, not spam points.
 * Rewards: keeping promises, clearing cognitive debt, improving thought quality,
 * aligning sprints with energy peaks.
 *
 * All endpoints require authentication.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authMiddleware } = require('../auth');

/**
 * GET /api/achievements
 * List all achievements for the current user.
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM achievements
       WHERE user_id = $1
       ORDER BY unlocked_at DESC`,
      [req.userId]
    );

    // Get total possible (all achievement definitions)
    const allPossible = getAllAchievementDefinitions();
    const unlockedKeys = new Set(rows.map(r => r.achievement_key));

    const achievements = allPossible.map(def => ({
      ...def,
      unlocked: unlockedKeys.has(def.key),
      unlocked_at: rows.find(r => r.achievement_key === def.key)?.unlocked_at || null,
    }));

    res.json({
      achievements,
      unlocked_count: rows.length,
      total_possible: allPossible.length,
      progress_pct: Math.round((rows.length / allPossible.length) * 100),
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list achievements', details: e.message });
  }
});

/**
 * GET /api/achievements/summary
 * Get achievement summary stats.
 */
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT category, COUNT(*) as count
       FROM achievements
       WHERE user_id = $1
       GROUP BY category`,
      [req.userId]
    );

    const allDefs = getAllAchievementDefinitions();
    const byCategory = {};
    for (const def of allDefs) {
      if (!byCategory[def.category]) byCategory[def.category] = { earned: 0, total: 0 };
      byCategory[def.category].total++;
      if (rows.find(r => r.achievement_key === def.key)) {
        byCategory[def.category].earned++;
      }
    }

    const { rows: totalStats } = await pool.query(
      `SELECT COUNT(*) as total_sprints,
              COALESCE(SUM(completed_thoughts), 0) as thoughts_in_sprints
       FROM cognitive_sprints
       WHERE user_id = $1 AND status = 'completed'`,
      [req.userId]
    );

    res.json({
      categories: byCategory,
      recent_unlocks: rows.slice(0, 5),
      stats: totalStats[0],
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get summary', details: e.message });
  }
});

/**
 * GET /api/achievements/:key
 * Get details of a specific achievement.
 */
router.get('/:key', authMiddleware, async (req, res) => {
  try {
    const def = getAllAchievementDefinitions().find(d => d.key === req.params.key);
    if (!def) return res.status(404).json({ error: 'Achievement not found' });

    const { rows } = await pool.query(
      'SELECT * FROM achievements WHERE user_id = $1 AND achievement_key = $2',
      [req.userId, req.params.key]
    );

    res.json({
      ...def,
      unlocked: rows.length > 0,
      unlocked_at: rows[0]?.unlocked_at || null,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get achievement', details: e.message });
  }
});

/**
 * GET /api/achievements/recent
 * Get the 5 most recently unlocked achievements.
 */
router.get('/recent/unlock', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM achievements
       WHERE user_id = $1
       ORDER BY unlocked_at DESC LIMIT 5`,
      [req.userId]
    );
    res.json({ recent: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get recent achievements', details: e.message });
  }
});

/**
 * GET /api/achievements/social-proof
 * Get anonymized aggregate achievement stats (for social proof).
 */
router.get('/social-proof/global', authMiddleware, async (req, res) => {
  try {
    const { rows: totalUsers } = await pool.query(
      'SELECT COUNT(DISTINCT user_id) as count FROM achievements'
    );
    const { rows: topAchievements } = await pool.query(
      `SELECT achievement_key, COUNT(*) as unlock_count
       FROM achievements
       GROUP BY achievement_key
       ORDER BY unlock_count DESC LIMIT 5`
    );
    const { rows: avgStats } = await pool.query(
      `SELECT AVG(unlocked_per_user) as avg_unlocks
       FROM (SELECT user_id, COUNT(*) as unlocked_per_user
             FROM achievements GROUP BY user_id) sub`
    );

    res.json({
      total_users_with_achievements: totalUsers[0]?.count || 0,
      most_common_achievements: topAchievements,
      avg_unlocks_per_user: Math.round(avgStats[0]?.avg_unlocks || 0),
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get social proof', details: e.message });
  }
});

// ── Achievement Definitions ─────────────────────────────────────────────────

function getAllAchievementDefinitions() {
  return [
    // Focus
    { key: 'first_sprint', category: 'focus', title: 'First Sprint Completed', description: 'You completed your first Cognitive Sprint. Your brain has a rhythm — now you know it.', icon: 'play_arrow' },
    { key: 'sprint_regular', category: 'focus', title: 'Sprint Regular', description: '10 sprints completed. You are building a focus habit that compounds.', icon: 'repeat' },
    { key: 'deep_focus', category: 'focus', title: 'Deep Focus Session', description: 'You held focus for 60+ minutes. That is rare. Your prefrontal cortex is sharpening.', icon: 'psychology' },
    { key: 'focus_master', category: 'focus', title: 'Focus Master', description: 'Average focus score above 80% across 5+ sprints. You have trained your attention.', icon: 'star' },
    { key: 'sprint_marathon', category: 'focus', title: 'Sprint Marathon', description: '25+ sprints completed. You have built a real cognitive practice.', icon: 'military_tech' },

    // Quality
    { key: 'thought_clarity', category: 'quality', title: 'Thought Clarity', description: 'Average thought quality score above 70%. Your ideas are getting sharper.', icon: 'auto_awesome' },
    { key: 'action_bias', category: 'quality', title: 'Action Bias', description: '80%+ of your thoughts contain actionable verbs. You think in solutions.', icon: 'bolt' },
    { key: 'specificity_master', category: 'quality', title: 'Specificity Master', description: 'Your TF-IDF specificity score is above 80%. No vague thoughts here.', icon: 'gps_fixed' },

    // Consistency
    { key: 'weekly_streak', category: 'consistency', title: '7-Day Sprint Streak', description: 'Seven consecutive days of sprints. Consistency is the compound interest of cognition.', icon: 'local_fire_department' },
    { key: 'monthly_streak', category: 'consistency', title: '30-Day Streak', description: 'A full month of daily sprints. You have rewired your default behavior.', icon: 'workspace_premium' },
    { key: 'early_bird', category: 'consistency', title: 'Early Bird Sprint', description: 'Completed a sprint before 8 AM. Your morning brain is powerful.', icon: 'wb_sunny' },
    { key: 'night_owl_sprint', category: 'consistency', title: 'Night Owl Sprint', description: 'Completed a sprint after 10 PM. Your late-night focus is a weapon.', icon: 'dark_mode' },

    // Cognitive
    { key: 'thought_accelerator', category: 'cognitive', title: 'Thought Accelerator', description: '20 thoughts completed during sprints. You process ideas faster than you think.', icon: 'speed' },
    { key: 'cognitive_debt_clearer', category: 'cognitive', title: 'Debt Cleared', description: 'Reduced cognitive debt below threshold. Your mind is lighter.', icon: 'balance' },
    { key: 'pattern_predictor', category: 'cognitive', title: 'Pattern Predictor', description: 'The anomaly detector found your first pattern break. You are self-aware.', icon: 'insights' },
    { key: 'energy_aligned', category: 'cognitive', title: 'Energy Aligned', description: '5 sprints started during your peak energy window. You are working WITH your brain.', icon: 'battery_full' },
    { key: 'quality_trajectory', category: 'cognitive', title: 'Quality Rising', description: 'Your thought quality scores improved by 20%+ over two weeks. Growth.', icon: 'trending_up' },

    // Social
    { key: 'witness_keeper', category: 'social', title: 'Witness Keeper', description: 'Kept 5 commitment witness promises. People trust your word.', icon: 'handshake' },
    { key: 'mind_sharer', category: 'social', title: 'Mind Sharer', description: 'Shared a thought with a witness contact for the first time.', icon: 'share' },
  ];
}

module.exports = router;

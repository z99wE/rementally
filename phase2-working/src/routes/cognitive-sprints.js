/**
 * COGNITIVE SPRINTS API
 *
 * Adaptive focus periods powered by ML energy estimation.
 * No fixed Pomodoro — the app recommends duration based on YOUR energy curve.
 *
 * All endpoints require authentication.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authMiddleware } = require('../auth');

const getSprintOptimizer = () => require('../ml/sprint-optimizer');

/**
 * GET /api/sprints/recommend
 * Get a personalized sprint recommendation based on energy curve.
 */
router.get('/recommend', authMiddleware, async (req, res) => {
  try {
    const { recommendSprint } = getSprintOptimizer();
    const { thought } = req.query;
    const recommendation = await recommendSprint(req.userId, thought || '');
    res.json(recommendation);
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate recommendation', details: e.message });
  }
});

/**
 * POST /api/sprints/start
 * Start a new cognitive sprint with ML-recommended duration.
 */
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const { recommendSprint } = getSprintOptimizer();
    const { thought_id, custom_minutes } = req.body;

    // Get recommendation (or use custom if provided)
    let recommendation;
    if (custom_minutes) {
      recommendation = { recommended_minutes: Math.max(10, Math.min(90, custom_minutes)) };
    } else {
      recommendation = await recommendSprint(req.userId);
    }

    // Check for active sprints — end them first
    const active = await pool.query(
      'SELECT id FROM cognitive_sprints WHERE user_id = $1 AND status = \'active\'',
      [req.userId]
    );
    if (active.rows.length > 0) {
      // Auto-complete any active sprints
      await pool.query(
        `UPDATE cognitive_sprints SET status = 'abandoned', ended_at = NOW()
         WHERE user_id = $1 AND status = 'active'`,
        [req.userId]
      );
    }

    // Create sprint
    const { rows } = await pool.query(
      `INSERT INTO cognitive_sprints
       (user_id, thought_id, recommended_minutes, energy_at_start, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.userId,
        thought_id || null,
        recommendation.recommended_minutes,
        (recommendation.current_energy || 50) / 100,
        JSON.stringify({
          recommendations: recommendation.suggestions,
          peak_window: recommendation.is_peak_window,
        }),
      ]
    );

    res.json({
      sprint: rows[0],
      recommendation: {
        minutes: recommendation.recommended_minutes,
        reasoning: recommendation.reasoning,
        suggestions: recommendation.suggestions,
        current_energy: recommendation.current_energy,
        is_peak_window: recommendation.is_peak_window,
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to start sprint', details: e.message });
  }
});

/**
 * POST /api/sprints/:id/complete
 * Complete a sprint, record results, check for achievements.
 */
router.post('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { completeSprint } = getSprintOptimizer();
    const { completed_thoughts } = req.body;

    const result = await completeSprint(
      req.userId,
      req.params.id,
      completed_thoughts || 0
    );

    res.json(result);
  } catch (e) {
    if (e.message.includes('not found')) return res.status(404).json({ error: e.message });
    if (e.message.includes('already ended')) return res.status(400).json({ error: e.message });
    res.status(500).json({ error: 'Failed to complete sprint', details: e.message });
  }
});

/**
 * POST /api/sprints/:id/abandon
 * Abandon a sprint (interrupted, gave up, etc.).
 */
router.post('/:id/abandon', authMiddleware, async (req, res) => {
  try {
    const { abandonSprint } = getSprintOptimizer();
    const { reason } = req.body;
    const result = await abandonSprint(req.userId, req.params.id, reason || 'interrupted');
    res.json(result);
  } catch (e) {
    if (e.message.includes('not found')) return res.status(404).json({ error: e.message });
    res.status(500).json({ error: 'Failed to abandon sprint', details: e.message });
  }
});

/**
 * GET /api/sprints
 * List user's sprint history (recent sprints).
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const { rows } = await pool.query(
      `SELECT * FROM cognitive_sprints
       WHERE user_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [req.userId, limit]
    );
    res.json({ sprints: rows, count: rows.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list sprints', details: e.message });
  }
});

/**
 * GET /api/sprints/active
 * Get the currently active sprint.
 */
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM cognitive_sprints
       WHERE user_id = $1 AND status = 'active'
       ORDER BY started_at DESC LIMIT 1`,
      [req.userId]
    );
    res.json({ sprint: rows[0] || null });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get active sprint', details: e.message });
  }
});

/**
 * GET /api/sprints/stats
 * Get aggregated sprint statistics.
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM user_sprint_stats WHERE user_id = $1',
      [req.userId]
    );
    res.json(rows[0] || {
      total_sprints: 0,
      total_focus_minutes: 0,
      avg_focus_score: 0,
      longest_sprint_minutes: 0,
      consecutive_sprint_days: 0,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get stats', details: e.message });
  }
});

/**
 * GET /api/sprints/today
 * Get today's sprint summary.
 */
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(actual_minutes), 0) as total_minutes,
              COALESCE(AVG(focus_score), 0) as avg_focus,
              COALESCE(SUM(completed_thoughts), 0) as total_thoughts
       FROM cognitive_sprints
       WHERE user_id = $1
         AND started_at >= CURRENT_DATE
         AND status IN ('completed', 'abandoned')`,
      [req.userId]
    );
    res.json(rows[0] || { count: 0, total_minutes: 0, avg_focus: 0, total_thoughts: 0 });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get today summary', details: e.message });
  }
});

module.exports = router;

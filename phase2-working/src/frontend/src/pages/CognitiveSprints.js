/**
 * CognitiveSprints Page
 *
 * Adaptive focus periods powered by ML energy estimation.
 * No fixed Pomodoro — the app recommends duration based on YOUR brain's rhythm.
 *
 * Brand: All CSS variables, Material Symbols only, no emoji, no hardcoded colors.
 */

import api from '../lib/api.js';
import { initSpecularButtons } from '../components/specularButton.js';

const esc = window.esc || (s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));

export function CognitiveSprints() {
  const container = document.createElement('div');
  container.className = 'page-shell';
  container.innerHTML = renderSkeleton();
  loadContent(container);
  return container;
}

function renderSkeleton() {
  return `
    <div style="max-width:900px;margin:0 auto;padding:1.5rem;">
      <div class="card-reveal" style="margin-bottom:1.5rem;">
        <h1 style="font:var(--md-sys-typescale-headline-medium);color:var(--md-sys-color-on-surface);margin:0 0 0.5rem;">
          <span class="material-symbols-outlined" style="vertical-align:-6px;margin-right:8px;color:var(--md-sys-color-primary);">speed</span>
          Cognitive Sprints
        </h1>
        <p style="color:var(--md-sys-color-on-surface-variant);font:var(--md-sys-typescale-body-medium);margin:0;">
          Focus periods calibrated to YOUR energy curve. No fixed timers — just your brain at its best.
        </p>
      </div>
      <div class="card-reveal" style="padding:2rem;text-align:center;color:var(--md-sys-color-on-surface-variant);">
        <span class="material-symbols-outlined" style="font-size:48px;color:var(--md-sys-color-primary);animation:pulse 2s infinite;">hourglass_empty</span>
        <p style="margin-top:1rem;">Loading your sprint data...</p>
      </div>
    </div>`;
}

async function loadContent(container) {
  try {
    const [recommendation, activeSprint, stats, today] = await Promise.all([
      api.get('/sprints/recommend').catch(() => null),
      api.get('/sprints/active').catch(() => ({ sprint: null })),
      api.get('/sprints/stats').catch(() => ({})),
      api.get('/sprints/today').catch(() => ({ count: 0, total_minutes: 0, avg_focus: 0 })),
    ]);

    const sprint = activeSprint?.sprint;
    container.innerHTML = renderSprintsPage(recommendation, sprint, stats, today);
    bindSprintEvents(container);
    initSpecularButtons(container);
    container.querySelectorAll('.card-reveal').forEach((el, i) => {
      setTimeout(() => el.classList.add('revealed'), i * 80);
    });
  } catch (e) {
    container.innerHTML = renderError(e.message);
  }
}

function renderSprintsPage(recommendation, activeSprint, stats, today) {
  const energy = recommendation?.current_energy || 50;
  const recommended = recommendation?.recommended_minutes || 25;
  const isPeak = recommendation?.is_peak_window || false;
  const suggestions = recommendation?.suggestions || [];

  return `
    <div style="max-width:900px;margin:0 auto;padding:1.5rem;">
      <!-- Header -->
      <div class="card-reveal" style="margin-bottom:1.5rem;">
        <h1 style="font:var(--md-sys-typescale-headline-medium);color:var(--md-sys-color-on-surface);margin:0 0 0.5rem;">
          <span class="material-symbols-outlined" style="vertical-align:-6px;margin-right:8px;color:var(--md-sys-color-primary);">speed</span>
          Cognitive Sprints
        </h1>
        <p style="color:var(--md-sys-color-on-surface-variant);font:var(--md-sys-typescale-body-medium);margin:0;">
          Focus periods calibrated to YOUR energy curve. No fixed timers — just your brain at its best.
        </p>
      </div>

      <!-- Active Sprint or Start New -->
      ${activeSprint ? renderActiveSprint(activeSprint) : renderStartCard(recommendation)}

      <!-- Energy & Recommendation -->
      <div class="card-reveal" style="background:var(--md-sys-color-surface-container);border:1px solid var(--md-sys-color-outline-variant);border-radius:16px;padding:1.5rem;margin-bottom:1.5rem;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:1rem;">
          <span class="material-symbols-outlined" style="color:var(--md-sys-color-primary);">monitoring</span>
          <h2 style="font:var(--md-sys-typescale-title-medium);color:var(--md-sys-color-on-surface);margin:0;">
            Your Energy Right Now
          </h2>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;">
          <div style="text-align:center;">
            <div style="font:var(--md-sys-typescale-display-small);color:${isPeak ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface)'};">${energy}%</div>
            <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-on-surface-variant);">Current Energy</div>
          </div>
          <div style="text-align:center;">
            <div style="font:var(--md-sys-typescale-display-small);color:var(--md-sys-color-on-surface);">${recommended}m</div>
            <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-on-surface-variant);">Recommended Duration</div>
          </div>
          <div style="text-align:center;">
            <div style="font:var(--md-sys-typescale-display-small);color:${isPeak ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)'};">
              ${isPeak ? 'Peak' : 'Moderate'}
            </div>
            <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-on-surface-variant);">Window Status</div>
          </div>
        </div>
        ${recommendation?.reasoning ? `<p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);margin:0;line-height:1.5;">${esc(recommendation.reasoning)}</p>` : ''}
        ${suggestions.length > 0 ? `
          <div style="margin-top:0.75rem;padding:0.75rem;background:var(--md-sys-color-surface-container-high);border-radius:12px;">
            <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-primary);margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.05em;">Suggested Approach</div>
            ${suggestions.map(s => `<div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);margin-bottom:0.25rem;">${esc(s)}</div>`).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Today's Progress -->
      <div class="card-reveal" style="background:var(--md-sys-color-surface-container);border:1px solid var(--md-sys-color-outline-variant);border-radius:16px;padding:1.5rem;margin-bottom:1.5rem;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:1rem;">
          <span class="material-symbols-outlined" style="color:var(--md-sys-color-primary);">today</span>
          <h2 style="font:var(--md-sys-typescale-title-medium);color:var(--md-sys-color-on-surface);margin:0;">Today</h2>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:1rem;text-align:center;">
          <div>
            <div style="font:var(--md-sys-typescale-headline-small);color:var(--md-sys-color-on-surface);">${today.count || 0}</div>
            <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-on-surface-variant);">Sprints</div>
          </div>
          <div>
            <div style="font:var(--md-sys-typescale-headline-small);color:var(--md-sys-color-on-surface);">${today.total_minutes || 0}m</div>
            <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-on-surface-variant);">Focus Time</div>
          </div>
          <div>
            <div style="font:var(--md-sys-typescale-headline-small);color:var(--md-sys-color-on-surface);">${today.total_thoughts || 0}</div>
            <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-on-surface-variant);">Thoughts Done</div>
          </div>
          <div>
            <div style="font:var(--md-sys-typescale-headline-small);color:var(--md-sys-color-on-surface);">${today.avg_focus ? Math.round(today.avg_focus * 100) + '%' : '--'}</div>
            <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-on-surface-variant);">Avg Focus</div>
          </div>
        </div>
      </div>

      <!-- Lifetime Stats -->
      <div class="card-reveal" style="background:var(--md-sys-color-surface-container);border:1px solid var(--md-sys-color-outline-variant);border-radius:16px;padding:1.5rem;margin-bottom:1.5rem;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:1rem;">
          <span class="material-symbols-outlined" style="color:var(--md-sys-color-primary);">bar_chart</span>
          <h2 style="font:var(--md-sys-typescale-title-medium);color:var(--md-sys-color-on-surface);margin:0;">Lifetime Progress</h2>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:1rem;">
          <div style="text-align:center;">
            <div style="font:var(--md-sys-typescale-headline-small);color:var(--md-sys-color-on-surface);">${stats.total_sprints || 0}</div>
            <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-on-surface-variant);">Total Sprints</div>
          </div>
          <div style="text-align:center;">
            <div style="font:var(--md-sys-typescale-headline-small);color:var(--md-sys-color-on-surface);">${stats.total_focus_minutes || 0}m</div>
            <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-on-surface-variant);">Total Focus</div>
          </div>
          <div style="text-align:center;">
            <div style="font:var(--md-sys-typescale-headline-small);color:var(--md-sys-color-on-surface);">${stats.consecutive_sprint_days || 0}</div>
            <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-on-surface-variant);">Day Streak</div>
          </div>
        </div>
      </div>
    </div>`;
}

function renderStartCard(recommendation) {
  const minutes = recommendation?.recommended_minutes || 25;
  const energy = recommendation?.current_energy || 50;
  const isPeak = recommendation?.is_peak_window || false;

  return `
    <div class="card-reveal" style="background:var(--md-sys-color-surface-container);border:2px solid var(--md-sys-color-primary);border-radius:16px;padding:2rem;margin-bottom:1.5rem;text-align:center;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:80px;height:80px;border-radius:50%;background:var(--md-sys-color-primary-container);margin-bottom:1rem;">
        <span class="material-symbols-outlined" style="font-size:40px;color:var(--md-sys-color-on-primary-container);">play_arrow</span>
      </div>
      <h2 style="font:var(--md-sys-typescale-title-large);color:var(--md-sys-color-on-surface);margin:0 0 0.5rem;">
        Start a ${minutes}-Minute Sprint
      </h2>
      <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0 0 1.5rem;">
        ${isPeak ? 'You are in a peak energy window. This is your best time to focus.' : 'Energy is moderate. A focused sprint will help you build momentum.'}
      </p>
      <button id="start-sprint-btn" class="btn-m3 btn-filled" style="width:100%;max-width:300px;height:56px;font:var(--md-sys-typescale-label-large);border-radius:16px;cursor:pointer;" aria-label="Start Cognitive Sprint">
        <span class="material-symbols-outlined" style="margin-right:8px;">speed</span>
        Start Sprint
      </button>
    </div>`;
}

function renderActiveSprint(sprint) {
  const elapsed = sprint.started_at ? Math.round((Date.now() - new Date(sprint.started_at).getTime()) / 60000) : 0;
  const progress = Math.min(100, Math.round((elapsed / Math.max(sprint.recommended_minutes, 1)) * 100));

  return `
    <div class="card-reveal" style="background:var(--md-sys-color-primary-container);border:2px solid var(--md-sys-color-primary);border-radius:16px;padding:2rem;margin-bottom:1.5rem;text-align:center;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:80px;height:80px;border-radius:50%;background:var(--md-sys-color-primary);margin-bottom:1rem;">
        <span class="material-symbols-outlined" style="font-size:40px;color:var(--md-sys-color-on-primary);">timer</span>
      </div>
      <h2 style="font:var(--md-sys-typescale-title-large);color:var(--md-sys-color-on-primary-container);margin:0 0 0.5rem;">
        Sprint Active
      </h2>
      <div style="font:var(--md-sys-typescale-display-medium);color:var(--md-sys-color-on-primary-container);font-weight:700;">
        ${elapsed}m / ${sprint.recommended_minutes}m
      </div>
      <div style="width:100%;height:8px;background:var(--md-sys-color-primary);border-radius:4px;opacity:0.3;margin:1rem 0;overflow:hidden;">
        <div style="width:${progress}%;height:100%;background:var(--md-sys-color-on-primary);border-radius:4px;transition:width 1s ease;"></div>
      </div>
      <div style="display:flex;gap:1rem;justify-content:center;margin-top:1rem;">
        <button id="complete-sprint-btn" class="btn-m3 btn-filled" style="height:48px;padding:0 24px;border-radius:12px;cursor:pointer;" aria-label="Complete sprint">
          <span class="material-symbols-outlined" style="margin-right:4px;">check_circle</span>
          Complete
        </button>
        <button id="abandon-sprint-btn" class="btn-m3 btn-outlined" style="height:48px;padding:0 24px;border-radius:12px;cursor:pointer;border-color:var(--md-sys-color-on-primary-container);color:var(--md-sys-color-on-primary-container);" aria-label="Abandon sprint">
          <span class="material-symbols-outlined" style="margin-right:4px;">stop_circle</span>
          Stop
        </button>
      </div>
    </div>`;
}

function renderError(msg) {
  return `
    <div style="max-width:900px;margin:0 auto;padding:1.5rem;">
      <div class="card-reveal" style="padding:3rem;text-align:center;">
        <span class="material-symbols-outlined" style="font-size:48px;color:var(--md-sys-color-error);">error</span>
        <h2 style="font:var(--md-sys-typescale-title-medium);color:var(--md-sys-color-on-surface);margin:1rem 0 0.5rem;">Something went wrong</h2>
        <p style="color:var(--md-sys-color-on-surface-variant);">${esc(msg)}</p>
        <button onclick="showPage('cognitive-sprints')" class="btn-m3 btn-filled" style="margin-top:1rem;cursor:pointer;">Retry</button>
      </div>
    </div>`;
}

function bindSprintEvents(container) {
  // Add aria-labels to all interactive elements
  container.querySelectorAll('button').forEach(el => {
    if (!el.getAttribute('aria-label')) {
      el.setAttribute('aria-label', el.textContent?.trim() || 'Sprint action');
    }
  });

  const startBtn = container.querySelector('#start-sprint-btn');
  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      startBtn.disabled = true;
      startBtn.innerHTML = '<span class="material-symbols-outlined" style="animation:spin 1s linear infinite;">refresh</span> Starting...';
      try {
        await api.post('/sprints/start', {});
        loadContent(container);
      } catch (e) {
        startBtn.disabled = false;
        startBtn.innerHTML = '<span class="material-symbols-outlined" style="margin-right:8px;">speed</span> Start Sprint';
      }
    });
  }

  const completeBtn = container.querySelector('#complete-sprint-btn');
  if (completeBtn) {
    completeBtn.addEventListener('click', async () => {
      completeBtn.disabled = true;
      try {
        const activeSprint = await api.get('/sprints/active');
        if (activeSprint?.sprint) {
          const result = await api.post(`/sprints/${activeSprint.sprint.id}/complete`, {
            completed_thoughts: 0,
          });
          showCompletionToast(result);
        }
        loadContent(container);
      } catch (e) {
        completeBtn.disabled = false;
      }
    });
  }

  const abandonBtn = container.querySelector('#abandon-sprint-btn');
  if (abandonBtn) {
    abandonBtn.addEventListener('click', async () => {
      if (!confirm('End this sprint early?')) return;
      try {
        const activeSprint = await api.get('/sprints/active');
        if (activeSprint?.sprint) {
          await api.post(`/sprints/${activeSprint.sprint.id}/abandon`, { reason: 'manual' });
        }
        loadContent(container);
      } catch (e) { /* ignore */ }
    });
  }
}

function showCompletionToast(result) {
  if (result?.new_achievements?.length > 0) {
    const ach = result.new_achievements[0];
    import('./../lib/toast.js').then(({ toast }) => {
      toast.show(`Achievement unlocked: ${ach.title}!`, 'success');
    }).catch(() => {});
  }
}

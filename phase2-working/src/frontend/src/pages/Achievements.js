/**
 * Achievements Page
 *
 * Behavior-change milestones — not login streaks, not spam points.
 * Rewards keeping promises, clearing cognitive debt, improving thought quality.
 *
 * Brand: All CSS variables, Material Symbols only, no emoji, no hardcoded colors.
 */

import api from '../lib/api.js';
import { initSpecularButtons } from '../components/specularButton.js';

const esc = window.esc || (s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));

const categoryMeta = {
  focus: { label: 'Focus', icon: 'psychology', color: 'var(--md-sys-color-primary)' },
  quality: { label: 'Quality', icon: 'auto_awesome', color: 'var(--md-sys-color-tertiary)' },
  consistency: { label: 'Consistency', icon: 'local_fire_department', color: 'var(--md-sys-color-error)' },
  cognitive: { label: 'Cognitive', icon: 'insights', color: 'var(--md-sys-color-secondary)' },
  social: { label: 'Social', icon: 'groups', color: 'var(--md-sys-color-tertiary)' },
};

export function Achievements() {
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
          <span class="material-symbols-outlined" style="vertical-align:-6px;margin-right:8px;color:var(--md-sys-color-primary);">emoji_events</span>
          Achievements
        </h1>
        <p style="color:var(--md-sys-color-on-surface-variant);font:var(--md-sys-typescale-body-medium);margin:0;">
          Milestones earned through real behavior change. Not streaks — substance.
        </p>
      </div>
      <div class="card-reveal" style="padding:2rem;text-align:center;color:var(--md-sys-color-on-surface-variant);">
        <span class="material-symbols-outlined" style="font-size:48px;color:var(--md-sys-color-primary);animation:pulse 2s infinite;">emoji_events</span>
        <p style="margin-top:1rem;">Loading achievements...</p>
      </div>
    </div>`;
}

async function loadContent(container) {
  try {
    const [achievements, summary] = await Promise.all([
      api.get('/achievements').catch(() => ({ achievements: [], unlocked_count: 0, total_possible: 22 })),
      api.get('/achievements/summary').catch(() => ({ categories: {}, recent_unlocks: [], stats: {} })),
    ]);

    container.innerHTML = renderAchievementsPage(achievements, summary);
    bindEvents(container);
    initSpecularButtons(container);
    container.querySelectorAll('.card-reveal').forEach((el, i) => {
      setTimeout(() => el.classList.add('revealed'), i * 80);
    });
  } catch (e) {
    container.innerHTML = renderError(e.message);
  }
}

function renderAchievementsPage(achievements, summary) {
  const { achievements: achList = [], unlocked_count = 0, total_possible = 22, progress_pct = 0 } = achievements;
  const { categories = {}, recent_unlocks = [], stats = {} } = summary;

  const grouped = {};
  for (const ach of achList) {
    if (!grouped[ach.category]) grouped[ach.category] = [];
    grouped[ach.category].push(ach);
  }

  return `
    <div style="max-width:900px;margin:0 auto;padding:1.5rem;">
      <!-- Header -->
      <div class="card-reveal" style="margin-bottom:1.5rem;">
        <h1 style="font:var(--md-sys-typescale-headline-medium);color:var(--md-sys-color-on-surface);margin:0 0 0.5rem;">
          <span class="material-symbols-outlined" style="vertical-align:-6px;margin-right:8px;color:var(--md-sys-color-primary);">emoji_events</span>
          Achievements
        </h1>
        <p style="color:var(--md-sys-color-on-surface-variant);font:var(--md-sys-typescale-body-medium);margin:0;">
          Milestones earned through real behavior change. Not streaks — substance.
        </p>
      </div>

      <!-- Progress Overview -->
      <div class="card-reveal" style="background:var(--md-sys-color-surface-container);border:1px solid var(--md-sys-color-outline-variant);border-radius:16px;padding:1.5rem;margin-bottom:1.5rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
          <div>
            <div style="font:var(--md-sys-typescale-display-small);color:var(--md-sys-color-on-surface);">${unlocked_count}<span style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);"> / ${total_possible}</span></div>
            <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-on-surface-variant);">Milestones Unlocked</div>
          </div>
          <div style="text-align:right;">
            <div style="font:var(--md-sys-typescale-display-small);color:var(--md-sys-color-primary);">${progress_pct}%</div>
            <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-on-surface-variant);">Progress</div>
          </div>
        </div>
        <!-- Progress bar -->
        <div style="width:100%;height:8px;background:var(--md-sys-color-surface-container-high);border-radius:4px;overflow:hidden;">
          <div style="width:${progress_pct}%;height:100%;background:var(--md-sys-color-primary);border-radius:4px;transition:width 0.5s ease;"></div>
        </div>
        <!-- Category breakdown -->
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:1rem;">
          ${Object.entries(categories).map(([cat, data]) => {
            const meta = categoryMeta[cat] || { label: cat, icon: 'circle', color: 'var(--md-sys-color-outline)' };
            const catPct = data.total > 0 ? Math.round((data.earned / data.total) * 100) : 0;
            return `
              <div style="display:flex;align-items:center;gap:6px;padding:4px 10px;background:var(--md-sys-color-surface-container-high);border-radius:8px;">
                <span class="material-symbols-outlined" style="font-size:16px;color:${meta.color};">${meta.icon}</span>
                <span style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-on-surface-variant);">${meta.label}</span>
                <span style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-on-surface);">${data.earned}/${data.total}</span>
              </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Recent Unlocks -->
      ${recent_unlocks.length > 0 ? `
        <div class="card-reveal" style="background:var(--md-sys-color-surface-container);border:1px solid var(--md-sys-color-outline-variant);border-radius:16px;padding:1.5rem;margin-bottom:1.5rem;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:1rem;">
            <span class="material-symbols-outlined" style="color:var(--md-sys-color-primary);">new_releases</span>
            <h2 style="font:var(--md-sys-typescale-title-medium);color:var(--md-sys-color-on-surface);margin:0;">Recent Unlocks</h2>
          </div>
          <div style="display:flex;gap:0.75rem;overflow-x:auto;padding-bottom:0.5rem;">
            ${recent_unlocks.map(ach => {
              const meta = categoryMeta[ach.category] || { label: ach.category, icon: 'circle', color: 'var(--md-sys-color-outline)' };
              return `
                <div style="min-width:180px;padding:1rem;background:var(--md-sys-color-surface-container-high);border-radius:12px;border:1px solid var(--md-sys-color-outline-variant);">
                  <span class="material-symbols-outlined" style="font-size:28px;color:${meta.color};margin-bottom:8px;display:block;">${ach.icon || meta.icon}</span>
                  <div style="font:var(--md-sys-typescale-label-medium);color:var(--md-sys-color-on-surface);margin-bottom:4px;">${esc(ach.title)}</div>
                  <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-on-surface-variant);">${formatDate(ach.unlocked_at)}</div>
                </div>`;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Achievement Categories -->
      ${Object.entries(grouped).map(([cat, achs]) => {
        const meta = categoryMeta[cat] || { label: cat, icon: 'circle', color: 'var(--md-sys-color-outline)' };
        return `
          <div class="card-reveal" style="margin-bottom:1.5rem;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:1rem;">
              <span class="material-symbols-outlined" style="color:${meta.color};">${meta.icon}</span>
              <h2 style="font:var(--md-sys-typescale-title-medium);color:var(--md-sys-color-on-surface);margin:0;">${meta.label}</h2>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(250px, 1fr));gap:0.75rem;">
              ${achs.map(ach => renderAchievementCard(ach, meta)).join('')}
            </div>
          </div>`;
      }).join('')}

      <!-- Stats -->
      ${stats.total_sprints > 0 ? `
        <div class="card-reveal" style="background:var(--md-sys-color-surface-container);border:1px solid var(--md-sys-color-outline-variant);border-radius:16px;padding:1.5rem;margin-bottom:1.5rem;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:1rem;">
            <span class="material-symbols-outlined" style="color:var(--md-sys-color-primary);">bar_chart</span>
            <h2 style="font:var(--md-sys-typescale-title-medium);color:var(--md-sys-color-on-surface);margin:0;">Your Cognitive Stats</h2>
          </div>
          <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:1rem;">
            <div style="padding:1rem;background:var(--md-sys-color-surface-container-high);border-radius:12px;text-align:center;">
              <div style="font:var(--md-sys-typescale-headline-small);color:var(--md-sys-color-on-surface);">${stats.total_sprints || 0}</div>
              <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-on-surface-variant);">Sprints Completed</div>
            </div>
            <div style="padding:1rem;background:var(--md-sys-color-surface-container-high);border-radius:12px;text-align:center;">
              <div style="font:var(--md-sys-typescale-headline-small);color:var(--md-sys-color-on-surface);">${stats.thoughts_in_sprints || 0}</div>
              <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-on-surface-variant);">Thoughts Processed</div>
            </div>
          </div>
        </div>
      ` : ''}
    </div>`;
}

function renderAchievementCard(ach, meta) {
  const unlocked = ach.unlocked;
  return `
    <div style="padding:1rem;background:${unlocked ? 'var(--md-sys-color-surface-container)' : 'var(--md-sys-color-surface-container-high)'};border:1px solid ${unlocked ? meta.color : 'var(--md-sys-color-outline-variant)'};border-radius:12px;opacity:${unlocked ? '1' : '0.5'};transition:opacity 0.3s;">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <div style="width:40px;height:40px;border-radius:10px;background:${unlocked ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container-high)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <span class="material-symbols-outlined" style="font-size:22px;color:${unlocked ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-outline)'};">
            ${unlocked ? ach.icon || meta.icon : 'lock'}
          </span>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font:var(--md-sys-typescale-label-medium);color:${unlocked ? 'var(--md-sys-color-on-surface)' : 'var(--md-sys-color-on-surface-variant)'};margin-bottom:2px;">
            ${esc(ach.title)}
          </div>
          <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);line-height:1.4;">
            ${esc(ach.description)}
          </div>
          ${unlocked && ach.unlocked_at ? `<div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-primary);margin-top:6px;">Unlocked ${formatDate(ach.unlocked_at)}</div>` : ''}
        </div>
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
        <button onclick="showPage('achievements')" class="btn-m3 btn-filled" style="margin-top:1rem;cursor:pointer;">Retry</button>
      </div>
    </div>`;
}

function bindEvents(container) {
  // Add aria-labels to all interactive elements
  container.querySelectorAll('[role="button"], button').forEach(el => {
    if (!el.getAttribute('aria-label')) {
      el.setAttribute('aria-label', el.textContent?.trim() || 'Achievement');
    }
  });
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

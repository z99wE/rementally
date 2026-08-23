// Smart Dashboard — All Intelligence Engines + ML visualized
// Brand: Obsidian & Lime Signal
import api from '../lib/api.js';

function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

export function SmartDashboard() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-shell">
      <div class="surface-card card-reveal" style="padding:2rem;">
        <div class="mono-label" style="color:var(--md-sys-color-primary);margin-bottom:0.5rem;">INTELLIGENCE ENGINES</div>
        <h1 style="font:var(--md-sys-typescale-headline-medium);margin:0;">Smart Dashboard</h1>
        <p style="color:var(--md-sys-color-on-surface-variant);margin-top:0.5rem;font:var(--md-sys-typescale-body-medium);">
          13 zero-cost behavioral + ML engines learning your patterns in real-time
        </p>
      </div>

      <!-- Predictive Overload + Energy Curve -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;margin-top:1.5rem;">
        <div class="surface-card card-reveal" style="padding:1.5rem;border:1px solid rgba(204,255,0,0.15);">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;color:var(--md-sys-color-primary);">
            <span class="material-symbols-rounded">psychology</span>
            Predictive Overload
          </h3>
          <div id="overload-predictor" style="text-align:center;padding:1rem 0;">
            <div class="anim-shimmer" style="height:80px;border-radius:8px;"></div>
          </div>
          <div id="overload-recommendation" style="margin-top:0.75rem;"></div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.5rem;border:1px solid rgba(204,255,0,0.15);">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;color:var(--md-sys-color-primary);">
            <span class="material-symbols-rounded">battery_charging_full</span>
            Energy Curve (KDE)
          </h3>
          <div id="energy-curve" style="height:160px;position:relative;">
            <div class="anim-shimmer" style="height:100%;border-radius:8px;"></div>
          </div>
          <div id="energy-status" style="margin-top:1rem;"></div>
        </div>
      </div>

      <!-- Cognitive Debt + Thought Quality -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;margin-top:1rem;">
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;color:var(--md-sys-color-secondary);">
            <span class="material-symbols-rounded">speed</span>
            Cognitive Debt
          </h3>
          <div id="cognitive-debt" style="text-align:center;padding:1rem 0;">
            <div class="anim-shimmer" style="height:80px;border-radius:8px;"></div>
          </div>
          <div id="escalation-list" style="display:flex;flex-direction:column;gap:0.75rem;margin-top:1rem;"></div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;color:var(--md-sys-color-tertiary);">
            <span class="material-symbols-rounded">grading</span>
            Thought Quality (TF-IDF)
          </h3>
          <div id="quality-scores" style="display:flex;flex-direction:column;gap:0.75rem;">
            <div class="anim-shimmer" style="height:60px;border-radius:8px;"></div>
          </div>
          <div id="quality-coaching" style="margin-top:1rem;"></div>
        </div>
      </div>

      <!-- Social Proof + Forgetting Curve -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;margin-top:1rem;">
        <div class="surface-card card-reveal" style="padding:1.5rem;border:1px solid rgba(204,255,0,0.1);">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;color:var(--md-sys-color-primary);">
            <span class="material-symbols-rounded">groups</span>
            Social Proof
          </h3>
          <div id="social-proof" style="display:flex;flex-direction:column;gap:0.75rem;">
            <div class="anim-shimmer" style="height:60px;border-radius:8px;"></div>
          </div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;">
            <span class="material-symbols-rounded">history</span>
            Forgetting Curve (Bayesian)
          </h3>
          <div id="forgetting-curve" style="display:flex;flex-direction:column;gap:0.75rem;">
            <div class="anim-shimmer" style="height:60px;border-radius:8px;"></div>
          </div>
        </div>
      </div>

      <!-- Thought Chains + Pattern Breaks -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;margin-top:1rem;">
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;">
            <span class="material-symbols-rounded">account_tree</span>
            Thought Chains
          </h3>
          <div id="thought-chains" style="display:flex;flex-direction:column;gap:0.75rem;">
            <div class="anim-shimmer" style="height:60px;border-radius:8px;"></div>
          </div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;">
            <span class="material-symbols-rounded">notify_change</span>
            Pattern Breaks (Z-Score)
          </h3>
          <div id="pattern-breaks" style="display:flex;flex-direction:column;gap:0.75rem;">
            <div class="anim-shimmer" style="height:40px;border-radius:8px;"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  loadDashboard(container);
  return container;
}

async function loadDashboard(container) {
  try {
    const data = await api.get('/smart/dashboard');

    renderOverloadPredictor(container, data.overload);
    renderEnergyCurve(container, data.energy);
    renderCognitiveDebt(container, data.escalations);
    renderQualityScores(container, data.quality);
    renderSocialProof(container, data.socialProof);
    renderForgettingCurve(container, data.forgettingCurve);
    renderThoughtChains(container, data.chains);
    renderPatternBreaks(container, data.patternBreaks);

    container.querySelectorAll('.card-reveal').forEach((card, i) => {
      setTimeout(() => card.classList.add('revealed'), i * 80);
    });
  } catch (e) {
    console.error('[SmartDashboard] Failed to load:', e);
    container.querySelectorAll('.anim-shimmer').forEach(el => {
      el.outerHTML = '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">Failed to load data</p>';
    });
  }
}

// ── Predictive Overload (TF.js Neural Network) ───────────────────────────
function renderOverloadPredictor(container, overload) {
  const el = container.querySelector('#overload-predictor');
  const recEl = container.querySelector('#overload-recommendation');
  if (!overload) {
    el.innerHTML = '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">Insufficient data for prediction</p>';
    return;
  }

  const prob = Math.round((overload.overload_probability || 0) * 100);
  const riskColors = { critical: 'var(--md-sys-color-error)', high: 'var(--color-urgency)', moderate: 'var(--color-analytical)', low: 'var(--color-success)' };
  const color = riskColors[overload.risk_level] || 'var(--md-sys-color-outline)';

  el.innerHTML = `
    <div style="position:relative;width:100px;height:100px;margin:0 auto;">
      <svg viewBox="0 0 100 100" style="width:100%;height:100%;transform:rotate(-90deg);">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke="${color}" stroke-width="8"
          stroke-dasharray="${prob * 2.51} 251" stroke-linecap="round"/>
      </svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <span style="font:var(--md-sys-typescale-headline-medium);color:${color};">${prob}%</span>
        <span style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">${overload.risk_level || 'unknown'}</span>
      </div>
    </div>
  `;

  if (overload.factors) {
    const factors = overload.factors;
    el.innerHTML += `
      <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.75rem;justify-content:center;">
        ${Object.entries(factors).map(([k, v]) => {
          const fc = v === 'high' || v === 'concerning' || v === 'fatigue_hours' ? 'var(--md-sys-color-error)' : v === 'moderate' ? 'var(--color-analytical)' : 'var(--color-success)';
          return `<span style="font:var(--md-sys-typescale-label-small);color:${fc};padding:0.2rem 0.5rem;border:1px solid ${fc}33;border-radius:4px;">${k.replace(/_/g, ' ')}: ${v}</span>`;
        }).join('')}
      </div>
    `;
  }

  if (overload.recommendation) {
    const rec = overload.recommendation;
    const recColors = { urgent_break: 'var(--md-sys-color-error)', prioritize: 'var(--color-analytical)', maintain: 'var(--color-success)', opportunity: 'var(--md-sys-color-primary)' };
    recEl.innerHTML = `
      <div style="padding:0.75rem 1rem;border:1px solid ${recColors[rec.action] || 'var(--md-sys-color-outline-variant)'}33;border-radius:8px;background:rgba(255,255,255,0.02);">
        <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface);line-height:1.5;">${escHtml(rec.message || '')}</div>
      </div>
    `;
  }
}

// ── Energy Curve (KDE) ───────────────────────────────────────────────────
function renderEnergyCurve(container, energy) {
  const el = container.querySelector('#energy-curve');
  const statusEl = container.querySelector('#energy-status');
  if (!energy?.has_data && !energy?.energy_curve) {
    el.innerHTML = '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">No energy data yet — complete some thoughts first</p>';
    return;
  }

  const curve = energy.energy_curve || energy.curve || [];
  if (!curve.length) {
    el.innerHTML = '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">Building your energy curve...</p>';
    return;
  }

  const currentHour = new Date().getHours();
  const maxEnergy = Math.max(...curve, 1);

  const width = 280, height = 140, pad = 20;
  let pathD = '';
  let areaD = `M ${pad} ${height - pad}`;

  for (let h = 0; h < curve.length; h++) {
    const x = pad + (h / (curve.length - 1)) * (width - pad * 2);
    const y = height - pad - (curve[h] / maxEnergy) * (height - pad * 2);
    pathD += (h === 0 ? 'M' : 'L') + ` ${x} ${y}`;
    areaD += ` L ${x} ${y}`;
  }
  areaD += ` L ${width - pad} ${height - pad} Z`;

  const currentX = pad + (currentHour / (curve.length - 1)) * (width - pad * 2);
  const currentY = height - pad - ((curve[currentHour] || 0) / maxEnergy) * (height - pad * 2);

  el.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:100%;">
      <defs>
        <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--md-sys-color-primary)" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="var(--md-sys-color-primary)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${[0.25, 0.5, 0.75].map(p => `<line x1="${pad}" y1="${height - pad - p * (height - pad * 2)}" x2="${width - pad}" y2="${height - pad - p * (height - pad * 2)}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4 4"/>`).join('')}
      <path d="${areaD}" fill="url(#energyGrad)" />
      <path d="${pathD}" fill="none" stroke="var(--md-sys-color-primary)" stroke-width="2" stroke-linecap="round" />
      <circle cx="${currentX}" cy="${currentY}" r="5" fill="var(--md-sys-color-primary)" opacity="0.3"/>
      <circle cx="${currentX}" cy="${currentY}" r="3" fill="var(--md-sys-color-primary)"/>
      ${[0, 6, 12, 18].map(h => `<text x="${pad + (h / (curve.length - 1)) * (width - pad * 2)}" y="${height - 4}" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="10" style="font-family:var(--font-mono);">${h}:00</text>`).join('')}
    </svg>
  `;

  const currentEnergy = curve[currentHour] || 0;
  const isPeak = (energy.peak_hours || []).some(p => p.hour === currentHour);
  statusEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem;">
      <div style="width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:var(--md-sys-typescale-headline-small);color:${isPeak ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)'};border:2px solid ${isPeak ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-outline-variant)'};">
        ${Math.round(currentEnergy)}
      </div>
      <div>
        <div style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface);">${isPeak ? 'Peak Energy' : 'Off-Peak'}</div>
        <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">${energy.confidence ? Math.round(energy.confidence * 100) + '% confidence' : 'Learning...'}</div>
      </div>
    </div>
  `;

  // Energy recommendations
  if (energy.recommendations?.length > 0) {
    statusEl.innerHTML += energy.recommendations.slice(0, 2).map(r => `
      <div style="margin-top:0.5rem;padding:0.5rem 0.75rem;border:1px solid rgba(204,255,0,0.1);border-radius:6px;font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);line-height:1.4;">
        <span class="material-symbols-rounded" style="font-size:14px;vertical-align:middle;color:var(--md-sys-color-primary);">lightbulb</span> ${escHtml(r.message || '')}
      </div>
    `).join('');
  }
}

// ── Cognitive Debt ────────────────────────────────────────────────────────
function renderCognitiveDebt(container, escalations) {
  const el = container.querySelector('#cognitive-debt');
  const listEl = container.querySelector('#escalation-list');
  if (!escalations?.escalations) { el.innerHTML = '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">No pending thoughts to escalate</p>'; return; }

  const debt = escalations.cognitiveDebt;
  const debtColor = debt.level === 'critical' ? 'var(--md-sys-color-error)' : debt.level === 'high' ? 'var(--color-analytical)' : debt.level === 'medium' ? 'var(--md-sys-color-primary)' : 'var(--color-success)';

  el.innerHTML = `
    <div style="position:relative;width:100px;height:100px;margin:0 auto;">
      <svg viewBox="0 0 100 100" style="width:100%;height:100%;transform:rotate(-90deg);">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke="${debtColor}" stroke-width="8"
          stroke-dasharray="${debt.score * 2.51} 251" stroke-linecap="round"/>
      </svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <span style="font:var(--md-sys-typescale-headline-medium);color:${debtColor};">${debt.score}</span>
        <span style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">debt</span>
      </div>
    </div>
    <p style="text-align:center;font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);margin-top:0.75rem;">${escHtml(debt.message)}</p>
  `;

  const top = escalations.escalations.slice(0, 5);
  listEl.innerHTML = top.map(e => {
    const severityColor = e.escalation.severity === 'critical' ? 'var(--md-sys-color-error)' : e.escalation.severity === 'warn' ? 'var(--color-analytical)' : 'var(--md-sys-color-outline)';
    return `
      <div class="surface-card" style="padding:0.75rem 1rem;display:flex;align-items:center;gap:0.75rem;border-left:3px solid ${severityColor};">
        <div style="flex:1;min-width:0;">
          <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(e.content)}</div>
          <div style="font:var(--md-sys-typescale-label-small);color:${severityColor};">${escHtml(e.escalation.message)}</div>
        </div>
        <div style="display:flex;gap:0.5rem;flex-shrink:0;">
          ${e.escalation.actions.slice(0, 2).map(a => `
            <button class="sp-btn escalation-btn" data-thought="${e.thoughtId}" data-action="${a.action}" aria-label="${escHtml(a.label)} for this thought" style="padding:0.25rem 0.5rem;font:var(--md-sys-typescale-label-small);border-radius:6px;cursor:pointer;">
              ${a.icon} ${escHtml(a.label)}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.escalation-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        const result = await api.post('/smart/escalations/act', { thoughtId: btn.dataset.thought, action: btn.dataset.action });
        if (result.success) { btn.closest('.surface-card').style.opacity = '0.4'; btn.closest('.surface-card').style.pointerEvents = 'none'; }
      } catch (e) { console.error('Escalation action failed:', e); }
    });
  });
}

// ── Thought Quality (TF-IDF) ─────────────────────────────────────────────
function renderQualityScores(container, quality) {
  const el = container.querySelector('#quality-scores');
  const coachingEl = container.querySelector('#quality-coaching');
  const thoughts = quality?.thoughts || quality?.scores || [];
  if (!thoughts.length) {
    el.innerHTML = '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">No pending thoughts to score</p>';
    return;
  }

  const gradeColors = { A: 'var(--color-success)', B: 'var(--md-sys-color-primary)', C: 'var(--color-analytical)', D: 'var(--color-urgency)', F: 'var(--md-sys-color-error)' };

  el.innerHTML = thoughts.slice(0, 8).map(s => {
    const color = gradeColors[s.grade] || 'var(--md-sys-color-outline)';
    return `
      <div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <div style="width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font:var(--md-sys-typescale-title-medium);color:${color};border:1px solid ${color}33;background:${color}11;">
          ${s.grade}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(s.content?.substring(0, 60) || '')}</div>
          <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">${s.score}/100${s.breakdown ? ` · specificity:${s.breakdown.specificity} action:${s.breakdown.actionability}` : ''}</div>
        </div>
      </div>
    `;
  }).join('');

  // Coaching tips from ML quality scorer
  const allTips = thoughts.flatMap(s => s.tips || []).filter(Boolean);
  const topTips = allTips.slice(0, 3);
  if (topTips.length > 0) {
    coachingEl.innerHTML = `
      <div class="surface-card" style="padding:0.75rem 1rem;border:1px solid rgba(204,255,0,0.1);">
        <div class="mono-label" style="color:var(--md-sys-color-primary);font-size:11px;margin-bottom:0.5rem;">ML COACHING TIPS</div>
        ${topTips.map(t => `
          <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);margin-bottom:0.25rem;"><span class="material-symbols-rounded" style="font-size:14px;vertical-align:middle;">lightbulb</span> ${escHtml(t.message || '')}</div>
        `).join('')}
      </div>
    `;
  }
}

// ── Social Proof ──────────────────────────────────────────────────────────
function renderSocialProof(container, social) {
  const el = container.querySelector('#social-proof');
  if (!social?.insights || social.insights.length === 0) {
    el.innerHTML = '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">Not enough data for social proof yet</p>';
    return;
  }

  const icons = { deadline: 'timer', witness: 'groups', activity: 'bar_chart', category: 'folder', productivity: 'bolt', completion: 'check_circle' };

  el.innerHTML = social.insights.map(insight => `
    <div style="padding:0.75rem;border:1px solid rgba(204,255,0,0.08);border-radius:8px;margin-bottom:0.5rem;">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem;">
        <span class="material-symbols-rounded" style="font-size:1.1rem;">${icons[insight.type] || 'trending_up'}</span>
        <span style="font:var(--md-sys-typescale-title-medium);color:var(--md-sys-color-primary);">${escHtml(insight.stat || '')}</span>
      </div>
      <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);line-height:1.5;">${escHtml(insight.message)}</div>
      ${insight.actionable ? `<div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-primary);margin-top:0.375rem;">→ ${escHtml(insight.actionable)}</div>` : ''}
    </div>
  `).join('');

  if (social.networkSize > 0) {
    el.innerHTML += `
      <div style="text-align:center;margin-top:0.75rem;font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">
        Insights from ${social.networkSize.toLocaleString()} user${social.networkSize > 1 ? 's' : ''}
      </div>
    `;
  }
}

// ── Forgetting Curve (Bayesian) ───────────────────────────────────────────
function renderForgettingCurve(container, curve) {
  const el = container.querySelector('#forgetting-curve');
  if (!curve?.curves || Object.keys(curve.curves).length === 0) {
    el.innerHTML = '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">Calibrating your forgetting curve — capture more thoughts first</p>';
    return;
  }

  const cats = Object.entries(curve.curves).sort((a, b) => (b[1].half_life_hours || 0) - (a[1].half_life_hours || 0));
  const maxHL = Math.max(...cats.map(([, v]) => v.half_life_hours || 0), 1);

  el.innerHTML = cats.map(([cat, data]) => {
    const width = ((data.half_life_hours || 0) / maxHL) * 100;
    const color = data.source === 'learned' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)';
    return `
      <div style="margin-bottom:0.5rem;">
        <div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;">
          <span style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface);text-transform:capitalize;">${escHtml(cat)}</span>
          <span style="font:var(--md-sys-typescale-label-small);color:${color};">${data.half_life_hours || 0}h half-life</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${width}%;background:${color};border-radius:3px;transition:width 600ms;"></div>
        </div>
      </div>
    `;
  }).join('');

  el.innerHTML += `
    <div style="margin-top:0.75rem;padding:0.5rem 0.75rem;border:1px solid rgba(255,255,255,0.06);border-radius:6px;font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">
      ${curve.total_data_points || 0} data points · ${curve.overall_confidence > 0.5 ? 'High' : curve.overall_confidence > 0.2 ? 'Moderate' : 'Low'} confidence · Bayesian posterior
    </div>
  `;
}

// ── Thought Chains ────────────────────────────────────────────────────────
function renderThoughtChains(container, chains) {
  const el = container.querySelector('#thought-chains');
  if (!chains || chains.length === 0) {
    el.innerHTML = '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">No active thought chains — start with "Write proposal" then "Send proposal"</p>';
    return;
  }

  el.innerHTML = chains.slice(0, 5).map(chain => `
    <div style="padding:0.75rem;border:1px solid rgba(255,255,255,0.06);border-radius:8px;margin-bottom:0.5rem;">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
        <span class="mono-label" style="color:var(--md-sys-color-primary);font-size:11px;">${chain.chainLength} STEPS</span>
        <span style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);">· ${chain.completedCount}/${chain.chainLength} done</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.375rem;">
        ${chain.thoughts.map((t, i) => {
          const isDone = t.status === 'completed' || t.status === 'done';
          return `
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <div style="width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:var(--md-sys-typescale-label-small);${isDone ? 'background:rgba(34,197,94,0.2);color:var(--color-success);' : 'border:1px solid var(--md-sys-color-outline-variant);color:var(--md-sys-color-outline);'}">
                ${isDone ? '<span class="material-symbols-rounded" style="font-size:14px;">check</span>' : i + 1}
              </div>
              <span style="font:var(--md-sys-typescale-body-small);color:${isDone ? 'var(--md-sys-color-outline)' : 'var(--md-sys-color-on-surface)'};${isDone ? 'text-decoration:line-through;' : ''} overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(t.content?.substring(0, 50) || '')}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');
}

// ── Pattern Breaks (Z-Score) ─────────────────────────────────────────────
function renderPatternBreaks(container, data) {
  const el = container.querySelector('#pattern-breaks');
  const breaks = data?.detected_breaks || data?.breaks || [];
  if (!breaks.length) {
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;">
        <div style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(34,197,94,0.15);color:var(--color-success);"><span class="material-symbols-rounded">check</span></div>
        <div>
          <div style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface);">All patterns normal</div>
          <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">No behavioral anomalies detected</div>
        </div>
      </div>
    `;
    return;
  }

  el.innerHTML = breaks.map(b => {
    const severity = b.severity || b.severity_score || 0.5;
    const severityColor = severity === 'alert' || severity >= 0.8 ? 'var(--md-sys-color-error)' : severity === 'watch' || severity >= 0.5 ? 'var(--color-analytical)' : 'var(--md-sys-color-primary)';
    const severityLabel = (severity === 'alert' || severity >= 0.8) ? 'ALERT' : (severity === 'watch' || severity >= 0.5) ? 'WATCH' : 'INFO';
    return `
      <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;border-left:3px solid ${severityColor};background:rgba(255,255,255,0.02);border-radius:0 8px 8px 0;margin-bottom:0.5rem;">
        <div style="width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font:var(--md-sys-typescale-label-medium);color:${severityColor};border:1px solid ${severityColor}33;flex-shrink:0;">
          ${severityLabel}
        </div>
        <div style="flex:1;">
          <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface);line-height:1.4;">${escHtml(b.message || '')}</div>
          ${b.z_score != null ? `<div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-outline);margin-top:0.25rem;">z-score: ${b.z_score} · metric: ${(b.metric || '').replace(/_/g, ' ')}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

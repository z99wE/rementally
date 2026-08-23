import api from './lib/api.js';
import { Home } from './pages/Home.js';
import { Auth } from './pages/Auth.js';
import { Dashboard } from './pages/Dashboard.js';
import { MissionControl } from './pages/MissionControl.js';
import { BrainFragments } from './pages/BrainFragments.js';
import { CognitiveLoad } from './pages/CognitiveLoad.js';
import { PredictiveLoad } from './pages/PredictiveLoad.js';
import { MemorySegments } from './pages/MemorySegments.js';
import { Memory } from './pages/Memory.js';
import { InteractiveSpace } from './pages/InteractiveSpace.js';
import { APIKeys } from './pages/APIKeys.js';
import { Channels } from './pages/Channels.js';
import { Credits } from './pages/Credits.js';
import { ThoughtAfterlife } from './pages/ThoughtAfterlife.js';
import { Commitments } from './pages/Commitments.js';
import { ThoughtArchaeology } from './pages/ThoughtArchaeology.js';
import { ThoughtExport } from './pages/ThoughtExport.js';
import { HowItWorks } from './pages/HowItWorks.js';
import { NotificationsLog } from './pages/NotificationsLog.js';
import { AdminDashboard } from './pages/AdminDashboard.js';
import { Legal } from './pages/Legal.js';
import { MapMyMind } from './pages/MapMyMind.js';
import { Profile } from './pages/Profile.js';
import { SmartDashboard } from './pages/SmartDashboard.js';
import { CognitiveSprints } from './pages/CognitiveSprints.js';
import { Achievements } from './pages/Achievements.js';
import { initSpecularButtons } from './components/specularButton.js';
import { initEnhancements } from './enhance.js';

let currentPage = 'home';
let user = null;

// Page registry with metadata — grouped by section
const pageRegistry = {
  // Primary nav
  home:                { title: 'Home',            icon: 'home',           auth: false, section: 'main' },
  dashboard:           { title: 'Dashboard',       icon: 'dashboard',      auth: true,  section: 'main' },
  'interactive-space': { title: 'Chat',            icon: 'psychology',     auth: true,  section: 'main' },
  'map-my-mind':       { title: 'Mind Map',        icon: 'explore',        auth: true,  section: 'main' },
  'mission-control':   { title: 'Mission Control', icon: 'settings_suggest',auth: true, section: 'main' },

  // Secondary (Cognitive Features)
  'thought-afterlife': { title: 'Thought Afterlife',icon: 'hourglass_empty',auth: true, section: 'analytics' },
  commitments:         { title: 'Commitments',     icon: 'task_alt',       auth: true,  section: 'analytics' },
  'brain-fragments':   { title: 'Brain Fragments', icon: 'neurology',      auth: true,  section: 'analytics' },
  'cognitive-load':    { title: 'Cognitive Load',  icon: 'monitoring',     auth: true,  section: 'analytics' },
  'predictive-load':   { title: 'Predictive Load', icon: 'psychology',     auth: true,  section: 'analytics' },
  archaeology:         { title: 'Archaeology',     icon: 'history_edu',    auth: true,  section: 'analytics' },
  'memory-segments':   { title: 'Memory Segments', icon: 'scatter_plot',   auth: true,  section: 'analytics' },

  // Utility
  memory:              { title: 'Memory',          icon: 'memory',         auth: true,  section: 'setup' },
  'thought-export':    { title: 'Export',          icon: 'download',       auth: true,  section: 'setup' },
  'api-keys':          { title: 'API Vault',       icon: 'key',            auth: true,  section: 'setup' },
  channels:            { title: 'Channels',        icon: 'forum',          auth: true,  section: 'setup' },
  credits:             { title: 'Credits & Tiers', icon: 'payments',       auth: true,  section: 'setup' },
  notifications:       { title: 'Notifications',   icon: 'notifications',  auth: true,  section: 'setup' },

  // Public / Other
  'smart-dashboard':   { title: 'Smart Dashboard', icon: 'psychology',     auth: true,  section: 'analytics' },
  'cognitive-sprints':  { title: 'Cognitive Sprints',icon: 'speed',         auth: true,  section: 'analytics' },
  achievements:         { title: 'Achievements',    icon: 'emoji_events',   auth: true,  section: 'analytics' },
  'how-it-works':      { title: 'How It Works',    icon: 'play_circle',    auth: false, section: 'main' },
  legal:               { title: 'Legal',           icon: 'gavel',          auth: false, section: 'other' },
  auth:                { title: 'Sign In',         icon: 'login',          auth: false, section: 'hidden' },

  // Admin
  admin:               { title: 'Admin',           icon: 'admin_panel_settings', auth: true, section: 'admin', adminOnly: true },
  // Hidden utility pages
  profile:             { title: 'My Profile',      icon: 'account_circle',  auth: true,  section: 'hidden' },
};

const pageFactories = {
  home: Home, auth: Auth, dashboard: Dashboard, 'mission-control': MissionControl,
  'brain-fragments': BrainFragments, 'cognitive-load': CognitiveLoad, 'predictive-load': PredictiveLoad,
  'memory-segments': MemorySegments, memory: Memory,  'interactive-space': InteractiveSpace,
  'api-keys': APIKeys,
  channels: Channels,
  credits: Credits, 'thought-afterlife': ThoughtAfterlife,
  commitments: Commitments, archaeology: ThoughtArchaeology,
  'thought-export': ThoughtExport, 'how-it-works': HowItWorks,
  notifications: NotificationsLog,
  admin: AdminDashboard, legal: Legal,
  'map-my-mind': MapMyMind,  'smart-dashboard': SmartDashboard,
  'cognitive-sprints': CognitiveSprints,
  achievements: Achievements,
  profile: Profile,
};

// ── Navigation Rendering ─────────────────────────────────────────────────────
let navWheelRoot = null;

// Ordered, auth-aware list of pages rendered on the OptionWheel navigation
function buildWheelPages() {
  const isAdmin = user?.isAdmin;
  const isLoggedIn = api.isLoggedIn();
  const order = [
    'home', 'dashboard', 'interactive-space', 'map-my-mind', 'mission-control',
    'how-it-works',
    'cognitive-sprints', 'achievements',
    'thought-afterlife', 'commitments', 'brain-fragments', 'cognitive-load', 'predictive-load',
    'archaeology', 'memory-segments',
    'memory', 'thought-export', 'api-keys', 'channels', 'credits', 'notifications',
    'legal',
  ];
  if (isAdmin) order.push('admin');
  return order.filter(k =>
    pageRegistry[k] &&
    (!pageRegistry[k].auth || isLoggedIn) &&
    (!pageRegistry[k].adminOnly || isAdmin)
  );
}

// Navigation debounce: dragging/scrolling the wheel fires onChange many times
// per gesture — only navigate after the wheel has briefly settled.
let wheelNavTimer = null;
function navigateFromWheel(key) {
  if (key && key !== currentPage) {
    if (wheelNavTimer) clearTimeout(wheelNavTimer);
    wheelNavTimer = setTimeout(() => {
      if (key !== currentPage) window.showPage(key);
    }, 180);
  }
}

// Mount the OptionWheel (React Bits) into the rail, re-rendering items on
// every nav pass so auth state and the active page stay in sync.
function mountNavWheel() {
  const host = document.getElementById('nav-wheel-root');
  if (!host) return;
  const keys = buildWheelPages();
  const labels = keys.map(k => pageRegistry[k].title);
  const selected = Math.max(0, keys.indexOf(currentPage));
  Promise.all([
    import('react'),
    import('react-dom/client'),
    import('./components/OptionWheel.jsx'),
  ]).then(([React, ReactDOM, wheelModule]) => {
    const OptionWheel = wheelModule.default;
    if (!navWheelRoot) navWheelRoot = ReactDOM.createRoot(host);
    navWheelRoot.render(
      React.createElement(OptionWheel, {
        key: currentPage,
        items: labels,
        defaultSelected: selected,
        textColor: '#aeb4bf',
        activeColor: '#ccff00',
        side: 'left',
        fontSize: 1.44,
        spacing: 1.67,
        curve: 1.4,
        tilt: 6,
        blur: 0.5,
        fade: 0.22,
        minOpacity: 0.08,
        smoothing: 520,
        inset: 30,
        loop: true,
        draggable: true,
        className: 'nav-wheel',
        onChange: (idx) => {
          navigateFromWheel(keys[idx]);
        },
      })
    );
  });
}

function renderNavRail() {
  const rail = document.getElementById('nav-rail');
  if (!rail) return;

  if (!document.getElementById('nav-wheel-root') || !document.getElementById('desktop-logo-root')) {
    rail.innerHTML = `
      <div id="desktop-logo-root" style="width:100%; height:76px; flex-shrink:0;"></div>
      <div class="nav-wheel-host" id="nav-wheel-root" style="flex:1;"></div>
    `;
    rail.dataset.wheelMounted = '1';

    setTimeout(() => {
      const desktopRoot = document.getElementById('desktop-logo-root');
      if (desktopRoot) {
        import('react').then((React) => {
          import('react-dom/client').then((ReactDOM) => {
            import('./components/TopLogo.jsx').then((module) => {
              const TopLogo = module.default;
              if (!desktopRoot._root) desktopRoot._root = ReactDOM.createRoot(desktopRoot);
              desktopRoot._root.render(React.createElement(TopLogo, { mobile: false }));
            });
          });
        });
      }
    }, 0);
  }

  mountNavWheel();
}

function renderBottomNav() {
  const container = document.getElementById('bottom-nav-items');
  if (!container) return;
  const bottomItems = ['home', 'dashboard', 'interactive-space', 'map-my-mind', 'mission-control'];
  const isLoggedIn = api.isLoggedIn();
  container.innerHTML = bottomItems
    .filter(k => pageRegistry[k] && (!pageRegistry[k].auth || isLoggedIn))
    .map(k => {
      const p = pageRegistry[k];
      const active = k === currentPage ? 'active' : '';
      return `<div class="bottom-nav-item ${active}" onclick="showPage('${k}')" role="button" tabindex="0" aria-label="Navigate to ${p.title}">
        <span class="bottom-nav-dot"></span>
        <span>${p.title.split(' ')[0]}</span>
      </div>`;
    }).join('');
}

function renderMobileDrawer() {
  const content = document.getElementById('drawer-content');
  if (!content) return;
  // Build a plain link list (the rail itself now hosts the React OptionWheel,
  // which can't be copied into the drawer).
  const items = buildWheelPages().map(k => {
    const p = pageRegistry[k];
    const active = k === currentPage ? 'active' : '';
    return `<div class="nav-item ${active}" onclick="showPage('${k}');document.getElementById('mobile-drawer').classList.remove('open')" role="button" tabindex="0" aria-label="Navigate to ${p.title}">
      <span class="nav-dot"></span><span>${p.title}</span>
    </div>`;
  }).join('');
  content.innerHTML = `
    <div class="nav-logo" style="flex-direction:column;gap:0.35rem;text-align:center;padding:1rem 0.75rem;">
      <div style="display:inline-block;font:italic 800 17px/1 var(--font-heading);letter-spacing:0.04em;color:#b5b5b5;">ReMentally</div>
      <div style="font:400 8px/1 var(--font-body);letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.2);">Cognitive Coprocessor</div>
    </div>
    ${items}`;
}

function updateUserChip() {
  const chip = document.getElementById('user-name');
  if (!chip) return;
  if (user) {
    // Priority: firstName > username > email prefix
    const displayName = user.firstName || user.username || user.email?.split('@')[0] || 'User';
    chip.textContent = displayName;
    // Tooltip with full name + email
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    chip.title = fullName ? `${fullName}\n${user.email}` : user.email;
  } else {
    chip.textContent = 'Sign In';
    chip.title = '';
  }
}
window.__updateUserChip = () => { user = api.getUser(); updateUserChip(); };

async function updateNotifBadge() {
  if (!api.isLoggedIn()) return;
  const data = await api.get('/notifications/unread-count');
  const badge = document.getElementById('notif-badge');
  if (badge && data.count > 0) {
    badge.textContent = data.count > 99 ? '99+' : data.count;
    badge.style.display = 'grid';
  } else if (badge) {
    badge.style.display = 'none';
  }
}

// ── Page Router ──────────────────────────────────────────────────────────────
function renderPage(page) {
  const info = pageRegistry[page];
  const factory = pageFactories[page];

  // Auth guard
  if (info?.auth && !api.isLoggedIn()) {
    page = 'auth';
  }
  // Admin guard
  if (info?.adminOnly && !user?.isAdmin) {
    page = 'home';
  }

  // presentation hook: lets the stylesheet adapt the chrome per page/auth state
  document.documentElement.dataset.page = page;
  document.documentElement.dataset.auth = api.isLoggedIn() ? 'true' : 'false';

  // Premium guard (PRO only) — skipped on local/dev instances,
  // where every feature is unlocked so the app looks and behaves the same
  // for every account.
  const premiumPages = ['commitments', 'thought-afterlife', 'cognitive-load', 'archaeology', 'brain-fragments', 'memory-segments'];
  const userTier = user?.tier || 'free';
  if (premiumPages.includes(page) && userTier === 'free' && !api.isDev()) {
    currentPage = page;
    const main = document.getElementById('main-content');
    if (main) {
      main.innerHTML = `
        <div class="page-shell">
          <div class="surface-card card-reveal neopop-card" style="padding:3rem;text-align:center;max-width:600px;margin:2rem auto;border: 1px solid var(--md-sys-color-primary) !important;">
            <div class="mono-label" style="color:var(--md-sys-color-primary);font-size:14px;margin-bottom:0.5rem;">EARLY ADOPTER FEATURE</div>
            <h2 class="neon-text-lime" style="font:var(--md-sys-typescale-headline-small);margin:0 0 1rem;">Unlock Advanced Co-Processing</h2>
            <p style="color:var(--md-sys-color-on-surface-variant);line-height:1.6;margin-bottom:2rem;">
              The <strong>${info?.title || page}</strong> features are available to <strong>Early Adopters</strong>. Spots are limited — join the waitlist to get access when the next batch opens.
            </p>
            <button class="btn-m3 btn-filled" onclick="showPage('credits')" style="width:100%;height:48px;font-weight:bold;">
              Join Early Adopter Waitlist
            </button>
          </div>
        </div>`;
      renderNavRail();
      renderBottomNav();
      renderMobileDrawer();
      setTimeout(() => {
        document.querySelectorAll('.card-reveal').forEach((el) => el.classList.add('revealed'));
        const mainEl = document.getElementById('main-content');
        if (mainEl) {
          initSpecularButtons(mainEl);
        }
      }, 50);
      return;
    }
  }

  currentPage = page;
  const main = document.getElementById('main-content');
  if (!main) return;

  // Set page title
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = pageRegistry[page]?.title || 'ReMentally';

  // Render page content
  if (factory) {
    const content = factory();
    if (typeof content === 'string') main.innerHTML = content;
    else if (content instanceof Node) main.replaceChildren(content);
    else main.innerHTML = '<div class="surface-card" style="color:var(--md-sys-color-error)">Page error</div>';
  } else {
    main.innerHTML = '<div class="surface-card">Page not found</div>';
  }

  // Animate entrance
  main.classList.add('page-enter');
  requestAnimationFrame(() => {
    main.classList.remove('page-enter');
    main.classList.add('page-enter-active');
    setTimeout(() => main.classList.remove('page-enter-active'), 400);
  });

  // Update nav active states
  renderNavRail();
  renderBottomNav();
  renderMobileDrawer();    // Reveal cards with stagger + apply specular glare to buttons
    setTimeout(() => {
      document.querySelectorAll('.card-reveal').forEach((el, i) => {
        setTimeout(() => el.classList.add('revealed'), i * 80);
      });
      const mainEl = document.getElementById('main-content');
      if (mainEl) {
        initSpecularButtons(mainEl);
      }
    }, 100);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Global showPage
window.showPage = (page) => {
  renderPage(page);
};

window.handleUserClick = () => {
  if (api.isLoggedIn()) {
    renderPage('profile');
  } else {
    renderPage('auth');
  }
};

// Listen for auth events
window.addEventListener('rementally-auth-required', () => renderPage('auth'));
window.addEventListener('rementally-auth-success', (e) => {
  user = e.detail?.user || api.getUser();
  updateUserChip();
  renderPage('dashboard');
});

// ── Global XSS Escape (available to all pages) ───────────────────────────────
// Every page MUST use esc() when interpolating user data into innerHTML.
// Usage: el.innerHTML = `<div>${esc(userInput)}</div>`;
window.esc = function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};
window.escAttr = function escAttr(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  user = api.getUser();
  updateUserChip();

  // Try to refresh user data if logged in
  if (api.isLoggedIn()) {
    const me = await api.get('/auth/me');
    if (me.id) {
      user = me;
      api.setUser(me);
      updateUserChip();
      updateNotifBadge();
    }
  }

  // Server-authoritative dev flag (overrides the hostname heuristic)
  try {
    const health = await api.get('/health');
    if (health && health.env) api.setIsDev(health.env !== 'production');
  } catch (e) { /* keep hostname heuristic */ }

  // Determine initial page from URL
  const path = window.location.pathname;
  const pageFromPath = Object.entries(pageRegistry).find(([k]) => path.includes(k))?.[0];
  renderPage(pageFromPath || 'home');

  // Branded presentation layer: entropy skin, liquid-glass hover, reveal,
  // hero scroll camera, logo decay (all presentation-only, never data)
  initEnhancements();

  // Specular glare on the top-bar chips + any button outside page content
  initSpecularButtons(document.body);

  // Mount ambient Footer globally
  setTimeout(() => {
    const footerReactRoot = document.getElementById('footer-react-root');
    if (footerReactRoot) {
      import('react').then((React) => {
        import('react-dom/client').then((ReactDOM) => {
          import('./components/Footer.jsx').then((module) => {
            const Footer = module.default;
            const root = ReactDOM.createRoot(footerReactRoot);
            root.render(React.createElement(Footer));
          });
        });
      });
    }

    const mobileLogoRoot = document.getElementById('mobile-logo-root');
    if (mobileLogoRoot) {
      import('react').then((React) => {
        import('react-dom/client').then((ReactDOM) => {
          import('./components/TopLogo.jsx').then((module) => {
            const TopLogo = module.default;
            const root = ReactDOM.createRoot(mobileLogoRoot);
            root.render(React.createElement(TopLogo, { mobile: true }));
          });
        });
      });
    }
  }, 0);
}

init();

// ── Service Worker Registration (Offline-First PWA) ──────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('[PWA] Service Worker registered:', reg.scope);
      // Check for updates every hour
      setInterval(() => reg.update(), 3600000);
    }).catch((err) => {
      console.warn('[PWA] SW registration failed:', err.message);
    });
  });

  // Listen for offline queue messages from SW
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'OFFLINE_THOUGHT_QUEUED') {
      import('./lib/toast.js').then(({ toast }) => {
        toast.show('Thought queued for sync when back online', 'info');
      });
    }
    if (event.data?.type === 'OFFLINE_THOUGHT_SYNCED') {
      import('./lib/toast.js').then(({ toast }) => {
        toast.show('Offline thought synced successfully', 'success');
      });
    }
  });
}

// ── Prompt service worker update on new version ────────────────────────────
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

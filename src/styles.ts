export const styles = `
:root {
  --bg: #ffffff;
  --card-bg: rgba(255,255,255,0.92);
  --card-border: rgba(0,0,0,0.07);
  --card-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06);
  --text: #1f2328;
  --text-heading: #0d1117;
  --muted: #656d76;
  --accent: #0969da;
  --accent-soft: rgba(9,105,218,0.14);
  --accent-border: rgba(9,105,218,0.28);
  --divider: rgba(0,0,0,0.06);
  --input-bg: rgba(0,0,0,0.04);
  --input-border: rgba(0,0,0,0.1);
  --btn-bg: rgba(0,0,0,0.04);
  --btn-bg-hover: rgba(0,0,0,0.08);
  --danger: #cf222e; --danger-soft: rgba(207,34,46,0.12);
  --success: #2da44e;
  --glow: rgba(9,105,218,0.03);
  --backdrop: none;
  --radius: 12px;
}

html[data-theme="dark"] {
  --bg: #0d1117;
  --card-bg: rgba(22,27,34,0.85);
  --card-border: rgba(255,255,255,0.06);
  --card-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.2);
  --text: #e6edf3;
  --text-heading: #f0f6fc;
  --muted: #8b949e;
  --accent: #58a6ff;
  --accent-soft: rgba(88,166,255,0.20);
  --accent-border: rgba(88,166,255,0.32);
  --divider: rgba(255,255,255,0.06);
  --input-bg: rgba(255,255,255,0.05);
  --input-border: rgba(255,255,255,0.1);
  --btn-bg: rgba(255,255,255,0.06);
  --btn-bg-hover: rgba(255,255,255,0.1);
  --danger: #f85149; --danger-soft: rgba(248,81,73,0.18);
  --success: #3fb950;
  --glow: rgba(88,166,255,0.04);
  --backdrop: blur(16px);
}

* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; font-size: 16px; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', sans-serif;
  background: var(--bg); color: var(--text); min-height: 100vh; line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  transition: background-color 0.4s ease, color 0.4s ease;
  position: relative;
}

body::before {
  content: ''; position: fixed; inset: 0;
  background: radial-gradient(ellipse at 50% 35%, var(--glow) 0%, transparent 70%);
  pointer-events: none; transition: background 0.4s ease;
}

::view-transition-old(root), ::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
::view-transition-new(root) { animation: vt-reveal 0.6s cubic-bezier(0.4,0,0.2,1) forwards; z-index: 2; }
::view-transition-old(root) { z-index: 1; }
@keyframes vt-reveal {
  from { clip-path: circle(0 at var(--vt-x, 50%) var(--vt-y, 50%)); }
  to   { clip-path: circle(200% at var(--vt-x, 50%) var(--vt-y, 50%)); }
}

a { color: var(--accent); text-decoration: none; transition: color 0.2s; }
a:hover { text-decoration: underline; }

.header {
  position: sticky; top: 0; z-index: 40;
  background: var(--card-bg); backdrop-filter: var(--backdrop); -webkit-backdrop-filter: var(--backdrop);
  border-bottom: 1px solid var(--card-border);
  transition: background-color 0.4s, border-color 0.4s;
}
.header-inner {
  max-width: 960px; margin: 0 auto; padding: 0 1.5rem;
  height: 3.5rem; display: flex; align-items: center; justify-content: space-between;
}
.logo { font-size: 1.05rem; font-weight: 700; letter-spacing: 0.1em; color: var(--text-heading); }
.nav { display: flex; align-items: center; gap: 1.5rem; }
.nav a { color: var(--muted); font-size: 0.85rem; font-weight: 500; text-decoration: none; transition: color 0.2s; }
.nav a.active, .nav a:hover { color: var(--accent); text-decoration: none; }

.theme-btn {
  width: 34px; height: 34px; border-radius: 50%;
  border: 1px solid var(--card-border); background: var(--card-bg);
  backdrop-filter: var(--backdrop); -webkit-backdrop-filter: var(--backdrop);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: var(--muted); outline: none; -webkit-tap-highlight-color: transparent;
  transition: background-color 0.4s, border-color 0.4s, transform 0.2s, color 0.3s;
}
.theme-btn:hover { transform: scale(1.08); color: var(--accent); border-color: var(--accent-border); }
.theme-btn svg { width: 15px; height: 15px; pointer-events: none; }
html:not([data-theme="dark"]) .icon-sun,
html[data-theme="dark"] .icon-moon { display: none; }

.main { max-width: 960px; margin: 0 auto; padding: 1.75rem 1.5rem 4rem; position: relative; z-index: 1; }
.page-title { font-size: 1.35rem; font-weight: 700; color: var(--text-heading); letter-spacing: -0.02em; }
.page-subtitle { color: var(--muted); font-size: 0.8rem; margin-top: 0.15rem; margin-bottom: 1.5rem; }

.stat-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 0.65rem; margin-bottom: 1.25rem; }
.stat-card {
  background: var(--card-bg); backdrop-filter: var(--backdrop); -webkit-backdrop-filter: var(--backdrop);
  border: 1px solid var(--card-border); border-radius: var(--radius);
  padding: 1.1rem 1rem; box-shadow: var(--card-shadow);
  transition: background-color 0.4s, border-color 0.4s, box-shadow 0.4s;
}
.stat-label { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.15rem; }
.stat-value { font-size: 1.5rem; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--accent); }
.stat-sub { font-size: 0.7rem; color: var(--muted); margin-top: 0.1rem; opacity: 0.7; }

.search-bar {
  background: var(--card-bg); backdrop-filter: var(--backdrop); -webkit-backdrop-filter: var(--backdrop);
  border: 1px solid var(--card-border); border-radius: var(--radius);
  padding: 0.9rem 1rem; box-shadow: var(--card-shadow); margin-bottom: 1.25rem;
  display: flex; gap: 0.6rem; align-items: flex-end; flex-wrap: wrap;
  transition: background-color 0.4s, border-color 0.4s, box-shadow 0.4s;
}
.search-field { display: flex; flex-direction: column; gap: 0.2rem; }
.search-field label { font-size: 0.68rem; color: var(--muted); font-weight: 500; letter-spacing: 0.04em; }
.search-field input, .search-field select {
  height: 2.35rem; padding: 0 1.75rem 0 0.65rem; font-size: 0.82rem;
  background: var(--input-bg); border: 1px solid var(--input-border); border-radius: 8px;
  color: var(--text); font-family: inherit;
  transition: border-color 0.25s, background-color 0.25s, box-shadow 0.25s;
  outline: none; min-width: 100px;
  appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23656d76' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 0.5rem center; background-size: 0.8rem;
  cursor: pointer;
}
html[data-theme="dark"] .search-field select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b949e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
}
.search-field input:focus, .search-field select:focus {
  border-color: var(--accent-border); box-shadow: 0 0 0 2px var(--accent-soft);
}
.search-field input::placeholder { color: var(--muted); opacity: 0.6; }
.btn {
  height: 2.35rem; padding: 0 1.1rem; font-size: 0.82rem; font-weight: 500;
  border: none; border-radius: 8px; cursor: pointer;
  font-family: inherit; transition: background-color 0.25s, opacity 0.2s;
}
.btn-primary { background: var(--accent); color: #fff; }
.btn-primary:hover { opacity: 0.88; }
.btn-success { background: var(--success); color: #fff; }
.btn-success:hover { opacity: 0.88; }
.btn-danger { background: var(--danger); color: #fff; }
.btn-danger:hover { opacity: 0.88; }
.btn-sm { height: 1.9rem; padding: 0 0.65rem; font-size: 0.75rem; }

.table-wrap {
  background: var(--card-bg); backdrop-filter: var(--backdrop); -webkit-backdrop-filter: var(--backdrop);
  border: 1px solid var(--card-border); border-radius: var(--radius);
  box-shadow: var(--card-shadow); overflow: hidden;
  transition: background-color 0.4s, border-color 0.4s, box-shadow 0.4s;
}
.table-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.8rem 1rem; border-bottom: 1px solid var(--divider);
}
.table-header h2 { font-size: 0.85rem; font-weight: 600; color: var(--text-heading); }
.table-header span { font-size: 0.75rem; color: var(--muted); }
table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
th {
  text-align: left; padding: 0.65rem 1rem; font-size: 0.68rem;
  font-weight: 500; color: var(--muted); text-transform: uppercase;
  letter-spacing: 0.05em; border-bottom: 1px solid var(--divider);
}
td { padding: 0.65rem 1rem; color: var(--text); border-bottom: 1px solid var(--divider); }
tr:last-child td { border-bottom: none; }
tr:hover td { background: var(--btn-bg); }
.callsign { font-weight: 600; color: var(--text-heading); }
.callsign a { color: var(--text-heading); text-decoration: none; }
.callsign a:hover { color: var(--accent); text-decoration: underline; }

.mode-badge { font-size: 0.72rem; font-weight: 500; padding: 0.12rem 0.45rem; border-radius: 4px; }
.mode-ft8 { background: rgba(191,97,106,0.15); color: #bf616a; }
.mode-ft4 { background: rgba(245,158,11,0.15); color: #d97706; }
.mode-ssb { background: var(--accent-soft); color: var(--accent); }
.mode-cw  { background: rgba(163,113,247,0.15); color: #a371f7; }
html[data-theme="dark"] .mode-ft8 { background: rgba(191,97,106,0.2); }
html[data-theme="dark"] .mode-ft4 { background: rgba(245,158,11,0.2); }
html[data-theme="dark"] .mode-cw  { background: rgba(163,113,247,0.2); }

.lotw-yes { color: #2da44e; font-weight: 700; }
.lotw-no  { color: var(--muted); opacity: 0.4; }

.pagination {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.8rem 1rem; border-top: 1px solid var(--divider);
}
.page-btn {
  height: 2.1rem; padding: 0 0.9rem; font-size: 0.78rem;
  background: var(--btn-bg); color: var(--text);
  border: 1px solid var(--card-border); border-radius: 8px; cursor: pointer;
  font-family: inherit; transition: background-color 0.25s, border-color 0.25s;
  display: inline-flex; align-items: center; text-decoration: none;
}
a.page-btn:hover { background: var(--btn-bg-hover); border-color: var(--accent-border); text-decoration: none; }
.page-btn:hover { background: var(--btn-bg-hover); border-color: var(--accent-border); }
.page-btn:disabled { opacity: 0.35; cursor: default; }
.page-btn:disabled:hover { background: var(--btn-bg); border-color: var(--card-border); }
.page-info { font-size: 0.78rem; color: var(--muted); }

footer {
  text-align: center; padding: 2rem 0; color: var(--muted); font-size: 0.72rem;
  opacity: 0.55; letter-spacing: 0.04em;
}
footer a { color: var(--muted); }
footer a:hover { color: var(--accent); text-decoration: underline; }

@media (max-width: 640px) {
  .stat-grid { grid-template-columns: repeat(2,1fr); }
  .search-bar { flex-direction: column; align-items: stretch; }
  .search-field input, .search-field select { width: 100%; }
  th:nth-child(4),td:nth-child(4),
  th:nth-child(6),td:nth-child(6) { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  *,*::before,*::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
`;

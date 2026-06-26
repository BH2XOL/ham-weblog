import { styles } from "../styles";
import type { Bindings, BestDX, QSO } from "../types";
import { esc, opt } from "../lib/html";
import { getBestDX, countQsos, queryQsos, initSchema, getLastActivity } from "../lib/db";
import { gridDistance } from "../lib/grid";

export async function frontendHandler(
  request: Request,
  env: Bindings
): Promise<Response> {
  await initSchema(env.DB);

  const url = new URL(request.url);
  const callF = url.searchParams.get("call") || undefined;
  const modeF = url.searchParams.get("mode") || undefined;
  const dateF = url.searchParams.get("date") || undefined;
  const filters = { call: callF, mode: modeF, date: dateF };
  const PAGE_SIZE = 50;
  const raw = parseInt(url.searchParams.get("page") || "1", 10);
  const page = Math.max(1, Number.isNaN(raw) ? 1 : raw);

  const [total, bestDx, qsos, lastAct] = await Promise.all([
    countQsos(env.DB, filters),
    getBestDX(env.DB),
    queryQsos(env.DB, filters, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    getLastActivity(env.DB),
  ]);

  const totalCnt = total?.cnt ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCnt / PAGE_SIZE));
  const lastActivity = lastAct?.last_activity || "";

  let bestDisplay: BestDX | null = bestDx ?? null;
  if (!bestDisplay) {
    const myGrids = env.MY_GRIDS?.split(",").filter(g => g.trim()) || [];
    if (myGrids.length > 0) {
      const qsosWG = await env.DB.prepare(
        "SELECT call, dxcc, grid FROM qsos WHERE grid != '' ORDER BY date DESC LIMIT 200"
      ).all<Record<string, string>>();
      let maxDist = 0, maxCall = "", maxDxcc = "";
      for (const row of qsosWG.results) {
        for (const mg of myGrids) {
          const d = gridDistance(mg.trim(), row.grid);
          if (d !== null && d > maxDist) { maxDist = d; maxCall = row.call; maxDxcc = row.dxcc; }
        }
      }
      if (maxCall) bestDisplay = { call: maxCall, description: maxDxcc, distance_km: maxDist };
    }
  }

  const callsign = env.CALLSIGN;
  const blogURL = env.BLOG_URL;
  const qrzURL = env.QRZ_URL;

  return new Response(
    renderPage(qsos, totalCnt, totalPages, page, bestDisplay, callsign, blogURL, qrzURL, lastActivity, callF, modeF, dateF),
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
    }
  );
}

function safeURL(u: string): string {
  if (!u) return "#";
  const lower = u.trim().toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://")) return esc(u);
  return "#";
}

function renderPage(
  qsos: QSO[], total: number, totalPages: number, page: number,
  best: BestDX | null,
  callsign: string, blogURL: string, qrzURL: string,
  lastActivity: string, callF?: string, modeF?: string, dateF?: string
): string {
  const bestHTML = best
    ? `<div class="stat-value" style="font-size:1.2rem;">${esc(best.call)}</div>
       <div class="stat-sub">${esc(best.description)} · ${best.distance_km}km</div>`
    : `<div class="stat-value" style="font-size:1rem;">—</div><div class="stat-sub">暂无数据</div>`;

  const lastActHTML = lastActivity
    ? `<div class="stat-value" style="font-size:1.2rem;">${esc(lastActivity)}</div>`
    : `<div class="stat-value" style="font-size:1rem;">—</div>`;

  const rows = qsos.map(q => `
    <tr>
      <td class="callsign"><a href="https://www.qrz.com/db/${esc(q.call)}" target="_blank" rel="noopener">${esc(q.call)}</a ></td>
      <td>${esc(q.date)}</td>
      <td>${esc(q.time)}</td>
      <td>${esc(q.freq)}</td>
      <td><span class="mode-badge mode-${esc(q.mode.toLowerCase())}">${esc(q.mode)}</span></td>
      <td>${esc(q.rst_rx)} / ${esc(q.rst_tx)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(callsign)} · 日志</title>
  <meta name="description" content="${esc(callsign)} 通联日志">
  <link rel="icon" href="/avatar.png">
  <script>
    (function() {
      var saved = localStorage.getItem('theme');
      if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme:dark)').matches)) {
        document.documentElement.setAttribute('data-theme','dark');
      }
    })();
  </script>
  <style>${styles}</style>
</head>
<body>
  <header class="header">
    <div class="header-inner">
      <a href="/" class="logo">${esc(callsign)}</a >
      <nav class="nav">
        <a href="${safeURL(blogURL)}">博客</a >
        <a href="#" class="active">日志</a >
        <a href="/admin">管理</a >
        <a href="${safeURL(qrzURL)}">QRZ</a >
        <button class="theme-btn" id="theme-btn" aria-label="切换主题">
          <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>
      </nav>
    </div>
  </header>

  <main class="main">
    <h1 class="page-title">通联日志</h1>
    <p class="page-subtitle">共 <strong>${total}</strong> 条</p >

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">总记录</div><div class="stat-value">${total}</div><div class="stat-sub">全部 QSO</div></div>
      <div class="stat-card"><div class="stat-label">最佳 DX</div>${bestHTML}</div>
      <div class="stat-card"><div class="stat-label">最近活动</div>${lastActHTML}<div class="stat-sub">&nbsp;</div></div>
      <div class="stat-card" style="visibility:hidden;"></div>
    </div>

    <div class="search-bar">
      <div class="search-field" style="flex:2;min-width:150px;">
        <label>呼号</label>
        <input type="text" placeholder="搜索呼号…" id="callSearch" value="${esc(callF || "")}">
      </div>
      <div class="search-field" style="min-width:90px;">
        <label>模式</label>
        <select id="modeFilter">${opt("全部","",modeF)}${opt("SSB","SSB",modeF)}${opt("FT8","FT8",modeF)}${opt("CW","CW",modeF)}</select>
      </div>
      <div class="search-field" style="min-width:100px;">
        <label>时间</label>
        <select id="dateFilter">${opt("全部","",dateF)}${opt("2026-04","2026-04",dateF)}${opt("2026-01","2026-01",dateF)}${opt("2025-10","2025-10",dateF)}</select>
      </div>
      <button class="btn btn-primary" style="align-self:flex-end;" onclick="search()">搜索</button>
    </div>

    <div class="table-wrap">
      <div class="table-header"><h2>通联记录</h2><span>共 ${total} 条</span></div>
      <div style="overflow-x:auto;">
        <table>
          <thead><tr><th>呼号</th><th>日期</th><th>UTC</th><th>频率</th><th>模式</th><th>RST</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${renderPagination(total, totalPages, page, callF, modeF, dateF)}
    </div>
  </main>

  <footer>${esc(callsign)} &copy; ${new Date().getFullYear()}&emsp;·&emsp;<a href="/admin">管理</a ></footer>

  <script>
    function search() {
      var p = new URLSearchParams();
      var c=document.getElementById('callSearch').value.trim();
      var m=document.getElementById('modeFilter').value;
      var d=document.getElementById('dateFilter').value;
      if(c) p.set('call',c); if(m) p.set('mode',m); if(d) p.set('date',d);
      window.location.search=p.toString();
    }
    (function() {
      var html=document.documentElement, btn=document.getElementById('theme-btn');
      if(!btn) return;
      function set(d){ if(d){html.setAttribute('data-theme','dark');localStorage.setItem('theme','dark');}else{html.removeAttribute('data-theme');localStorage.setItem('theme','light');} }
      btn.addEventListener('click',function(e){
        var r=btn.getBoundingClientRect();
        html.style.setProperty('--vt-x',(r.left+r.width/2)+'px');
        html.style.setProperty('--vt-y',(r.top+r.height/2)+'px');
        var isDark=html.getAttribute('data-theme')==='dark';
        if(document.startViewTransition){document.startViewTransition(function(){set(!isDark);});}else{set(!isDark);}
      });
    })();
  </script>
</body>
</html>`;
}

function renderPagination(total: number, totalPages: number, page: number, callF?: string, modeF?: string, dateF?: string): string {
  if (totalPages <= 1) return "";
  const qs = new URLSearchParams();
  if (callF) qs.set("call", callF);
  if (modeF) qs.set("mode", modeF);
  if (dateF) qs.set("date", dateF);
  const base = qs.size > 0 ? `?${qs.toString()}&` : "?";
  const prev = page > 1 ? `<a href="${base}page=${page - 1}" class="page-btn">← 上一页</a>` : `<button class="page-btn" disabled>← 上一页</button>`;
  const next = page < totalPages ? `<a href="${base}page=${page + 1}" class="page-btn">下一页 →</a>` : `<button class="page-btn" disabled>下一页 →</button>`;
  return `<div class="pagination">${prev}<span class="page-info">第 ${page} / ${totalPages} 页 · ${total} 条</span>${next}</div>`;
}

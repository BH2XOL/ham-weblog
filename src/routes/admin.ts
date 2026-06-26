import type { Bindings } from "../types";
import { esc } from "../lib/html";
import { styles } from "../styles";
import { verifySession, createSessionCookie, verifyPassword } from "../lib/auth";
import { initSchema, countRecentLoginFailures, recordLoginAttempt } from "../lib/db";

export async function adminHandler(
  request: Request,
  env: Bindings
): Promise<Response> {
  await initSchema(env.DB);

  const url = new URL(request.url);
  const callsign = env.CALLSIGN;
  const securityHeaders: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };

  if (url.pathname === "/admin/login" && request.method === "POST") {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";

    const recentFails = await countRecentLoginFailures(env.DB, ip);
    if (recentFails >= 5) {
      return new Response(renderLogin(callsign, "尝试次数过多，请15分钟后再试"), {
        headers: { ...securityHeaders, "Content-Type": "text/html; charset=utf-8" },
        status: 429,
      });
    }

    const body = (await request.json()) as { email: string; password: string };
    const ok = await verifyPassword(env, body.email || "", body.password || "");
    await recordLoginAttempt(env.DB, ip, ok);

    if (!ok) {
      return new Response(renderLogin(callsign, "邮箱或密码错误"), {
        headers: { ...securityHeaders, "Content-Type": "text/html; charset=utf-8" },
        status: 401,
      });
    }
    const cookie = await createSessionCookie(env, body.email);
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/admin",
        "Set-Cookie": cookie,
      },
    });
  }

  const login = await verifySession(request, env);
  if (!login) {
    return new Response(renderLogin(callsign), {
      headers: { ...securityHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new Response(renderAdmin(callsign), {
    headers: { ...securityHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function logoutHandler(): Promise<Response> {
  return new Response(null, {
    status: 302,
    headers: { Location: "/admin", "Set-Cookie": "session=; Path=/admin; HttpOnly; SameSite=Lax; Max-Age=0" },
  });
}

function renderLogin(callsign: string, error?: string): string {
  const errHTML = error ? `<p style="color:var(--danger);font-size:0.82rem;margin-bottom:1rem;">${esc(error)}</p>` : "";
  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>登录 · ${esc(callsign)} 管理</title>
  <script>
    (function() {
      var saved = localStorage.getItem('theme');
      if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme:dark)').matches)) {
        document.documentElement.setAttribute('data-theme','dark');
      }
    })();
  </script>
  <style>${styles}
    body { display:flex; align-items:center; justify-content:center; }
    body::before { opacity:0.15; }
    .login-card {
      background:var(--card-bg); border:1px solid var(--card-border);
      border-radius:var(--radius); padding:2.5rem 2rem; box-shadow:var(--card-shadow);
      text-align:center; max-width:380px; width:100%; position:relative; z-index:1;
      backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
      transition: background-color 0.4s, border-color 0.4s, box-shadow 0.4s;
    }
    .login-card h1 { font-size:1.25rem; color:var(--text-heading); margin-bottom:0.5rem; }
    .login-card p { color:var(--muted); font-size:0.85rem; margin-bottom:1.5rem; }
    .field { margin-bottom:1rem; text-align:left; }
    .field label { display:block; font-size:0.75rem; color:var(--muted); margin-bottom:0.3rem; font-weight:500; }
    .field input {
      width:100%; height:2.5rem; padding:0 0.75rem; font-size:0.9rem; font-family:inherit;
      background:var(--input-bg); border:1px solid var(--input-border); border-radius:8px;
      color:var(--text); outline:none; transition: border-color 0.25s, box-shadow 0.25s;
    }
    .field input:focus { border-color:var(--accent); box-shadow:0 0 0 2px var(--accent-soft); }
    .login-btn {
      width:100%; height:2.5rem; font-size:0.9rem; font-weight:500; font-family:inherit;
      background:var(--accent); color:#fff; border:none; border-radius:8px; cursor:pointer;
      transition: opacity 0.2s;
    }
    .login-btn:hover { opacity:0.88; }
  </style>
</head>
<body>
  <div class="login-card">
    <h1>${esc(callsign)} 日志管理</h1>
    <p>管理员登录</p>
    ${errHTML}
    <form id="loginForm" onsubmit="login(event)">
      <div class="field"><label>邮箱</label><input type="email" id="email" required></div>
      <div class="field"><label>密码</label><input type="password" id="password" required></div>
      <button type="submit" class="login-btn">登录</button>
    </form>
  </div>
  <script>
    async function login(e) {
      e.preventDefault();
      var resp = await fetch('/admin/login', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:document.getElementById('email').value,password:document.getElementById('password').value})
      });
      if (resp.ok) { window.location.href='/admin'; }
      else { var t = await resp.text(); document.body.innerHTML = t; }
    }
  </script>
</body>
</html>`;
}

function renderAdmin(callsign: string): string {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(callsign)} · 日志管理</title>
  <script>
    (function() {
      var saved = localStorage.getItem('theme');
      if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme:dark)').matches)) {
        document.documentElement.setAttribute('data-theme','dark');
      }
    })();
  </script>
  <style>${styles}
    .logout-btn {
      height:2rem; padding:0 0.8rem; font-size:0.78rem;
      background:var(--btn-bg); color:var(--text);
      border:1px solid var(--card-border); border-radius:8px; cursor:pointer;
      font-family:inherit; transition: background-color 0.25s;
    }
    .logout-btn:hover { background:var(--btn-bg-hover); }
    .card {
      background:var(--card-bg); border:1px solid var(--card-border);
      border-radius:var(--radius); padding:1.25rem; margin-bottom:1rem;
      box-shadow:var(--card-shadow);
      backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
      transition: background-color 0.4s, border-color 0.4s, box-shadow 0.4s;
    }
    .card-title {
      font-size:0.95rem; font-weight:600; color:var(--text-heading);
      margin-bottom:1rem; padding-bottom:0.6rem; border-bottom:1px solid var(--divider);
    }
    .form-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:0.75rem; }
    .form-field { display:flex; flex-direction:column; gap:0.2rem; min-width:0; }
    .form-field label { font-size:0.72rem; color:var(--muted); font-weight:500; letter-spacing:0.04em; }
    .form-field input, .form-field select {
      height:2.35rem; padding:0 0.65rem; font-size:0.82rem; width:100%;
      background:var(--input-bg); border:1px solid var(--input-border); border-radius:8px;
      color:var(--text); font-family:inherit;
      transition: border-color 0.25s, box-shadow 0.25s; outline:none;
    }
    .form-field input:focus, .form-field select:focus {
      border-color:var(--accent-border); box-shadow:0 0 0 2px var(--accent-soft);
    }
    .upload-zone { border:2px dashed var(--input-border); border-radius:var(--radius); padding:2rem; text-align:center; cursor:pointer; transition: border-color 0.25s, background-color 0.25s; }
    .upload-zone:hover { border-color:var(--accent-border); background:var(--accent-soft); }
    .upload-zone p { color:var(--muted); font-size:0.85rem; }
    .upload-zone p strong { color:var(--accent); }
    .toast { position:fixed; bottom:1.5rem; right:1.5rem; z-index:999; padding:0.75rem 1.25rem; border-radius:8px; font-size:0.85rem; font-weight:500; box-shadow:var(--card-shadow); animation:toast-in 0.3s ease; }
    .toast-ok { background:rgba(45,164,78,0.14); color:var(--success); border:1px solid var(--success); }
    .toast-err { background:var(--danger-soft); color:var(--danger); border:1px solid var(--danger); }
    @keyframes toast-in { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    .callsign-cell { font-weight:600; color:var(--text-heading); }
    .checkbox { width:1rem; height:1rem; accent-color:var(--accent); cursor:pointer; }
    @media (max-width:640px) { .form-grid { grid-template-columns:repeat(2,1fr); } }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-inner">
      <a href="/admin" class="logo">${esc(callsign)}</a>
      <nav class="nav">
        <a href="/">日志</a>
        <a href="/admin" class="active">管理</a>
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
        <button class="logout-btn" onclick="window.location.href='/admin/logout'">退出</button>
      </nav>
    </div>
  </header>
  <main class="main">
    <h1 class="page-title">日志管理</h1>
    <p class="page-subtitle">上传 ADIF · 手动添加 · 删除 · 设置</p>
    <div class="card">
      <div class="card-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span>📤 上传 ADIF</span>
        <a href="/admin/api/export" class="btn btn-sm" style="text-decoration:none;color:var(--text);">📥 导出</a>
      </div>
      <div class="upload-zone" id="uploadZone" onclick="document.getElementById('fileInput').click()">
        <p>拖拽 <strong>.adif</strong> 文件或<strong>点击选择</strong></p>
        <p style="font-size:0.72rem;margin-top:0.25rem;">自动去重 · 同 CALL+DATE+TIME+FREQ+MODE 不重复</p>
      </div>
      <input type="file" id="fileInput" accept=".adif,.adi" style="display:none" onchange="handleFile(this)">
      <div id="uploadResult" style="margin-top:0.75rem;font-size:0.82rem;color:var(--muted);display:none;"></div>
    </div>
    <div class="card">
      <div class="card-title">✏️ 手动添加 QSO</div>
      <div class="form-grid">
        <div class="form-field"><label>呼号 *</label><input type="text" id="addCall" style="text-transform:uppercase;" maxlength="32"></div>
        <div class="form-field"><label>日期 *</label><input type="date" id="addDate" value="2026-05-21"></div>
        <div class="form-field"><label>UTC 时间 *</label><input type="time" id="addTime" value="12:00"></div>
        <div class="form-field"><label>频率 (MHz) *</label><input type="text" id="addFreq" placeholder="14.270" maxlength="16"></div>
        <div class="form-field"><label>模式 *</label><select id="addMode"><option>SSB</option><option selected>FT8</option><option>CW</option><option>FT4</option></select></div>
        <div class="form-field"><label>RST 收</label><input type="text" id="addRstR" value="59" maxlength="8"></div>
        <div class="form-field"><label>RST 发</label><input type="text" id="addRstS" value="59" maxlength="8"></div>
        <div class="form-field"><label>对方 Grid</label><input type="text" id="addGrid" maxlength="10"></div>
        <div class="form-field"><label>备注</label><input type="text" id="addNote" maxlength="200"></div>
      </div>
      <button class="btn btn-primary" style="margin-top:1rem;" onclick="addQSO()">添加记录</button>
    </div>
    <div class="card">
      <div class="card-title">⚙️ 首页设置</div>
      <div class="form-grid">
        <div class="form-field"><label>最近活动</label><input type="text" id="lastAct" placeholder="WAPC 2026" maxlength="200"></div>
      </div>
      <button class="btn btn-primary" style="margin-top:0.75rem;" onclick="saveLastAct()">保存</button>
    </div>
    <div class="card">
      <div class="card-title">🏆 最佳 DX</div>
      <p style="font-size:0.8rem;color:var(--muted);margin-bottom:0.75rem;">手动设置统计卡片显示的最佳 DX。</p>
      <div class="form-grid">
        <div class="form-field"><label>呼号 *</label><input type="text" id="bestCall" style="text-transform:uppercase;" maxlength="32"></div>
        <div class="form-field"><label>描述</label><input type="text" id="bestDesc" maxlength="100"></div>
        <div class="form-field"><label>距离(km) *</label><input type="number" id="bestDist" min="1" max="40000"></div>
      </div>
      <button class="btn btn-success" style="margin-top:0.75rem;" onclick="saveBest()">保存</button>
    </div>
    <div class="card">
      <div class="card-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span>📋 QSO 列表</span>
        <button class="btn btn-sm btn-danger" onclick="batchDelete()">批量删除</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th style="width:32px;"><input type="checkbox" class="checkbox" id="selectAll" onclick="toggleAll()"></th><th>呼号</th><th>日期</th><th>UTC</th><th>频率</th><th>模式</th><th>操作</th></tr>
          </thead>
          <tbody id="qsoTable"><tr><td colspan="7" style="text-align:center;color:var(--muted);">加载中…</td></tr></tbody>
        </table>
      </div>
      <div id="qsoPager" style="display:flex;align-items:center;justify-content:space-between;padding:0.8rem 1rem;border-top:1px solid var(--divider);"></div>
    </div>
  </main>
  <script>
    function toast(m,e) {
      var t=document.createElement('div'); t.className='toast toast-'+(e?'err':'ok'); t.textContent=m;
      document.body.appendChild(t); setTimeout(function(){t.remove()},2500);
    }
    var uploadZone = document.getElementById('uploadZone');
    uploadZone.addEventListener('dragover',function(e){e.preventDefault();});
    uploadZone.addEventListener('drop',function(e){e.preventDefault();handleFile(e.dataTransfer.files[0]);});
    async function handleFile(f) {
      var file = f.files ? f.files[0] : f; if (!file) return;
      if (file.size > 5*1024*1024) { toast('文件不能超过 5MB', true); return; }
      var text = await file.text();
      var resp = await fetch('/admin/api/upload', { method:'POST', body:text });
      var data = await resp.json();
      document.getElementById('uploadResult').style.display='block';
      document.getElementById('uploadResult').textContent = '新增 '+data.inserted+' 条 · 跳过 '+data.skipped+' 条重复';
      toast('上传完成 · 新增 '+data.inserted+' 条'); goPage(1);
    }
    async function addQSO() {
      var call = document.getElementById('addCall').value.trim().toUpperCase();
      var date = document.getElementById('addDate').value;
      var time = document.getElementById('addTime').value;
      var freq = document.getElementById('addFreq').value.trim();
      if (!call || !date || !time || !freq) { toast('呼号、日期、时间、频率为必填项', true); return; }
      if (call.length > 32 || date.length > 10 || time.length > 5 || freq.length > 16) { toast('字段长度超出限制', true); return; }
      var body = {
        call, date, time, freq,
        mode: document.getElementById('addMode').value,
        rst_rx: document.getElementById('addRstR').value.trim() || '59',
        rst_tx: document.getElementById('addRstS').value.trim() || '59',
        grid: document.getElementById('addGrid').value.trim(),
        note: document.getElementById('addNote').value.trim()
      };
      var resp = await fetch('/admin/api/add', { method:'POST', body:JSON.stringify(body) });
      var data = await resp.json();
      if (data.ok) { toast('已添加 '+call); goPage(1); }
      else toast(data.error || '添加失败', true);
    }
    async function saveLastAct() {
      var text = document.getElementById('lastAct').value.trim();
      if (text.length > 200) { toast('文本不能超过 200 字符', true); return; }
      var resp = await fetch('/admin/api/lastact', { method:'POST', body:JSON.stringify({text:text}) });
      var data = await resp.json();
      toast(data.ok ? '已保存' : (data.error||'保存失败'), !data.ok);
    }
    async function saveBest() {
      var call = document.getElementById('bestCall').value.trim().toUpperCase();
      var dist = parseInt(document.getElementById('bestDist').value, 10);
      if (!call || !dist) { toast('呼号和距离必填', true); return; }
      if (dist <= 0 || dist > 40000) { toast('距离范围 1-40000 km', true); return; }
      var body = { call:call, description:document.getElementById('bestDesc').value.trim().slice(0, 100), distance_km:dist };
      var resp = await fetch('/admin/api/bestdx', { method:'POST', body:JSON.stringify(body) });
      var data = await resp.json();
      toast(data.ok ? '最佳 DX 已更新' : (data.error||'保存失败'), !data.ok);
    }
    async function deleteOne(id) {
      if (!confirm('删除此条 QSO？不可撤销。')) return;
      await fetch('/admin/api/delete', { method:'POST', body:JSON.stringify({ids:[id]}) });
      toast('已删除'); goPage(1);
    }
    async function batchDelete() {
      var checks = document.querySelectorAll('.select-row:checked');
      if (!checks.length) { toast('请勾选记录', true); return; }
      if (checks.length > 200) { toast('一次最多删除 200 条', true); return; }
      if (!confirm('删除选中的 '+checks.length+' 条？不可撤销。')) return;
      var ids = Array.from(checks).map(function(c){ return parseInt(c.value, 10); });
      await fetch('/admin/api/delete', { method:'POST', body:JSON.stringify({ids:ids}) });
      toast('已批量删除 '+ids.length+' 条'); goPage(1);
    }
    function toggleAll() {
      var checked = document.getElementById('selectAll').checked;
      document.querySelectorAll('.select-row').forEach(function(c){ c.checked = checked; });
    }
    var _page = 1, _totalPages = 1;
    function renderPager() {
      var p = document.getElementById('qsoPager');
      if (!p || _totalPages <= 1) { if (p) p.innerHTML = ''; return; }
      var prev = _page > 1 ? '<button class="page-btn" onclick="goPage('+(_page-1)+')">← 上一页</button>' : '<button class="page-btn" disabled>← 上一页</button>';
      var next = _page < _totalPages ? '<button class="page-btn" onclick="goPage('+(_page+1)+')">下一页 →</button>' : '<button class="page-btn" disabled>下一页 →</button>';
      p.innerHTML = prev + '<span class="page-info">第 '+_page+' / '+_totalPages+' 页</span>' + next;
    }
    function goPage(n) { _page = n; loadList(); }
    async function loadList() {
      var resp = await fetch('/admin/api/list?page='+_page);
      var data = await resp.json();
      _totalPages = Math.max(1, Math.ceil((data.total||0) / (data.pageSize||100)));
      document.getElementById('qsoTable').innerHTML = data.qsos.map(function(q){
        return '<tr><td><input type="checkbox" class="checkbox select-row" value="'+q.id+'"></td>'+
               '<td class="callsign-cell">'+esc(q.call)+'</td>'+
               '<td>'+esc(q.date)+'</td><td>'+esc(q.time)+'</td><td>'+esc(q.freq)+'</td><td>'+esc(q.mode)+'</td>'+
               '<td><button class="btn btn-sm btn-danger" onclick="deleteOne('+q.id+')">删除</button></td></tr>';
      }).join('');
      renderPager();
    }
    function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

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

    loadList();
  </script>
</body>
</html>`;
}

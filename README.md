# ham-weblog

业余无线电通联日志（QSO Logbook），部署在 Cloudflare Workers + D1。

## 功能

- 通联日志展示 — 公开页面，显示全部 QSO 记录，支持按呼号/模式/时间筛选和分页
- 最佳 DX 统计 — 根据 Maidenhead Grid 自动计算最远距离，也支持手动设定
- ADIF 导入/导出 — 拖拽或点击上传 `.adif` 文件（自动去重），支持一键导出
- 手动添加 QSO — 管理后台逐条录入
- 批量删除 — 勾选后按 ID 删除
- 首页设置 — 自定义"最近活动"文本
- 主题切换 — 浅色/深色主题，View Transition API 平滑过渡

## 技术栈

| 层 | 技术 |
| --- | --- |
| 运行环境 | Cloudflare Workers |
| 数据库 | Cloudflare D1 (SQLite) |
| Web 框架 | [Hono](https://hono.dev) |
| 认证 | HMAC-SHA256 Session Cookie |
| 密码存储 | PBKDF2 + SHA-256（兼容旧 SHA-256 格式） |
| CSRF 防护 | Origin 头校验 |
| 部署 | GitHub Actions + Wrangler |
| 语言 | TypeScript |

## 目录结构

```
src/
├── index.ts          # Hono 入口，路由注册，CSRF 中间件
├── styles.ts         # 全局样式（CSS 变量 + 组件）
├── types.ts          # 类型定义
├── lib/
│   ├── auth.ts       # Session 认证 + PBKDF2 密码验证
│   ├── db.ts         # D1 数据库操作（schema、CRUD、速率限制）
│   ├── adif.ts       # ADIF 解析与去重
│   ├── grid.ts       # Maidenhead 网格距离计算
│   └── html.ts       # HTML 转义工具
└── routes/
    ├── frontend.ts   # 公开日志页面
    ├── admin.ts      # 管理后台（登录 / 面板 / 速率限制）
    └── api.ts        # REST API（输入校验、上传限制）
```

## 安全特性

| 特性 | 实现 |
| --- | --- |
| 密码哈希 | PBKDF2-SHA256（600,000 迭代 + 随机盐），向下兼容无盐 SHA-256 |
| 登录保护 | 15 分钟内同 IP 失败 ≥5 次返回 429 |
| CSRF 防护 | 管理端 POST 请求校验 Origin 头 |
| XSS 防护 | 所有用户输入 HTML 实体转义 |
| 输入校验 | 字段长度限制、模式白名单、距离范围、批量操作上限 |
| 上传限制 | 最大 5MB，单次最多 1000 条 QSO，分批插入 |
| 安全头 | `X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、`Referrer-Policy` |

## 环境变量

在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中添加以下 12 个 Secrets：

| Secret | 说明 |
| --- | --- |
| `CF_API_TOKEN` | Cloudflare API 令牌 |
| `CF_ACCOUNT_ID` | Cloudflare 账户 ID |
| `WORKER_NAME` | Worker 名称 |
| `D1_DATABASE_ID` | D1 数据库 ID |
| `DOMAIN` | 部署域名（如 `log.example.com`） |
| `CALLSIGN` | 你的呼号 |
| `BLOG_URL` | 博客链接（必须以 `http://` 或 `https://` 开头） |
| `QRZ_URL` | QRZ 个人主页（必须以 `http://` 或 `https://` 开头） |
| `MY_GRIDS` | 你的 Maidenhead Grid，逗号分隔（如 `OM44,FJ25`） |
| `ADMIN_EMAIL` | 管理员登录邮箱 |
| `ADMIN_PASSWORD_HASH` | 密码哈希（见下方生成方法） |
| `SESSION_SECRET` | Session 签名密钥（随机字符串，≥32 字符） |

### 生成 ADMIN_PASSWORD_HASH

支持两种格式：

**推荐 — PBKDF2 格式**（`盐Hex:迭代次数:哈希Hex`）：

```bash
# 生成方式（Node.js）：
node -e "
const {randomBytes,pbkdf2Sync}=require('crypto');
const salt=randomBytes(16).toString('hex');
const hash=pbkdf2Sync('你的密码',Buffer.from(salt,'hex'),600000,32,'sha256').toString('hex');
console.log(salt+':600000:'+hash);
"
```

**旧格式 — 无盐 SHA-256 十六进制**（向后兼容，不推荐）：

```bash
echo -n '你的密码' | sha256sum | cut -d' ' -f1
```

## 本地开发

```bash
git clone git@github.com:BH2XOL/ham-weblog.git
cd ham-weblog
npm install
npx wrangler dev
```

## 部署

```bash
npm run deploy
```

推送 `main` 分支自动触发 GitHub Actions 部署。

## API

### 公开

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/` | 公开日志页 |
| `GET` | `/api/qsos?call=&mode=&date=&page=` | JSON 搜索 |

### 管理（需 Session）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/admin/api/upload` | 上传 ADIF 文本（body 为原始 ADIF 字符串） |
| `POST` | `/admin/api/add` | 手动添加 QSO（JSON body） |
| `POST` | `/admin/api/delete` | 批量删除（`{"ids":[1,2,3]}`） |
| `GET` | `/admin/api/list?page=` | 获取全部 QSO（每页 100 条） |
| `GET` | `/admin/api/export` | 导出全部 QSO 为 ADIF 文本 |
| `POST` | `/admin/api/bestdx` | 设置最佳 DX（`{"call":"","description":"","distance_km":123}`, 1-40000km） |
| `POST` | `/admin/api/lastact` | 设置最近活动（`{"text":"WAPC 2026"}`，≤200 字符） |

### 输入约束

| 字段 | 最大长度 | 备注 |
| --- | --- | --- |
| `call` | 32 | 自动转大写 |
| `date` | 10 | |
| `time` | 5 | |
| `freq` | 16 | |
| `mode` | 8 | 仅允许 SSB/CW/FT8/FT4/AM/FM/RTTY/PSK31 |
| `rst_rx/rst_tx` | 8 | |
| `grid` | 10 | |
| `note` | 200 | |
| `distance_km` | — | 1-40000 整数 |
| `ids[]` | — | 单次最多 200 个 |

## 授权

MIT

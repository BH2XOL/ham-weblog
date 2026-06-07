import type { QSO, BestDX } from "../types";

function rowToQSO(row: Record<string, unknown>): QSO {
  return {
    id: row.id as number,
    call: row.call as string,
    dxcc: row.dxcc as string,
    date: row.date as string,
    time: row.time as string,
    freq: row.freq as string,
    mode: row.mode as string,
    rst_rx: row.rst_rx as string,
    rst_tx: row.rst_tx as string,
    grid: row.grid as string,
    lotw: !!row.lotw,
    note: (row.note as string) || "",
    created_at: row.created_at as string,
  };
}

export function initSchema(db: D1Database) {
  return db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS qsos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        call TEXT NOT NULL,
        dxcc TEXT DEFAULT '',
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        freq TEXT DEFAULT '',
        mode TEXT NOT NULL,
        rst_rx TEXT DEFAULT '59',
        rst_tx TEXT DEFAULT '59',
        grid TEXT DEFAULT '',
        lotw INTEGER DEFAULT 0,
        note TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS best_dx (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        call TEXT NOT NULL,
        description TEXT DEFAULT '',
        distance_km INTEGER NOT NULL DEFAULT 0
      )
    `),
    db.prepare(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_qso_unique
      ON qsos(call, date, time, freq, mode)
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS site_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        last_activity TEXT DEFAULT ''
      )
    `),
  ]);
}

export function countQsos(db: D1Database, filters?: Record<string, string | undefined>) {
  const { sql, params } = buildFilter("SELECT COUNT(*) as cnt FROM qsos", filters);
  return db.prepare(sql).bind(...params).first<{ cnt: number }>();
}
export function queryQsos(db: D1Database, filters?: Record<string, string | undefined>, limit?: number, offset?: number) {
  const { sql, params } = buildFilter("SELECT * FROM qsos", filters);
  let full = `${sql} ORDER BY date DESC, time DESC`;
  if (limit != null) full += ` LIMIT ?`;
  if (offset != null) full += ` OFFSET ?`;
  const allParams = limit != null ? (offset != null ? [...params, limit, offset] : [...params, limit]) : params;
  return db.prepare(full).bind(...allParams).all<Record<string, unknown>>().then(r => r.results.map(rowToQSO));
}

export function countDXCC(db: D1Database) {
  return db.prepare("SELECT COUNT(DISTINCT dxcc) as cnt FROM qsos WHERE dxcc != ''").first<{ cnt: number }>();
}

export function insertQSO(db: D1Database, qso: Omit<QSO, "id" | "created_at">) {
  return db.prepare(`
    INSERT OR IGNORE INTO qsos (call, dxcc, date, time, freq, mode, rst_rx, rst_tx, grid, lotw, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(qso.call, qso.dxcc, qso.date, qso.time, qso.freq, qso.mode, qso.rst_rx, qso.rst_tx, qso.grid, qso.lotw ? 1 : 0, qso.note).run();
}

export function batchInsertQSOs(db: D1Database, qsos: Omit<QSO, "id" | "created_at">[]) {
  if (qsos.length === 0) return Promise.resolve([]);
  const stmts = qsos.map(q =>
    db.prepare(`
      INSERT OR IGNORE INTO qsos (call, dxcc, date, time, freq, mode, rst_rx, rst_tx, grid, lotw, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(q.call, q.dxcc, q.date, q.time, q.freq, q.mode, q.rst_rx, q.rst_tx, q.grid, q.lotw ? 1 : 0, q.note)
  );
  return db.batch(stmts);
}

export function deleteQSOs(db: D1Database, ids: number[]) {
  const placeholders = ids.map(() => "?").join(",");
  return db.prepare(`DELETE FROM qsos WHERE id IN (${placeholders})`).bind(...ids).run();
}

export function getBestDX(db: D1Database) {
  return db.prepare("SELECT * FROM best_dx WHERE id = 1").first<BestDX>();
}

export function setBestDX(db: D1Database, dx: BestDX) {
  return db.prepare(`
    INSERT INTO best_dx (id, call, description, distance_km)
    VALUES (1, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET call = excluded.call, description = excluded.description, distance_km = excluded.distance_km
  `).bind(dx.call, dx.description, dx.distance_km).run();
}

export function getLastActivity(db: D1Database) {
  return db.prepare("SELECT last_activity FROM site_config WHERE id = 1").first<{ last_activity: string }>();
}

export function setLastActivity(db: D1Database, text: string) {
  return db.prepare(`
    INSERT INTO site_config (id, last_activity) VALUES (1, ?)
    ON CONFLICT(id) DO UPDATE SET last_activity = excluded.last_activity
  `).bind(text).run();
}

export async function exportAllADIF(db: D1Database, callsign: string): Promise<string> {
  const all = await db.prepare("SELECT * FROM qsos ORDER BY date, time").all<Record<string, unknown>>();
  const lines: string[] = [
    "<ADIF_VER:5>3.1.4",
    `<PROGRAMID:${`${callsign}-LOG`.length}>${callsign}-LOG`,
    "<EOH>",
  ];
  for (const row of all.results) {
    const q = rowToQSO(row);
    lines.push(
      `<CALL:${q.call.length}>${q.call}` +
      `<FREQ:${q.freq.length}>${q.freq}` +
      `<MODE:${q.mode.length}>${q.mode}` +
      `<QSO_DATE:8>${q.date.replace(/-/g, "")}` +
      `<TIME_ON:${q.time.replace(/:/g, "").length}>${q.time.replace(/:/g, "")}` +
      `<RST_RCVD:${q.rst_rx.length}>${q.rst_rx}` +
      `<RST_SENT:${q.rst_tx.length}>${q.rst_tx}` +
      (q.grid ? `<GRIDSQUARE:${q.grid.length}>${q.grid}` : "") +
      (q.dxcc ? `<COUNTRY:${q.dxcc.length}>${q.dxcc}` : "") +
      (q.note ? `<COMMENT:${q.note.length}>${q.note}` : "") +
      `<EOR>`
    );
  }
  return lines.join("\n") + "\n";
}

function buildFilter(baseSQL: string, filters?: Record<string, string | undefined>) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters?.call) { clauses.push("call LIKE ?"); params.push(`%${filters.call}%`); }
  if (filters?.mode) { clauses.push("mode = ?"); params.push(filters.mode); }
  if (filters?.date) { clauses.push("date LIKE ?"); params.push(`${filters.date}%`); }
  const sql = clauses.length > 0 ? `${baseSQL} WHERE ${clauses.join(" AND ")}` : baseSQL;
  return { sql, params };
}
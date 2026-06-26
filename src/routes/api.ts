import type { Bindings } from "../types";
import { queryQsos, insertQSO, batchInsertQSOs, deleteQSOs, setBestDX, setLastActivity, exportAllADIF, countQsos } from "../lib/db";
import { parseADIF, mergeUnique } from "../lib/adif";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_DELETE_IDS = 200;
const MAX_FIELD_LEN: Record<string, number> = {
  call: 10, date: 10, time: 5, freq: 16, mode: 8,
  rst_rx: 8, rst_tx: 8, grid: 10, note: 200,
};
const ALLOWED_MODES = new Set(["SSB", "CW", "FT8", "FT4", "AM", "FM", "RTTY", "PSK31"]);

export async function apiSearchHandler(request: Request, env: Bindings): Promise<Response> {
  const url = new URL(request.url);
  const call = url.searchParams.get("call") || undefined;
  const mode = url.searchParams.get("mode") || undefined;
  const date = url.searchParams.get("date") || undefined;
  const PAGE_SIZE = 50;
  const raw = parseInt(url.searchParams.get("page") || "1", 10);
  const page = Math.max(1, Number.isNaN(raw) ? 1 : raw);
  const filters = { call, mode, date };
  const [total, qsos] = await Promise.all([
    countQsos(env.DB, filters),
    queryQsos(env.DB, filters, PAGE_SIZE, (page - 1) * PAGE_SIZE),
  ]);
  return Response.json({ qsos, total: total?.cnt ?? 0, page, pageSize: PAGE_SIZE });
}

export async function apiUploadHandler(request: Request, env: Bindings): Promise<Response> {
  const contentLength = request.headers.get("Content-Length");
  if (contentLength && parseInt(contentLength, 10) > MAX_UPLOAD_BYTES) {
    return Response.json({ inserted: 0, skipped: 0, error: "文件超过最大限制 (5MB)" }, { status: 413 });
  }

  const text = await request.text();
  if (text.length > MAX_UPLOAD_BYTES) {
    return Response.json({ inserted: 0, skipped: 0, error: "文件超过最大限制 (5MB)" }, { status: 413 });
  }

  const incoming = parseADIF(text);
  if (incoming.length === 0) {
    return Response.json({ inserted: 0, skipped: 0, error: "No valid QSO in ADIF" });
  }

  if (incoming.length > 1000) {
    return Response.json({ inserted: 0, skipped: 0, error: "一次最多处理 1000 条 QSO" }, { status: 413 });
  }

  const existing = await queryQsos(env.DB);
  const unique = mergeUnique(existing, incoming);

  const toInsert = unique.map(q => ({
    call: q.call.slice(0, MAX_FIELD_LEN.call),
    dxcc: q.dxcc.slice(0, 100),
    date: q.date.slice(0, MAX_FIELD_LEN.date),
    time: q.time.slice(0, MAX_FIELD_LEN.time),
    freq: q.freq.slice(0, MAX_FIELD_LEN.freq),
    mode: q.mode.slice(0, MAX_FIELD_LEN.mode),
    rst_rx: (q.rst_rx || "59").slice(0, MAX_FIELD_LEN.rst_rx),
    rst_tx: (q.rst_tx || "59").slice(0, MAX_FIELD_LEN.rst_tx),
    grid: q.grid.slice(0, MAX_FIELD_LEN.grid),
    lotw: q.lotw,
    note: q.note.slice(0, MAX_FIELD_LEN.note),
  }));

  const chunks = chunkArray(toInsert, 100);
  for (const chunk of chunks) {
    await batchInsertQSOs(env.DB, chunk);
  }

  return Response.json({ inserted: unique.length, skipped: incoming.length - unique.length });
}

export async function apiAddHandler(request: Request, env: Bindings): Promise<Response> {
  const body = (await request.json()) as Record<string, string>;
  const call = (body.call || "").trim().toUpperCase().slice(0, MAX_FIELD_LEN.call);
  const date = (body.date || "").trim().slice(0, MAX_FIELD_LEN.date);
  const time = (body.time || "").trim().slice(0, MAX_FIELD_LEN.time);
  const freq = (body.freq || "").trim().slice(0, MAX_FIELD_LEN.freq);
  const mode = (body.mode || "").trim().toUpperCase().slice(0, MAX_FIELD_LEN.mode);

  if (!call || !date || !time || !freq || !mode) {
    return Response.json({ ok: false, error: "必填字段缺失" }, { status: 400 });
  }

  if (!ALLOWED_MODES.has(mode)) {
    return Response.json({ ok: false, error: "不支持的通信模式" }, { status: 400 });
  }

  await insertQSO(env.DB, {
    call,
    dxcc: (body.dxcc || "").slice(0, 100),
    date,
    time,
    freq,
    mode,
    rst_rx: (body.rst_rx || "59").slice(0, MAX_FIELD_LEN.rst_rx),
    rst_tx: (body.rst_tx || "59").slice(0, MAX_FIELD_LEN.rst_tx),
    grid: (body.grid || "").toUpperCase().slice(0, MAX_FIELD_LEN.grid),
    lotw: false,
    note: (body.note || "").slice(0, MAX_FIELD_LEN.note),
  });

  return Response.json({ ok: true });
}

export async function apiDeleteHandler(request: Request, env: Bindings): Promise<Response> {
  const body = (await request.json()) as { ids: number[] };
  if (!body.ids?.length) {
    return Response.json({ ok: false, error: "未提供 ID" }, { status: 400 });
  }
  const ids = body.ids.slice(0, MAX_DELETE_IDS).filter(id => Number.isFinite(id) && id > 0);
  if (ids.length === 0) {
    return Response.json({ ok: false, error: "无效的 ID" }, { status: 400 });
  }
  await deleteQSOs(env.DB, ids);
  return Response.json({ ok: true });
}

export async function apiListHandler(request: Request, env: Bindings): Promise<Response> {
  const url = new URL(request.url);
  const PAGE_SIZE = 100;
  const raw = parseInt(url.searchParams.get("page") || "1", 10);
  const page = Math.max(1, Number.isNaN(raw) ? 1 : raw);
  const [total, qsos] = await Promise.all([
    countQsos(env.DB),
    queryQsos(env.DB, undefined, PAGE_SIZE, (page - 1) * PAGE_SIZE),
  ]);
  return Response.json({ qsos, total: total?.cnt ?? 0, page, pageSize: PAGE_SIZE });
}

export async function apiBestDXHandler(request: Request, env: Bindings): Promise<Response> {
  const body = (await request.json()) as { call: string; description: string; distance_km: number };
  if (!body.call || body.distance_km == null) {
    return Response.json({ ok: false, error: "缺少参数" }, { status: 400 });
  }
  const dist = Number(body.distance_km);
  if (!Number.isFinite(dist) || dist < 1 || dist > 40000) {
    return Response.json({ ok: false, error: "距离范围为 1-40000 km" }, { status: 400 });
  }
  await setBestDX(env.DB, {
    call: body.call.toUpperCase().slice(0, MAX_FIELD_LEN.call),
    description: (body.description || "").slice(0, 100),
    distance_km: Math.round(dist),
  });
  return Response.json({ ok: true });
}

export async function apiLastActHandler(request: Request, env: Bindings): Promise<Response> {
  const body = (await request.json()) as { text: string };
  const text = (body.text || "").slice(0, 200);
  await setLastActivity(env.DB, text);
  return Response.json({ ok: true });
}

export async function apiExportHandler(_request: Request, env: Bindings): Promise<Response> {
  const adif = await exportAllADIF(env.DB, env.CALLSIGN);
  return new Response(adif, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${env.CALLSIGN}_logbook.adif"`,
    },
  });
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

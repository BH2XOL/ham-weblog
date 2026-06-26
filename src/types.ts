export interface QSO {
  id: number;
  call: string;
  dxcc: string;
  date: string;
  time: string;
  freq: string;
  mode: string;
  rst_rx: string;
  rst_tx: string;
  grid: string;
  lotw: boolean;
  note: string;
  created_at: string;
}

export interface BestDX {
  call: string;
  description: string;
  distance_km: number;
}

export interface EnvVars {
  CALLSIGN: string;
  BLOG_URL: string;
  QRZ_URL: string;
  MY_GRIDS: string;
}

export type Bindings = {
  DB: D1Database;
  DOMAIN: string;
} & EnvVars;

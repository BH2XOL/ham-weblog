import { Hono } from "hono";
import type { Bindings } from "./types";
import { frontendHandler } from "./routes/frontend";
import { adminHandler } from "./routes/admin";
import {
  apiSearchHandler, apiUploadHandler, apiAddHandler,
  apiDeleteHandler, apiListHandler, apiBestDXHandler, apiLastActHandler,
  apiExportHandler,
} from "./routes/api";

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => frontendHandler(c.req.raw, c.env));
app.get("/api/qsos", (c) => apiSearchHandler(c.req.raw, c.env));

app.get("/admin", (c) => adminHandler(c.req.raw, c.env));
app.post("/admin/api/upload", (c) => apiUploadHandler(c.req.raw, c.env));
app.post("/admin/api/add", (c) => apiAddHandler(c.req.raw, c.env));
app.post("/admin/api/delete", (c) => apiDeleteHandler(c.req.raw, c.env));
app.get("/admin/api/list", (c) => apiListHandler(c.req.raw, c.env));
app.post("/admin/api/bestdx", (c) => apiBestDXHandler(c.req.raw, c.env));
app.post("/admin/api/lastact", (c) => apiLastActHandler(c.req.raw, c.env));
app.get("/admin/api/export", (c) => apiExportHandler(c.req.raw, c.env));

export default app;

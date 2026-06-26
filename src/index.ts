import { Hono } from "hono";
import type { Bindings } from "./types";
import { verifySession } from "./lib/auth";
import { frontendHandler } from "./routes/frontend";
import { adminHandler, logoutHandler } from "./routes/admin";
import {
  apiSearchHandler, apiUploadHandler, apiAddHandler,
  apiDeleteHandler, apiListHandler, apiBestDXHandler, apiLastActHandler,
  apiExportHandler,
} from "./routes/api";

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => frontendHandler(c.req.raw, c.env));
app.get("/api/qsos", (c) => apiSearchHandler(c.req.raw, c.env));

app.get("/admin", (c) => adminHandler(c.req.raw, c.env));
app.post("/admin/login", (c) => adminHandler(c.req.raw, c.env));
app.get("/admin/logout", () => logoutHandler());

const admin = new Hono<{ Bindings: Bindings }>();
admin.use("*", async (c, next) => {
  const login = await verifySession(c.req.raw, c.env);
  if (!login) return c.json({ error: "Unauthorized" }, 401);

  if (c.req.method !== "GET" && c.req.method !== "HEAD" && c.req.method !== "OPTIONS") {
    if (c.req.header("X-Requested-With") !== "XMLHttpRequest") {
      return c.json({ error: "Forbidden" }, 403);
    }
  }

  await next();
});
admin.post("/admin/api/upload", (c) => apiUploadHandler(c.req.raw, c.env));
admin.post("/admin/api/add", (c) => apiAddHandler(c.req.raw, c.env));
admin.post("/admin/api/delete", (c) => apiDeleteHandler(c.req.raw, c.env));
admin.get("/admin/api/list", (c) => apiListHandler(c.req.raw, c.env));
admin.post("/admin/api/bestdx", (c) => apiBestDXHandler(c.req.raw, c.env));
admin.post("/admin/api/lastact", (c) => apiLastActHandler(c.req.raw, c.env));
admin.get("/admin/api/export", (c) => apiExportHandler(c.req.raw, c.env));

app.route("/", admin);
export default app;

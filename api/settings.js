// /api/settings — сайтын цэс (nav) болон өнгө.
// GET: хэн ч уншина. PUT: зөвхөн админ (x-admin-password).
const crypto = require("crypto");
const { redis, hasDb } = require("./_db");

const HEX = /^#[0-9a-f]{6}$/i;
const THEME_KEYS = ["bg", "paper", "text", "mark"];

function ok(req) {
  const pass = process.env.ADMIN_PASSWORD || "";
  const got = String(req.headers["x-admin-password"] || "");
  if (!pass || got.length !== pass.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(pass));
}

function clean(d) {
  const nav = (Array.isArray(d.nav) ? d.nav : []).slice(0, 12).map((x) => ({
    l: String((x && x.l) || "").trim().replace(/\s+/g, " ").slice(0, 24),
    kw: String((x && x.kw) || "").trim().slice(0, 300),
  })).filter((x) => x.l);
  const theme = {};
  for (const k of THEME_KEYS) if (d.theme && HEX.test(String(d.theme[k] || ""))) theme[k] = d.theme[k].toLowerCase();
  return { nav, theme };
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=60");
    if (!hasDb()) return res.status(200).send("{}");
    try { return res.status(200).send((await redis("GET", "settings")) || "{}"); }
    catch { return res.status(200).send("{}"); }
  }
  res.setHeader("Cache-Control", "no-store");
  if (!hasDb()) return res.status(500).json({ error: "Vercel дээр Upstash Redis холбогдоогүй байна" });
  if (!ok(req)) return res.status(401).json({ error: "Нууц үг буруу" });
  if (req.method !== "PUT") return res.status(405).json({ error: "Method not allowed" });
  const s = clean(req.body || {});
  if (!s.nav.length) return res.status(400).json({ error: "Цэсэнд дор хаяж нэг хэсэг байх ёстой" });
  await redis("SET", "settings", JSON.stringify(s));
  res.status(200).json(s);
};

// /api/views — "Их уншсан" мэдээ.
// POST ?id=...  → тухайн мэдээний уншсан тоог 1-ээр нэмнэ (7 хоногоор хадгална)
// GET           → сүүлийн 7 хоногт хамгийн их уншсан 10 мэдээний id
const { redis, hasDb } = require("./_db");

// Өдөр бүр тусдаа тоолж, сүүлийн 7 хоногийнхыг нийлүүлнэ
const dayKey = (d) => "views:" + new Date(d).toISOString().slice(0, 10);

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (!hasDb()) return res.status(200).send("[]");
  try {
    if (req.method === "POST") {
      const id = String((req.query && req.query.id) || "").replace(/[^\w-]/g, "").slice(0, 80);
      if (!id) return res.status(400).send("[]");
      const k = dayKey(Date.now());
      await redis("ZINCRBY", k, 1, id);
      await redis("EXPIRE", k, 8 * 86400);
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send('{"ok":true}');
    }
    const keys = [];
    for (let i = 0; i < 7; i++) keys.push(dayKey(Date.now() - i * 86400e3));
    const sum = new Map();
    for (const k of keys) {
      const flat = (await redis("ZREVRANGE", k, 0, 49, "WITHSCORES")) || [];
      for (let i = 0; i < flat.length; i += 2) sum.set(flat[i], (sum.get(flat[i]) || 0) + Number(flat[i + 1]));
    }
    const top = [...sum].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, n]) => ({ id, n }));
    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
    res.status(200).send(JSON.stringify(top));
  } catch (e) {
    res.status(200).send("[]");
  }
};

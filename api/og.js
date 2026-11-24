// /a/<id> → энэ функц. Facebook, Messenger-т хуваалцахад мэдээний гарчиг, тайлбар, зураг гарч ирэхийн тулд
// og: шошготой жижиг хуудас буцааж, уншигчийг шууд мэдээ рүү нь шилжүүлнэ.
const { redis, hasDb } = require("./_db");

const SLUG = { "Улс төр": "uls-tur", "Эдийн засаг": "ediin-zasag", "Нийгэм": "niigem", "Спорт": "sport",
  "Технологи": "tehnologi", "Эрүүл мэнд": "eruul-mend", "Байгаль орчин": "baigal" };
const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const clean = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&hellip;/g, "…").replace(/\s*\[…\]\s*$/, "…").replace(/\s+/g, " ").trim();
const clip = (s, k) => (s.length > k ? s.slice(0, k).replace(/\s+\S*$/, "") + "…" : s);

module.exports = async (req, res) => {
  const site = "https://" + (req.headers["x-forwarded-host"] || req.headers.host || "mandate.mn");
  const id = String((req.query && req.query.id) || "").replace(/[^\w-]/g, "").slice(0, 80);
  let t = "mandate.mn", d = "Монголын хамгийн сүүлийн мэдээ.", img = site + "/og/default.jpg";
  try {
    if (/^newsmn-\d+$/.test(id)) {
      const r = await fetch("https://news.mn/wp-json/wp/v2/posts/" + id.slice(7));
      if (r.ok) { const p = await r.json(); t = clean(p.title && p.title.rendered) || t; d = clip(clean(p.excerpt && p.excerpt.rendered), 200) || d;
        const c = (p.category || []).map((x) => x.name).find((n) => SLUG[n]); if (c) img = site + "/og/" + SLUG[c] + ".jpg"; }
    } else if (id.startsWith("ikon-")) {
      const xml = await (await fetch("https://ikon.mn/rss")).text();
      for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
        const get = (tag) => ((new RegExp("<" + tag + ">([\\s\\S]*?)</" + tag + ">").exec(m[1]) || [])[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "");
        if (clean(get("link")).split("/").pop() === id.slice(5)) { t = clean(get("title")); d = clip(clean(get("description")), 200); break; }
      }
    } else if (hasDb() && id) {
      const raw = await redis("HGET", "posts", id);
      if (raw) { const p = JSON.parse(raw); t = p.t || t; d = clip((p.b || [])[0] || "", 200) || d;
        img = p.img ? site + p.img : site + "/og/" + (SLUG[p.c] || "niigem") + ".jpg"; }
    }
  } catch {}
  const to = "/#m-" + id;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=86400");
  res.status(200).send(`<!DOCTYPE html><html lang="mn"><head><meta charset="utf-8"><title>${esc(t)} — mandate.mn</title>
<meta name="description" content="${esc(d)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="mandate.mn">
<meta property="og:title" content="${esc(t)}"><meta property="og:description" content="${esc(d)}">
<meta property="og:image" content="${esc(img)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:url" content="${esc(site + "/a/" + id)}"><meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${esc(to)}"></head>
<body><script>location.replace(${JSON.stringify(to)})</script><a href="${esc(to)}">${esc(t)}</a></body></html>`);
};

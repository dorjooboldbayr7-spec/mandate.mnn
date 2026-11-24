// /api/market — ханш болон Улаанбаатарын цаг агаар (30 минут кэшлэнэ)
// Ханш: open.er-api.com (үнэгүй, түлхүүргүй). Цаг агаар: open-meteo.com (үнэгүй, түлхүүргүй).
const WX = {0:"Цэлмэг",1:"Цэлмэг",2:"Багавтар үүлтэй",3:"Үүлэрхэг",45:"Манан",48:"Манан",51:"Шиврээ",53:"Шиврээ",55:"Шиврээ",
  61:"Бороо",63:"Бороо",65:"Их бороо",71:"Цас",73:"Цас",75:"Их цас",77:"Цас",80:"Аадар",81:"Аадар",82:"Аадар",85:"Цас",86:"Их цас",95:"Аянга"};

module.exports = async (req, res) => {
  const out = {};
  const [fx, wx] = await Promise.allSettled([
    fetch("https://open.er-api.com/v6/latest/USD").then((r) => r.json()),
    fetch("https://api.open-meteo.com/v1/forecast?latitude=47.92&longitude=106.92&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FUlaanbaatar&forecast_days=1").then((r) => r.json()),
  ]);
  if (fx.status === "fulfilled" && fx.value && fx.value.rates && fx.value.rates.MNT) {
    const R = fx.value.rates, mnt = R.MNT;
    out.fx = ["USD", "CNY", "RUB", "EUR", "KRW"].filter((c) => R[c]).map((c) => [c, mnt / R[c]]);
  }
  if (wx.status === "fulfilled" && wx.value && wx.value.current) {
    const c = wx.value.current, d = wx.value.daily || {};
    out.wx = { t: Math.round(c.temperature_2m), d: WX[c.weather_code] || "",
      hi: d.temperature_2m_max ? Math.round(d.temperature_2m_max[0]) : null, lo: d.temperature_2m_min ? Math.round(d.temperature_2m_min[0]) : null };
  }
  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(200).send(JSON.stringify(out));
};

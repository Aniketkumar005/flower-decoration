export default function handler(req, res) {
  const q = req.query;
  const name = q.name ? String(q.name).replace(/[^\w.\-]/g, "") : "";
  const img = name ? `/assets/${name}` : q.img || "";
  const titles = {
    wedding: "Wedding Decoration",
    engagement: "Engagement",
    birthday: "Birthday Party",
    baby: "Baby Shower",
    haldi: "Haldi & Mehndi",
    anniversary: "Anniversary",
    corporate: "Corporate Events",
    special: "Special Occasions",
    festival: "Festival",
  };
  const title =
    q.title || titles[name.split("_")[0].toLowerCase()] || "Decor Enquiry";
  const priceMatch = name.match(/_(\d+)-/);
  const price = q.price || (priceMatch ? priceMatch[1] : "");
  const origin = `https://${req.headers.host}`;

  let imageUrl;
  try {
    const u = new URL(img, origin);
    if (u.origin !== origin) throw new Error("bad origin");
    imageUrl = u.href;
  } catch {
    res.status(400).send("Invalid image");
    return;
  }

  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const priceNum = Number(price);
  const desc = priceNum
    ? `Price: ₹${priceNum.toLocaleString("en-IN")} · Shri Shakti Decor`
    : "Shri Shakti Decor · Flowers, Decor & Special Moments";
const pageTitle = `${title} | Shri Shakti Decor`;
const ogImage = `https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}&w=800&h=420&fit=cover&output=jpg&q=70`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600");
  res.status(200).send(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(pageTitle)}</title>
<meta property="og:type" content="website" />
<meta property="og:title" content="${esc(pageTitle)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:image" content="${esc(ogImage)}" />
<meta property="og:image:secure_url" content="${esc(ogImage)}" />
<meta property="og:image:type" content="image/jpeg" />
<meta property="og:image:width" content="800" />
<meta property="og:image:height" content="420" />
<meta property="og:url" content="${esc(origin + req.url)}" />
<meta name="twitter:card" content="summary_large_image" />
<script>location.replace("/gallery");</script>
</head>
<body></body>
</html>`);
}
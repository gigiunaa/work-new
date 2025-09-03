import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "5mb" })); // საკმარისია დიდი HTML-სთვისაც

// --- Utility funcs ---
function getUrlsFromRows(rows, urlFieldName = "URL", idxFieldName = "") {
  const list = Array.isArray(rows) ? rows.slice() : [];
  const urlKey = (urlFieldName || "URL").trim();
  const idxKey = (idxFieldName || "").trim();

  if (idxKey) {
    list.sort((a, b) => {
      const ai = Number(String(a?.[idxKey] ?? "").replace(",", "."));
      const bi = Number(String(b?.[idxKey] ?? "").replace(",", "."));
      if (isNaN(ai) && isNaN(bi)) return 0;
      if (isNaN(ai)) return 1;
      if (isNaN(bi)) return -1;
      return ai - bi;
    });
  }

  const urls = [];
  for (const row of list) {
    let url = row?.[urlKey];
    if (url != null) {
      url = String(url).trim();
      if (url) urls.push(url);
    }
  }
  return urls;
}

function replaceOneIndex(html, index, url) {
  const exts = "(png|jpg|jpeg|gif|webp)";
  const pattern = new RegExp(
    `(\\b(?:src|data-src)\\s*=\\s*)(["'])images\\/image${index}\\.${exts}\\2`,
    "i"
  );

  if (pattern.test(html)) {
    html = html.replace(pattern, (match, attr, quote) => `${attr}${quote}${url}${quote}`);
    return { html, replaced: true };
  }

  const fallbackPattern = new RegExp(
    `(\\bsrc\\s*=\\s*)(["'])images\\/image${index}\\.${exts}\\2`,
    "i"
  );
  if (fallbackPattern.test(html)) {
    html = html.replace(fallbackPattern, (match, attr, quote) => `${attr}${quote}${url}${quote}`);
    return { html, replaced: true };
  }

  return { html, replaced: false };
}

function runReplace({ html = "", rows = [], urlFieldName = "URL", idxFieldName = "" }) {
  if (typeof html !== "string") html = "";
  const urls = getUrlsFromRows(rows, urlFieldName, idxFieldName);

  let out = html;
  let replacedCount = 0;
  for (let i = 0; i < urls.length; i++) {
    const r = replaceOneIndex(out, i + 1, urls[i]);
    out = r.html;
    if (r.replaced) replacedCount++;
  }

  return {
    html: out,
    total_urls: urls.length,
    replaced: replacedCount,
    skipped: Math.max(0, urls.length - replacedCount)
  };
}

// --- ჯანმრთელობის შემოწმება ---
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/**
 * POST /replace-images
 * Body JSON ვარიანტები:
 * A) { html, rows, urlFieldName?, idxFieldName? }
 * B) { template_url, rows, urlFieldName?, idxFieldName? }
 * C) { files: [{ filename, html }], rows, ... }
 */
app.post("/replace-images", async (req, res) => {
  try {
    let { html, template_url, rows, urlFieldName, idxFieldName, files } = req.body || {};

    // HTML fallback from files[0].html
    if (!html && Array.isArray(files) && files.length > 0 && typeof files[0]?.html === "string") {
      html = files[0].html;
    }

    if (!html && !template_url)
      return res.status(400).json({ error: "Provide either 'html', 'template_url', or 'files[0].html'." });

    if (!Array.isArray(rows))
      return res.status(400).json({ error: "'rows' must be an array of objects." });

    if (!html && template_url) {
      const r = await fetch(template_url, { timeout: 15000 });
      if (!r.ok) {
        return res.status(400).json({ error: `Failed to fetch template_url: ${r.status}` });
      }
      html = await r.text();
      if (!html || typeof html !== "string") {
        return res.status(400).json({ error: "template_url did not return text/html." });
      }
    }

    const result = runReplace({ html, rows, urlFieldName, idxFieldName });
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error", details: String(e?.message || e) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Image replacer listening on port", PORT);
});

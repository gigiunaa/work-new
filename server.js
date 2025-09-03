app.post("/replace-images", async (req, res) => {
  try {
    let { html, html_b64, template_url, rows, urlFieldName, idxFieldName, files } = req.body || {};

    // თუ Base64 მოვიდა, მას უპირატესობა აქვს
    if (!html && html_b64 && typeof html_b64 === "string") {
      try {
        const buff = Buffer.from(html_b64, "base64");
        html = buff.toString("utf-8");
      } catch (e) {
        return res.status(400).json({ error: "Invalid html_b64, cannot decode" });
      }
    }

    // HTML fallback from files[0].html
    if (!html && Array.isArray(files) && files.length > 0 && typeof files[0]?.html === "string") {
      html = files[0].html;
    }

    if (!html && !template_url)
      return res.status(400).json({ error: "Provide either 'html', 'html_b64', 'template_url', or 'files[0].html'." });

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

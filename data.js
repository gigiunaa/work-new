import express from "express";

const app = express();
app.use(express.json({ limit: "10mb" })); // საკმარისია დიდი HTML + სურათების ლისტისთვის

// 🟢 ფუნქცია: JSON {images: [...]} გადაჰყავს {IDX, URL}
function mapImages(input) {
  const urls = input?.images || [];
  let out = [];
  if (Array.isArray(urls)) {
    for (let i = 0; i < urls.length; i++) {
      out.push({
        IDX: i + 1,
        URL: urls[i]
      });
    }
  }
  return out;
}

// Health-check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Endpoint: JSON → IDX Map
app.post("/map-images", (req, res) => {
  try {
    const { jsonString, images } = req.body || {};

    // ვიღებთ ან პირდაპირ images array-ს, ან ვპარსავთ jsonString-ს
    let inputObj;
    if (Array.isArray(images)) {
      inputObj = { images };
    } else if (jsonString) {
      inputObj = JSON.parse(jsonString);
    } else {
      return res.status(400).json({ error: "Provide either 'images' array or 'jsonString'." });
    }

    const result = mapImages(inputObj);
    res.json({ array: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", details: String(err?.message || err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Mapper API running on port", PORT);
});

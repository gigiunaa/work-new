import express from "express";

const app = express();
app.use(express.json({ limit: "10mb" }));

// Health-check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// POST /map-images
app.post("/map-images", (req, res) => {
  try {
    const { jsonString, images } = req.body || {};

    let input;
    if (Array.isArray(images)) {
      input = { images };
    } else if (jsonString) {
      input = JSON.parse(jsonString);
    } else {
      return res.status(400).json({
        error: "Provide either 'images' array or 'jsonString'."
      });
    }

    let out = [];
    if (Array.isArray(input.images)) {
      for (let i = 0; i < input.images.length; i++) {
        out.push({
          IDX: i + 1,
          URL: input.images[i]
        });
      }
    }

    res.json({ array: out });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error",
      details: String(err?.message || err)
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mapper API running on port ${PORT}`);
});

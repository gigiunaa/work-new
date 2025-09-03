import express from "express";

const app = express();
app.use(express.json({ limit: "5mb" }));

app.post("/map-images", (req, res) => {
  try {
    const { jsonString } = req.body || {};
    const input = JSON.parse(jsonString);

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
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Mapper API running on port", PORT);
});

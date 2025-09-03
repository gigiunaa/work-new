from fastapi import FastAPI, Request
from pydantic import BaseModel
from typing import List, Optional
import base64
import re
import httpx

app = FastAPI()

# -------------------- Utility funcs --------------------

def get_urls_from_rows(rows, url_field="URL", idx_field=""):
    lst = list(rows)
    if idx_field:
        try:
            lst.sort(key=lambda r: float(str(r.get(idx_field, "")).replace(",", ".")) if str(r.get(idx_field, "") else 0)
        except Exception:
            pass
    urls = []
    for r in lst:
        url = r.get(url_field)
        if url:
            urls.append(str(url).strip())
    return urls


def replace_one_index(html: str, index: int, url: str):
    exts = "(png|jpg|jpeg|gif|webp)"
    pattern = re.compile(rf'(\b(?:src|data-src)\s*=\s*)(["\'])images/image{index}\.{exts}\2', re.I)

    if pattern.search(html):
        return pattern.sub(rf'\1"\g<2>{url}\2', html, count=1), True

    return html, False


def run_replace(html: str, rows: List[dict], url_field="URL", idx_field=""):
    urls = get_urls_from_rows(rows, url_field, idx_field)
    out = html
    replaced_count = 0
    for i, u in enumerate(urls):
        out, replaced = replace_one_index(out, i + 1, u)
        if replaced:
            replaced_count += 1
    return {
        "html": out,
        "total_urls": len(urls),
        "replaced": replaced_count,
        "skipped": max(0, len(urls) - replaced_count),
    }

# -------------------- Models --------------------

class FileItem(BaseModel):
    filename: str
    html: Optional[str] = None
    html_b64: Optional[str] = None

class ReplaceRequest(BaseModel):
    html: Optional[str] = None
    html_b64: Optional[str] = None
    template_url: Optional[str] = None
    rows: List[dict]
    urlFieldName: Optional[str] = "URL"
    idxFieldName: Optional[str] = ""
    files: Optional[List[FileItem]] = None

# -------------------- Endpoints --------------------

@app.get("/health")
async def health():
    return {"ok": True}

@app.post("/replace-images")
async def replace_images(req: ReplaceRequest):
    html = req.html

    # Base64 case
    if not html and req.html_b64:
        try:
            html = base64.b64decode(req.html_b64).decode("utf-8")
        except Exception:
            return {"error": "Invalid html_b64, cannot decode"}

    # Files fallback
    if not html and req.files and len(req.files) > 0:
        f = req.files[0]
        if f.html:
            html = f.html
        elif f.html_b64:
            html = base64.b64decode(f.html_b64).decode("utf-8")

    # template_url fallback
    if not html and req.template_url:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(req.template_url)
            if r.status_code != 200:
                return {"error": f"Failed to fetch template_url: {r.status_code}"}
            html = r.text

    if not html:
        return {"error": "Provide either 'html', 'html_b64', 'template_url', or 'files[0].html'."}

    if not isinstance(req.rows, list):
        return {"error": "'rows' must be an array of objects."}

    result = run_replace(html, req.rows, req.urlFieldName, req.idxFieldName)
    return result

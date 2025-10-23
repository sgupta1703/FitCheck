import os
import json
import requests
from typing import Tuple, Dict, List
from pathlib import Path
import re

BASE_DIR = Path(os.environ.get("FITCHECK_BASE", r"C:\Users\HP\Desktop\FitCheck\FitCheck"))
CLOTHES_DIR = Path(os.environ.get("FITCHECK_CLOTHES", BASE_DIR / "Clothes"))
LABELS_DIR = CLOTHES_DIR / "labels"

BLUE_TSHIRT_TAGS = {
    "t-shirt": True,
    "blue": True,
    "cotton": True,
    "casual": True,
    "top": True,
}

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip() or "AIzaSyAx37BEVPAqEHWUdIUnMTa35dmH-Ge_czE"
GEMINI_URL = os.environ.get(
    "GEMINI_URL",
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
)

ALLOWED_KEYS = [
    't-shirt','polo','shirt','blouse','hoodie','sweater','jacket','coat',
    'dress','skirt','jeans','trousers','shorts','leggings','jumpsuit','romper',
    'men','women','unisex','kids','casual','formal','sporty','vintage',
    'blue','red','green','yellow','black','white','grey','brown','pink','purple',
    'orange','beige','checked','striped','plain','dotted','floral','graphic',
    'denim','cotton','wool','leather','silk','linen','synthetic','knitted',
    'outerwear','top','bottom','onesie','footwear'
]

def _parse_gemini_response(resp_json) -> str:
    if not resp_json:
        return None
    try:
        candidates = resp_json.get("candidates") or resp_json.get("candidate")
        if isinstance(candidates, list) and candidates:
            first = candidates[0]
            content = first.get("content") or first.get("message") or first
            if isinstance(content, dict):
                parts = content.get("parts")
                if isinstance(parts, list) and parts:
                    p0 = parts[0]
                    if isinstance(p0, dict) and "text" in p0:
                        return p0["text"]
                    if isinstance(p0, str):
                        return p0
            if "text" in first:
                return first["text"]
    except Exception:
        pass
    try:
        return json.dumps(resp_json, indent=2)
    except Exception:
        return str(resp_json)

def call_gemini(prompt: str, system: str = "", temperature: float = 0.0, max_tokens: int = 512, timeout: int = 30) -> Tuple[str, dict]:
    if not GEMINI_API_KEY:
        return ("[Gemini API messed up]", {})

    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-goog-api-key": GEMINI_API_KEY,
    }

    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": float(temperature),
            "maxOutputTokens": int(max_tokens),
            "candidateCount": 1,
        },
    }
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}

    try:
        resp = requests.post(GEMINI_URL, headers=headers, json=body, timeout=timeout)
    except Exception as e:
        return (f"[Error contacting Gemini API: {e}]", {})

    if resp.status_code >= 400:
        try:
            parsed = resp.json()
            return (f"[Gemini API returned HTTP {resp.status_code}]\n{json.dumps(parsed, indent=2)}", parsed)
        except Exception:
            return (f"[Gemini API returned HTTP {resp.status_code}]\n{resp.text}", {})

    try:
        data = resp.json()
    except Exception as e:
        return (f"[Error parsing Gemini response JSON: {e}]\nRaw: {resp.text}", {})

    parsed_text = _parse_gemini_response(data)
    if parsed_text is None:
        return (json.dumps(data, indent=2), data)
    return (parsed_text, data)

def _extract_first_json_object(s: str) -> str:
    if not s:
        return None
    start = s.find("{")
    if start == -1:
        return None
    depth = 0
    for i in range(start, len(s)):
        if s[i] == "{":
            depth += 1
        elif s[i] == "}":
            depth -= 1
            if depth == 0:
                return s[start:i + 1]
    return None

def _clean_boolean_json(parsed: Dict) -> Dict[str, bool]:
    out = {}
    for k, v in parsed.items():
        key = str(k).strip()
        if key in ALLOWED_KEYS:
            out[key] = bool(v)
    return out

def predict(image_path: str = None) -> Tuple[Dict[str, bool], str]:
    allowed_list_str = ", ".join([f"'{k}'" for k in ALLOWED_KEYS])
    base_true = [k for k, v in BLUE_TSHIRT_TAGS.items() if v]

    prompt = (
        f"Input: {', '.join(base_true)}\n\n"
        "Task: Suggest complementary clothing pieces from this list of allowed tags:\n"
        f"[{allowed_list_str}]\n\n"
        "Rules:\n"
        "- Output ONLY a JSON object.\n"
        "- Mark true ONLY for items, styles, or colors that would pair well with the input item.\n"
        "- Do NOT repeat the input item's own tags.\n"
        "- All other keys must be false.\n\n"
        "Example output (must be valid JSON):\n"
        '{"jeans": true, "trousers": true, "jacket": true, "casual": true, "t-shirt": false, "blue": false}\n'
    )

    system = (
        "You are an outfit recommendation engine. "
        "Return only a single JSON object with booleans. "
        "Mark true for complementary items, false for the input's own tags."
    )

    gemini_text, gemini_json = call_gemini(prompt, system=system, temperature=0.0, max_tokens=300)
    if gemini_text and isinstance(gemini_text, str):
        gemini_text = gemini_text.strip()
        if gemini_text.startswith("```"):
            gemini_text = re.sub(r"^```[a-zA-Z]*\n?", "", gemini_text)
            gemini_text = re.sub(r"\n?```$", "", gemini_text).strip()

    def _repair_and_parse(s: str) -> Dict:
        if not s:
            return {}

        text = s.strip()

        try:
            return json.loads(text)
        except Exception:
            pass

        text2 = re.sub(r",\s*(?=[}\]])", "", text)
        try:
            return json.loads(text2)
        except Exception:
            pass

        open_count = text2.count("{")
        close_count = text2.count("}")
        if open_count > close_count:
            text3 = text2 + "}" * (open_count - close_count)
            try:
                return json.loads(text3)
            except Exception:
                text2 = text3  

        js = _extract_first_json_object(text2)
        if js:
            try:
                return json.loads(js)
            except Exception:
                js2 = re.sub(r",\s*(?=[}\]])", "", js)
                try:
                    return json.loads(js2)
                except Exception:
                    oc = js2.count("{"); cc = js2.count("}")
                    if oc > cc:
                        try:
                            return json.loads(js2 + "}" * (oc - cc))
                        except Exception:
                            pass

        try:
            text_single_to_double = text2.replace("'", '"')
            return json.loads(text_single_to_double)
        except Exception:
            pass

        out = {}
        for m in re.finditer(r'"?([\w\-\s]+)"?\s*:\s*(true|false)', text, flags=re.IGNORECASE):
            k = m.group(1).strip()
            v = m.group(2).lower() == "true"
            out[k] = v
        return out

    parsed = _repair_and_parse(gemini_text if isinstance(gemini_text, str) else json.dumps(gemini_json, indent=2))

    cleaned = _clean_boolean_json(parsed or {})
    for k in ALLOWED_KEYS:
        cleaned.setdefault(k, False)

    gemini_raw = gemini_text if isinstance(gemini_text, str) else json.dumps(gemini_json, indent=2)
    return cleaned, gemini_raw


def find_matching_items(tags: Dict[str, bool]) -> Tuple[List[str], Dict]:
    matches = []
    debug = {"labels_checked": 0, "matched_files": 0, "missing_images": []}
    wanted = {k for k, v in tags.items() if v}

    if not LABELS_DIR.exists():
        debug["error"] = f"labels dir missing: {LABELS_DIR}"
        return matches, debug

    for file in os.listdir(LABELS_DIR):
        if not file.lower().endswith(".json"):
            continue
        debug["labels_checked"] += 1
        label_path = LABELS_DIR / file
        try:
            with open(label_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            continue
        flags = {k for k, v in data.get("flags", {}).items() if v}
        if wanted & flags:
            base = Path(file).stem
            found = False
            for ext in (".webp", ".png", ".jpg", ".jpeg"):
                candidate = CLOTHES_DIR / (base + ext)
                if candidate.exists():
                    matches.append(base + ext)
                    found = True
                    debug["matched_files"] += 1
                    break
            if not found:
                debug["missing_images"].append(base)

    debug["total_matches"] = len(matches)
    return matches, debug

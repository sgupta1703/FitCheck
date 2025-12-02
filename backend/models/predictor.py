import os
import json
import re
import logging
from pathlib import Path
from typing import Tuple, Dict, List
import random

logger = logging.getLogger(__name__)
if not logging.getLogger().hasHandlers():
    logging.basicConfig(level=logging.INFO)

import requests

from PIL import Image
import numpy as np
import torch
import torch.nn.functional as F
from transformers import CLIPProcessor, CLIPModel
BASE_DIR = Path(os.environ.get("FITCHECK_BASE", r"C:\Users\HP\oofa"))
CLOTHES_DIR = Path(os.environ.get("FITCHECK_CLOTHES", BASE_DIR / "Clothes"))
LABELS_DIR = Path(os.environ.get("FITCHECK_LABELS", CLOTHES_DIR / "labels"))

try:
    CLOTHES_DIR.mkdir(parents=True, exist_ok=True)
    LABELS_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    logger.exception("Failed to ensure clothes/labels directories exist")

logger.info("predictor module initialized. BASE_DIR=%s CLOTHES_DIR=%s LABELS_DIR=%s",
            str(BASE_DIR), str(CLOTHES_DIR), str(LABELS_DIR))

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
    'outerwear','top','bottom','onesie','footwear',
    'tank', 'tank-top', 'tank top',
]

COMPLEMENT_MAP = {
    't-shirt': ['jeans','shorts','jacket','casual'],
    'shirt': ['trousers','jeans','jacket','formal'],
    'blouse': ['skirt','trousers','cardigan'] , 
    'top': ['jeans','skirt','shorts','jacket'],
    'hoodie': ['jeans','sneakers','jacket'],  
    'jacket': ['jeans','trousers','boots'], 
    'jeans': ['t-shirt','shirt','jacket'],
    'skirt': ['blouse','cardigan'],
    'shorts': ['t-shirt','tank'],
    'tank': ['shorts','jeans','skirt'],
    'dress': ['jacket','cardigan'],
}

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
        return ("[Gemini API key missing]", {})

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
    if not isinstance(parsed, dict):
        return {}

    def norm(k: str) -> str:
        return re.sub(r"[\s_]+", "-", str(k).strip().lower())

    allowed_norm_map = {norm(k): k for k in ALLOWED_KEYS}
    out = {}

    for raw_k, raw_v in parsed.items():
        key_norm = norm(raw_k)
        if key_norm in allowed_norm_map:
            canonical = allowed_norm_map[key_norm]
            out[canonical] = bool(raw_v)
            continue
        if key_norm.endswith("-top") and key_norm[:-4] in allowed_norm_map:
            canonical = allowed_norm_map[key_norm[:-4]]
            out[canonical] = bool(raw_v)
            continue
        if key_norm.endswith("s") and key_norm[:-1] in allowed_norm_map:
            canonical = allowed_norm_map[key_norm[:-1]]
            out[canonical] = bool(raw_v)
            continue
        for anorm, acanon in allowed_norm_map.items():
            if anorm in key_norm or key_norm in anorm:
                out[acanon] = bool(raw_v)
                break

    return out

_CLIP_MODEL = None
_CLIP_PROCESSOR = None
_CLIP_DEVICE = None

def load_clip(model_name: str = "openai/clip-vit-base-patch32"):
    global _CLIP_MODEL, _CLIP_PROCESSOR, _CLIP_DEVICE
    if _CLIP_MODEL is not None:
        return
    _CLIP_DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Loading CLIP model {model_name} on {_CLIP_DEVICE} (this may take a while)...")
    _CLIP_MODEL = CLIPModel.from_pretrained(model_name).to(_CLIP_DEVICE)
    _CLIP_PROCESSOR = CLIPProcessor.from_pretrained(model_name)
    logger.info("CLIP loaded.")

def _image_dominant_color(image: Image.Image) -> str:
    img = image.copy().convert("RGB")
    img = img.resize((64, 64))
    arr = np.array(img).reshape(-1, 3).astype(float)
    mean_rgb = arr.mean(axis=0)
    palette = {
        "black": np.array([0,0,0]),
        "white": np.array([255,255,255]),
        "red": np.array([220,20,60]),
        "blue": np.array([30,144,255]),
        "green": np.array([34,139,34]),
        "yellow": np.array([255,215,0]),
        "brown": np.array([150,75,0]),
        "pink": np.array([255,105,180]),
        "purple": np.array([128,0,128]),
        "grey": np.array([128,128,128]),
        "beige": np.array([245,245,220]),
        "orange": np.array([255,140,0]),
    }
    best = None
    best_dist = float("inf")
    for name, rgb in palette.items():
        d = np.linalg.norm(mean_rgb - rgb)
        if d < best_dist:
            best_dist = d
            best = name
    return best

def detect_image_tags_clip(image_path: str, allowed_keys: List[str], threshold: float = 0.22, top_k: int = 5) -> Tuple[Dict[str, bool], Dict]:

    if _CLIP_MODEL is None or _CLIP_PROCESSOR is None:
        raise RuntimeError("CLIP model not loaded. Call load_clip() first.")

    image = Image.open(image_path).convert("RGB")
    texts = []
    text_variants = {}
    for k in allowed_keys:
        key_text = k.replace('_', ' ').replace('-', ' ')
        aliases = [key_text, f"a photo of a {key_text}", f"a {key_text}"]
        if ' ' in key_text:
            aliases.append(key_text.split()[0])
        text_variants[k] = aliases
        texts.extend(aliases)

    inputs = _CLIP_PROCESSOR(text=texts, images=image, return_tensors="pt", padding=True)
    device = _CLIP_DEVICE
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        image_emb = _CLIP_MODEL.get_image_features(pixel_values=inputs["pixel_values"])
        text_emb = _CLIP_MODEL.get_text_features(input_ids=inputs["input_ids"], attention_mask=inputs["attention_mask"])

    image_emb = F.normalize(image_emb, dim=-1)
    text_emb = F.normalize(text_emb, dim=-1)

    sims_all = (image_emb @ text_emb.T).squeeze(0).cpu().numpy()

    per_key_scores = {}
    i = 0
    for k in allowed_keys:
        variants = text_variants[k]
        n = len(variants)
        scores = sims_all[i:i+n].tolist()
        per_key_scores[k] = max(scores)
        i += n

    ranked_all = sorted(per_key_scores.items(), key=lambda kv: kv[1], reverse=True)
    top_scores = ranked_all[:10]

    results = {}
    if top_k is not None:
        ranked = ranked_all
        top_keys = {k for k, s in ranked[:top_k]}
        for k in allowed_keys:
            results[k] = (k in top_keys) and (float(per_key_scores.get(k, 0.0)) > (threshold - 0.05))
    else:
        for k in allowed_keys:
            results[k] = float(per_key_scores.get(k, 0.0)) >= float(threshold)

    if not any(results.values()):
        logger.debug("CLIP returned no keys above threshold; using top_k fallback (top %d).", top_k or 3)
        fallback = {k for k, s in ranked_all[:(top_k or 3)]}
        for k in allowed_keys:
            results[k] = k in fallback

    colors = {"blue","red","green","yellow","black","white","grey","brown","pink","purple","orange","beige"}
    if not any(results.get(c, False) for c in colors):
        dom = _image_dominant_color(image)
        if dom and dom in colors:
            results[dom] = True

    debug = {"scores": per_key_scores, "top_scores": top_scores}
    return results, debug

def _truthy(v):
    if isinstance(v, bool):
        return v
    if v is None:
        return False
    if isinstance(v, (int, float)):
        return bool(v)
    s = str(v).strip().lower()
    return s in ("true", "1", "yes", "y", "t")

def find_matching_items(tags: Dict[str, bool], max_results: int = 5, shuffle_ties: bool = True) -> Tuple[List[str], Dict]:

    matches = []
    debug = {
        "labels_checked": 0,
        "matched_files": 0,
        "missing_images": [],
        "wanted": sorted([k for k, v in tags.items() if v]),
        "sample_label_flags": [],
        "scored_candidates_sample": [],
    }

    wanted = {k for k, v in tags.items() if v}

    if not LABELS_DIR.exists():
        debug["error"] = f"labels dir missing: {LABELS_DIR}"
        return matches, debug

    scored = []  

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

        raw_flags = data.get("flags", {}) if isinstance(data, dict) else {}
        label_true_flags = {k for k, v in raw_flags.items() if _truthy(v)}

        if len(debug["sample_label_flags"]) < 12:
            sample_raw = dict(list(raw_flags.items())[:8])
            debug["sample_label_flags"].append({
                "file": file,
                "raw_sample": sample_raw,
                "true_flags": sorted(list(label_true_flags))
            })

        score = len(wanted & label_true_flags)

        if score > 0:
            base = Path(file).stem
            exts_found = []
            for ext in (".webp", ".png", ".jpg", ".jpeg"):
                candidate = CLOTHES_DIR / (base + ext)
                if candidate.exists():
                    exts_found.append(base + ext)
            if exts_found:
                scored.append((score, base, exts_found, sorted(list(label_true_flags))))
            else:
                debug["missing_images"].append(base)

    if not scored:
        debug["total_matches"] = 0
        return [], debug

    scored.sort(key=lambda x: x[0], reverse=True)
    if shuffle_ties:
        grouped = {}
        for sc in scored:
            grouped.setdefault(sc[0], []).append(sc)
        final_order = []
        for score in sorted(grouped.keys(), reverse=True):
            group = grouped[score]
            random.shuffle(group)
            final_order.extend(group)
    else:
        final_order = scored

    results = []
    seen_bases = set()
    for score, base, exts_found, true_flags in final_order:
        if base in seen_bases:
            continue
        results.append(exts_found[0])
        seen_bases.add(base)
        debug["scored_candidates_sample"].append({
            "score": score, "file_base": base, "chosen_file": exts_found[0], "label_flags": true_flags
        })
        if len(results) >= (max_results or 5):
            break

    if max_results and len(results) < max_results:
        all_images = []
        for img in os.listdir(CLOTHES_DIR):
            if img.lower().endswith((".webp", ".png", ".jpg", ".jpeg")):
                all_images.append(img)
        pool = [i for i in all_images if i not in results]
        random.shuffle(pool)
        while len(results) < max_results and pool:
            results.append(pool.pop())

    debug["total_matches"] = len(results)
    debug["matched_files"] = len(results)
    return results, debug

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

def _generate_fallback_tags(detected_keys: List[str]) -> Dict[str, bool]:
    out = {}
    for k in ALLOWED_KEYS:
        out[k] = False

    def norm_key(k: str) -> str:
        return re.sub(r"[\s_]+", "-", str(k).strip().lower())

    allowed_norm_map = {norm_key(k): k for k in ALLOWED_KEYS}

    complements = set()
    for d in detected_keys:
        dnorm = norm_key(d)
        mapped = allowed_norm_map.get(dnorm, None)
        if mapped is None:
            if dnorm.endswith("-top") and dnorm[:-4] in allowed_norm_map:
                mapped = allowed_norm_map[dnorm[:-4]]
        if mapped is None:
            if dnorm.endswith("s") and dnorm[:-1] in allowed_norm_map:
                mapped = allowed_norm_map[dnorm[:-1]]
        if mapped is None:
            continue

        comp_keys = COMPLEMENT_MAP.get(mapped, [])
        for c in comp_keys:
            cnorm = norm_key(c)
            if cnorm in allowed_norm_map:
                complements.add(allowed_norm_map[cnorm])

    if not complements:
        for fallback in ["jeans", "trousers", "jacket"]:
            if fallback in ALLOWED_KEYS:
                complements.add(fallback)

    for c in complements:
        out[c] = True

    for d in detected_keys:
        dnorm = norm_key(d)
        if dnorm in allowed_norm_map:
            out[allowed_norm_map[dnorm]] = False

    return out

def predict(image_path: str = None, clip_threshold: float = 0.22, clip_top_k_fallback: int = 5) -> Tuple[Dict[str, bool], str, Dict]:
    try:
        load_clip()
    except Exception as e:
        logger.exception("Failed to load CLIP model at predict() start.")
        pass

    base_true = []
    detection_debug = {}
    if image_path:
        try:
            detected, debug = detect_image_tags_clip(image_path, ALLOWED_KEYS, threshold=clip_threshold, top_k=clip_top_k_fallback)
            detection_debug = debug
            base_true = [k for k, v in detected.items() if v]
            logger.info(f"CLIP detected: {base_true}")
            logger.debug("CLIP top scores: %s", detection_debug.get("top_scores"))
        except Exception as e:
            logger.exception("Error running CLIP detection - falling back to BLUE_TSHIRT_TAGS.")
            base_true = [k for k, v in BLUE_TSHIRT_TAGS.items() if v]
    else:
        base_true = [k for k, v in BLUE_TSHIRT_TAGS.items() if v]

    if not base_true:
        base_true = [k for k, v in BLUE_TSHIRT_TAGS.items() if v]

    allowed_list_str = ", ".join([f"'{k}'" for k in ALLOWED_KEYS])

    prompt = (
        f"Input: {', '.join(base_true)}\n\n"
        "Task: Suggest complementary clothing pieces from this list of allowed tags:\n"
        f"[{allowed_list_str}]\n\n"
        "Rules:\n"
        "- Output ONLY a JSON object.\n"
        "- Output EXACTLY 10 true values meaning 10 total tags should have the True attribute to them.\n"
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

    parsed = _repair_and_parse(gemini_text if isinstance(gemini_text, str) else json.dumps(gemini_json, indent=2))
    cleaned = _clean_boolean_json(parsed or {})

    for k in ALLOWED_KEYS:
        cleaned.setdefault(k, False)

    if not any(cleaned.get(k, False) for k in ALLOWED_KEYS):
        print(f"Raw Gemini text: {gemini_text}\nRaw Gemini JSON: {json.dumps(gemini_json, indent=2)}")
        logger.warning("Gemini returned no usable True values; using deterministic fallback based on detection.")
        fallback = _generate_fallback_tags(base_true)
        for k in base_true:
            if k in fallback:
                fallback[k] = False
        for k, v in fallback.items():
            cleaned[k] = v

    gemini_raw = gemini_text if isinstance(gemini_text, str) else json.dumps(gemini_json, indent=2)
    return cleaned, gemini_raw, {"clip_detection": detection_debug, "base_true": base_true}

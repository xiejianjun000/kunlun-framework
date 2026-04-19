#!/usr/bin/env python3

import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.request


def _get_nested(obj, path):
    cur = obj
    for key in path:
        if isinstance(cur, list):
            cur = cur[key]
        else:
            cur = cur[key]
    return cur


def _load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_or_init_model_info(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as f:
            json.dump({}, f, ensure_ascii=False, indent=2)
        return {}
    try:
        return _load_json(path)
    except json.JSONDecodeError:
        return {}


def _write_model_info(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")
    os.replace(tmp, path)


def _normalize_base_url(base_url):
    return base_url.rstrip("/")


def _detect_image_mime(path):
    low = path.lower()
    if low.endswith(".png"):
        return "image/png"
    if low.endswith(".jpg") or low.endswith(".jpeg"):
        return "image/jpeg"
    if low.endswith(".webp"):
        return "image/webp"
    return "application/octet-stream"


def _build_vision_payload(model_id, image_path):
    with open(image_path, "rb") as f:
        raw = f.read()
    mime = _detect_image_mime(image_path)
    b64 = base64.b64encode(raw).decode("ascii")
    data_url = f"data:{mime};base64,{b64}"
    return {
        "model": model_id,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Describe the image content."},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            }
        ],
        "max_tokens": 128,
        "temperature": 0,
    }


def _post_json(url, api_key, payload, timeout_s):
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    if api_key:
        req.add_header("Authorization", f"Bearer {api_key}")
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            data = resp.read()
            try:
                return resp.status, _safe_json_loads(data)
            except Exception:
                return resp.status, {"raw": data.decode("utf-8", errors="replace")}
    except urllib.error.HTTPError as e:
        data = e.read()
        try:
            return e.code, _safe_json_loads(data)
        except Exception:
            return e.code, {"raw": data.decode("utf-8", errors="replace")}
    except urllib.error.URLError as e:
        return 0, {"error": str(e)}


def _safe_json_loads(b):
    if isinstance(b, (bytes, bytearray)):
        return json.loads(b.decode("utf-8"))
    return json.loads(b)


def _is_auth_error(status, body):
    if status in (401, 403):
        return True
    msg = json.dumps(body, ensure_ascii=False).lower()
    return "invalid api key" in msg or "unauthorized" in msg or "forbidden" in msg


def _vision_probe(base_url, api_key, model_id, image_path, timeout_s):
    endpoint = f"{_normalize_base_url(base_url)}/chat/completions"
    payload = _build_vision_payload(model_id, image_path)
    status, body = _post_json(endpoint, api_key, payload, timeout_s=timeout_s)
    if status == 200:
        return True, {"status": status}
    if status == 0:
        return False, {"status": status, "error": body.get("error")}
    if _is_auth_error(status, body):
        return None, {"status": status, "error": body}
    return False, {"status": status, "error": body}


def main():
    p = argparse.ArgumentParser()
    p.add_argument(
        "--openclaw-config",
        default="/root/.openclaw/openclaw.json",
        help="openclaw.json path (default: /root/.openclaw/openclaw.json)",
    )
    p.add_argument(
        "--image",
        default=os.path.expanduser("~/.cua/example.png"),
        help="example image path (default: ~/.cua/example.png)",
    )
    p.add_argument(
        "--model-info",
        default=os.path.expanduser("~/.cua/model-info"),
        help="model cache file (default: ~/.cua/model-info)",
    )
    p.add_argument("--timeout", type=float, default=30, help="HTTP timeout seconds")
    args = p.parse_args()

    cfg = _load_json(args.openclaw_config)
    primary = _get_nested(cfg, ["agents", "defaults", "model", "primary"])
    model_id = str(primary).strip().split("/")[-1].strip()
    if not model_id or model_id == "None":
        raise ValueError("invalid model id")
    base_url = _get_nested(cfg, ["models", "providers", "ark", "baseUrl"])
    api_key = _get_nested(cfg, ["models", "providers", "ark", "apiKey"])

    cache = _load_or_init_model_info(args.model_info)
    cached = cache.get(model_id)
    if isinstance(cached, bool):
        out = {"model_id": model_id, "multimodal": cached, "source": "cache"}
        print(json.dumps(out, ensure_ascii=False))
        return 0 if cached else 2

    if not os.path.exists(args.image):
        raise FileNotFoundError(args.image)

    supported, meta = _vision_probe(
        base_url=base_url,
        api_key=api_key,
        model_id=model_id,
        image_path=args.image,
        timeout_s=args.timeout,
    )

    if supported is None:
        out = {
            "model_id": model_id,
            "multimodal": None,
            "source": "probe",
            "error": meta,
        }
        print(json.dumps(out, ensure_ascii=False))
        return 3

    cache[model_id] = bool(supported)
    _write_model_info(args.model_info, cache)

    out = {"model_id": model_id, "multimodal": bool(supported), "source": "probe"}
    print(json.dumps(out, ensure_ascii=False))
    return 0 if supported else 2


if __name__ == "__main__":
    raise SystemExit(main())

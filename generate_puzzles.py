import os
import json
import google.generativeai as genai
import random
import time
from typing import Any, Dict, List, Optional, Tuple

def generate_ai_puzzles():
    """
    Calls the Gemini API to generate 3 'Odd One Out' puzzles and saves them to a file.
    """
    try:
        # --- 1. API Key Configuration ---
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set!")
        genai.configure(api_key=api_key)

    except ValueError as e:
        print(f"Error: {e}")
        print("Please set your Gemini API key as an environment variable.")
        print("Example: export GEMINI_API_KEY='Your-API-Key-Here'")
        raise SystemExit(1)

    def _is_quota_error(e: Exception) -> bool:
        msg = str(e).lower()
        return (
            "quota exceeded" in msg
            or "exceeded your current quota" in msg
            or "429" in msg
            or "rate limit" in msg
        )

    def _is_model_not_found(e: Exception) -> bool:
        msg = str(e).lower()
        return "is not found" in msg or "not supported for generatecontent" in msg or "404" in msg

    def _response_text(resp: Any) -> str:
        """
        Best-effort extraction of text from google-generativeai responses across versions.
        """
        # Newer versions tend to expose resp.text
        txt = getattr(resp, "text", None)
        if isinstance(txt, str) and txt.strip():
            return txt
        # Older / alternate shapes: candidates[0].content.parts[0].text
        cands = getattr(resp, "candidates", None)
        if cands and isinstance(cands, list):
            try:
                parts = cands[0].content.parts
                if parts and hasattr(parts[0], "text"):
                    return parts[0].text
            except Exception:
                pass
        return ""

    def _extract_json(text: str) -> str:
        """
        Best-effort extraction of a JSON object/array from a model response.
        Handles cases where the model wraps JSON in prose or code fences.
        """
        if not text:
            raise ValueError("Empty response text")
        cleaned = text.strip()
        # Strip common markdown fences
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            # If language is present, drop the first line
            if "\n" in cleaned:
                cleaned = cleaned.split("\n", 1)[1].strip()
        # Try direct parse first
        try:
            json.loads(cleaned)
            return cleaned
        except Exception:
            pass
        # Find first JSON start char and attempt to parse progressively
        start = None
        for ch in ("{", "["):
            idx = cleaned.find(ch)
            if idx != -1 and (start is None or idx < start):
                start = idx
        if start is None:
            raise ValueError("Could not find JSON start in response")
        candidate = cleaned[start:]
        # Trim to last plausible end
        end_candidates = [candidate.rfind("}"), candidate.rfind("]")]
        end = max(end_candidates)
        if end == -1:
            raise ValueError("Could not find JSON end in response")
        candidate = candidate[: end + 1].strip()
        json.loads(candidate)  # validate
        return candidate

    def _validate_puzzle(p: Dict[str, Any]) -> Dict[str, Any]:
        tokens = p.get("tokens")
        answer_index = p.get("answer_index")
        category = p.get("category")
        explanation = p.get("explanation")

        if not isinstance(tokens, list) or len(tokens) != 5 or not all(isinstance(t, str) and t.strip() for t in tokens):
            raise ValueError(f"Invalid tokens: expected 5 non-empty strings, got {tokens!r}")
        if not isinstance(answer_index, int):
            # Sometimes model returns float; coerce if safe
            if isinstance(answer_index, (float,)) and int(answer_index) == answer_index:
                answer_index = int(answer_index)
            else:
                raise ValueError(f"Invalid answer_index type: {type(answer_index)} value={answer_index!r}")
        if answer_index < 0 or answer_index >= 5:
            raise ValueError(f"answer_index out of range: {answer_index}")
        if not isinstance(category, str) or not category.strip():
            raise ValueError("Missing/invalid category")
        if not isinstance(explanation, str) or not explanation.strip():
            raise ValueError("Missing/invalid explanation")

        return {
            "tokens": [t.strip() for t in tokens],
            "answer_index": answer_index,
            "category": category.strip(),
            "explanation": explanation.strip(),
        }

    # --- 2. Define the JSON Output Schema ---
    schema = {
        "type": "OBJECT",
        "properties": {
            "tokens": {
                "type": "ARRAY",
                "items": {"type": "STRING"}
            },
            "answer_index": {
                "type": "NUMBER",
                "description": "The 0-based index of the token that is the odd one out."
            },
            "category": {"type": "STRING"},
            "explanation": {"type": "STRING"}
        },
        "required": ["tokens", "answer_index", "category", "explanation"]
    }

    # --- 3. Configure the AI Model ---
    #
    # Preview model names can disappear. We'll try a small list of likely-stable model ids
    # and fall back gracefully if a model isn't available for your key/project.
    # Default to a single modern model to avoid noisy 404s for keys that don't have access
    # to certain model families / API versions. You can override via GEMINI_MODEL.
    #
    # Default requested model: Gemini 2.5 Flash.
    default_model = os.getenv("GEMINI_MODEL", "").strip() or "gemini-2.5-flash"
    # Keep a fallback in case the key/API version doesn't have access to 2.5 yet.
    model_candidates = [default_model, "gemini-2.0-flash"]

    system_instruction = """
        You are a master puzzle designer, specializing in clever 'Odd One Out' brain teasers that require lateral thinking. Your task is to generate a single, high-quality puzzle.

        The puzzle must consist of 5 tokens (words or short phrases). Four of these tokens must share a non-obvious, creative, and specific connection. The fifth token is the outlier.

        **CRITICAL INSTRUCTIONS:**
        1.  **Embrace Creativity:** Avoid simple categories like "fruits" or "colors." Instead, think about the *function*, *origin*, *properties*, or *context* of the tokens.
        2.  **Diverse Categories:** Generate puzzles from a wide range of domains. Here are some examples to inspire you:
            * **Thematic Groups:** Things you need for a specific activity (e.g., items for a beach trip: Sunscreen, Towel, Umbrella, Bucket, **Scarf**).
            * **Historical Context:** Events or figures from a specific time period (e.g., US Presidents during the 1800s).
            * **Cultural Specificity:** Things unique to a certain culture (e.g., Chinese inventions: Gunpowder, Papermaking, Compass, Printing, **Aqueduct**).
            * **Vocabulary & Synonyms:** A set of words that are synonyms, with one that is subtly different (e.g., synonyms for "destroy": Eradicate, Eliminate, Extinguish, Annihilate, **Separate**).
            * **Specialized Terminology:** Words from a specific field (e.g., American Football terms: Touchdown, Fumble, Interception, Field Goal, **Homerun**).
            * **Logical Connections:** Items that follow a pattern or are part of a set (e.g., things that have screens: Laptop, Smartphone, Television, ATM, **Radio**).
        3.  **Unambiguous Answer:** There must be only ONE clear and defensible correct answer. The connection between the four items should be strong and the outlier's exclusion should be obvious once the category is revealed.
        4.  **JSON Output:** The output must strictly conform to the provided JSON schema, including the 5 tokens, the 0-based index of the outlier, the category name, and a concise explanation.
        """

    # Prefer schema-based JSON mode, but not all models/SDK versions support it consistently.
    generation_config_json = {"response_mime_type": "application/json", "response_schema": schema}
    prompt_prefix_fallback = (
        "Return ONLY valid JSON (no markdown) with keys: tokens (5 strings), answer_index (0-4 int), "
        "category (string), explanation (string)."
    )

    def _make_model(model_name: str) -> genai.GenerativeModel:
        """
        Some SDK versions expect model ids like 'gemini-1.5-flash' while others accept/return
        'models/gemini-1.5-flash'. We'll try both.
        """
        candidates = [model_name]
        if not model_name.startswith("models/"):
            candidates.append(f"models/{model_name}")
        else:
            candidates.append(model_name.replace("models/", "", 1))

        last_exc: Optional[Exception] = None
        for m in candidates:
            try:
                return genai.GenerativeModel(
                    model_name=m,
                    generation_config=generation_config_json,
                    system_instruction=system_instruction,
                )
            except Exception as e:
                last_exc = e
                try:
                    # Fallback without schema config
                    return genai.GenerativeModel(
                        model_name=m,
                        system_instruction=system_instruction,
                    )
                except Exception as e2:
                    last_exc = e2
                    continue
        raise last_exc or RuntimeError("Failed to construct model")

    # --- 4. Generate the Puzzles ---
    print("Generating 3 new puzzles...")
    new_puzzles = []
    prompts = [
        "Generate a new puzzle based on a common theme or activity.",
        "Generate a new puzzle based on historical or cultural knowledge.",
        "Generate a new clever puzzle based on vocabulary or logical connections."
    ]

    for i in range(3):
        print(f"  - Generating puzzle {i+1}...")
        last_err: Optional[Exception] = None

        for model_name in model_candidates:
            model = _make_model(model_name)
            # Retry a couple times for transient errors / safety blocks
            for attempt in range(1, 4):
                try:
                    prompt = prompts[i]
                    # If schema-mode isn't supported, we can still coerce JSON with a prefix
                    response = model.generate_content(f"{prompt_prefix_fallback}\n\n{prompt}")
                    puzzle_raw = json.loads(_extract_json(_response_text(response)))
                    puzzle_data = _validate_puzzle(puzzle_raw)

                    tokens = puzzle_data["tokens"]
                    correct_answer_index = puzzle_data["answer_index"]
                    correct_answer_value = tokens[correct_answer_index]

                    random.shuffle(tokens)
                    new_correct_index = tokens.index(correct_answer_value)

                    puzzle_data["tokens"] = tokens
                    puzzle_data["answer_index"] = new_correct_index
                    puzzle_data["completed"] = False

                    new_puzzles.append(puzzle_data)
                    last_err = None
                    break
                except Exception as e:
                    last_err = e
                    # If we're out of quota, don't fail the workflow—just keep existing puzzles.json
                    # so the website remains up and playable.
                    if _is_quota_error(e):
                        print("\nGemini quota is exceeded for this key/project.")
                        print("Keeping existing puzzles.json and exiting successfully (no update).")
                        return
                    # If the model isn't available for this key/API, don't waste retries.
                    if _is_model_not_found(e):
                        print(f"    - {model_name} is not available for this API/key: {e}")
                        break
                    wait_s = min(8, 2 ** (attempt - 1))
                    print(f"    - {model_name} attempt {attempt}/3 failed: {e}. Retrying in {wait_s}s...")
                    time.sleep(wait_s)
                    continue

            if last_err is None:
                break

        if last_err is not None:
            print(f"    - Failed to generate puzzle {i+1} after trying models/retries: {last_err}")
            print("    - Skipping this puzzle.")
            continue
    
    # --- 5. Save to File ---
    if len(new_puzzles) == 3:
        with open("puzzles.json", "w") as f:
            json.dump(new_puzzles, f, indent=4)
        print("\nSuccessfully generated and saved 3 new puzzles to puzzles.json!")
    else:
        print("\nFailed to generate a full set of 3 puzzles. The puzzles.json file was not updated.")
        # Exit successfully so scheduled automation doesn't spam failures when Gemini is unavailable.
        return

if __name__ == "__main__":
    generate_ai_puzzles()

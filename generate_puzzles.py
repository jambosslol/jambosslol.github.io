import os
import json
import google.generativeai as genai

def generate_ai_puzzles():
    """
    Calls the Gemini API to generate 3 'Odd One Out' puzzles and saves them to a file.
    """
    try:
        # --- 1. API Key Configuration ---
        # It's best practice to set your API key as an environment variable
        # to avoid committing it directly into your code.
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set!")
        genai.configure(api_key=api_key)

    except ValueError as e:
        print(f"Error: {e}")
        print("Please set your Gemini API key as an environment variable.")
        print("Example: export GEMINI_API_KEY='Your-API-Key-Here'")
        return

    # --- 2. Define the JSON Output Schema ---
    # This schema tells the AI exactly how to structure its response.
    schema = {
        "type": "OBJECT",
        "properties": {
            "tokens": {
                "type": "ARRAY",
                # "minItems": 5,
                # "maxItems": 5,
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
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash-preview-05-20",
        generation_config={"response_mime_type": "application/json", "response_schema": schema},
        system_instruction="""
        You are a creative and clever puzzle designer. Your task is to generate a single 'Odd One Out' puzzle.
        The puzzle consists of 5 tokens (words or phrases). Four of the tokens share a clean, nameable feature, and one does not.
        You must provide the 5 tokens, the 0-based index of the 'odd one out', the name of the category, and a concise explanation.
        Avoid obscure trivia. Ensure there is only ONE correct answer and the category is unambiguous.
        Create puzzles with a range of difficulties: some based on spelling/letters, some on semantics/meaning.
        The output must conform to the provided JSON schema.
        """
    )

    # --- 4. Generate the Puzzles ---
    print("Generating 3 new puzzles...")
    new_puzzles = []
    prompts = [
        "Generate a new puzzle with an easy difficulty, based on letters or spelling.",
        "Generate a new puzzle with a medium difficulty, based on semantics or meaning.",
        "Generate a new clever puzzle with a hard difficulty."
    ]

    for i in range(3):
        try:
            print(f"  - Generating puzzle {i+1}...")
            response = model.generate_content(prompts[i])
            
            # The response text will be a JSON string, so we parse it
            puzzle_data = json.loads(response.text)
            
            # Add the 'completed' field required by the frontend
            puzzle_data["completed"] = False
            new_puzzles.append(puzzle_data)

        except Exception as e:
            print(f"An error occurred while generating puzzle {i+1}: {e}")
            print("Skipping this puzzle.")
            continue
    
    # --- 5. Save to File ---
    if len(new_puzzles) == 3:
        with open("puzzles.json", "w") as f:
            json.dump(new_puzzles, f, indent=4)
        print("\nSuccessfully generated and saved 3 new puzzles to puzzles.json!")
    else:
        print("\nFailed to generate a full set of 3 puzzles. The puzzles.json file was not updated.")

if __name__ == "__main__":
    generate_ai_puzzles()

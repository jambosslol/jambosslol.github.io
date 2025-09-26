import os
import json
import google.generativeai as genai
# MODIFICATION: Import the random library to shuffle the tokens
import random

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
        return

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
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash-preview-05-20",
        generation_config={"response_mime_type": "application/json", "response_schema": schema},
        system_instruction="""
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
    )

    # --- 4. Generate the Puzzles ---
    print("Generating 3 new puzzles...")
    new_puzzles = []
    prompts = [
        "Generate a new puzzle based on a common theme or activity.",
        "Generate a new puzzle based on historical or cultural knowledge.",
        "Generate a new clever puzzle based on vocabulary or logical connections."
    ]

    for i in range(3):
        try:
            print(f"  - Generating puzzle {i+1}...")
            response = model.generate_content(prompts[i])
            
            puzzle_data = json.loads(response.text)
            
            # --- MODIFICATION: Shuffle the answer choices ---
            tokens = puzzle_data["tokens"]
            correct_answer_index = puzzle_data["answer_index"]
            correct_answer_value = tokens[correct_answer_index]
            
            # Shuffle the list of tokens randomly
            random.shuffle(tokens)
            
            # Find the new index of the correct answer
            new_correct_index = tokens.index(correct_answer_value)
            
            # Update the puzzle data with the shuffled list and new index
            puzzle_data["tokens"] = tokens
            puzzle_data["answer_index"] = new_correct_index
            # --- End of modification ---

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
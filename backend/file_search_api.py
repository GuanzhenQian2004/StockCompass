from fastapi import FastAPI, Request, HTTPException
import openai
import os

app = FastAPI()

# Ensure the backend has access to your secure API key
openai.api_key = os.environ.get("OPENAI_API_KEY")
if not openai.api_key:
    raise RuntimeError("OPENAI_API_KEY environment variable is not set.")

@app.post("/api/file_search")
async def file_search(request: Request):
    data = await request.json()
    prompt = data.get("prompt")
    if not prompt:
        raise HTTPException(status_code=400, detail="Missing prompt in the request body")
    try:
        # Call OpenAI's ChatCompletion with a model that supports file search (e.g. GPT-4o)
        response = openai.ChatCompletion.create(
            model="gpt-4o",  # Ensure your account has access to this beta model
            messages=[
                {"role": "system", "content": "You are a helpful assistant retrieving real-time market data from recent documents."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=500,
        )
        message = response["choices"][0]["message"]["content"].strip()
        return {"context": message}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 
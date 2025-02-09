// This helper fetches the OpenAI summary by sending a prompt to our API route.
export async function fetchOpenAISummary(prompt: string): Promise<string> {
  try {
    const response = await fetch('/api/openai_analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, useFileSearch: true }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch OpenAI summary: ${errorText}`);
    }
    
    const data = await response.json();
    return data.answer;
  } catch (error) {
    console.error("fetchOpenAISummary error:", error);
    throw error;
  }
} 
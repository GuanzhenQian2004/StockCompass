import { NextResponse } from "next/server";

// Your secure API route that calls OpenAI's API without exposing your secret key
export async function POST(request: Request) {
  try {
    // Destructure useFileSearch along with prompt and chartData
    const { prompt, chartData, useFileSearch } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Missing prompt in the request body" },
        { status: 400 }
      );
    }

    // Use your secure OpenAI API key (stored securely in environment variables)
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    // Debug: Ensure the API key is set
    if (!OPENAI_API_KEY) {
      console.error("Missing OpenAI API Key");
      return NextResponse.json(
        { error: "Server configuration error: OpenAI API key not set." },
        { status: 500 }
      );
    }

    // Format chart data for the prompt
    const dataAnalysis = chartData ? `
      Additional Technical Data:
      - Average Volume: ${calculateAverageVolume(chartData)}
      - Price Range: $${findPriceRange(chartData)}
      - Volume Trend: ${analyzeVolumeTrend(chartData)}
    ` : '';

    // Build the enhanced prompt
    let enhancedPrompt = `${prompt}\n\n${dataAnalysis}`;

    // NEW: If flagged, fetch up-to-date real-time context from our backend file search API.
    if (useFileSearch) {
      try {
        const fileSearchResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/file_search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt })
        });
        if (fileSearchResponse.ok) {
          const fileSearchData = await fileSearchResponse.json();
          enhancedPrompt = `${enhancedPrompt}\n\nReal-time context:\n${fileSearchData.context}`;
        } else {
          console.error("File search returned an error:", await fileSearchResponse.text());
        }
      } catch (err) {
        console.error("Error fetching file search context:", err);
      }
    }
    
    // Log a snippet of the final prompt for debugging
    console.log("Calling OpenAI API with enhanced prompt:", enhancedPrompt.substring(0, 50), "...");

    // Updated to use GPT-4
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview", // Using the latest GPT-4 turbo model
        messages: [
          {
            role: "system",
            content: `You are an expert financial analyst specializing in historical stock market analysis. 
                     Focus on providing factual analysis of past market events and their documented impact on stock prices. 
                     Use technical analysis patterns and market data to explain price movements.
                     Always include specific numbers and percentages in your analysis.
                     At the end of your response, please list all references (URLs or source names) that you accessed to compile your answer, or clearly state if no external references were used.`
          },
          {
            role: "user",
            content: enhancedPrompt
          }
        ],
        temperature: 0.3, // Lower temperature for more focused, analytical responses
        max_tokens: 750,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch data from OpenAI", details: errorText },
        { status: openaiResponse.status }
      );
    }

    const result = await openaiResponse.json();

    // Updated to handle chat completion response format
    const answer = result.choices && result.choices[0]
      ? result.choices[0].message.content.trim()
      : "";

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Error in /api/openai_analysis:", error);
    return NextResponse.json(
      { 
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Helper functions for data analysis
function calculateAverageVolume(chartData: any[]) {
  const avg = chartData.reduce((sum, item) => sum + item.volume, 0) / chartData.length;
  return Math.round(avg).toLocaleString();
}

function findPriceRange(chartData: any[]) {
  const prices = chartData.map(item => item.price);
  return `${Math.min(...prices).toFixed(2)} - ${Math.max(...prices).toFixed(2)}`;
}

function analyzeVolumeTrend(chartData: any[]) {
  const firstHalfAvg = chartData.slice(0, Math.floor(chartData.length/2))
    .reduce((sum, item) => sum + item.volume, 0) / Math.floor(chartData.length/2);
  const secondHalfAvg = chartData.slice(Math.floor(chartData.length/2))
    .reduce((sum, item) => sum + item.volume, 0) / Math.floor(chartData.length/2);
  
  const percentChange = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg * 100).toFixed(2);
  return `${percentChange}% ${Number(percentChange) > 0 ? 'increase' : 'decrease'} in average volume`;
} 
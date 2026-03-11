export const callGemini = async (prompt: string, systemPrompt: string = "You are an expert technical recruiter."): Promise<string> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemPrompt })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.text || '';
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating content. Please try again.";
  }
};

/**
 * Strips markdown code fences and extracts JSON from AI responses.
 * GPT often wraps JSON in ```json ... ``` even when told not to.
 */
export function parseAIJson<T = unknown>(text: string): T {
  let cleaned = text.trim();

  // Remove markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Try to extract JSON object or array if there's surrounding text
  if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      cleaned = jsonMatch[1];
    }
  }

  return JSON.parse(cleaned);
}

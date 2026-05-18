import OpenAI from 'openai'

// OpenRouter is wire-compatible with the OpenAI SDK — only the baseURL changes.
// Free model: mistralai/mistral-7b-instruct:free. Switch via OPENROUTER_MODEL env.
export const ai = new OpenAI({
  apiKey:  process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

const MODEL = process.env.OPENROUTER_MODEL || 'mistralai/mistral-7b-instruct:free'

// Given an expense title/notes and the company's category list, ask the AI to
// pick the best matching category NAME. We constrain the AI to a closed set so
// it can't invent new categories. Returns null on any failure — callers must
// treat AI as best-effort and never block on it.
export async function categorizeExpense(
  title: string,
  notes: string | null,
  categories: { name: string }[]
): Promise<string | null> {
  const categoryList = categories.map((c) => c.name).join(', ')

  const prompt = `You categorize business expenses. Pick EXACTLY ONE category name from this list:
${categoryList}

Expense title: ${title}
${notes ? `Notes: ${notes}` : ''}

Respond with ONLY the category name from the list above. No explanation, no punctuation, no extra words.`

  try {
    const completion = await ai.chat.completions.create(
      {
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 10,
      },
      // Per-request timeout. The default SDK timeout is ~10 minutes which is
      // absurd for a 1-token classification. 8s is well above typical free-tier
      // latency but short enough that a hung upstream doesn't leak threads.
      { timeout: 8000 },
    )

    const raw = completion.choices[0]?.message?.content?.trim() ?? ''

    // Free-tier models (Mistral 7B etc.) often ignore "no punctuation" and return
    // things like "Meals." or `"Meals"` or "Category: Meals". Strip surrounding
    // punctuation/quotes and any leading "label:" prefix before matching.
    const cleaned = raw
      .replace(/^["'`\s]+|["'`.\s]+$/g, '')   // trim quotes + trailing period
      .replace(/^[A-Za-z\s]+:\s*/, '')        // strip "Category: " style prefixes
      .trim()

    // Two-stage match: exact (case-insensitive) first, then substring as fallback.
    // The substring fallback catches things like "the category is Meals" where the
    // exact match fails but the category name still appears in the response.
    const lower = cleaned.toLowerCase()
    const exact = categories.find((c) => c.name.toLowerCase() === lower)
    const fuzzy = exact ?? categories.find((c) => lower.includes(c.name.toLowerCase()))

    if (process.env.NODE_ENV !== 'production') {
      console.log('[AI] raw response:', JSON.stringify(raw), '→ matched:', fuzzy?.name ?? 'NONE')
    }

    return fuzzy?.name ?? null
  } catch (err) {
    console.warn('[AI] categorizeExpense failed:', (err as Error).message)
    return null
  }
}

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
    const completion = await ai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 10,
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ''

    // Validate the AI returned one of our exact category names (case-insensitive).
    const match = categories.find((c) => c.name.toLowerCase() === raw.toLowerCase())
    return match?.name ?? null
  } catch (err) {
    console.warn('[AI] categorizeExpense failed:', (err as Error).message)
    return null
  }
}

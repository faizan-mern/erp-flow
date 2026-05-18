import * as repo from './ai.repository'
import { ai as openRouter } from '../../lib/openrouter'
import OpenAI from 'openai'

function fail(message: string, status: number): never {
  throw Object.assign(new Error(message), { status })
}

export async function createChat(companyId: string, userId: string, title: string) {
  return repo.createChat(companyId, userId, title)
}

export async function listChats(companyId: string, userId: string) {
  return repo.listChats(companyId, userId)
}

export async function getChat(id: string, companyId: string, userId: string) {
  const chat = await repo.getChat(id, companyId, userId)
  if (!chat) fail('Chat not found', 404)
  return chat
}

export async function deleteChat(id: string, companyId: string, userId: string) {
  const chat = await repo.getChat(id, companyId, userId)
  if (!chat) fail('Chat not found', 404)
  await repo.deleteChat(id, companyId, userId)
}

const SYSTEM_PROMPT =
  'You are the ERP Platform AI Assistant. Help the user manage their business. ' +
  'You have access to tools to query live database metrics (employees, expenses, inventory). ' +
  'Always use the tools to answer data questions. Be concise and professional. Do not hallucinate numbers.'

const TOOL_DEFINITIONS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'getEmployeeCount',
      description: 'Get the total number of active employees currently in the company.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getLowStockCount',
      description: 'Get the exact count of products that are currently below their low stock threshold.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getPendingExpenseTotals',
      description: 'Get the total count and sum amount of all pending expenses awaiting approval.',
      parameters: { type: 'object', properties: {} },
    },
  },
]

const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-120b:free'
const AI_TIMEOUT_MS = 15000

async function runTool(
  functionName: string,
  companyId: string,
): Promise<Record<string, number> | { count: number; totalAmount: number } | { error: string }> {
  if (functionName === 'getEmployeeCount') {
    const count = await repo.getEmployeeCount(companyId)
    return { count }
  }
  if (functionName === 'getLowStockCount') {
    const count = await repo.getLowStockCount(companyId)
    return { count }
  }
  if (functionName === 'getPendingExpenseTotals') {
    return repo.getPendingExpenseTotals(companyId)
  }
  return { error: 'Tool not recognized' }
}

async function generateAssistantReply(
  chatMessages: { role: string; content: string }[],
  companyId: string,
): Promise<string> {
  const systemMsg: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
    role: 'system',
    content: SYSTEM_PROMPT,
  }
  const conversation: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = chatMessages.map((m) => ({
    role: m.role.toLowerCase() as 'user' | 'assistant',
    content: m.content,
  }))

  let response = await openRouter.chat.completions.create(
    {
      model: MODEL,
      messages: [systemMsg, ...conversation],
      tools: TOOL_DEFINITIONS,
    },
    { timeout: AI_TIMEOUT_MS },
  )

  let responseMessage = response.choices[0]?.message
  if (!responseMessage) {
    return 'I could not process that request.'
  }

  const toolCalls = responseMessage.tool_calls ?? []
  if (toolCalls.length > 0) {
    const results = await Promise.all(toolCalls.map((tc) => runTool(tc.function.name, companyId)))
    const toolMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = toolCalls.map((tc, i) => ({
      role: 'tool',
      tool_call_id: tc.id,
      content: JSON.stringify(results[i]),
    }))

    response = await openRouter.chat.completions.create(
      {
        model: MODEL,
        messages: [systemMsg, ...conversation, responseMessage, ...toolMessages],
      },
      { timeout: AI_TIMEOUT_MS },
    )
    responseMessage = response.choices[0]?.message
    if (!responseMessage) {
      return 'I could not process that request.'
    }
  }

  return responseMessage.content || 'I could not process that request.'
}

export async function processMessage(chatId: string, companyId: string, userId: string, content: string) {
  const chat = await getChat(chatId, companyId, userId)

  if (chat.messages.length === 0) {
    const title = content.length > 50 ? content.slice(0, 50).trimEnd() + '…' : content
    await repo.updateChatTitle(chatId, companyId, userId, title)
  }

  await repo.saveMessage(chatId, companyId, userId, 'USER', content)

  const messages = chat.messages.map((m) => ({
    role: m.role.toLowerCase(),
    content: m.content,
  }))
  messages.push({ role: 'user', content })

  let finalContent: string

  try {
    finalContent = await generateAssistantReply(messages, companyId)
  } catch (err) {
    console.error('[AI Tool-Calling Error]', err)
    finalContent =
      'I am currently experiencing connection issues with the AI provider. Please check the OpenRouter model configuration or try again later.'
  }

  await repo.saveMessage(chatId, companyId, userId, 'ASSISTANT', finalContent)
  return getChat(chatId, companyId, userId)
}

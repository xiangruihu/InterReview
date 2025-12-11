// 基于阿里云 DashScope（OpenAI 兼容模式）的 LLM 调用示例（支持多轮对话）
// 注意：在浏览器直接调用第三方 LLM API 可能会有 CORS 与密钥泄露风险，建议生产环境通过后端代理。

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

// 兼容：保留一份简单的本地 Mock，作为兜底
const fallbackMock: Record<string, string> = {
  '给我一些改进建议': '这里是本地 Mock：改进建议示例。配置 API Key 后将由真实 LLM 生成回答。',
};

// 旧版 mock 逻辑的简化兜底实现（从历史中取最后一句用户消息）
function fallbackFromHistory(messages: ChatMessage[]): string {
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  if (!lastUser) {
    return '（本地 Mock）未配置 LLM API Key，返回占位回答。请在 .env 中设置 DASHSCOPE_API_KEY 后重试。';
  }
  const q = lastUser.content || '';
  for (const [k, v] of Object.entries(fallbackMock)) {
    if (q.includes(k) || k.includes(q)) return v;
  }
  return '（本地 Mock）未配置 LLM API Key，返回占位回答。请在 .env 中设置 DASHSCOPE_API_KEY 后重试。';
}

// 将消息长度裁剪，避免超过模型上下文窗口（简单字符数近似）
function trimMessages(messages: ChatMessage[], maxChars = 8000): ChatMessage[] {
  // 策略：优先保留末尾若干轮，从后往前累加字符数，超过阈值则停止
  let total = 0;
  const kept: ChatMessage[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    const len = (m.content || '').length + 20; // 预估加上role等
    if (total + len > maxChars) break;
    kept.push(m);
    total += len;
  }
  return kept.reverse();
}

// 核心：基于多轮对话消息调用 LLM
export async function chatWithLLM(messages: ChatMessage[], options?: { model?: string; stream?: boolean }): Promise<string> {
  const apiKey = import.meta.env.DASHSCOPE_API_KEY as string | undefined;
  const baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const model = options?.model || 'qwen3-max';
  const stream = options?.stream ?? false; // 目前仍使用非流式，前端做打字机效果

  // 若没配 Key，走本地兜底
  if (!apiKey) {
    console.warn('[LLM] 未检测到 DASHSCOPE_API_KEY，使用本地 Mock 兜底');
    return fallbackFromHistory(messages);
  }

  try {
    const trimmed = trimMessages(messages);
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: trimmed,
        stream,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`LLM API 响应异常：${resp.status} ${resp.statusText} - ${text}`);
    }

    const data = await resp.json();
    // OpenAI 兼容格式：choices[0].message.content
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('LLM 返回内容为空或格式不符合预期');
    }
    return content;
  } catch (err) {
    console.error('[LLM] 调用失败，降级到本地 Mock：', err);
    return fallbackFromHistory(messages);
  }
}

// 兼容旧接口：单轮封装
export async function generateAIResponse(question: string): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: question },
  ];
  return chatWithLLM(messages);
}

import { BACKEND_BASE } from './backend';

export interface LLMFollowupItem {
  question?: string;
  reason?: string;
}

interface FollowupLLMRequest {
  question: string;
  answer?: string;
  category?: string;
  topic?: string;
  score?: number;
  history?: string[];
}

interface FollowupLLMResponse {
  followups?: Array<{ question?: string; reason?: string }>;
  data?: {
    followups?: Array<{ question?: string; reason?: string }>;
  };
}

export async function requestFollowupQuestionsLLM(
  payload: FollowupLLMRequest
): Promise<LLMFollowupItem[] | null> {
  // 仅当提供了问题内容时才尝试请求 LLM
  if (!payload?.question?.trim()) {
    return null;
  }

  try {
    const resp = await fetch(`${BACKEND_BASE}/diagnostics/qa-followups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      throw new Error(`requestFollowupQuestionsLLM failed: ${resp.status}`);
    }

    const data = (await resp.json()) as FollowupLLMResponse;
    const list =
      data?.followups ||
      data?.data?.followups ||
      (Array.isArray(data?.data) ? data?.data : []);

    if (!Array.isArray(list) || list.length === 0) {
      return null;
    }

    return list
      .map((item) => ({
        question: item?.question,
        reason: item?.reason,
      }))
      .filter((item) => Boolean(item.question?.trim()));
  } catch (error) {
    if (import.meta.env?.DEV) {
      console.warn('[diagnostic] followup LLM request failed, fallback to模板', error);
    }
    return null;
  }
}

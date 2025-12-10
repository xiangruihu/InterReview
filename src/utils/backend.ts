// 简易后端 API 客户端（FastAPI）
// 读取环境变量 VITE_BACKEND_URL，默认 http://localhost:8000

export const BACKEND_BASE = (import.meta.env.VITE_BACKEND_URL as string) || 'http://localhost:8000';

export interface UserProfileDTO {
  userId: string;
  username: string;
  email: string;
  createdAt?: string;
}

export interface InterviewDataDTO {
  id: string;
  title: string;
  company: string;
  position: string;
  status: '待上传' | '分析中' | '已完成';
  date: string;
}

export interface MessageDTO {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

// 注册用户：在服务端创建/更新用户记录
export async function registerUser(profile: UserProfileDTO): Promise<void> {
  const resp = await fetch(`${BACKEND_BASE}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`registerUser failed: ${resp.status} ${text}`);
  }
}

// 读取/保存 面试列表
export async function fetchInterviews(userId: string): Promise<InterviewDataDTO[]> {
  const resp = await fetch(`${BACKEND_BASE}/users/${userId}/interviews`);
  if (!resp.ok) throw new Error(`fetchInterviews failed: ${resp.status}`);
  const data = await resp.json();
  return data?.data || [];
}

export async function saveInterviews(userId: string, interviews: InterviewDataDTO[]): Promise<void> {
  const resp = await fetch(`${BACKEND_BASE}/users/${userId}/interviews`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(interviews),
  });
  if (!resp.ok) throw new Error(`saveInterviews failed: ${resp.status}`);
}

// 读取/保存 对话消息（按面试ID分组）
export type MessagesMap = Record<string, MessageDTO[]>;

export async function fetchMessages(userId: string): Promise<MessagesMap> {
  const resp = await fetch(`${BACKEND_BASE}/users/${userId}/messages`);
  if (!resp.ok) throw new Error(`fetchMessages failed: ${resp.status}`);
  const data = await resp.json();
  return data?.data || {};
}

export async function saveMessages(userId: string, messages: MessagesMap): Promise<void> {
  const resp = await fetch(`${BACKEND_BASE}/users/${userId}/messages`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
  if (!resp.ok) throw new Error(`saveMessages failed: ${resp.status}`);
}

// 面试分析读写（可选）
export type AnalysisMap = Record<string, any>; // { [interviewId]: Analysis }

export async function fetchAnalysis(userId: string): Promise<AnalysisMap> {
  const resp = await fetch(`${BACKEND_BASE}/users/${userId}/analysis`);
  if (!resp.ok) throw new Error(`fetchAnalysis failed: ${resp.status}`);
  const data = await resp.json();
  return data?.data || {};
}

export async function saveAnalysis(userId: string, analysis: AnalysisMap): Promise<void> {
  const resp = await fetch(`${BACKEND_BASE}/users/${userId}/analysis`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(analysis),
  });
  if (!resp.ok) throw new Error(`saveAnalysis failed: ${resp.status}`);
}


// 简易后端 API 客户端（FastAPI）
// 读取环境变量 VITE_BACKEND_URL，默认 http://localhost:8000

import type { AnalysisData } from '../types/analysis';

export const BACKEND_BASE = (import.meta.env.VITE_BACKEND_URL as string) || 'http://localhost:8000';

export interface UserProfileDTO {
  userId: string;
  username: string;
  email: string;
  createdAt?: string;
}

export type InterviewStatus = '待上传' | '已上传文件' | '分析中' | '已完成' | '分析失败';

export interface InterviewDataDTO {
  id: string;
  title: string;
  company: string;
  position: string;
  status: InterviewStatus;
  date: string;
  fileUrl?: string;
  fileType?: string;
  transcriptText?: string;
  durationSeconds?: number;
  durationText?: string;
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

export interface AnalyzeInterviewPayload {
  model?: string;
  maxPairs?: number;
}

export async function analyzeInterviewReport(
  userId: string,
  interviewId: string,
  payload?: AnalyzeInterviewPayload
): Promise<AnalysisData> {
  const resp = await fetch(
    `${BACKEND_BASE}/interviews/${interviewId}/analyze?user_id=${encodeURIComponent(userId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    }
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`analyzeInterviewReport failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  return data?.data as AnalysisData;
}

export interface UploadInterviewResponse {
  success: boolean;
  message: string;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type?: string;
}

export interface TranscriptPayload {
  interviewId: string;
  text: string;
  model?: string;
  filePath?: string;
  createdAt?: string;
}

export async function uploadInterviewFile(
  userId: string,
  interviewId: string,
  file: File
): Promise<UploadInterviewResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const resp = await fetch(`${BACKEND_BASE}/upload/interview/${userId}/${interviewId}`, {
    method: 'POST',
    body: formData,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`uploadInterviewFile failed: ${resp.status} ${text}`);
  }

  return resp.json();
}

export async function transcribeInterview(
  userId: string,
  interviewId: string,
  model?: string
): Promise<TranscriptPayload> {
  const resp = await fetch(
    `${BACKEND_BASE}/interviews/${interviewId}/transcribe?user_id=${encodeURIComponent(userId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
    }
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`transcribeInterview failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  return data?.data;
}

export async function fetchTranscript(
  userId: string,
  interviewId: string
): Promise<TranscriptPayload | null> {
  const resp = await fetch(
    `${BACKEND_BASE}/interviews/${interviewId}/transcription?user_id=${encodeURIComponent(userId)}`
  );

  if (resp.status === 404) {
    return null;
  }

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`fetchTranscript failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  return data?.data || null;
}

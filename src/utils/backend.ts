// 简易后端 API 客户端（FastAPI）
// 通过 .env 中的 VITE_API_BASE 配置 API 地址，默认走同域 /api 反代

import type { AnalysisData } from '../types/analysis';

const rawApiBase = (import.meta.env.VITE_API_BASE as string) || '/api';
const normalizedApiBase = rawApiBase.endsWith('/') ? rawApiBase.slice(0, -1) : rawApiBase;
export const BACKEND_BASE = normalizedApiBase || '/api';

type JsonMap = Record<string, any>;

async function parseResponse(resp: Response): Promise<JsonMap> {
  const text = await resp.text();
  let data: JsonMap = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!resp.ok) {
    const message = data?.detail || data?.message || data?.error || resp.statusText || '请求失败';
    const error = new Error(typeof message === 'string' ? message : '请求失败');
    (error as any).status = resp.status;
    throw error;
  }

  return data;
}

export interface UserProfileDTO {
  userId: string;
  username: string;
  email: string;
  createdAt?: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export type InterviewStatus = '待上传' | '上传中' | '已上传文件' | '分析中' | '已完成' | '分析失败';

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
export async function registerAccount(payload: RegisterPayload): Promise<UserProfileDTO> {
  const resp = await fetch(`${BACKEND_BASE}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseResponse(resp);
  return data?.data as UserProfileDTO;
}

export async function loginUser(payload: LoginPayload): Promise<UserProfileDTO> {
  const resp = await fetch(`${BACKEND_BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseResponse(resp);
  return data?.data as UserProfileDTO;
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

export type TranscriptChunkStatus = 'pending' | 'ok' | 'error';

export interface TranscriptChunk {
  index: number;
  filename: string;
  status: TranscriptChunkStatus;
  text?: string;
  error?: string;
  retryCount?: number;
  updatedAt?: string;
}

export interface TranscriptPayload {
  interviewId: string;
  text: string;
  model?: string;
  filePath?: string;
  createdAt?: string;
  updatedAt?: string;
  chunks?: TranscriptChunk[];
  failedChunks?: TranscriptChunk[];
  overallStatus?: 'empty' | 'completed' | 'partial' | 'error';
  chunkCount?: number;
}

export interface TranscriptRetryPayload {
  chunkIndices?: number[];
  model?: string;
}

interface UploadInterviewOptions {
  onProgress?: (percent: number) => void;
}

export interface ChatRequestPayload {
  question: string;
  model?: string;
}

export interface ChatResponsePayload {
  answer: string;
  assistantMessage: MessageDTO;
  userMessage: MessageDTO;
  history: MessageDTO[];
}

export interface ChatStreamHandlers {
  signal?: AbortSignal;
  onChunk?: (chunk: string) => void;
  onDone?: (payload: ChatResponsePayload) => void;
  onError?: (message: string) => void;
}

export async function uploadInterviewFile(
  userId: string,
  interviewId: string,
  file: File,
  options?: UploadInterviewOptions
): Promise<UploadInterviewResponse> {
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BACKEND_BASE}/upload/interview/${userId}/${interviewId}`);
    xhr.responseType = 'json';

    if (options?.onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          options.onProgress?.(percent);
        }
      };
    }

    xhr.onload = () => {
      const status = xhr.status;
      if (status >= 200 && status < 300) {
        let response: UploadInterviewResponse;
        if (xhr.responseType === 'json') {
          response = xhr.response as UploadInterviewResponse;
        } else {
          try {
            response = JSON.parse(xhr.responseText);
          } catch {
            response = xhr.response as UploadInterviewResponse;
          }
        }
        resolve(response);
      } else {
        const text = xhr.responseText || `HTTP ${status}`;
        reject(new Error(`uploadInterviewFile failed: ${status} ${text}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('uploadInterviewFile failed: 网络错误或连接中断'));
    };

    xhr.send(formData);
  });
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

export async function retryTranscriptChunks(
  userId: string,
  interviewId: string,
  payload?: TranscriptRetryPayload
): Promise<TranscriptPayload> {
  const resp = await fetch(
    `${BACKEND_BASE}/interviews/${interviewId}/transcript/retry_failed?user_id=${encodeURIComponent(userId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    }
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`retryTranscriptChunks failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  return data?.data;
}

export async function chatWithInterview(
  userId: string,
  interviewId: string,
  payload: ChatRequestPayload
): Promise<ChatResponsePayload> {
  const resp = await fetch(
    `${BACKEND_BASE}/interviews/${interviewId}/chat?user_id=${encodeURIComponent(userId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  const data = await parseResponse(resp);
  return data?.data as ChatResponsePayload;
}

export async function streamChatWithInterview(
  userId: string,
  interviewId: string,
  payload: ChatRequestPayload,
  handlers?: ChatStreamHandlers
): Promise<void> {
  const resp = await fetch(
    `${BACKEND_BASE}/interviews/${interviewId}/chat/stream?user_id=${encodeURIComponent(userId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: handlers?.signal,
    }
  );

  if (!resp.ok || !resp.body) {
    const text = await resp.text();
    throw new Error(text || `chat stream failed: ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const flushBuffer = (chunk: string) => {
    buffer += chunk;
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 2);
      if (!raw || !raw.startsWith('data:')) continue;
      const jsonStr = raw.replace(/^data:\s*/, '');
      if (!jsonStr) continue;
      let data: any;
      try {
        data = JSON.parse(jsonStr);
      } catch {
        continue;
      }
      const type = data?.type;
      if (type === 'chunk') {
        handlers?.onChunk?.(data?.content ?? '');
      } else if (type === 'done') {
        handlers?.onDone?.(data as ChatResponsePayload);
      } else if (type === 'error') {
        const message = data?.message || '流式回答失败';
        handlers?.onError?.(message);
        throw new Error(message);
      } else if (type === 'end') {
        return true;
      }
    }
    return false;
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      flushBuffer(decoder.decode());
      break;
    }
    const chunk = decoder.decode(value, { stream: true });
    const ended = flushBuffer(chunk);
    if (ended) break;
  }
}

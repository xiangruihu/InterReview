import rawData from '../../data/qa_pairs.json';
import { formatDuration } from './time';

interface RawQAPair {
  id: number;
  questioner?: string;
  question_time?: string;
  question: string;
  answerer?: string;
  answer_time?: string;
  answer: string;
  notes?: string;
}

interface RawStrength {
  title: string;
  detail?: string;
}

interface RawSuggestion {
  title: string;
  description?: string;
  priority?: string;
  actions?: string[];
}

export interface QAItem {
  id: number;
  question: string;
  questioner?: string;
  questionTime?: string;
  answer: string;
  answerer?: string;
  answerTime?: string;
  notes?: string;
  score?: number;
  category?: string;
}

export interface StrengthItem {
  title: string;
  desc: string;
}

export interface SuggestionItem {
  title: string;
  desc: string;
  priority: '高' | '中' | '低';
  actions: string[];
}

export interface AnalysisData {
  duration: string;
  rounds: number;
  score: number;
  passRate: number;
  strengths: StrengthItem[];
  weaknesses: StrengthItem[];
  qaList: QAItem[];
  suggestions: SuggestionItem[];
  quickSummary?: string;
}

interface RawFileShape {
  qa_pairs?: RawQAPair[];
  strengths?: RawStrength[];
  improvements?: RawStrength[];
  quick_summary?: string;
  suggestions?: RawSuggestion[];
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const normalizePriority = (priority?: string): '高' | '中' | '低' => {
  if (!priority) return '中';
  if (priority.includes('高')) return '高';
  if (priority.includes('低')) return '低';
  return '中';
};

export function getMockAnalysisData(params?: { durationSeconds?: number; durationText?: string }): AnalysisData {
  const raw = rawData as RawFileShape;
  const duration =
    params?.durationText ||
    formatDuration(params?.durationSeconds) ||
    '45分32秒';

  const qaList: QAItem[] = (raw.qa_pairs || []).map((qa) => ({
    id: qa.id,
    question: qa.question,
    questioner: qa.questioner,
    questionTime: qa.question_time,
    answer: qa.answer,
    answerer: qa.answerer,
    answerTime: qa.answer_time,
    notes: qa.notes,
  }));

  const strengths: StrengthItem[] = (raw.strengths || []).map((item) => ({
    title: item.title,
    desc: item.detail || '',
  }));

  const weaknesses: StrengthItem[] = (raw.improvements || []).map((item) => ({
    title: item.title,
    desc: item.detail || '',
  }));

  const suggestions: SuggestionItem[] = (raw.suggestions || []).map((item) => ({
    title: item.title,
    desc: item.description || '',
    priority: normalizePriority(item.priority),
    actions: item.actions || [],
  }));

  const rounds = qaList.length;
  const scoreBase = 65 + strengths.length * 3 - weaknesses.length * 2;
  const score = clamp(scoreBase, 45, 90);
  const passRate = clamp(score + 5, 35, 95);

  return {
    duration,
    rounds,
    score,
    passRate,
    strengths,
    weaknesses,
    qaList,
    suggestions,
    quickSummary: raw.quick_summary,
  };
}

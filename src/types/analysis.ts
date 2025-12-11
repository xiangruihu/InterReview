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
  generatedAt?: string;
}

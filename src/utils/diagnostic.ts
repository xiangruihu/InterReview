import type { AnalysisData, QAItem } from '../types/analysis';
import { requestFollowupQuestionsLLM, type LLMFollowupItem } from './llmClient';

export interface InterviewMetaLite {
  id: string;
  title?: string;
  company?: string;
  date?: string;
}

export interface HistoricalAnswerInsight {
  interview: string;
  date?: string;
  question: string;
  answer: string;
  score?: number;
}

export interface DerivedQuestionInsight {
  question: string;
  reason: string;
}

export interface QADiagnosticInsight {
  categoryLabel: string;
  topicLabel: string;
  historical: {
    similarAnswers: HistoricalAnswerInsight[];
    avgHistoricalScore: number;
    totalMatches: number;
  };
  derived: DerivedQuestionInsight[];
}

interface GenerateParams {
  qa: QAItem;
  analysisMap?: Record<string, AnalysisData>;
  interviews?: InterviewMetaLite[];
  currentInterviewId?: string;
}

type NormalizedCategory =
  | 'self_intro'
  | 'project'
  | 'tech_depth'
  | 'system_design'
  | 'algorithm'
  | 'behavior'
  | 'motivation'
  | 'company'
  | 'product'
  | 'closing'
  | 'other';

interface QARecord {
  qa: QAItem;
  interviewId: string;
  interviewTitle?: string;
  company?: string;
  date?: string;
  normalizedCategory: NormalizedCategory;
}

const CATEGORY_LABELS: Record<NormalizedCategory, string> = {
  self_intro: '自我介绍',
  project: '项目经验',
  tech_depth: '技术深度',
  system_design: '系统设计',
  algorithm: '算法与编码',
  behavior: '行为面试',
  motivation: '求职动机',
  company: '公司认知',
  product: '产品思维',
  closing: '收尾&反问',
  other: '综合问题',
};

const FOLLOW_UP_LIBRARY: Record<NormalizedCategory | 'default', DerivedQuestionInsight[]> = {
  self_intro: [
    { question: '能否结合一两个代表性项目，补充你在「{topic}」方面最有说服力的经历？', reason: '自我介绍后，面试官通常会追问能证明个人定位的具体案例。' },
    { question: '如果让你用一个指标衡量自己在这段经历里的成长，会选择什么？', reason: '考察候选人能否提炼经验并用数据量化。' },
    { question: '在这个背景下你目前最大的短板是什么？你打算怎么补？', reason: '面试官希望确认自省能力与改进计划。' },
  ],
  project: [
    { question: '在这个项目里你最关注的指标是什么？最终结果相较预期如何？', reason: '验证候选人是否以结果为导向，并有量化意识。' },
    { question: '如果项目时间再给你一次机会，你会如何重做最难的那部分？', reason: '考察复盘能力和可迁移经验。' },
    { question: '该项目中有哪些决策点是你主导的？当时的权衡逻辑是什么？', reason: '深入了解候选人的独立思考与影响力。' },
  ],
  tech_depth: [
    { question: '在这个技术方案之外，你还评估过哪些可选思路？', reason: '判断技术深度是否建立在全面调研和权衡之上。' },
    { question: '如果这个方案要扩展到 10 倍规模，最薄弱的环节会是什么？', reason: '考察系统性思考能力和风险意识。' },
    { question: '你能画出关键数据流/调用链吗？哪些节点最容易出问题？', reason: '面试官希望看到候选人的底层理解。' },
  ],
  system_design: [
    { question: '在高并发/高可用场景下，这套设计的瓶颈会出在哪里？', reason: '系统性问题通常会追问极端场景的鲁棒性。' },
    { question: '如果上线后指标异常，你的排查顺序会怎样？', reason: '考察运维意识与定位问题的方法论。' },
    { question: '这套架构里，你最担心的单点失败是什么？', reason: '让候选人展示对整体拓扑和假设的掌控力。' },
  ],
  algorithm: [
    { question: '这个算法有没有进一步优化空间？复杂度的瓶颈核心在哪？', reason: '算法题常被追问是否还有更优解或空间换时间。' },
    { question: '如果输入数据量更加「极端」，你会如何调整？', reason: '考察对边界情况和工程落地的考虑。' },
    { question: '有没有真实项目中用过类似思路？结果怎样？', reason: '评估算法知识是否能迁移到业务。' },
  ],
  behavior: [
    { question: '这类冲突/挑战你后来又遇到过吗？这次会怎么处理？', reason: '行为面试会验证经验能否指导后续行动。' },
    { question: '在团队中你的角色定位是什么？别人会如何评价？', reason: '深挖候选人的团队协作与影响力。' },
    { question: '如果结果不如预期，你通常如何复盘并给团队反馈？', reason: '考察复盘机制和沟通方式。' },
  ],
  motivation: [
    { question: '你如何判断一家公司/岗位真正吸引你的点是什么？', reason: '确认动机是否经过深思熟虑，而不是泛泛而谈。' },
    { question: '加入我们后，你希望 6 个月内验证哪件事？', reason: '面试官关注候选人是否已设定具体目标。' },
    { question: '如果要拿我们和其他 offer 做对比，你最看重哪些指标？', reason: '考察决策逻辑与匹配度。' },
  ],
  company: [
    { question: '我们近期哪项业务升级最吸引你？你会怎么参与？', reason: '检验候选人是否做过深入调研并有观点。' },
    { question: '针对 {category}，你觉得我们还可以如何优化？', reason: '追问候选人的行业洞察与建设性想法。' },
    { question: '如果加入团队，前三个月你会优先关注什么？', reason: '考察落地计划与行动优先级。' },
  ],
  product: [
    { question: '这个产品背后的用户画像和核心场景是什么？', reason: '面试官会追问候选人对业务上下文的思考。' },
    { question: '如果要设计指标体系，你会选哪些关键指标？', reason: '检验候选人是否具备数据驱动意识。' },
    { question: '你如何判断一次产品迭代是否成功？', reason: '了解复盘框架与因果拆解能力。' },
  ],
  closing: [
    { question: '你还想了解我们团队的哪一块细节？', reason: '引导候选人准备更深入的反向提问。' },
    { question: '如果拿到 offer，你最想先确认哪些合作机制？', reason: '检验对团队流程与沟通的关注。' },
    { question: '是否还有其他顾虑需要我们补充说明？', reason: '确保双方信息对齐、防止遗留问题。' },
  ],
  default: [
    { question: '能否补充一个更具挑战性的案例，说明你如何解决？', reason: '多数问题都可以进一步追问更高难度的经历。' },
    { question: '如果换一个完全不同的业务场景，你的思路会改变吗？', reason: '考察方法论是否具备迁移性。' },
    { question: '这件事对团队/业务有什么可复用的经验？', reason: '鼓励候选人沉淀复盘结论。' },
  ],
};

export async function analyzeQADiagnosticInsight(params: GenerateParams): Promise<QADiagnosticInsight> {
  const { qa, analysisMap, interviews, currentInterviewId } = params;
  const mergedAnalysis = analysisMap || {};
  const records = collectRecords(mergedAnalysis, interviews);
  const normalizedCategory = normalizeCategory(qa.category, qa.question);
  const topicLabel = extractTopicLabel(qa.question);
  const currentScore = typeof qa.score === 'number' ? qa.score : undefined;

  const { matches, totalMatches } = selectSimilarRecords({
    records,
    normalizedCategory,
    currentQuestion: qa.question,
    currentInterviewId,
    currentQaId: qa.id,
    currentScore,
  });

  const avgHistoricalScore = computeAverageScore(matches, records, currentScore);
  const historicalAnswers = matches.slice(0, 3).map((record) => ({
    interview: formatInterviewLabel(record),
    date: formatDateLabel(record.date),
    question: record.qa.question,
    answer: record.qa.answer,
    score: typeof record.qa.score === 'number' ? Math.round(record.qa.score) : undefined,
  }));

  const followUps = await resolveFollowUpQuestions({
    normalizedCategory,
    topicLabel,
    qa,
    matches,
  });

  return {
    categoryLabel: getCategoryLabel(normalizedCategory, qa.category),
    topicLabel,
    historical: {
      similarAnswers: historicalAnswers,
      avgHistoricalScore,
      totalMatches,
    },
    derived: followUps,
  };
}

function collectRecords(
  analysisMap: Record<string, AnalysisData>,
  interviews?: InterviewMetaLite[]
): QARecord[] {
  const metaMap = new Map<string, InterviewMetaLite>();
  (interviews || []).forEach((meta) => {
    if (meta?.id) {
      metaMap.set(meta.id, meta);
    }
  });

  const records: QARecord[] = [];

  Object.entries(analysisMap || {}).forEach(([interviewId, report]) => {
    const qaList = report?.qaList || [];
    const meta = metaMap.get(interviewId);
    qaList.forEach((qa) => {
      if (!qa || !qa.question) return;
      records.push({
        qa,
        interviewId,
        interviewTitle: meta?.title,
        company: meta?.company,
        date: meta?.date || report?.generatedAt,
        normalizedCategory: normalizeCategory(qa.category, qa.question),
      });
    });
  });

  return records;
}

function selectSimilarRecords(params: {
  records: QARecord[];
  normalizedCategory: NormalizedCategory;
  currentQuestion: string;
  currentInterviewId?: string;
  currentQaId?: number;
  currentScore?: number;
}): { matches: QARecord[]; totalMatches: number } {
  const {
    records,
    normalizedCategory,
    currentQuestion,
    currentInterviewId,
    currentQaId,
    currentScore,
  } = params;

  if (!records.length) {
    return { matches: [], totalMatches: 0 };
  }

  const sanitizedQuestion = currentQuestion || '';
  const baseline = records
    .filter((record) => {
      if (!record.qa || !record.qa.question) return false;
      if (record.interviewId === currentInterviewId && record.qa.id === currentQaId) return false;
      return true;
    })
    .map((record) => {
      const similarity = calculateTextSimilarity(sanitizedQuestion, record.qa.question);
      const categoryBoost = record.normalizedCategory === normalizedCategory ? 0.35 : 0;
      const scoreBonus =
        typeof currentScore === 'number' && typeof record.qa.score === 'number'
          ? 0.2 * (1 - Math.min(Math.abs(currentScore - record.qa.score) / 40, 1))
          : 0;
      const recencyBonus = computeRecencyBonus(record.date);
      const weight = similarity + categoryBoost + scoreBonus + recencyBonus;
      return { record, weight };
    })
    .sort((a, b) => b.weight - a.weight);

  let filtered = baseline.filter((item) => item.weight > 0.2);
  if (!filtered.length) {
    filtered = baseline.slice(0, 5);
  }

  return {
    matches: filtered.map((item) => item.record),
    totalMatches: baseline.length,
  };
}

function computeAverageScore(
  matches: QARecord[],
  records: QARecord[],
  currentScore?: number
): number {
  const source = matches.length ? matches : records;
  const values = source
    .map((item) => (typeof item.qa.score === 'number' ? item.qa.score : undefined))
    .filter((value): value is number => typeof value === 'number');

  if (values.length === 0) {
    return typeof currentScore === 'number' ? currentScore : 0;
  }

  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(avg);
}

function generateFollowUpQuestionsFromTemplates(
  normalizedCategory: NormalizedCategory,
  topicLabel: string
): DerivedQuestionInsight[] {
  const templates = FOLLOW_UP_LIBRARY[normalizedCategory] || FOLLOW_UP_LIBRARY.default;

  return templates.slice(0, 3).map((template) => ({
    question: template.question
      .replace('{topic}', topicLabel || '该话题')
      .replace('{category}', CATEGORY_LABELS[normalizedCategory] || '这个主题'),
    reason: template.reason
      .replace('{topic}', topicLabel || '该话题')
      .replace('{category}', CATEGORY_LABELS[normalizedCategory] || '这个主题'),
  }));
}

async function resolveFollowUpQuestions(params: {
  normalizedCategory: NormalizedCategory;
  topicLabel: string;
  qa: QAItem;
  matches: QARecord[];
}): Promise<DerivedQuestionInsight[]> {
  const { normalizedCategory, topicLabel, qa, matches } = params;

  const historySummary = matches.slice(0, 3).map((record) => {
    const scoreText =
      typeof record.qa.score === 'number' ? `（${record.qa.score}分）` : '';
    return `问：${record.qa.question}${scoreText}\n答：${record.qa.answer}`;
  });

  const llmCandidates = await requestFollowupQuestionsLLM({
    question: qa.question,
    answer: qa.answer,
    category: qa.category || CATEGORY_LABELS[normalizedCategory],
    topic: topicLabel,
    score: typeof qa.score === 'number' ? qa.score : undefined,
    history: historySummary,
  });

  if (llmCandidates && llmCandidates.length > 0) {
    return normalizeLLMFollowups(llmCandidates, normalizedCategory, topicLabel);
  }

  return generateFollowUpQuestionsFromTemplates(normalizedCategory, topicLabel);
}

function normalizeLLMFollowups(
  followups: LLMFollowupItem[],
  normalizedCategory: NormalizedCategory,
  topicLabel: string
): DerivedQuestionInsight[] {
  const fallbackReason = `围绕${CATEGORY_LABELS[normalizedCategory] || '该主题'}的深入问题，帮助评估你的思考深度。`;

  return followups
    .map((item) => ({
      question: (item.question || '').trim(),
      reason:
        (item.reason || '').trim() ||
        fallbackReason.replace('{topic}', topicLabel || '该话题'),
    }))
    .filter((item) => item.question)
    .slice(0, 3);
}

function normalizeCategory(category?: string, question?: string): NormalizedCategory {
  const source = `${category || ''}${question || ''}`.toLowerCase();
  if (!source.trim()) return 'other';

  if (source.includes('自我') || source.includes('self')) return 'self_intro';
  if (source.includes('项目') || source.includes('project')) return 'project';
  if (source.includes('架构') || source.includes('系统设计') || source.includes('system'))
    return 'system_design';
  if (
    source.includes('算法') ||
    source.includes('复杂度') ||
    source.includes('leetcode') ||
    source.includes('coding')
  )
    return 'algorithm';
  if (
    source.includes('技术') ||
    source.includes('原理') ||
    source.includes('性能') ||
    source.includes('优化')
  )
    return 'tech_depth';
  if (
    source.includes('冲突') ||
    source.includes('合作') ||
    source.includes('沟通') ||
    source.includes('失败') ||
    source.includes('复盘')
  )
    return 'behavior';
  if (source.includes('动机') || source.includes('why us') || source.includes('为什么选择'))
    return 'motivation';
  if (source.includes('公司') || source.includes('业务') || source.includes('行业'))
    return 'company';
  if (source.includes('产品') || source.includes('体验')) return 'product';
  if (source.includes('反问') || source.includes('提问') || source.includes('closing'))
    return 'closing';

  return 'other';
}

function getCategoryLabel(normalized: NormalizedCategory, fallback?: string): string {
  return fallback || CATEGORY_LABELS[normalized] || CATEGORY_LABELS.other;
}

function extractTopicLabel(question?: string): string {
  if (!question) return '该话题';
  const cleaned = question
    .replace(/^[^A-Za-z0-9\u4e00-\u9fa5]+/, '')
    .replace(/[?？。\s]+$/g, '')
    .trim();
  if (!cleaned) return '该话题';
  return cleaned.length > 18 ? `${cleaned.slice(0, 18)}…` : cleaned;
}

function formatDateLabel(date?: string): string | undefined {
  if (!date) return undefined;
  const parsed = new Date(date);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  const simple = date.split('T')[0];
  return simple || undefined;
}

function formatInterviewLabel(record: QARecord): string {
  if (record.interviewTitle) return record.interviewTitle;
  if (record.company) return `${record.company}面试`;
  return `面试 ${record.interviewId.slice(0, 6)}`;
}

function buildTextShingles(text: string): string[] {
  const cleaned = (text || '')
    .replace(/[\r\n]+/g, '')
    .replace(/[，,。.!？?、；;：“”"''（）()]/g, '')
    .trim();
  if (!cleaned) return [];
  const size = cleaned.length <= 4 ? 1 : 2;
  const shingles: string[] = [];
  for (let i = 0; i <= cleaned.length - size; i += 1) {
    shingles.push(cleaned.slice(i, i + size));
  }
  return shingles;
}

function calculateTextSimilarity(textA: string, textB: string): number {
  const tokensA = buildTextShingles(textA);
  const tokensB = buildTextShingles(textB);
  if (!tokensA.length || !tokensB.length) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  setA.forEach((token) => {
    if (setB.has(token)) intersection += 1;
  });
  const unionSize = new Set([...tokensA, ...tokensB]).size || 1;
  return intersection / unionSize;
}

function computeRecencyBonus(rawDate?: string): number {
  if (!rawDate) return 0;
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return 0;
  const diffDays = Math.max(1, (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
  return Math.min(0.2, 0.2 / diffDays);
}

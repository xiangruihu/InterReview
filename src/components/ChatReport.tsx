import {
  Sparkles,
  User,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Target,
  Clock,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Download,
  FileText,
  BarChart3,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Share2,
  X,
  Image as ImageIcon,
  FileCode,
  Edit2,
  Check,
  Briefcase,
  Building2,
  Calendar,
  Brain,
  History,
  HelpCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ExportModal } from './ExportModal';
import { ExportQuestionsModal } from './ExportQuestionsModal';
import { ExportReportModal } from './ExportReportModal';
import { formatDuration } from '../utils/time';
import type { AnalysisData, QAItem, SuggestionItem } from '../types/analysis';
import { toast } from 'sonner@2.0.3';
import { analyzeQADiagnosticInsight, type QADiagnosticInsight } from '../utils/diagnostic';

interface InterviewData {
  id: string;
  title: string;
  company: string;
  position: string;
  status: '待上传' | '上传中' | '已上传文件' | '分析中' | '已完成' | '分析失败';
  date: string;
  transcriptText?: string;
  durationSeconds?: number;
  durationText?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  type?: 'text' | 'report-summary' | 'qa-detail' | 'suggestions' | 'full-report';
  data?: any;
}

const defaultAnalysisData: AnalysisData = {
  duration: '45分32秒',
  rounds: 12,
  score: 72,
  passRate: 65,
  quickSummary: '技术能力扎实，但需要更充分的公司调研与结构化表达。',
  strengths: [
    { title: '技术深度扎实', desc: '对 React 生态、性能优化等问题回答专业' },
    { title: '逻辑思维清晰', desc: '问题分析有条理，解决方案完整' },
    { title: '项目经验丰富', desc: '有多个完整项目的实战经历' }
  ],
  weaknesses: [
    { title: '对公司了解不足', desc: '建议提前深入研究目标公司的业务和文化' },
    { title: '回答缺少量化数据', desc: '用具体数字展示项目成果会更有说服力' },
    { title: '有些回答过于简短', desc: '可以用 STAR 法则让回答更结构化' }
  ],
  qaList: [
    {
      id: 1,
      question: '请简单介绍一下你自己',
      answer: '我是一名前端开发工程师，有两年的实习经验。主要使用 React 技术栈，做过几个完整的项目...',
      score: 70,
      category: '自我介绍',
      notes: '建议补充更具体的成绩和量化指标。'
    },
    {
      id: 2,
      question: '请介绍一下你最近做的项目',
      answer: '我最近做了一个电商后台管理系统，主要负责前端开发。使用了 React 和 TypeScript，实现了商品管理、订单管理等功能...',
      score: 75,
      category: '项目经验',
      notes: '整体逻辑清晰，可加强指标说明。'
    },
    {
      id: 3,
      question: '你在项目中遇到过什么技术难点？如何解决的？',
      answer: '遇到过一个内存泄漏的问题，后来通过 Chrome DevTools 定位到是某个组件的事件监听器没有清理...',
      score: 82,
      category: '技术深度',
      notes: '解决方案严谨，表达得当。'
    }
  ],
  suggestions: [
    {
      title: '深入了解目标公司',
      desc: '面试前至少花 2 小时研究公司',
      priority: '高',
      actions: [
        '阅读公司官网、产品介绍、技术博客',
        '搜索公司近 3 个月的新闻和动态',
        '在社区了解公司文化和面试经验',
        '准备 2-3 个与公司相关的问题'
      ]
    },
    {
      title: '使用 STAR 法则重构项目经历',
      desc: '让项目描述更有说服力',
      priority: '高',
      actions: [
        'Situation：简述项目背景（1-2句话）',
        'Task：说明你的职责和要解决的问题',
        'Action：详细描述你的具体行动和技术方案',
        'Result：用数据量化成果（如性能提升 X%）'
      ]
    },
    {
      title: '加强行为面试题的准备',
      desc: '提前准备常见问题的回答',
      priority: '中',
      actions: [
        '准备 3-5 个核心项目经历，可从不同角度展开',
        '准备应对挫折、团队合作、冲突解决等场景',
        '每个故事都要有具体细节和个人思考',
        '控制在 2-3 分钟内，避免冗长'
      ]
    }
  ]
};

interface ChatReportProps {
  interviewData?: InterviewData;
  analysisData?: AnalysisData;
  onUpdateInterview: (data: Partial<InterviewData>) => void;
  allAnalysisData?: Record<string, AnalysisData>;
  interviews?: InterviewData[];
}

export function ChatReport({
  interviewData,
  analysisData,
  onUpdateInterview,
  allAnalysisData,
  interviews,
}: ChatReportProps) {
  const resolvedReportData = analysisData || defaultAnalysisData;
  const messages = useMemo<Message[]>(() => [
    {
      id: '1',
      role: 'assistant',
      content: '',
      timestamp: '16:45',
      type: 'full-report',
      data: resolvedReportData,
    },
  ], [resolvedReportData]);

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div key={message.id}>
          {message.role === 'user' ? (
            <UserMessage message={message} />
          ) : (
            <AssistantMessage 
              message={message} 
              interviewData={interviewData}
              onUpdateInterview={onUpdateInterview}
              historyAnalysis={allAnalysisData}
              interviewList={interviews}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function UserMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-end">
      <div className="flex items-start gap-3 max-w-[80%]">
        <div className="flex-1">
          <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3">
            <p className="text-sm leading-relaxed">{message.content}</p>
          </div>
          <div className="text-xs text-gray-400 mt-1">{message.timestamp}</div>
        </div>
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-gray-600" />
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({
  message,
  interviewData,
  onUpdateInterview,
  historyAnalysis,
  interviewList,
}: {
  message: Message;
  interviewData?: InterviewData;
  onUpdateInterview: (data: Partial<InterviewData>) => void;
  historyAnalysis?: Record<string, AnalysisData>;
  interviewList?: InterviewData[];
}) {
  return (
    <div className="flex justify-start">
      <div className="flex items-start gap-3 max-w-[90%]">
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-5 py-4">
            {message.type === 'full-report' && (
              <FullReportContent
                data={message.data as AnalysisData}
                interviewData={interviewData}
                onUpdateInterview={onUpdateInterview}
                historyAnalysis={historyAnalysis}
                interviewList={interviewList}
                currentInterviewId={interviewData?.id}
              />
            )}
            {message.type === 'report-summary' && (
              <ReportSummaryContent 
                data={{
                  ...message.data,
                  duration: interviewData?.durationText || formatDuration(interviewData?.durationSeconds) || message.data?.duration
                }}
              />
            )}
            {message.type === 'qa-detail' && (
              <QADetailContent data={message.data} />
            )}
            {message.type === 'suggestions' && (
              <SuggestionsContent data={message.data} />
            )}
            {message.type === 'text' && (
              <p className="text-sm text-gray-800 leading-relaxed">{message.content}</p>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-400">{message.timestamp}</span>
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button className="text-gray-400 hover:text-green-600 transition-colors">
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button className="text-gray-400 hover:text-red-600 transition-colors">
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportSummaryContent({ data }: { data: any }) {
  const safeData = data || {};
  const strengths = safeData.strengths || [];
  const weaknesses = safeData.weaknesses || [];
  const rounds = Array.isArray(safeData.qaList)
    ? safeData.qaList.length
    : safeData.rounds || 0;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-gray-900 mb-1">分析完成！这是你的面试表现总结 ✨</h3>
        <p className="text-sm text-gray-600">
          我已经完成了对你这场面试的详细分析，以下是关键数据和建议：
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs">面试时长</span>
          </div>
          <div className="text-gray-900 text-sm">{safeData.duration}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-xs">问答轮次</span>
          </div>
          <div className="text-gray-900 text-sm">{rounds} 轮</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Target className="w-3.5 h-3.5" />
            <span className="text-xs">综合评分</span>
          </div>
          <div className="text-blue-600 text-sm">{safeData.score} / 100</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-xs">通过概率</span>
          </div>
          <div className="text-green-600 text-sm">{safeData.passRate}%</div>
        </div>
      </div>

      {/* Strengths */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-green-600" />
          </div>
          <h4 className="text-gray-900 text-sm">表现优秀的方面</h4>
        </div>
        <div className="space-y-2">
          {strengths.map((item: any, index: number) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <span className="text-green-600 mt-0.5">•</span>
              <div>
                <span className="text-gray-900">{item.title}</span>
                <span className="text-gray-500"> - {item.desc || item.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weaknesses */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center">
            <TrendingDown className="w-3.5 h-3.5 text-orange-600" />
          </div>
          <h4 className="text-gray-900 text-sm">需要改进的地方</h4>
        </div>
        <div className="space-y-2">
          {weaknesses.map((item: any, index: number) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <span className="text-orange-600 mt-0.5">•</span>
              <div>
                <span className="text-gray-900">{item.title}</span>
                <span className="text-gray-500"> - {item.desc || item.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {safeData.quickSummary && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <h5 className="text-gray-900 text-sm mb-2">💡 快速总结</h5>
          <p className="text-sm text-gray-700 leading-relaxed">
            {safeData.quickSummary}
          </p>
        </div>
      )}

      <div className="pt-3 border-t border-gray-100">
        <p className="text-sm text-gray-600">
          💡 你可以问我任何问题，比如："详细分析某个问题的回答"、"给我改进建议"、"预测下一轮面试"等
        </p>
      </div>
    </div>
  );
}

function QADetailContent({ data }: { data: Partial<QAItem> & { analysis?: string; improvedAnswer?: string } }) {
  if (!data) return null;

  const metaInfo = [
    data.questioner ? data.questioner : null,
    data.questionTime ? `@ ${data.questionTime}` : null,
  ].filter(Boolean).join(' ');

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-gray-900 mb-2">问题分析</h4>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
          <div className="text-sm text-gray-700 mb-1">
            <span className="text-gray-500">Q: </span>
            {data.question}
          </div>
          {metaInfo && (
            <div className="text-xs text-gray-500">{metaInfo}</div>
          )}
          {typeof data.score === 'number' && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500">得分：</span>
              <span className={`px-2 py-0.5 rounded text-xs ${
                data.score >= 80 ? 'bg-green-100 text-green-700' :
                data.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {data.score}
              </span>
            </div>
          )}
        </div>
      </div>

      <div>
        <h5 className="text-gray-700 text-sm mb-2">你的回答：</h5>
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed">
          {data.yourAnswer || data.answer}
        </div>
        {(data.answerer || data.answerTime) && (
          <div className="text-xs text-gray-400 mt-1">
            {data.answerer && <span>{data.answerer}</span>}
            {data.answerTime && <span className="ml-1">@ {data.answerTime}</span>}
          </div>
        )}
      </div>

      {data.analysis && (
        <div>
          <h5 className="text-gray-700 text-sm mb-2">分析：</h5>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {data.analysis}
          </div>
        </div>
      )}

      {data.improvedAnswer && (
        <div>
          <h5 className="text-green-700 text-sm mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            优化后的回答示例：
          </h5>
          <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {(() => {
              const cleanText = (text: string) => {
                if (!text) return '';
                return text
                  .replace(/\uFFFD/g, '')
                  .replace(/[""]/g, '"')
                  .replace(/['']/g, "'")
                  .replace(/…/g, '...')
                  .replace(/—/g, '-')
                  .replace(/–/g, '-')
                  .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
              };
              return cleanText(data.improvedAnswer || '');
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function SuggestionsContent({ data }: { data: any }) {
  const priorityColors: Record<string, string> = {
    '高': 'bg-red-100 text-red-700',
    '中': 'bg-yellow-100 text-yellow-700',
    '低': 'bg-green-100 text-green-700'
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-gray-900 mb-1">最需要改进的 3 个方面</h4>
        <p className="text-sm text-gray-600">
          根据你的表现，我建议优先关注以几点：
        </p>
      </div>

      {data.suggestions.map((item: any, index: number) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                {index + 1}
              </div>
              <div>
                <h5 className="text-gray-900">{item.title}</h5>
                <p className="text-sm text-gray-600 mt-0.5">{item.desc || item.description}</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-xs ${priorityColors[item.priority] || 'bg-gray-100 text-gray-700'}`}>
              {item.priority}优先级
            </span>
          </div>
          <div className="pl-8">
            <div className="text-sm text-gray-700">
              <div className="mb-1">具体行动：</div>
              <ul className="space-y-1">
                {item.actions.map((action: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span className="flex-1 text-gray-600">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FullReportContent({
  data,
  interviewData,
  onUpdateInterview,
  historyAnalysis,
  interviewList,
  currentInterviewId,
}: {
  data: AnalysisData;
  interviewData?: InterviewData;
  onUpdateInterview: (data: Partial<InterviewData>) => void;
  historyAnalysis?: Record<string, AnalysisData>;
  interviewList?: InterviewData[];
  currentInterviewId?: string;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'qa' | 'analysis' | 'suggestions'>('overview');
  const [expandedQA, setExpandedQA] = useState<number | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showExportQuestionsModal, setShowExportQuestionsModal] = useState(false);
  const [showExportReportModal, setShowExportReportModal] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  
  // Use interview data from props or fallback to defaults
  const [tempInfo, setTempInfo] = useState({
    title: interviewData?.title || '字节跳动前端一面',
    company: interviewData?.company || '字节跳动',
    position: interviewData?.position || '前端开发工程师',
    date: interviewData?.date || '2024-03-15T14:00'
  });
  const [diagnosticQA, setDiagnosticQA] = useState<number | null>(null);
  const [loadingDiagnostic, setLoadingDiagnostic] = useState(false);
  const [diagnosticCache, setDiagnosticCache] = useState<Record<number, QADiagnosticInsight>>({});

  const mergedAnalysisMap = useMemo(() => {
    const base: Record<string, AnalysisData> = { ...(historyAnalysis || {}) };
    if (currentInterviewId && data) {
      base[currentInterviewId] = data;
    }
    return base;
  }, [historyAnalysis, currentInterviewId, data]);

  const handleSaveInfo = () => {
    // Update parent state
    onUpdateInterview({
      title: tempInfo.title,
      company: tempInfo.company,
      position: tempInfo.position,
      date: tempInfo.date
    });
    setIsEditingInfo(false);
  };

  const handleCancelEdit = () => {
    // Reset to current interview data
    setTempInfo({
      title: interviewData?.title || '字节跳动前端一面',
      company: interviewData?.company || '字节跳动',
      position: interviewData?.position || '前端开发工程师',
      date: interviewData?.date || '2024-03-15T14:00'
    });
    setIsEditingInfo(false);
  };

  const handleDiagnosticRequest = async (qa: QAItem) => {
    if (!qa?.id) return;

    if (diagnosticQA === qa.id && !loadingDiagnostic) {
      setDiagnosticQA(null);
      return;
    }

    if (diagnosticCache[qa.id]) {
      setDiagnosticQA(qa.id);
      return;
    }

    try {
      setDiagnosticQA(qa.id);
      setLoadingDiagnostic(true);
      await new Promise((resolve) => setTimeout(resolve, 150));
      const insight = await analyzeQADiagnosticInsight({
        qa,
        analysisMap: mergedAnalysisMap,
        interviews: interviewList,
        currentInterviewId,
      });
      setDiagnosticCache((prev) => ({ ...prev, [qa.id]: insight }));
    } catch (error) {
      console.error('[diagnostic] failed', error);
      setDiagnosticQA(null);
      toast.error('诊断失败', {
        description: error instanceof Error ? error.message : '请稍后重试',
      });
    } finally {
      setLoadingDiagnostic(false);
    }
  };

  // Format date for display (only show date, not time)
  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    // Remove time part for display
    const datePart = dateStr.split('T')[0];
    const date = new Date(datePart);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const tabs = [
    { id: 'overview' as const, label: '概览', icon: Target },
    { id: 'qa' as const, label: '完整问答', icon: MessageSquare },
    { id: 'analysis' as const, label: '数据分析', icon: BarChart3 },
    { id: 'suggestions' as const, label: '改进建议', icon: Lightbulb }
  ];
  const resolvedDurationText =
    interviewData?.durationText ||
    formatDuration(interviewData?.durationSeconds) ||
    data?.duration;
  const baseReportData = resolvedDurationText
    ? { ...(data || {}), duration: resolvedDurationText }
    : (data || {});
  const normalizedRounds = Array.isArray(baseReportData.qaList)
    ? baseReportData.qaList.length
    : baseReportData.rounds || 0;
  const reportData = { ...baseReportData, rounds: normalizedRounds };
  const overviewData = { ...reportData };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-gray-900 mb-1">面试分析报告已生成 ✨</h3>
          <p className="text-sm text-gray-600">
            我已经完成了对你这场面试的全面分析，包含 {reportData.rounds} 个问答、关键数据统计和改进建议
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowExportReportModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs transition-colors flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            导出报告
          </button>
          <button 
            onClick={() => setShowExportModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs transition-colors flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5" />
            分享面经
          </button>
        </div>
      </div>

      {/* Interview Info Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start justify-between mb-3">
          <h4 className="text-gray-900 text-sm flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600" />
            面试信息
          </h4>
          {!isEditingInfo ? (
            <button
              onClick={() => setIsEditingInfo(true)}
              className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1 transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              编辑
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancelEdit}
                className="text-gray-600 hover:text-gray-700 text-xs flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" />
                取消
              </button>
              <button
                onClick={handleSaveInfo}
                className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1 transition-colors"
              >
                <Check className="w-3 h-3" />
                保存
              </button>
            </div>
          )}
        </div>

        {!isEditingInfo ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <FileText className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500">面试名称</div>
                <div className="text-sm text-gray-900 mt-0.5">{interviewData?.title || tempInfo.title}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500">面试时间</div>
                <div className="text-sm text-gray-900 mt-0.5">{formatDateForDisplay(interviewData?.date || tempInfo.date)}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500">公司名称</div>
                <div className="text-sm text-gray-900 mt-0.5">{interviewData?.company || tempInfo.company}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Briefcase className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500">岗位名称</div>
                <div className="text-sm text-gray-900 mt-0.5">{interviewData?.position || tempInfo.position}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">面试名称</label>
              <input
                type="text"
                value={tempInfo.title}
                onChange={(e) => setTempInfo({ ...tempInfo, title: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例如：字节跳动前端一面"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">公司名称</label>
                <input
                  type="text"
                  value={tempInfo.company}
                  onChange={(e) => setTempInfo({ ...tempInfo, company: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例如：字节跳动"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">岗位名称</label>
                <input
                  type="text"
                  value={tempInfo.position}
                  onChange={(e) => setTempInfo({ ...tempInfo, position: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例如：前端开发工程师"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                面试时间
              </label>
              <input
                type="datetime-local"
                value={tempInfo.date}
                onChange={(e) => setTempInfo({ ...tempInfo, date: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm transition-colors flex items-center gap-2 border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'overview' && <OverviewTab data={overviewData} />}
        {activeTab === 'qa' && (
          <QAListTab
            qaList={reportData.qaList}
            expandedQA={expandedQA}
            setExpandedQA={setExpandedQA}
            diagnosticQA={diagnosticQA}
            diagnosticDataMap={diagnosticCache}
            loadingDiagnostic={loadingDiagnostic}
            onDiagnosticRequest={handleDiagnosticRequest}
          />
        )}
        {activeTab === 'analysis' && <AnalysisTab data={reportData} />}
        {activeTab === 'suggestions' && <SuggestionsTab suggestions={reportData.suggestions} />}
      </div>

      {/* Export Modal */}
      <ExportModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        data={{
          ...reportData,
          title: interviewData?.title || tempInfo.title
        }}
      />
      <ExportQuestionsModal 
        isOpen={showExportQuestionsModal}
        onClose={() => setShowExportQuestionsModal(false)}
        data={reportData}
      />
      <ExportReportModal 
        isOpen={showExportReportModal}
        onClose={() => setShowExportReportModal(false)}
        data={reportData}
      />
    </div>
  );
}

function OverviewTab({ data }: { data: any }) {
  const safeData = data || {};
  const rounds = Array.isArray(safeData.qaList)
    ? safeData.qaList.length
    : safeData.rounds || 0;
  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs">面试时长</span>
          </div>
          <div className="text-gray-900 text-sm">{safeData.duration}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-xs">问答轮次</span>
          </div>
          <div className="text-gray-900 text-sm">{rounds} 轮</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Target className="w-3.5 h-3.5" />
            <span className="text-xs">综合评分</span>
          </div>
          <div className="text-blue-600 text-sm">{safeData.score} / 100</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-xs">通过概率</span>
          </div>
          <div className="text-green-600 text-sm">{safeData.passRate}%</div>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-green-600" />
            </div>
            <h4 className="text-gray-900 text-sm">表现优秀的方面</h4>
          </div>
          <div className="space-y-2">
            {(safeData.strengths || []).map((item: any, index: number) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <span className="text-green-600 mt-0.5">•</span>
                <div>
                  <span className="text-gray-900">{item.title}</span>
                  <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5 text-orange-600" />
            </div>
            <h4 className="text-gray-900 text-sm">需要改进的地方</h4>
          </div>
          <div className="space-y-2">
            {(safeData.weaknesses || []).map((item: any, index: number) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <span className="text-orange-600 mt-0.5">•</span>
                <div>
                  <span className="text-gray-900">{item.title}</span>
                  <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Summary */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <h5 className="text-gray-900 text-sm mb-2">💡 快速总结</h5>
        <p className="text-sm text-gray-700 leading-relaxed">
          {safeData.quickSummary || '你的技术能力整体不错，但仍有一些需要改进的地方。'}
        </p>
      </div>
    </div>
  );
}

function QAListTab({
  qaList,
  expandedQA,
  setExpandedQA,
  diagnosticQA,
  diagnosticDataMap,
  loadingDiagnostic,
  onDiagnosticRequest,
}: {
  qaList: QAItem[];
  expandedQA: number | null;
  setExpandedQA: (id: number | null) => void;
  diagnosticQA: number | null;
  diagnosticDataMap: Record<number, QADiagnosticInsight>;
  loadingDiagnostic: boolean;
  onDiagnosticRequest: (qa: QAItem) => void;
}) {
  if (!qaList || qaList.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        暂无问答记录
      </div>
    );
  }

  const getPriorityBadge = (score?: number) => {
    if (typeof score !== 'number') return '';
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const renderTrendMessage = (currentScore?: number, historicalScore?: number) => {
    if (typeof currentScore !== 'number' || typeof historicalScore !== 'number') {
      return '暂无足够的评分数据，建议多积累几场同类面试。';
    }
    const delta = Math.round(currentScore - historicalScore);
    if (delta >= 0) {
      return `本次得分 ${currentScore} 分，比历史平均（${historicalScore} 分）提升了 +${delta} 分，继续保持这个节奏 💪`;
    }
    return `本次得分 ${currentScore} 分，低于历史平均 ${historicalScore} 分 ${Math.abs(delta)} 分，建议优化答题结构。`;
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        共 {qaList.length} 个问答，点击展开查看详情
      </p>
      {qaList.map((qa) => {
        const diagData = diagnosticDataMap[qa.id];
        const isActiveDiagnostic = diagnosticQA === qa.id;
        const isLoadingThisDiagnostic = loadingDiagnostic && isActiveDiagnostic && !diagData;
        const disableDiagnosticButton = loadingDiagnostic && diagnosticQA !== qa.id;
        const displayCategory = diagData?.categoryLabel || qa.category || '该主题';

        return (
          <div key={qa.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedQA(expandedQA === qa.id ? null : qa.id)}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1 text-left">
                <span className="text-gray-500 text-sm">Q{qa.id}</span>
                <div className="flex-1">
                  <div className="text-gray-900 text-sm">{qa.question}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {qa.questioner && <span>{qa.questioner}</span>}
                    {qa.questionTime && <span className="ml-1">@ {qa.questionTime}</span>}
                  </div>
                </div>
                {qa.category && (
                  <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                    {qa.category}
                  </span>
                )}
                {typeof qa.score === 'number' && (
                  <span className={`px-2 py-0.5 rounded text-xs ${getPriorityBadge(qa.score)}`}>
                    {qa.score}分
                  </span>
                )}
              </div>
              {expandedQA === qa.id ? (
                <ChevronUp className="w-4 h-4 text-gray-400 ml-2" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400 ml-2" />
              )}
            </button>

            {expandedQA === qa.id && (
              <div className="px-4 py-4 bg-white space-y-4">
                <div>
                  <h6 className="text-xs text-gray-500 mb-2">候选人回答：</h6>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed">
                    {qa.answer}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {qa.answerer && <span>{qa.answerer}</span>}
                    {qa.answerTime && <span className="ml-1">@ {qa.answerTime}</span>}
                  </div>
                </div>

                {qa.notes && (
                  <div>
                    <h6 className="text-xs text-gray-500 mb-2">分析 / 复盘：</h6>
                    <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-sm text-gray-700 leading-relaxed">
                      {qa.notes}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-100">
                  <button
                    onClick={() => onDiagnosticRequest(qa)}
                    disabled={disableDiagnosticButton}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border border-purple-200 rounded-lg transition-all flex items-center justify-center gap-2 text-sm text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Brain className="w-4 h-4" />
                    {isLoadingThisDiagnostic
                      ? '诊断中...'
                      : isActiveDiagnostic
                      ? '收起诊断'
                      : '智能诊断分析'}
                  </button>
                </div>

                {isActiveDiagnostic && (
                  <div className="space-y-4 pt-2">
                    {isLoadingThisDiagnostic && !diagData ? (
                      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-3 text-xs text-gray-600">
                        AI 正在调取你的历史面试记录并分析，请稍候...
                      </div>
                    ) : diagData ? (
                      <>
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <History className="w-4 h-4 text-amber-600" />
                            <h6 className="text-sm text-amber-900">历史回答分析</h6>
                          </div>
                          <div className="space-y-3">
                            {diagData.historical.similarAnswers.length > 0 ? (
                              diagData.historical.similarAnswers.map((item, idx) => (
                                <div
                                  key={`${qa.id}-hist-${idx}`}
                                  className="bg-white rounded-lg p-3 border border-amber-100"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="text-xs text-gray-500">
                                        {item.interview}
                                        {item.date ? ` · ${item.date}` : ''}
                                      </div>
                                      <div className="text-sm text-gray-900 mt-1">
                                        {item.question}
                                      </div>
                                    </div>
                                    {typeof item.score === 'number' && (
                                      <span
                                        className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                          item.score >= 60
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-red-100 text-red-700'
                                        }`}
                                      >
                                        {item.score}分
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 mt-2 leading-relaxed">
                                    {item.answer}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="bg-white rounded-lg p-3 border border-dashed border-amber-200 text-xs text-amber-800">
                                暂无类似历史记录，继续积累更多面试即可生成趋势分析。
                              </div>
                            )}

                            <div className="bg-amber-100 border border-amber-200 rounded-lg p-3">
                              <div className="text-xs text-amber-900 leading-relaxed">
                                <span className="font-medium">📊 趋势分析：</span>
                                <span className="ml-1">
                                  {renderTrendMessage(qa.score, diagData.historical.avgHistoricalScore)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <HelpCircle className="w-4 h-4 text-blue-600" />
                            <h6 className="text-sm text-blue-900">可能的衍生追问</h6>
                          </div>
                          <p className="text-xs text-blue-700 mb-3">
                            基于「{displayCategory}」类型，面试官可能会继续深入追问：
                          </p>
                          <div className="space-y-2">
                            {diagData.derived.length > 0 ? (
                              diagData.derived.map((item, idx) => (
                                <div
                                  key={`${qa.id}-derived-${idx}`}
                                  className="bg-white rounded-lg p-3 border border-blue-100"
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                                      {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                      <div className="text-sm text-gray-900 mb-1">{item.question}</div>
                                      <div className="text-xs text-gray-500 leading-relaxed">
                                        <span className="text-blue-600 mr-1">→</span>
                                        {item.reason}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="bg-white rounded-lg p-3 border border-dashed border-blue-200 text-xs text-blue-800">
                                暂无推荐追问，建议梳理该类问题的常见延展方向。
                              </div>
                            )}
                          </div>
                          <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 mt-3">
                            <div className="text-xs text-blue-900 leading-relaxed">
                              <span className="font-medium">💡 准备建议：</span>
                              <span className="ml-1">
                                针对这些衍生问题提前准备答案，能大大提升面试的流畅度和深度。建议使用 STAR
                                法则（情境-任务-行动-结果）来组织回答。
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-3 text-xs text-gray-600">
                        暂无诊断数据，请稍后重试。
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AnalysisTab({ data }: { data: any }) {
  const categoryStats = [
    { category: '自介绍', count: 1, avgScore: 70, color: 'bg-purple-500' },
    { category: '项目经验', count: 1, avgScore: 75, color: 'bg-blue-500' },
    { category: '技术深度', count: 3, avgScore: 85, color: 'bg-green-500' },
    { category: '求职动机', count: 1, avgScore: 45, color: 'bg-orange-500' },
    { category: '反向提问', count: 1, avgScore: 65, color: 'bg-gray-500' }
  ];

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-gray-900 mb-3">各类问题得分分布</h4>
        <div className="space-y-3">
          {categoryStats.map((stat) => (
            <div key={stat.category}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">{stat.category}</span>
                  <span className="text-xs text-gray-500">({stat.count} 题)</span>
                </div>
                <span className="text-sm text-gray-900">{stat.avgScore}分</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${stat.color}`}
                  style={{ width: `${stat.avgScore}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-gray-900 mb-3">得分区间分布</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <div className="text-2xl text-red-600 mb-1">1</div>
            <div className="text-xs text-gray-600">&lt; 60 分（较差）</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <div className="text-2xl text-yellow-600 mb-1">3</div>
            <div className="text-xs text-gray-600">60-79 分（中等）</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-2xl text-green-600 mb-1">3</div>
            <div className="text-xs text-gray-600">≥ 80 分（优秀）</div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h5 className="text-gray-900 text-sm mb-2">📊 数据洞察</h5>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>你在"技术深度"类问题表现最好，平均得分 85 分</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-600">•</span>
            <span>你在"求职动机"类问题表现较弱，仅 45 分，需要重点准备</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600">•</span>
            <span>42.8% 的问题得分在 80 分以上，整体表现良好</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function SuggestionsTab({ suggestions }: { suggestions: SuggestionItem[] }) {
  const priorityColors: Record<string, string> = {
    '高': 'bg-red-100 text-red-700',
    '中': 'bg-yellow-100 text-yellow-700',
    '低': 'bg-green-100 text-green-700'
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        根据你的表现，我整理了以下改进建议，按优先级排序：
      </p>
      {suggestions.map((item: any, index: number) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                {index + 1}
              </div>
              <div>
                <h5 className="text-gray-900">{item.title}</h5>
                <p className="text-sm text-gray-600 mt-0.5">{item.desc}</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-xs ${priorityColors[item.priority] || 'bg-gray-100 text-gray-700'}`}>
              {item.priority}优先级
            </span>
          </div>
          <div className="pl-8">
            <div className="text-sm text-gray-700">
              <div className="mb-1 text-gray-900">具体行动：</div>
              <ul className="space-y-1">
                {item.actions.map((action: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span className="flex-1 text-gray-600">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

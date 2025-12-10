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
  Calendar
} from 'lucide-react';
import { useState } from 'react';
import { ExportModal } from './ExportModal';
import { ExportQuestionsModal } from './ExportQuestionsModal';
import { ExportReportModal } from './ExportReportModal';

interface InterviewData {
  id: string;
  title: string;
  company: string;
  position: string;
  status: '待上传' | '分析中' | '已完成';
  date: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  type?: 'text' | 'report-summary' | 'qa-detail' | 'suggestions' | 'full-report';
  data?: any;
}

interface ChatReportProps {
  interviewData?: InterviewData;
  onUpdateInterview: (data: Partial<InterviewData>) => void;
}

export function ChatReport({ interviewData, onUpdateInterview }: ChatReportProps) {
  const [messages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '',
      timestamp: '16:45',
      type: 'full-report',
      data: {
        duration: '45分32秒',
        rounds: 12,
        score: 72,
        passRate: 65,
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
            yourAnswer: '我是一名前端开发工程师，有两年的实习经验。主要使用 React 技术栈，做过几个完整的项目...',
            score: 70,
            category: '自我介绍'
          },
          {
            id: 2,
            question: '请介绍一下你最近做的项目',
            yourAnswer: '我最近做了一个电商后台管理系统，主要负责前端开发。使用了 React 和 TypeScript，实现了商品管理、订单管理等功能。在性能优化方面，我使用了虚拟滚动来处理大量数据的渲染...',
            score: 75,
            category: '项目经验'
          },
          {
            id: 3,
            question: '你在项目中遇到过什么技术难点？如何解决的？',
            yourAnswer: '遇到过一个内存泄漏的问题，后来通过 Chrome DevTools 定位到是某个组件的事件监听器没有清理。我在 useEffect 中添加了清理函数，问题就解决了。',
            score: 82,
            category: '技术深度'
          },
          {
            id: 4,
            question: '你对我们公司了解多少？为什么选择我们？',
            yourAnswer: '呃...我知道贵公司是做互联网的，规模挺大的...',
            score: 45,
            category: '求职动机'
          },
          {
            id: 5,
            question: 'React Hooks 的闭包陷阱你遇到过吗？',
            yourAnswer: '遇到过。主要是在 useEffect 或者 useCallback 中使用了外部变量，但没有加入依赖数组，导致获取到的是旧值。解决方法是要么把变量加入依赖数组，要么使用 useRef 来存储最新值。',
            score: 88,
            category: '技术深度'
          },
          {
            id: 6,
            question: '如何进行前端性能优化？',
            yourAnswer: '可以从几个方面：1. 代码层面：代码分割、懒加载、Tree Shaking 2. 资源层面：图片压缩、CDN、Gzip 3. 渲染层面：虚拟列表、防抖节流、memo 优化重渲染',
            score: 85,
            category: '技术深度'
          },
          {
            id: 7,
            question: '你有什么想问我的吗？',
            yourAnswer: '请问团队的技术栈是什么？有没有技术分享的文化？',
            score: 65,
            category: '反向提问'
          }
        ],
        suggestions: [
          {
            title: '深入了解目标公司',
            priority: '高',
            desc: '面试前至少花 2 小时研究公司',
            actions: [
              '阅读公司官网、产品介绍、技术博客',
              '搜索公司近 3 个月的新闻和动态',
              '在脉脉、知乎等平台了解公司文化和面试经验',
              '准备 2-3 个与公司相关的问题，体现你的兴趣'
            ]
          },
          {
            title: '使用 STAR 法则重构项目经历',
            priority: '高',
            desc: '让项目描述更有说服力',
            actions: [
              'Situation：简述项目背景（1-2句话）',
              'Task：说明你的职责和要解决的问题',
              'Action：详细描述你的具体行动和技术方案',
              'Result：用数据量化成果（如：性能提升X%，用户增长X%）'
            ]
          },
          {
            title: '加强行为面试题的准备',
            priority: '中',
            desc: '提前准备常见问题的回答',
            actions: [
              '准备 3-5 个核心项目经历，每个都能从不同角度展开',
              '准备应对挫折、团队合作、冲突解决等场景',
              '每个故事都要有具体细节和个人思考',
              '避免过于简短或过于冗长（控制在 2-3 分钟）'
            ]
          }
        ]
      }
    },
    {
      id: '2',
      role: 'user',
      content: '帮我详细分析一下第3个问题的回答',
      timestamp: '16:47',
      type: 'text'
    },
    {
      id: '3',
      role: 'assistant',
      content: '',
      timestamp: '16:47',
      type: 'qa-detail',
      data: {
        question: '你对我们公司了解多少？为什么选择我们？',
        yourAnswer: '呃...我知道贵公司是做互联网的，规模挺大的...',
        score: 45,
        analysis: '这个回答准备明显不足，体现出以下几个问题：\n\n1. **缺乏具体信息**：只说"做互联网的"过于笼统，没有展现出对公司的真正了解\n2. **缺乏诚意**："呃..."的开头和犹豫的语气给面试官留下了不好的印象\n3. **没有个人思考**：没有说明为什么选择这家公司，缺少个人职业规划的体现\n\n**改进建议：**\n\n提前做好功课，可以从以下几个维度准备：\n- 公司的核心产品和业务线（如：字节跳动的抖音、今日头条、飞书等）\n- 公司的技术特点和技术栈\n- 公司近期的重大新闻、融资或业务拓展\n- 公司文化和价值观（可以从官网、招聘页面了解）\n- 这个岗位具体做什么，为什么吸引你',
        improvedAnswer: '我对字节跳动一直很关注。贵公司旗下有抖音、今日头条等多个国民级产品，在推荐算法和大规模分发系统方面处于行业领先地位。\n\n我特别认同字节的"始终创业"文化，以及对技术创新的重视。我注意到贵司最近在 AI 和大模型方向投入很大，这和我的学习方向很契合。\n\n选择字节有几个原因：\n1. 技术氛围好，可以接触到海量数据和高并发场景\n2. 团队年轻有活力，成长空间大\n3. 前端技术栈（如 Modern.js）先进，能学到很多\n\n我希望能在字节这样的平台快速成长，参与到真正有影响力的产品中。'
      }
    }
  ]);

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

function AssistantMessage({ message, interviewData, onUpdateInterview }: { message: Message, interviewData?: InterviewData, onUpdateInterview: (data: Partial<InterviewData>) => void }) {
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
                data={message.data} 
                interviewData={interviewData}
                onUpdateInterview={onUpdateInterview}
              />
            )}
            {message.type === 'report-summary' && (
              <ReportSummaryContent data={message.data} />
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
          <div className="text-gray-900 text-sm">{data.duration}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-xs">问答轮次</span>
          </div>
          <div className="text-gray-900 text-sm">{data.rounds} 轮</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Target className="w-3.5 h-3.5" />
            <span className="text-xs">综合评分</span>
          </div>
          <div className="text-blue-600 text-sm">{data.score} / 100</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-xs">通过概率</span>
          </div>
          <div className="text-green-600 text-sm">{data.passRate}%</div>
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
          {data.strengths.map((item: any, index: number) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <span className="text-green-600 mt-0.5">•</span>
              <div>
                <span className="text-gray-900">{item.title}</span>
                <span className="text-gray-500"> - {item.desc}</span>
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
          {data.weaknesses.map((item: any, index: number) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <span className="text-orange-600 mt-0.5">•</span>
              <div>
                <span className="text-gray-900">{item.title}</span>
                <span className="text-gray-500"> - {item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-gray-100">
        <p className="text-sm text-gray-600">
          💡 你可以问我任何问题，比如："详细分析某个问题的回答"、"给我改进建议"、"预测下一轮面试"等
        </p>
      </div>
    </div>
  );
}

function QADetailContent({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-gray-900 mb-2">问题分析</h4>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
          <div className="text-sm text-gray-700 mb-1">
            <span className="text-gray-500">Q: </span>
            {data.question}
          </div>
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
        </div>
      </div>

      <div>
        <h5 className="text-gray-700 text-sm mb-2">你的回答：</h5>
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed">
          {data.yourAnswer}
        </div>
      </div>

      <div>
        <h5 className="text-gray-700 text-sm mb-2">分析：</h5>
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {data.analysis}
        </div>
      </div>

      <div>
        <h5 className="text-green-700 text-sm mb-2 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          优化后的回答示例：
        </h5>
        <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {(() => {
            // Clean up text to fix encoding issues
            const cleanText = (text: string) => {
              if (!text) return '';
              return text
                // Remove invalid Unicode characters (replacement character)
                .replace(/\uFFFD/g, '')
                // Replace common problematic characters
                .replace(/[""]/g, '"')
                .replace(/['']/g, "'")
                .replace(/…/g, '...')
                .replace(/—/g, '-')
                .replace(/–/g, '-')
                // Remove any remaining invalid characters
                .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
            };
            return cleanText(data.improvedAnswer);
          })()}
        </div>
      </div>
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
                <p className="text-sm text-gray-600 mt-0.5">{item.desc}</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-xs ${priorityColors[item.priority]}`}>
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

function FullReportContent({ data, interviewData, onUpdateInterview }: { data: any, interviewData?: InterviewData, onUpdateInterview: (data: Partial<InterviewData>) => void }) {
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-gray-900 mb-1">面试分析报告已生成 ✨</h3>
          <p className="text-sm text-gray-600">
            我已经完成了对你这场面试的全面分析，包含 {data.rounds} 个问答、关键数据统计和改进建议
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
        {activeTab === 'overview' && <OverviewTab data={data} />}
        {activeTab === 'qa' && (
          <QAListTab 
            qaList={data.qaList} 
            expandedQA={expandedQA}
            setExpandedQA={setExpandedQA}
          />
        )}
        {activeTab === 'analysis' && <AnalysisTab data={data} />}
        {activeTab === 'suggestions' && <SuggestionsTab suggestions={data.suggestions} />}
      </div>

      {/* Export Modal */}
      <ExportModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        data={data}
      />
      <ExportQuestionsModal 
        isOpen={showExportQuestionsModal}
        onClose={() => setShowExportQuestionsModal(false)}
        data={data}
      />
      <ExportReportModal 
        isOpen={showExportReportModal}
        onClose={() => setShowExportReportModal(false)}
        data={data}
      />
    </div>
  );
}

function OverviewTab({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs">面试时长</span>
          </div>
          <div className="text-gray-900 text-sm">{data.duration}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-xs">问答轮次</span>
          </div>
          <div className="text-gray-900 text-sm">{data.rounds} 轮</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Target className="w-3.5 h-3.5" />
            <span className="text-xs">综合评分</span>
          </div>
          <div className="text-blue-600 text-sm">{data.score} / 100</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-xs">通过概率</span>
          </div>
          <div className="text-green-600 text-sm">{data.passRate}%</div>
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
            {data.strengths.map((item: any, index: number) => (
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
            {data.weaknesses.map((item: any, index: number) => (
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
          你的技术能力整体不错，在 React 生态和性能优化方表现出色。但需要加强对目标公司的了解，以及在表达项目经验时用更结构化的方法（如 STAR 法则）。建议重点关注"求职动机"类问题的准备。
        </p>
      </div>
    </div>
  );
}

function QAListTab({ qaList, expandedQA, setExpandedQA }: { 
  qaList: any[], 
  expandedQA: number | null,
  setExpandedQA: (id: number | null) => void 
}) {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      '自我介绍': 'bg-purple-100 text-purple-700',
      '项目经验': 'bg-blue-100 text-blue-700',
      '技术深度': 'bg-green-100 text-green-700',
      '求职动机': 'bg-orange-100 text-orange-700',
      '反向提问': 'bg-gray-100 text-gray-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  // Safety check for qaList
  if (!qaList || qaList.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        暂无问答记录
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        共 {qaList.length} 个问答，点击展开查看详情
      </p>
      {qaList.map((qa) => (
        <div key={qa.id} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedQA(expandedQA === qa.id ? null : qa.id)}
            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-3 flex-1 text-left">
              <span className="text-gray-500 text-sm">Q{qa.id}</span>
              <span className="text-gray-900 text-sm flex-1">{qa.question}</span>
              <span className={`px-2 py-0.5 rounded text-xs ${getCategoryColor(qa.category)}`}>
                {qa.category}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs ${
                qa.score >= 80 ? 'bg-green-100 text-green-700' :
                qa.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {qa.score}分
              </span>
            </div>
            {expandedQA === qa.id ? (
              <ChevronUp className="w-4 h-4 text-gray-400 ml-2" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 ml-2" />
            )}
          </button>

          {expandedQA === qa.id && (
            <div className="px-4 py-4 bg-white">
              <div>
                <h6 className="text-xs text-gray-500 mb-2">你的回答：</h6>
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed">
                  {qa.yourAnswer}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
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

function SuggestionsTab({ suggestions }: { suggestions: any[] }) {
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
            <span className={`px-2 py-0.5 rounded text-xs ${priorityColors[item.priority]}`}>
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

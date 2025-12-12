import { X, Download, Share2, Image as ImageIcon, FileCode, Copy, Check, CheckSquare, Square } from 'lucide-react';
import { useState, forwardRef } from 'react';
import { toast } from 'sonner';
import { generateShareImage } from '../utils/shareImage';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

export function ExportModal({ isOpen, onClose, data }: ExportModalProps) {
  const [step, setStep] = useState<'select' | 'format'>('select');
  const [selectedFormat, setSelectedFormat] = useState<'image' | 'markdown'>('image');
  const [copied, setCopied] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(
    new Set(data.qaList?.map((qa: any) => qa.id) || [])
  );
  if (!isOpen) return null;

  const toggleQuestion = (id: number) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedQuestions(newSelected);
  };

  const toggleAll = () => {
    if (selectedQuestions.size === data.qaList?.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(data.qaList?.map((qa: any) => qa.id) || []));
    }
  };

  const getFilteredData = () => {
    return {
      ...data,
      qaList: data.qaList?.filter((qa: any) => selectedQuestions.has(qa.id)) || [],
      rounds: selectedQuestions.size
    };
  };

  const getAnswerText = (qa: any) => {
    const answer = qa?.yourAnswer ?? qa?.answer ?? qa?.response;
    return answer && typeof answer === 'string' && answer.trim() ? answer : '（暂无回答）';
  };

  const getSuggestionDesc = (item: any) => item?.desc ?? item?.description ?? '';
  const getStrengthDesc = (item: any) => item?.desc ?? item?.detail ?? '';

  const handleDownloadImage = async () => {
    try {
      const shareData = getFilteredData();
      const dataUrl = await generateShareImage({
        title: shareData.title,
        duration: shareData.duration,
        rounds: shareData.rounds,
        score: shareData.score,
        passRate: shareData.passRate,
        qaList: shareData.qaList,
        suggestions: shareData.suggestions || [],
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `面试复盘-${new Date().toLocaleDateString()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('图片已下载');
    } catch (error) {
      const description = error instanceof Error ? error.message : '请稍后重试';
      toast.error('图片下载失败', { description });
    }
  };

  const generateMarkdown = () => {
    const filteredData = getFilteredData();
    const md = `# 面试复盘笔记

## 📊 面试基本信息
- **面试时长**: ${filteredData.duration}
- **问答轮次**: ${filteredData.rounds} 轮
- **综合评分**: ${filteredData.score} / 100
- **通过概率**: ${filteredData.passRate}%

## ✅ 表现优秀的方面
${filteredData.strengths.map((s: any) => `- **${s.title}**: ${getStrengthDesc(s)}`).join('\n')}

## ⚠️ 需要改进的地方
${filteredData.weaknesses.map((w: any) => `- **${w.title}**: ${getStrengthDesc(w)}`).join('\n')}

## 📝 完整问答记录

${filteredData.qaList.map((qa: any, index: number) => `### Q${index + 1}: ${qa.question}

**分类**: ${qa.category} | **得分**: ${qa.score}分

**我的回答**:
${getAnswerText(qa)}

---
`).join('\n')}

## 💡 改进建议

${filteredData.suggestions.map((s: any, index: number) => `### ${index + 1}. ${s.title} (${s.priority}优先级)

${getSuggestionDesc(s)}

**具体行动**:
${s.actions.map((a: string) => `- ${a}`).join('\n')}

`).join('\n')}

---
*由 InterReview 面试复盘助手生成*`;
    
    return md;
  };

  const handleCopyMarkdown = async () => {
    const markdown = generateMarkdown();
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('内容已复制到剪贴板');
  };

  const handleDownloadMarkdown = () => {
    const markdown = generateMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `面试复盘-${new Date().toLocaleDateString()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('文件已下载');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-gray-900">
              {step === 'select' ? '选择分享内容' : '导出面经'}
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">
              {step === 'select' 
                ? `已选择 ${selectedQuestions.size} / ${data.qaList?.length || 0} 个问题`
                : '选择导出格式，分享给朋友或保存到笔记'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 ${step === 'select' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step === 'select' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-white'
              }`}>
                1
              </div>
              <span className="text-sm">选择内容</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-300" />
            <div className={`flex items-center gap-2 ${step === 'format' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step === 'format' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-white'
              }`}>
                2
              </div>
              <span className="text-sm">选择格式</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {/* Step 1: Select Questions */}
          {step === 'select' && (
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-gray-900 text-sm mb-1">选择要分享的问题</h3>
                  <p className="text-xs text-gray-500">可以隐藏一些敏感或不想公开的问题</p>
                </div>
                <button
                  onClick={toggleAll}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs transition-colors flex items-center gap-1.5"
                >
                  {selectedQuestions.size === data.qaList?.length ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5" />
                      取消全选
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5" />
                      全选
                    </>
                  )}
                </button>
              </div>
              
              <div className="space-y-2">
                {data.qaList?.map((qa: any, index: number) => (
                  <button
                    key={qa.id}
                    onClick={() => toggleQuestion(qa.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
                      selectedQuestions.has(qa.id)
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      selectedQuestions.has(qa.id) ? 'bg-blue-600' : 'bg-gray-200'
                    }`}>
                      {selectedQuestions.has(qa.id) && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 mb-1">
                            <span className="text-gray-400 mr-2">Q{index + 1}.</span>
                            {qa.question}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 bg-white border border-gray-200 text-gray-600 rounded">
                              {qa.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {selectedQuestions.size === 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    ⚠️ 至少选择一个问题才能继续导出
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Format Selector & Preview */}
          {step === 'format' && (
            <>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-gray-900 text-sm mb-3">选择导出格式</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedFormat('image')}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors flex items-center gap-3 ${
                      selectedFormat === 'image'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selectedFormat === 'image' ? 'bg-blue-600' : 'bg-gray-100'
                    }`}>
                      <ImageIcon className={`w-5 h-5 ${
                        selectedFormat === 'image' ? 'text-white' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="text-left">
                      <div className={`text-sm ${
                        selectedFormat === 'image' ? 'text-gray-900' : 'text-gray-700'
                      }`}>图片格式</div>
                      <div className="text-xs text-gray-500">精美卡片，适合分享到社交媒体</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedFormat('markdown')}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors flex items-center gap-3 ${
                      selectedFormat === 'markdown'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selectedFormat === 'markdown' ? 'bg-blue-600' : 'bg-gray-100'
                    }`}>
                      <FileCode className={`w-5 h-5 ${
                        selectedFormat === 'markdown' ? 'text-white' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="text-left">
                      <div className={`text-sm ${
                        selectedFormat === 'markdown' ? 'text-gray-900' : 'text-gray-700'
                      }`}>Markdown 格式</div>
                      <div className="text-xs text-gray-500">适合导入 Notion、语雀等笔记工具</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="px-6 py-4">
                <h3 className="text-gray-900 text-sm mb-3">预览</h3>
                {selectedFormat === 'image' ? (
                  <ImagePreview data={getFilteredData()} />
                ) : (
                  <MarkdownPreview markdown={generateMarkdown()} />
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          {step === 'select' ? (
            <>
              <div className="text-sm text-gray-600">
                已选择 {selectedQuestions.size} 个问题
              </div>
              <button
                onClick={() => setStep('format')}
                disabled={selectedQuestions.size === 0}
                className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  selectedQuestions.size === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                下一步：选择格式
                <span className="text-lg">→</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep('select')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <span className="text-lg">←</span>
                返回修改
              </button>
              <div className="flex gap-2">
                {selectedFormat === 'markdown' && (
                  <button
                    onClick={handleCopyMarkdown}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        复制内容
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={selectedFormat === 'markdown' ? handleDownloadMarkdown : handleDownloadImage}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {selectedFormat === 'image' ? '下载图片' : '下载文件'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const ImagePreview = forwardRef<HTMLDivElement, { data: any }>(({ data }, ref) => {
  const qaList = data.qaList || [];
  const heading = (data?.title && data.title.trim()) || '面试复盘笔记';
  return (
    <div
      ref={ref}
      className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 space-y-6"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-3">
          <Share2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl text-gray-900">{heading}</h1>
        <p className="text-gray-600">InterReview 面试复盘助手</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 text-center">
          <div className="text-2xl text-blue-600 mb-1">{data.duration}</div>
          <div className="text-xs text-gray-600">面试时长</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center">
          <div className="text-2xl text-blue-600 mb-1">{data.rounds}</div>
          <div className="text-xs text-gray-600">问答轮次</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center">
          <div className="text-2xl text-blue-600 mb-1">{data.score}</div>
          <div className="text-xs text-gray-600">综合评分</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center">
          <div className="text-2xl text-green-600 mb-1">{data.passRate}%</div>
          <div className="text-xs text-gray-600">通过概率</div>
        </div>
      </div>

      {/* Key Questions */}
      <div className="bg-white rounded-xl p-5 space-y-3">
        <h3 className="text-gray-900 text-sm mb-3">🔥 精选问答（共 {qaList.length} 个）</h3>
        {qaList.map((qa: any, index: number) => (
          <div key={qa.id || index} className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 text-xs">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-900 mb-1">{qa.question}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                  {qa.category}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  qa.score >= 80 ? 'bg-green-100 text-green-700' :
                  qa.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {qa.score}分
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Suggestions */}
      <div className="bg-white rounded-xl p-5 space-y-3">
        <h3 className="text-gray-900 text-sm mb-3">💡 核心改进建议</h3>
        {(data.suggestions || []).map((suggestion: any, index: number) => (
          <div key={index} className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <div className="flex-1">
              <span className="text-sm text-gray-900">{suggestion.title}</span>
              <span className="text-xs text-gray-500 ml-2">({suggestion.priority}优先级)</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center pt-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Share2 className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <div className="text-xs text-gray-900">InterReview</div>
            <div className="text-xs text-gray-500">AI 面试复盘助手</div>
          </div>
        </div>
      </div>
    </div>
  );
});
ImagePreview.displayName = 'ImagePreview';

const MarkdownPreview = ({ markdown }: { markdown: string }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
        {markdown}
      </pre>
    </div>
  );
};

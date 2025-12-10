import { X, Download, Copy, Check, FileCode, FileText, CheckSquare, Square } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

export function ExportReportModal({ isOpen, onClose, data }: ExportReportModalProps) {
  const [step, setStep] = useState<'select' | 'format'>('select');
  const [selectedFormat, setSelectedFormat] = useState<'markdown' | 'pdf' | 'text' | 'image'>('markdown');
  const [copied, setCopied] = useState(false);
  
  // Content selection states
  const [includeOverview, setIncludeOverview] = useState(true);
  const [includeQA, setIncludeQA] = useState(true);
  const [includeAnalysis, setIncludeAnalysis] = useState(true);
  const [includeSuggestions, setIncludeSuggestions] = useState(true);
  const [hideScores, setHideScores] = useState(false);

  if (!isOpen) return null;

  const hasSelectedContent = includeOverview || includeQA || includeAnalysis || includeSuggestions;

  const generateMarkdown = () => {
    let md = `# 面试分析报告\n\n`;
    md += `**面试日期**: ${new Date().toLocaleDateString()}\n`;
    md += `**生成时间**: ${new Date().toLocaleString()}\n\n`;
    md += `---\n\n`;

    if (includeOverview) {
      md += `## 📊 面试概览\n\n`;
      md += `### 基本信息\n\n`;
      md += `- **面试时长**: ${data.duration}\n`;
      md += `- **问答轮次**: ${data.rounds} 轮\n`;
      if (!hideScores) {
        md += `- **综合评分**: ${data.score} / 100\n`;
        md += `- **通过概率**: ${data.passRate}%\n`;
      }
      md += `\n`;
      
      md += `### ✅ 表现优秀的方面\n\n`;
      data.strengths?.forEach((s: any) => {
        md += `- **${s.title}**: ${s.desc}\n`;
      });
      
      md += `\n### ⚠️ 需要改进的地方\n\n`;
      data.weaknesses?.forEach((w: any) => {
        md += `- **${w.title}**: ${w.desc}\n`;
      });
      
      md += `\n---\n\n`;
    }

    if (includeQA) {
      md += `## 📝 完整问答记录\n\n`;
      md += `共 ${data.qaList?.length || 0} 个问题\n\n`;
      
      data.qaList?.forEach((qa: any, index: number) => {
        md += `### Q${index + 1}: ${qa.question}\n\n`;
        md += `**分类**: ${qa.category}`;
        
        if (!hideScores) {
          md += ` | **得分**: ${qa.score} / 100`;
        }
        md += `\n\n`;
        
        md += `**我的回答**:\n\n${qa.yourAnswer}\n\n`;
        md += `---\n\n`;
      });
    }

    if (includeAnalysis) {
      md += `## 📈 数据分析\n\n`;
      md += `### 各类问题表现\n\n`;
      
      const categoryStats = [
        { category: '自我介绍', count: 1, avgScore: 70 },
        { category: '项目经验', count: 1, avgScore: 75 },
        { category: '技术深度', count: 3, avgScore: 85 },
        { category: '求职动机', count: 1, avgScore: 45 },
        { category: '反向提问', count: 1, avgScore: 65 }
      ];
      
      categoryStats.forEach(stat => {
        md += `- **${stat.category}** (${stat.count} 题)`;
        if (!hideScores) {
          md += `: 平均 ${stat.avgScore} 分`;
        }
        md += `\n`;
      });
      
      if (!hideScores) {
        md += `\n### 得分分布\n\n`;
        md += `- 优秀 (≥80分): 3 题\n`;
        md += `- 中等 (60-79分): 3 题\n`;
        md += `- 较差 (<60分): 1 题\n`;
      }
      
      md += `\n---\n\n`;
    }

    if (includeSuggestions) {
      md += `## 💡 改进建议\n\n`;
      
      data.suggestions?.forEach((s: any, index: number) => {
        md += `### ${index + 1}. ${s.title} (${s.priority}优先级)\n\n`;
        md += `${s.desc}\n\n`;
        md += `**具体行动**:\n\n`;
        s.actions?.forEach((a: string) => {
          md += `- ${a}\n`;
        });
        md += `\n`;
      });
    }

    md += `\n---\n\n`;
    md += `*由 InterReview 面试复盘助手生成*`;
    
    return md;
  };

  const generatePlainText = () => {
    let text = `面试分析报告\n\n`;
    text += `面试日期: ${new Date().toLocaleDateString()}\n`;
    text += `生成时间: ${new Date().toLocaleString()}\n\n`;
    text += `========================================\n\n`;

    if (includeOverview) {
      text += `面试概览\n`;
      text += `========================================\n\n`;
      text += `基本信息:\n`;
      text += `面试时长: ${data.duration}\n`;
      text += `问答轮次: ${data.rounds} 轮\n`;
      if (!hideScores) {
        text += `综合评分: ${data.score} / 100\n`;
        text += `通过概率: ${data.passRate}%\n`;
      }
      text += `\n`;
      
      text += `表现优秀的方面:\n`;
      data.strengths?.forEach((s: any) => {
        text += `• ${s.title}: ${s.desc}\n`;
      });
      
      text += `\n需要改进的地方:\n`;
      data.weaknesses?.forEach((w: any) => {
        text += `• ${w.title}: ${w.desc}\n`;
      });
      
      text += `\n========================================\n\n`;
    }

    if (includeQA) {
      text += `完整问答记录\n`;
      text += `========================================\n\n`;
      
      data.qaList?.forEach((qa: any, index: number) => {
        text += `Q${index + 1}: ${qa.question}\n`;
        text += `分类: ${qa.category}`;
        
        if (!hideScores) {
          text += ` | 得分: ${qa.score} / 100`;
        }
        text += `\n\n`;
        
        text += `我的回答:\n${qa.yourAnswer}\n\n`;
        text += `----------------------------------------\n\n`;
      });
    }

    if (includeAnalysis) {
      text += `数据分析\n`;
      text += `========================================\n\n`;
      
      const categoryStats = [
        { category: '自我介绍', count: 1, avgScore: 70 },
        { category: '项目经验', count: 1, avgScore: 75 },
        { category: '技术深度', count: 3, avgScore: 85 },
        { category: '求职动机', count: 1, avgScore: 45 },
        { category: '反向提问', count: 1, avgScore: 65 }
      ];
      
      categoryStats.forEach(stat => {
        text += `• ${stat.category} (${stat.count} 题)`;
        if (!hideScores) {
          text += `: 平均 ${stat.avgScore} 分`;
        }
        text += `\n`;
      });
      
      text += `\n========================================\n\n`;
    }

    if (includeSuggestions) {
      text += `改进建议\n`;
      text += `========================================\n\n`;
      
      data.suggestions?.forEach((s: any, index: number) => {
        text += `${index + 1}. ${s.title} (${s.priority}优先级)\n\n`;
        text += `${s.desc}\n\n`;
        text += `具体行动:\n`;
        s.actions?.forEach((a: string) => {
          text += `• ${a}\n`;
        });
        text += `\n`;
      });
    }

    text += `\n由 InterReview 面试复盘助手生成`;
    
    return text;
  };

  const handleCopy = async () => {
    const content = selectedFormat === 'markdown' ? generateMarkdown() : generatePlainText();
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('内容已复制到剪贴板');
  };

  const handleDownload = () => {
    const content = selectedFormat === 'markdown' ? generateMarkdown() : generatePlainText();
    const fileExt = selectedFormat === 'markdown' ? 'md' : 'txt';
    const mimeType = selectedFormat === 'markdown' ? 'text/markdown' : 'text/plain';
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `面试分析报告-${new Date().toLocaleDateString()}.${fileExt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('文件已下载');
  };

  const handleDownloadPDF = () => {
    const content = generateMarkdown();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>面试分析报告</title>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Microsoft YaHei", sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              line-height: 1.8;
              color: #333;
            }
            h1 { 
              color: #2563EB; 
              border-bottom: 3px solid #2563EB;
              padding-bottom: 10px;
              margin-bottom: 20px;
              font-size: 28px;
            }
            h2 { 
              color: #1e40af; 
              margin-top: 30px;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 8px;
              font-size: 22px;
            }
            h3 { 
              color: #374151; 
              margin-top: 20px;
              font-size: 18px;
            }
            strong { color: #1f2937; }
            ul, ol { padding-left: 25px; }
            li { margin: 10px 0; }
            hr { 
              border: none; 
              border-top: 1px solid #e5e7eb; 
              margin: 30px 0; 
            }
            .meta {
              background: #f3f4f6;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 25px;
              font-size: 14px;
            }
            p { margin: 12px 0; }
            @media print {
              body { 
                margin: 0; 
                padding: 20px; 
                max-width: 100%;
              }
              h1, h2, h3 { page-break-after: avoid; }
              ul, ol { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${convertMarkdownToHTML(content)}
        </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const convertMarkdownToHTML = (markdown: string) => {
    return markdown
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/^---$/gm, '<hr>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gm, '<p>$1</p>')
      .replace(/<p><h/g, '<h')
      .replace(/<\/h([1-6])><\/p>/g, '</h$1>')
      .replace(/<p><ul>/g, '<ul>')
      .replace(/<\/ul><\/p>/g, '</ul>')
      .replace(/<p><hr><\/p>/g, '<hr>')
      .replace(/<p><\/p>/g, '');
  };

  const toggleAllContent = () => {
    const allSelected = includeOverview && includeQA && includeAnalysis && includeSuggestions;
    setIncludeOverview(!allSelected);
    setIncludeQA(!allSelected);
    setIncludeAnalysis(!allSelected);
    setIncludeSuggestions(!allSelected);
  };

  const previewContent = selectedFormat === 'markdown' || selectedFormat === 'pdf' 
    ? generateMarkdown() 
    : selectedFormat === 'text' 
    ? generatePlainText()
    : '';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-gray-900">
              {step === 'select' ? '选择导出内容' : '导出报告'}
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">
              {step === 'select' 
                ? '自定义报告内容，保护隐私信息'
                : '选择导出格式，保存完整分析报告'
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
          {/* Step 1: Select Content */}
          {step === 'select' && (
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-gray-900 text-sm mb-1">选择要导出的模块</h3>
                  <p className="text-xs text-gray-500">可以隐藏敏感信息或不需要的部分</p>
                </div>
                <button
                  onClick={toggleAllContent}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs transition-colors flex items-center gap-1.5"
                >
                  {includeOverview && includeQA && includeAnalysis && includeSuggestions ? (
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

              <div className="space-y-3 mb-6">
                {/* Overview */}
                <button
                  onClick={() => setIncludeOverview(!includeOverview)}
                  className={`w-full flex items-start gap-3 p-4 rounded-lg border-2 transition-all ${
                    includeOverview
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    includeOverview ? 'bg-blue-600' : 'bg-gray-200'
                  }`}>
                    {includeOverview && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm text-gray-900 mb-1">📊 面试概览</div>
                    <div className="text-xs text-gray-500">基本信息、优势分析、改进方向</div>
                  </div>
                </button>

                {/* QA */}
                <button
                  onClick={() => setIncludeQA(!includeQA)}
                  className={`w-full flex items-start gap-3 p-4 rounded-lg border-2 transition-all ${
                    includeQA
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    includeQA ? 'bg-blue-600' : 'bg-gray-200'
                  }`}>
                    {includeQA && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm text-gray-900 mb-1">📝 完整问答</div>
                    <div className="text-xs text-gray-500">所有问题和我的回答内容</div>
                  </div>
                </button>

                {/* Analysis */}
                <button
                  onClick={() => setIncludeAnalysis(!includeAnalysis)}
                  className={`w-full flex items-start gap-3 p-4 rounded-lg border-2 transition-all ${
                    includeAnalysis
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    includeAnalysis ? 'bg-blue-600' : 'bg-gray-200'
                  }`}>
                    {includeAnalysis && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm text-gray-900 mb-1">📈 数据分析</div>
                    <div className="text-xs text-gray-500">各类问题得分、数据统计</div>
                  </div>
                </button>

                {/* Suggestions */}
                <button
                  onClick={() => setIncludeSuggestions(!includeSuggestions)}
                  className={`w-full flex items-start gap-3 p-4 rounded-lg border-2 transition-all ${
                    includeSuggestions
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    includeSuggestions ? 'bg-blue-600' : 'bg-gray-200'
                  }`}>
                    {includeSuggestions && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm text-gray-900 mb-1">💡 改进建议</div>
                    <div className="text-xs text-gray-500">具体的改进方向和行动计划</div>
                  </div>
                </button>
              </div>

              {/* Privacy Option */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-gray-900 text-sm mb-3">隐私设置</h3>
                <label className="flex items-start gap-3 cursor-pointer p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <input
                    type="checkbox"
                    checked={hideScores}
                    onChange={(e) => setHideScores(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm text-gray-900">🔒 隐藏所有分数</div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      不显示综合评分、通过概率和各题得分（适合公开分享）
                    </div>
                  </div>
                </label>
              </div>

              {!hasSelectedContent && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    ⚠️ 至少选择一个模块才能继续导出
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Format Selection & Preview */}
          {step === 'format' && (
            <div className="flex h-full">
              {/* Left: Format Selection */}
              <div className="w-80 border-r border-gray-200 p-6 space-y-4">
                <div>
                  <h3 className="text-gray-900 text-sm mb-3">导出格式</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedFormat('markdown')}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
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
                      <div className="text-left flex-1">
                        <div className={`text-sm ${
                          selectedFormat === 'markdown' ? 'text-gray-900' : 'text-gray-700'
                        }`}>Markdown</div>
                        <div className="text-xs text-gray-500">适合 Notion、语雀</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setSelectedFormat('pdf')}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                        selectedFormat === 'pdf'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedFormat === 'pdf' ? 'bg-blue-600' : 'bg-gray-100'
                      }`}>
                        <FileText className={`w-5 h-5 ${
                          selectedFormat === 'pdf' ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="text-left flex-1">
                        <div className={`text-sm ${
                          selectedFormat === 'pdf' ? 'text-gray-900' : 'text-gray-700'
                        }`}>PDF 文档</div>
                        <div className="text-xs text-gray-500">打印或存档保存</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setSelectedFormat('text')}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                        selectedFormat === 'text'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedFormat === 'text' ? 'bg-blue-600' : 'bg-gray-100'
                      }`}>
                        <FileText className={`w-5 h-5 ${
                          selectedFormat === 'text' ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="text-left flex-1">
                        <div className={`text-sm ${
                          selectedFormat === 'text' ? 'text-gray-900' : 'text-gray-700'
                        }`}>纯文本</div>
                        <div className="text-xs text-gray-500">兼容性最好</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700 leading-relaxed">
                      💡 提示: 导出的报告可用于面试复盘、学习总结或求职档案管理
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Preview */}
              <div className="flex-1 flex flex-col">
                <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-gray-900 text-sm">预览</h3>
                </div>
                <div className="flex-1 overflow-auto px-6 py-4">
                  {selectedFormat === 'image' ? (
                    <div className="text-center py-12 text-gray-500">
                      图片格式预览
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                        {previewContent}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          {step === 'select' ? (
            <>
              <div className="text-sm text-gray-600">
                已选择 {[includeOverview, includeQA, includeAnalysis, includeSuggestions].filter(Boolean).length} 个模块
              </div>
              <button
                onClick={() => setStep('format')}
                disabled={!hasSelectedContent}
                className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  !hasSelectedContent
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
                {(selectedFormat === 'markdown' || selectedFormat === 'text') && (
                  <button
                    onClick={handleCopy}
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
                  onClick={selectedFormat === 'pdf' ? handleDownloadPDF : handleDownload}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {selectedFormat === 'pdf' ? '生成 PDF' : '下载文件'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
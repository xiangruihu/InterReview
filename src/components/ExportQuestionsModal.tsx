import { X, Download, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ExportQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

export function ExportQuestionsModal({ isOpen, onClose, data }: ExportQuestionsModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'markdown' | 'pdf' | 'text'>('markdown');
  const [copied, setCopied] = useState(false);
  const [includeAnswers, setIncludeAnswers] = useState(true);
  const [includeScores, setIncludeScores] = useState(true);
  const [includeAnalysis, setIncludeAnalysis] = useState(true);

  if (!isOpen) return null;

  const generateMarkdown = () => {
    let md = `# 面试问题清单\n\n`;
    md += `**面试日期**: ${new Date().toLocaleDateString()}\n`;
    md += `**总问题数**: ${data.qaList?.length || 0} 个\n`;
    md += `**面试时长**: ${data.duration}\n\n`;

    if (includeAnalysis) {
      md += `## 📊 整体分析\n\n`;
      md += `- **综合评分**: ${data.score} / 100\n`;
      md += `- **通过概率**: ${data.passRate}%\n\n`;
      
      md += `### 表现优秀的方面\n\n`;
      data.strengths?.forEach((s: any) => {
        md += `- **${s.title}**: ${s.desc}\n`;
      });
      
      md += `\n### 需要改进的地方\n\n`;
      data.weaknesses?.forEach((w: any) => {
        md += `- **${w.title}**: ${w.desc}\n`;
      });
      
      md += `\n---\n\n`;
    }

    md += `## 📝 问答详情\n\n`;
    
    data.qaList?.forEach((qa: any, index: number) => {
      md += `### Q${index + 1}: ${qa.question}\n\n`;
      md += `**分类**: ${qa.category}`;
      
      if (includeScores) {
        md += ` | **得分**: ${qa.score} / 100`;
      }
      md += `\n\n`;
      
      if (includeAnswers) {
        md += `**我的回答**:\n\n${qa.yourAnswer}\n\n`;
        
        if (qa.evaluation) {
          md += `**AI 点评**:\n\n${qa.evaluation}\n\n`;
        }
        
        if (qa.suggestion) {
          md += `**改进建议**:\n\n${qa.suggestion}\n\n`;
        }
      }
      
      md += `---\n\n`;
    });

    md += `\n*由 InterReview 面试复盘助手生成*`;
    
    return md;
  };

  const generatePlainText = () => {
    let text = `面试问题清单\n\n`;
    text += `面试日期: ${new Date().toLocaleDateString()}\n`;
    text += `总问题数: ${data.qaList?.length || 0} 个\n`;
    text += `面试时长: ${data.duration}\n\n`;

    if (includeAnalysis) {
      text += `========================================\n`;
      text += `整体分析\n`;
      text += `========================================\n\n`;
      text += `综合评分: ${data.score} / 100\n`;
      text += `通过概率: ${data.passRate}%\n\n`;
      
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

    text += `问答详情\n`;
    text += `========================================\n\n`;
    
    data.qaList?.forEach((qa: any, index: number) => {
      text += `Q${index + 1}: ${qa.question}\n`;
      text += `分类: ${qa.category}`;
      
      if (includeScores) {
        text += ` | 得分: ${qa.score} / 100`;
      }
      text += `\n\n`;
      
      if (includeAnswers) {
        text += `我的回答:\n${qa.yourAnswer}\n\n`;
        
        if (qa.evaluation) {
          text += `AI 点评:\n${qa.evaluation}\n\n`;
        }
        
        if (qa.suggestion) {
          text += `改进建议:\n${qa.suggestion}\n\n`;
        }
      }
      
      text += `----------------------------------------\n\n`;
    });

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
    a.download = `面试问题清单-${new Date().toLocaleDateString()}.${fileExt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('文件已下载');
  };

  const handleDownloadPDF = () => {
    // 使用浏览器打印功能生成 PDF
    const content = generateMarkdown();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>面试问题清单</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              line-height: 1.6;
              color: #333;
            }
            h1 { 
              color: #2563EB; 
              border-bottom: 3px solid #2563EB;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            h2 { 
              color: #1e40af; 
              margin-top: 30px;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 8px;
            }
            h3 { 
              color: #374151; 
              margin-top: 20px;
            }
            strong { color: #1f2937; }
            ul { padding-left: 20px; }
            li { margin: 8px 0; }
            hr { 
              border: none; 
              border-top: 1px solid #e5e7eb; 
              margin: 25px 0; 
            }
            .meta {
              background: #f3f4f6;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .question {
              background: #fafafa;
              padding: 15px;
              border-left: 4px solid #2563EB;
              margin: 15px 0;
              page-break-inside: avoid;
            }
            .answer {
              margin-left: 20px;
              color: #4b5563;
            }
            @media print {
              body { margin: 0; padding: 15px; }
              h1 { page-break-after: avoid; }
              .question { page-break-inside: avoid; }
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

  const previewContent = selectedFormat === 'markdown' ? generateMarkdown() : generatePlainText();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-gray-900">导出问题清单</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              导出完整的面试问答记录和分析报告
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Left Sidebar - Options */}
          <div className="w-80 border-r border-gray-200 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
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
                    <div className="text-xs text-gray-500">适合导入笔记工具</div>
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

            <div className="px-6 py-4 flex-1 overflow-auto">
              <h3 className="text-gray-900 text-sm mb-3">导出内容</h3>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAnalysis}
                    onChange={(e) => setIncludeAnalysis(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm text-gray-900">整体分析</div>
                    <div className="text-xs text-gray-500">包含评分、优势和改进点</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAnswers}
                    onChange={(e) => setIncludeAnswers(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm text-gray-900">我的回答</div>
                    <div className="text-xs text-gray-500">包含回答内容和 AI 点评</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeScores}
                    onChange={(e) => setIncludeScores(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm text-gray-900">每题得分</div>
                    <div className="text-xs text-gray-500">显示每个问题的评分</div>
                  </div>
                </label>
              </div>

              <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  💡 提示: 导出的内容可用于面试复盘、经验总结或分享给朋友学习参考
                </p>
              </div>
            </div>
          </div>

          {/* Right - Preview */}
          <div className="flex-1 flex flex-col">
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-gray-900 text-sm">预览</h3>
                <span className="text-xs text-gray-500">
                  共 {data.qaList?.length || 0} 个问题
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                  {previewContent}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedFormat === 'pdf' ? '将打开打印对话框' : '下载到本地或复制内容'}
          </div>
          <div className="flex gap-2">
            {selectedFormat !== 'pdf' && (
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
        </div>
      </div>
    </div>
  );
}
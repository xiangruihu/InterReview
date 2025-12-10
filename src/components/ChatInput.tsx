import { Plus, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';

interface ChatInputProps {
  onSendMessage?: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');

  const quickQuestions = [
    '详细分析第1个问题',
    '详细分析第2个问题', 
    '给我一些改进建议',
    '预测下一轮可能问什么',
    '帮我生成面试总结',
    '导出完整报告'
  ];

  const handleQuickQuestion = (question: string) => {
    if (disabled) {
      toast.error('AI 正在回复中，请稍候...');
      return;
    }
    setInputValue(question);
  };

  const handleSend = () => {
    if (!inputValue.trim()) {
      toast.error('请输入问题');
      return;
    }

    if (disabled) {
      toast.error('AI 正在回复中，请稍候...');
      return;
    }

    // Call the callback with the message
    if (onSendMessage) {
      onSendMessage(inputValue.trim());
    }
    
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow Ctrl+A / Cmd+A for select all
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      // Let browser handle select all natively
      return;
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      setInputValue('');
    }
  };

  const handleAttachment = () => {
    toast.info('附件功能开发中...');
  };

  return (
    <div className="bg-white border-t border-gray-200 pt-4 pb-6 px-8">
      <div className="max-w-5xl mx-auto space-y-3">
        {/* Quick Question Chips */}
        <div className="flex flex-wrap gap-2">
          {quickQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => handleQuickQuestion(question)}
              disabled={disabled}
              className={`px-3 py-1.5 bg-white text-gray-700 text-sm rounded-full border border-gray-200 transition-colors ${
                disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-100'
              }`}
            >
              {question}
            </button>
          ))}
        </div>

        {/* Chat Input */}
        <div className={`flex items-center gap-3 bg-gray-100 rounded-3xl px-4 py-3 transition-all ${
          disabled
            ? 'opacity-60'
            : 'hover:bg-gray-200'
        }`}>
          {/* Plus Button */}
          <button 
            onClick={handleAttachment}
            disabled={disabled}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 disabled:opacity-50"
            title="添加附件"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Input Field */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={disabled ? 'AI 正在回复中...' : '继续提问，例如：帮我详细分析第5个问题的回答...'}
            className="flex-1 bg-transparent text-gray-900 placeholder:text-gray-500 text-sm focus:outline-none disabled:cursor-not-allowed"
          />

          {/* Send Button */}
          <button 
            onClick={handleSend}
            disabled={!inputValue.trim() || disabled}
            className={`rounded-lg px-3 py-2 transition-colors flex-shrink-0 flex items-center gap-1.5 ${
              inputValue.trim() && !disabled
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          InterReview 可能会出错。请核查重要信息。
        </p>
      </div>
    </div>
  );
}
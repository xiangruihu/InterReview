import { Plus, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';

interface ChatAreaProps {
  onSendMessage?: (message: string) => void;
  disabled?: boolean;
}

export function ChatArea({ onSendMessage, disabled = false }: ChatAreaProps) {
  const [inputValue, setInputValue] = useState('');

  const quickQuestions = [
    '总结本场的优缺点',
    '帮我改写这个回答',
    '预测下一轮可能会问什么',
    '给我 3 条改进建议',
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
    <div className="bg-white border border-gray-200 rounded-xl px-6 py-6">
      {/* Instruction Text */}
      <p className="text-gray-600 text-sm mb-4">
        你可以直接向助手提问，例如：&quot;帮我总结这场面试的优缺点&quot;
      </p>

      {/* Quick Question Chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {quickQuestions.map((question, index) => (
          <button
            key={index}
            onClick={() => handleQuickQuestion(question)}
            disabled={disabled}
            className={`px-4 py-2 bg-gray-50 text-gray-700 text-sm rounded-full border border-gray-200 transition-colors ${
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
      <div className={`flex items-center gap-3 bg-gray-50 border rounded-lg px-4 py-3 transition-all ${
        disabled
          ? 'border-gray-200 opacity-60'
          : 'border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-20'
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
          placeholder={disabled ? 'AI 正在回复中...' : '在此输入问题，例如：帮我总结本场面试的优缺点…'}
          className="flex-1 bg-transparent text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none disabled:cursor-not-allowed"
        />

        {/* Send Button */}
        <button 
          onClick={handleSend}
          disabled={!inputValue.trim() || disabled}
          className={`transition-colors flex-shrink-0 ${
            inputValue.trim() && !disabled
              ? 'text-blue-600 hover:text-blue-700' 
              : 'text-gray-300 cursor-not-allowed'
          }`}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
import { FileText, Plus } from 'lucide-react';

interface EmptyStateProps {
  onCreateNew: () => void;
}

export function EmptyState({ onCreateNew }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Icon */}
      <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
        <FileText className="w-12 h-12 text-blue-600" />
      </div>

      {/* Title */}
      <h2 className="text-gray-900 mb-2">还没有面试记录</h2>

      {/* Description */}
      <p className="text-gray-600 mb-8 max-w-md">
        点击下方按钮创建第一个面试分析，开始你的面试复盘之旅
      </p>

      {/* CTA Button */}
      <button
        onClick={onCreateNew}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors shadow-sm"
      >
        <Plus className="w-5 h-5" />
        <span>新建面试分析</span>
      </button>

      {/* Tips */}
      <div className="mt-12 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md">
        <p className="text-sm text-blue-900 mb-2">💡 小贴士</p>
        <ul className="text-xs text-blue-700 text-left space-y-1">
          <li>• 支持上传音频、视频和文本文件</li>
          <li>• AI 会自动分析面试表现并给出建议</li>
          <li>• 可以随时编辑面试信息和添加笔记</li>
        </ul>
      </div>
    </div>
  );
}

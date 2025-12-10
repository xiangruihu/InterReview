import { Search, Plus, LogOut, User } from 'lucide-react';
import { InterviewListItem } from './InterviewListItem';
import { useState } from 'react';

interface InterviewData {
  id: string;
  title: string;
  company: string;
  position: string;
  status: '待上传' | '已上传文件' | '分析中' | '已完成' | '分析失败';
  date: string;
}

interface SidebarProps {
  interviews: InterviewData[];
  selectedInterviewId: string;
  onInterviewSelect: (id: string, mode: 'upload' | 'report') => void;
  onInterviewRename: (id: string, newTitle: string) => void;
  onInterviewDelete: (id: string) => void;
  onCreateNewInterview: () => void;
  currentUser: string;
  onLogout: () => void;
}

export function Sidebar({ interviews, selectedInterviewId, onInterviewSelect, onInterviewRename, onInterviewDelete, onCreateNewInterview, currentUser, onLogout }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter interviews based on search query
  const filteredInterviews = interviews.filter(interview => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      interview.title.toLowerCase().includes(query) ||
      interview.company.toLowerCase().includes(query) ||
      interview.position.toLowerCase().includes(query)
    );
  });

  return (
    <aside className="w-[260px] bg-white border-r border-gray-200 flex flex-col">
      {/* Logo Section */}
      <div className="px-4 py-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white">IR</span>
          </div>
          <span className="text-blue-600">InterReview</span>
        </div>
      </div>

      {/* User Section */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <span className="flex-1 text-gray-900">{currentUser}</span>
        </div>
        <button className="w-full px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg flex items-center gap-2 text-sm transition-colors" onClick={onLogout}>
          <LogOut className="w-4 h-4" />
          <span>退出登录</span>
        </button>
      </div>

      {/* Main Function Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Section Title */}
        <div className="mb-4">
          <h3 className="text-gray-500 text-xs uppercase tracking-wider mb-3">我的面试</h3>
          
          {/* New Interview Button */}
          <button className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors mb-4" onClick={onCreateNewInterview}>
            <Plus className="w-4 h-4" />
            <span>新建面试分析</span>
          </button>
          
          {/* Search Box */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="按标题、公司、岗位搜索"
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Interview List */}
        <div className="space-y-2">
          {filteredInterviews.length > 0 ? (
            filteredInterviews.map((interview) => (
              <div 
                key={interview.id} 
                onClick={() => {
                  const mode = interview.status === '已完成' ? 'report' : 'upload';
                  onInterviewSelect(interview.id, mode);
                }}
              >
                <InterviewListItem 
                  {...interview} 
                  isActive={interview.id === selectedInterviewId}
                  onRename={(newTitle) => onInterviewRename(interview.id, newTitle)}
                  onDelete={() => onInterviewDelete(interview.id)}
                />
              </div>
            ))
          ) : (
            <div className="text-center py-8 px-4">
              <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">没有找到匹配的面试记录</p>
              <p className="text-xs text-gray-400 mt-1">试试其他关键词</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

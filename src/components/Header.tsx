import { Clock, Edit2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface HeaderProps {
  viewMode: 'upload' | 'report';
  interviewName: string;
  onRename?: (newName: string) => void;
}

export function Header({ viewMode, interviewName, onRename }: HeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(interviewName);
  const [currentTime, setCurrentTime] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Update current time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(/\//g, '-');
      setCurrentTime(formatted);
    };

    updateTime(); // Initial update
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Update local name when prop changes
  useEffect(() => {
    setNewName(interviewName);
  }, [interviewName]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (newName.trim() && newName !== interviewName && onRename) {
      onRename(newName.trim());
    } else {
      setNewName(interviewName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setNewName(interviewName);
      setIsEditing(false);
    }
  };

  return (
    <div className="mx-8 mt-6 mb-4">
      <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          {/* Left: Current Session Info */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white">IR</span>
            </div>
            <div>
              <div className="text-gray-900 mb-1">InterReview 面试复盘助手</div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span>最近更新时间：{viewMode === 'report' ? '2025-12-05 16:45' : currentTime}</span>
              </div>
            </div>
          </div>

          {/* Center: Current Session Name - Editable */}
          <div className="group flex items-center gap-2">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="px-3 py-1.5 text-gray-900 bg-white border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              />
            ) : (
              <>
                <div className="text-gray-900 cursor-pointer hover:text-blue-600 transition-colors" onClick={handleEditClick}>
                  {interviewName}
                </div>
                <button
                  onClick={handleEditClick}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 transition-all"
                >
                  <Edit2 className="w-4 h-4 text-gray-400 hover:text-blue-600" />
                </button>
              </>
            )}
          </div>

          {/* Right: Beta Badge */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs rounded-full border border-purple-200">
              Beta · 自动复盘
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
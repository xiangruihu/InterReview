import { MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface InterviewListItemProps {
  title: string;
  company: string;
  position: string;
  status: '待上传' | '上传中' | '已上传文件' | '分析中' | '已完成' | '分析失败';
  date: string;
  isActive: boolean;
  onRename?: (newTitle: string) => void;
  onDelete?: () => void;
}

export function InterviewListItem({
  title,
  company,
  position,
  status,
  date,
  isActive,
  onRename,
  onDelete,
}: InterviewListItemProps) {
  const statusColors: Record<string, string> = {
    '待上传': 'bg-gray-100 text-gray-700',
    '上传中': 'bg-blue-100 text-blue-700',
    '已上传文件': 'bg-blue-100 text-blue-700',
    '分析中': 'bg-yellow-100 text-yellow-700',
    '已完成': 'bg-green-100 text-green-700',
    '分析失败': 'bg-red-100 text-red-600',
  };

  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(title);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Format date to only show year-month-day (remove time)
  const formatDateOnly = (dateStr: string) => {
    if (!dateStr) return '';
    // Handle both datetime-local format (YYYY-MM-DDTHH:mm) and date format (YYYY-MM-DD)
    const datePart = dateStr.split('T')[0];
    const date = new Date(datePart);
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).replace(/\//g, '-');
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Focus input when renaming starts
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRenameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRenaming(true);
    setShowMenu(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (onDelete) {
      onDelete();
    }
  };

  const handleRenameSubmit = () => {
    if (newTitle.trim() && newTitle !== title && onRename) {
      onRename(newTitle.trim());
    } else {
      setNewTitle(title);
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setNewTitle(title);
      setIsRenaming(false);
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  return (
    <div
      className={`group relative px-3 py-3 rounded-lg border cursor-pointer transition-all ${
        isActive
          ? 'bg-blue-50 border-blue-200 shadow-sm'
          : 'bg-white border-gray-200 hover:bg-gray-50'
      }`}
    >
      {/* Active Indicator */}
      {isActive && (
        <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-600 rounded-r-full" />
      )}
      
      <div className="space-y-2">
        {/* Title with Menu Button */}
        <div className="flex items-center justify-between gap-2">
          {isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-2 py-1 text-sm text-gray-900 bg-white border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <div className="flex-1 text-gray-900 text-sm">{title}</div>
          )}
          
          {/* Menu Button - Show on hover or when menu is open */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={handleMenuClick}
              className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              <MoreVertical className="w-4 h-4 text-gray-600" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                <button
                  onClick={handleRenameClick}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  重命名
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  删除
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Company and Position */}
        <div className="text-xs text-gray-500">
          {company} · {position}
        </div>
        
        {/* Status and Date */}
        <div className="flex items-center justify-between">
          <span
            className={`text-xs px-2 py-0.5 rounded ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}
          >
            {status}
          </span>
          <span className="text-xs text-gray-400">{formatDateOnly(date)}</span>
        </div>
      </div>
    </div>
  );
}

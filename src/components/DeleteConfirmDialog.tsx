import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface InterviewData {
  id: string;
  title: string;
  company: string;
  position: string;
  status: '待上传' | '上传中' | '已上传文件' | '分析中' | '已完成' | '分析失败';
  date: string;
}

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interview: InterviewData | null;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({ open, onOpenChange, interview, onConfirm }: DeleteConfirmDialogProps) {
  if (!interview) return null;

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case '已完成':
        return 'text-green-700 bg-green-50 border-green-200';
      case '已上传文件':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case '上传中':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case '分析中':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case '分析失败':
        return 'text-red-600 bg-red-50 border-red-200';
      case '待上传':
        return 'text-gray-700 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <AlertDialogTitle>确认删除面试记录？</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-gray-600">
                删除后将无法恢复，请确认是否删除以下面试记录：
              </p>
              
              {/* Interview Info Card */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-gray-900 mb-1">{interview.title}</div>
                    <div className="text-sm text-gray-600">
                      {interview.company} · {interview.position}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs rounded-md border ${getStatusColor(interview.status)}`}>
                    {interview.status}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  面试时间：{formatDate(interview.date)}
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
          >
            确认删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

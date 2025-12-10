import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { StepProgress } from './components/StepProgress';
import { ChatArea } from './components/ChatArea';
import { UploadArea } from './components/UploadArea';
import { AnalysisReport } from './components/AnalysisReport';
import { ChatReport } from './components/ChatReport';
import { ChatInput } from './components/ChatInput';
import { LoginPage } from './components/LoginPage';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { AnalyzingLoader } from './components/AnalyzingLoader';
import { EmptyState } from './components/EmptyState';
import { MessageList } from './components/MessageList';
import { TypingIndicator } from './components/TypingIndicator';
import { useState, useEffect, useCallback } from 'react';
import { Toaster } from 'sonner@2.0.3';
import { toast } from 'sonner@2.0.3';
import { chatWithLLM, type ChatMessage } from './utils/mockAIResponses';
import { registerUser, fetchInterviews, fetchMessages, saveInterviews, saveMessages } from './utils/backend';

// 用户档案模型
interface UserProfile {
  userId: string;         // 稳定唯一ID（基于邮箱生成）
  username: string;
  email: string;
  createdAt: string;
}

function hashEmailToId(email: string): string {
  // 简单的 djb2 哈希实现，输出 8 位十六进制
  let hash = 5381;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) + hash) + email.charCodeAt(i);
    hash = hash >>> 0;
  }
  return 'usr_' + hash.toString(16).padStart(8, '0');
}

interface InterviewData {
  id: string;
  title: string;
  company: string;
  position: string;
  status: '待上传' | '已上传文件' | '分析中' | '已完成' | '分析失败';
  date: string;
  fileUrl?: string;
  fileType?: string;
  transcriptText?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export default function App() {
  // Default demo interviews
  const getDefaultInterviews = useCallback((): InterviewData[] => {
    return [
      {
        id: '1',
        title: '未命名面试 48',
        company: '未知公司',
        position: '未知岗位',
        status: '待上传',
        date: '2025-12-08T14:30',
      },
      {
        id: '2',
        title: '字节跳动前端一面',
        company: '字节跳动',
        position: '前端开发工程师',
        status: '已完成',
        date: '2024-03-15T14:00',
      },
      {
        id: '3',
        title: '腾讯技术面',
        company: '腾讯',
        position: '后端开发',
        status: '已完成',
        date: '2025-12-03T10:30',
      },
      {
        id: '4',
        title: '阿里巴巴二面',
        company: '阿里巴巴',
        position: '算法工程师',
        status: '已完成',
        date: '2025-12-01T16:00',
      },
    ];
  }, []);

  // Login state - Load from localStorage
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const saved = localStorage.getItem('interreview_isLoggedIn');
    return saved === 'true';
  });
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(() => {
    const raw = localStorage.getItem('interreview_currentUserProfile');
    if (raw) {
      try { return JSON.parse(raw) as UserProfile; } catch {}
    }
    return null;
  });

  // Toggle between upload view and analysis report view
  const [viewMode, setViewMode] = useState<'upload' | 'report'>('report');
  const [currentStep, setCurrentStep] = useState(3);
  const [selectedInterviewId, setSelectedInterviewId] = useState('2');
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<InterviewData | null>(null);
  
  // Chat messages state - separate messages for each interview
  const [interviewMessages, setInterviewMessages] = useState<Record<string, Message[]>>({});
  const [hasLoadedRemoteData, setHasLoadedRemoteData] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);
  
  // Interview data state - Load from localStorage
  const [interviews, setInterviews] = useState<InterviewData[]>(() => getDefaultInterviews());

  // Get current interview
  const currentInterview = interviews.find(i => i.id === selectedInterviewId);

  // 持久化登录状态与用户档案
  useEffect(() => {
    if (isLoggedIn && currentUserProfile) {
      localStorage.setItem('interreview_isLoggedIn', 'true');
      localStorage.setItem('interreview_currentUserProfile', JSON.stringify(currentUserProfile));
    }
  }, [isLoggedIn, currentUserProfile]);

  // 用户维度持久化：面试列表（本地备份）
  useEffect(() => {
    if (currentUserProfile) {
      localStorage.setItem(`interreview_interviews_${currentUserProfile.userId}`, JSON.stringify(interviews));
    }
  }, [interviews, currentUserProfile]);

  // 用户维度持久化：对话消息（本地备份）
  useEffect(() => {
    if (currentUserProfile) {
      localStorage.setItem(`interreview_messages_${currentUserProfile.userId}`, JSON.stringify(interviewMessages));
    }
  }, [interviewMessages, currentUserProfile]);

  // 同步到后端：面试列表
  useEffect(() => {
    if (!currentUserProfile || !hasLoadedRemoteData) return;
    (async () => {
      try { await saveInterviews(currentUserProfile.userId, interviews as any); } catch (e) {
        console.warn('[backend] saveInterviews 失败：', e);
      }
    })();
  }, [interviews, currentUserProfile?.userId, hasLoadedRemoteData]);

  // 同步到后端：对话消息
  useEffect(() => {
    if (!currentUserProfile || !hasLoadedRemoteData) return;
    (async () => {
      try { await saveMessages(currentUserProfile.userId, interviewMessages as any); } catch (e) {
        console.warn('[backend] saveMessages 失败：', e);
      }
    })();
  }, [interviewMessages, currentUserProfile?.userId, hasLoadedRemoteData]);

  const restoreSelectedInterview = useCallback((userId: string) => {
    const savedSelected = localStorage.getItem(`interreview_selectedInterview_${userId}`);
    if (savedSelected) {
      setSelectedInterviewId(savedSelected);
    }
  }, []);

  const loadLocalBackup = useCallback((userId: string, username: string) => {
    let savedInterviews = localStorage.getItem(`interreview_interviews_${userId}`);
    if (!savedInterviews) {
      const legacy = localStorage.getItem(`interreview_interviews_${username}`);
      if (legacy) {
        savedInterviews = legacy;
        localStorage.setItem(`interreview_interviews_${userId}`, legacy);
      }
    }

    let interviewsPayload: InterviewData[] = getDefaultInterviews();
    if (savedInterviews) {
      try {
        interviewsPayload = JSON.parse(savedInterviews);
      } catch {
        interviewsPayload = getDefaultInterviews();
      }
    }

    let savedMessages = localStorage.getItem(`interreview_messages_${userId}`);
    if (!savedMessages) {
      const legacy = localStorage.getItem(`interreview_messages_${username}`);
      if (legacy) {
        savedMessages = legacy;
        localStorage.setItem(`interreview_messages_${userId}`, legacy);
      }
    }

    let messagesPayload: Record<string, Message[]> = {};
    if (savedMessages) {
      try {
        messagesPayload = JSON.parse(savedMessages);
      } catch {
        messagesPayload = {};
      }
    }

    setInterviews(interviewsPayload);
    setInterviewMessages(messagesPayload);
    restoreSelectedInterview(userId);
  }, [getDefaultInterviews, restoreSelectedInterview]);

  const hydrateFromBackend = useCallback(async (profile: UserProfile) => {
    setHasLoadedRemoteData(false);
    try {
      await registerUser({ ...profile });
      const [remoteInterviews, remoteMessages] = await Promise.all([
        fetchInterviews(profile.userId),
        fetchMessages(profile.userId),
      ]);

      const finalInterviews = (remoteInterviews && remoteInterviews.length > 0)
        ? remoteInterviews
        : getDefaultInterviews();
      const finalMessages = remoteMessages || {};

      setInterviews(finalInterviews as any);
      setInterviewMessages(finalMessages as any);
      restoreSelectedInterview(profile.userId);
    } catch (e) {
      console.warn('[backend] 无法连接后端，使用本地数据：', e);
      loadLocalBackup(profile.userId, profile.username);
    } finally {
      setHasLoadedRemoteData(true);
    }
  }, [getDefaultInterviews, loadLocalBackup, restoreSelectedInterview]);

  useEffect(() => {
    if (!isLoggedIn || !currentUserProfile) return;
    hydrateFromBackend(currentUserProfile);
  }, [isLoggedIn, currentUserProfile?.userId, hydrateFromBackend]);

  // Update interview data
  const updateInterview = (id: string, data: Partial<InterviewData>) => {
    setInterviews(prev => prev.map(interview => 
      interview.id === id ? { ...interview, ...data } : interview
    ));
  };

  // Rename interview
  const renameInterview = (id: string, newTitle: string) => {
    const oldTitle = interviews.find(i => i.id === id)?.title;
    updateInterview(id, { title: newTitle });
    toast.success(`已重命名为「${newTitle}」`);
  };

  // Show delete confirmation dialog
  const showDeleteDialog = (id: string) => {
    const interview = interviews.find(i => i.id === id);
    if (!interview) return;
    
    // Check if trying to delete an interview that is being analyzed
    if (interview.status === '分析中') {
      toast.error('该面试正在分析中，无法删除', {
        description: '请等待分析完成后再删除',
      });
      return;
    }
    
    setInterviewToDelete(interview);
    setDeleteDialogOpen(true);
  };

  // Confirm delete interview
  const confirmDeleteInterview = () => {
    if (!interviewToDelete) return;
    
    const id = interviewToDelete.id;
    const title = interviewToDelete.title;

    // If deleting the currently selected interview, select another one
    if (id === selectedInterviewId) {
      const remainingInterviews = interviews.filter(i => i.id !== id);
      if (remainingInterviews.length > 0) {
        const nextInterview = remainingInterviews[0];
        setSelectedInterviewId(nextInterview.id);
        setViewMode(nextInterview.status === '已完成' ? 'report' : 'upload');
        setCurrentStep(nextInterview.status === '已完成' ? 3 : 2);
      }
    }

    // Remove the interview
    setInterviews(prev => prev.filter(interview => interview.id !== id));

    // Remove messages for this interview
    setInterviewMessages(prev => {
      const copy = { ...prev } as Record<string, Message[]>;
      delete copy[id];
      return copy;
    });
    
    // Close dialog and reset state
    setDeleteDialogOpen(false);
    setInterviewToDelete(null);
    
    // Show success toast
    toast.success(`已删除「${title}」`);
  };

  // Delete interview (old function - keep for backward compatibility)
  const deleteInterview = (id: string) => {
    showDeleteDialog(id);
  };

  // Create new interview
  const createNewInterview = () => {
    // Generate new ID
    const newId = Date.now().toString();
    
    // Generate interview number based on existing interviews
    const existingNumbers = interviews
      .map(i => {
        const match = i.title.match(/未命名面试 (\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(n => n > 0);
    
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    
    // Get current date and time
    const now = new Date();
    const dateTimeString = now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
    
    // Create new interview
    const newInterview: InterviewData = {
      id: newId,
      title: `未命名面试 ${nextNumber}`,
      company: '未知公司',
      position: '未知岗位',
      status: '待上传',
      date: dateTimeString,
    };
    
    // Add to interviews list (add to the beginning)
    setInterviews(prev => [newInterview, ...prev]);
    
    // Select the new interview and switch to upload view
    setSelectedInterviewId(newId);
    setViewMode('upload');
    setCurrentStep(1);
    
    // Show success toast
    toast.success(`面试分析 #${nextNumber} 已创建`);
  };

  // Handle file upload complete
  const handleUploadComplete = (info: { fileName: string; filePath: string; fileType?: string }) => {
    setCurrentStep(2);
    if (selectedInterviewId) {
      updateInterview(selectedInterviewId, {
        status: '已上传文件',
        fileUrl: info.filePath,
        fileType: info.fileType,
      });
    }
    toast.success(`「${info.fileName}」上传完成`);
  };

  const handleTranscriptUpdate = (text: string) => {
    if (!selectedInterviewId) return;
    updateInterview(selectedInterviewId, { transcriptText: text });
  };

  // Handle start analysis
  const handleStartAnalysis = () => {
    // Update interview status to "分析中"
    updateInterview(selectedInterviewId, { status: '分析中' });
    setCurrentStep(3);
    
    toast.success('开始分析面试内容...', {
      description: '预计需要 30-60 秒',
    });

    // Simulate analysis process (10 seconds)
    setTimeout(() => {
      // Update interview status to "已完成"
      updateInterview(selectedInterviewId, { status: '已完成' });
      setViewMode('report');
      
      toast.success('分析完成！', {
        description: '面试报告已生成',
      });
    }, 10000); // 10 seconds to match the loader animation
  };

  // Get interview name for header
  const getInterviewName = () => {
    return currentInterview?.title || '未命名面试';
  };

  // Handle login - 保存用户档案并加载该用户的历史数据
  const handleLogin = async (profileInput: { username: string; email: string }) => {
    const userId = hashEmailToId(profileInput.email || profileInput.username);
    const profile: UserProfile = {
      userId,
      username: profileInput.username,
      email: profileInput.email,
      createdAt: new Date().toISOString(),
    };

    setCurrentUserProfile(profile);
    setIsLoggedIn(true);
    setHasLoadedRemoteData(false);
    localStorage.setItem('interreview_isLoggedIn', 'true');
    localStorage.setItem('interreview_currentUserProfile', JSON.stringify(profile));
  };

  // Handle logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUserProfile(null);
    setHasLoadedRemoteData(false);
    localStorage.removeItem('interreview_isLoggedIn');
    localStorage.removeItem('interreview_currentUserProfile');
    // 内存中保留当前的 interviews/messages，不清空本地存储，便于下次登录继续
  };

  // Handle send message
  const handleSendMessage = (content: string) => {
    if (!selectedInterviewId || isAITyping) return;

    // Create user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    // Add user message to current interview's messages
    setInterviewMessages(prev => ({
      ...prev,
      [selectedInterviewId]: [...(prev[selectedInterviewId] || []), userMessage],
    }));

    // Show AI typing indicator
    setIsAITyping(true);

    // Simulate AI thinking time (1-2 seconds)
    setTimeout(async () => {
      // 基于历史构造多轮对话（system + 历史消息 + 当前用户消息）
      const prevMsgs = interviewMessages[selectedInterviewId] || [];
      const history: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant. 请作为面试复盘助手，用简洁中文回答，并可使用 Markdown。' },
        ...(prevMsgs.map(m => ({ role: m.role, content: m.content })) as ChatMessage[]),
        { role: 'user', content },
      ];

      const aiResponse = await chatWithLLM(history);
      
      // Create AI message with streaming flag
      const aiMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };

      // Add AI message
      setInterviewMessages(prev => ({
        ...prev,
        [selectedInterviewId]: [...(prev[selectedInterviewId] || []), aiMessage],
      }));

      // Hide typing indicator
      setIsAITyping(false);

      // Remove streaming flag after typing animation completes
      // Approximate time: 20ms per character
      const typingDuration = aiResponse.length * 20;
      setTimeout(() => {
        setInterviewMessages(prev => ({
          ...prev,
          [selectedInterviewId]: prev[selectedInterviewId].map(msg =>
            msg.id === aiMessage.id ? { ...msg, isStreaming: false } : msg
          ),
        }));
      }, typingDuration);
    }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
  };

  // Get current interview messages
  const currentMessages = interviewMessages[selectedInterviewId] || [];

  // Show login page if not logged in
  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Toast Notification Container */}
      <Toaster position="top-center" richColors />
      
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        interview={interviewToDelete}
        onConfirm={confirmDeleteInterview}
      />
      
      {/* Left Sidebar */}
      <Sidebar 
        interviews={interviews}
        selectedInterviewId={selectedInterviewId}
        onInterviewSelect={(id, mode) => {
          setSelectedInterviewId(id);
          setViewMode(mode);
          setCurrentStep(mode === 'upload' ? 2 : 3);
          // 持久化当前选择
          if (currentUserProfile) {
            localStorage.setItem(`interreview_selectedInterview_${currentUserProfile.userId}`, id);
          }
        }}
        onInterviewRename={renameInterview}
        onInterviewDelete={deleteInterview}
        onCreateNewInterview={createNewInterview}
        currentUser={currentUserProfile?.username || ''}
        onLogout={handleLogout}
      />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <Header 
          viewMode={viewMode} 
          interviewName={getInterviewName()}
          onRename={(newName) => renameInterview(selectedInterviewId, newName)}
        />
        
        {/* Main Work Area - Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-5xl mx-auto space-y-8 pb-32">
            {interviews.length === 0 ? (
              /* Show empty state when no interviews exist */
              <EmptyState onCreateNew={createNewInterview} />
            ) : currentInterview?.status === '分析中' ? (
              /* Show analyzing loader for "分析中" status */
              <AnalyzingLoader interviewName={currentInterview?.title} />
            ) : viewMode === 'upload' ? (
              <>
                {/* Welcome Title */}
                <h1 className="text-center">有什么可以帮忙的？</h1>
                
                {/* Step Progress */}
                <StepProgress currentStep={currentStep} />
                
                {/* Message List */}
                {currentMessages.length > 0 && (
                  <MessageList messages={currentMessages} />
                )}
                
                {/* AI Typing Indicator */}
                {isAITyping && <TypingIndicator />}
                
                {/* Chat Area - Only show if no messages */}
                {currentMessages.length === 0 && <ChatArea onSendMessage={handleSendMessage} disabled={isAITyping} />}
                
                {/* Upload Area */}
                <UploadArea 
                  userId={currentUserProfile?.userId}
                  interviewId={selectedInterviewId}
                  interviewTitle={currentInterview?.title}
                  interviewStatus={currentInterview?.status}
                  interviewFileUrl={currentInterview?.fileUrl}
                  onUploadComplete={handleUploadComplete} 
                  onStartAnalysis={handleStartAnalysis}
                  initialTranscript={currentInterview?.transcriptText}
                  onTranscriptUpdate={handleTranscriptUpdate}
                />
              </>
            ) : (
              <>
                {/* Step Progress */}
                <StepProgress currentStep={currentStep} />
                
                {/* Chat Report - Conversation Style */}
                <ChatReport 
                  interviewData={currentInterview}
                  onUpdateInterview={(data) => updateInterview(selectedInterviewId, data)}
                />
                
                {/* Message List */}
                {currentMessages.length > 0 && (
                  <MessageList messages={currentMessages} />
                )}
                
                {/* AI Typing Indicator */}
                {isAITyping && <TypingIndicator />}
              </>
            )}
          </div>
        </div>
        
        {/* Chat Input - Fixed at Bottom (only show in report view) */}
        {interviews.length > 0 && 
         currentInterview?.status !== '分析中' && 
         viewMode === 'report' && (
          <ChatInput onSendMessage={handleSendMessage} disabled={isAITyping} />
        )}
      </main>
    </div>
  );
}

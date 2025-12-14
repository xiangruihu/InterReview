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
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Toaster } from 'sonner@2.0.3';
import { toast } from 'sonner@2.0.3';
import { fetchInterviews, fetchMessages, saveInterviews, saveMessages, fetchAnalysis, saveAnalysis, analyzeInterviewReport, transcribeInterview, streamChatWithInterview } from './utils/backend';
import { getMockAnalysisData } from './utils/mockAnalysis';
import type { AnalysisData } from './types/analysis';
import type { UploadTaskState, AnalysisTaskState } from './types/uploads';
import { computeStagedProgressValue } from './hooks/useStagedProgress';
import {
  DEFAULT_UPLOAD_COMPLETION_DURATION,
  DEFAULT_UPLOAD_PROGRESS_CONFIG,
  DEFAULT_ANALYSIS_PROGRESS_CONFIG,
  DEFAULT_ANALYSIS_COMPLETION_DURATION,
} from './constants/progress';

const DEMO_USER_EMAIL = 'demo@example.com';

// 用户档案模型
interface UserProfile {
  userId: string;         // 稳定唯一ID，由后端返回
  username: string;
  email: string;
  createdAt: string;
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
  durationSeconds?: number;
  durationText?: string;
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
  const isDemoUser = useMemo(
    () => ((currentUserProfile?.email || '').toLowerCase() === DEMO_USER_EMAIL),
    [currentUserProfile?.email]
  );

  // Toggle between upload view and analysis report view
  const [viewMode, setViewMode] = useState<'upload' | 'report'>('report');
  const [currentStep, setCurrentStep] = useState(3);
  const [selectedInterviewId, setSelectedInterviewIdState] = useState('2');
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<InterviewData | null>(null);
  
  // Chat messages state - separate messages for each interview
  const [interviewMessages, setInterviewMessages] = useState<Record<string, Message[]>>({});
  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisData>>({});
  const [uploadTasks, setUploadTasks] = useState<Record<string, UploadTaskState>>({});
  const [analysisTasks, setAnalysisTasks] = useState<Record<string, AnalysisTaskState>>({});
  const [hasLoadedRemoteData, setHasLoadedRemoteData] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);
  
  // Interview data state - Load from localStorage
  const [interviews, setInterviews] = useState<InterviewData[]>(() => getDefaultInterviews());

  // Get current interview
  const currentInterview = interviews.find(i => i.id === selectedInterviewId);
  const [analysisCompletionTargetId, setAnalysisCompletionTargetId] = useState<string | null>(null);
  const selectedInterviewIdRef = useRef(selectedInterviewId);
  const abortedAnalysisIdsRef = useRef<Set<string>>(new Set());

  const setSelectedInterviewId = useCallback((id: string) => {
    selectedInterviewIdRef.current = id;
    setSelectedInterviewIdState(id);
  }, []);

  const updateInterview = useCallback((id: string, data: Partial<InterviewData>) => {
    setInterviews(prev =>
      prev.map((interview) => (interview.id === id ? { ...interview, ...data } : interview))
    );
  }, []);

  const beginUploadTask = useCallback((info: { interviewId: string; fileName: string }) => {
    if (!info.interviewId) return;
    setUploadTasks((prev) => ({
      ...prev,
      [info.interviewId]: {
        status: 'running',
        fileName: info.fileName,
        startedAt: Date.now(),
      },
    }));
  }, []);

  const completeUploadTaskState = useCallback((interviewId: string) => {
    if (!interviewId) return;
    setUploadTasks((prev) => {
      const prevTask = prev[interviewId];
      const startedAt = prevTask?.startedAt ?? Date.now();
      const completedAt = Date.now();
      const baseProgress = Math.min(
        computeStagedProgressValue(completedAt - startedAt, DEFAULT_UPLOAD_PROGRESS_CONFIG),
        DEFAULT_UPLOAD_PROGRESS_CONFIG.maxWhileRunning ?? 90
      );
      return {
        ...prev,
        [interviewId]: {
          ...prevTask,
          status: 'success',
          startedAt,
          completedAt,
          progressAtCompletion: baseProgress,
          completionDuration: DEFAULT_UPLOAD_COMPLETION_DURATION,
        },
      };
    });
  }, []);

  const failUploadTask = useCallback((info: { interviewId: string; error?: string }) => {
    if (!info.interviewId) return;
    setUploadTasks((prev) => ({
      ...prev,
      [info.interviewId]: {
        ...prev[info.interviewId],
        status: 'error',
        error: info.error,
      },
    }));
  }, []);

  const clearUploadTask = useCallback((interviewId: string) => {
    if (!interviewId) return;
    setUploadTasks((prev) => {
      const next = { ...prev };
      delete next[interviewId];
      return next;
    });
  }, []);

  const beginAnalysisTask = useCallback((interviewId: string) => {
    if (!interviewId) return;
    setAnalysisTasks((prev) => ({
      ...prev,
      [interviewId]: {
        status: 'running',
        startedAt: Date.now(),
      },
    }));
  }, []);

  const completeAnalysisTask = useCallback((interviewId: string) => {
    if (!interviewId) return;
    setAnalysisTasks((prev) => {
      const prevTask = prev[interviewId];
      const startedAt = prevTask?.startedAt ?? Date.now();
      const completedAt = Date.now();
      const baseProgress = Math.min(
        computeStagedProgressValue(completedAt - startedAt, DEFAULT_ANALYSIS_PROGRESS_CONFIG),
        DEFAULT_ANALYSIS_PROGRESS_CONFIG.maxWhileRunning ?? 90
      );
      return {
        ...prev,
        [interviewId]: {
          ...prevTask,
          status: 'success',
          startedAt,
          completedAt,
          progressAtCompletion: baseProgress,
          completionDuration: DEFAULT_ANALYSIS_COMPLETION_DURATION,
        },
      };
    });
  }, []);

  const failAnalysisTask = useCallback((interviewId: string, error?: string) => {
    if (!interviewId) return;
    setAnalysisTasks((prev) => ({
      ...prev,
      [interviewId]: {
        ...prev[interviewId],
        status: 'error',
        error,
      },
    }));
  }, []);

  const clearAnalysisTask = useCallback((interviewId: string) => {
    if (!interviewId) return;
    setAnalysisTasks((prev) => {
      const next = { ...prev };
      delete next[interviewId];
      return next;
    });
  }, []);

  useEffect(() => {
    selectedInterviewIdRef.current = selectedInterviewId;
  }, [selectedInterviewId]);

  useEffect(() => {
    if (!analysisCompletionTargetId) return;
    if (currentInterview?.id === analysisCompletionTargetId) return;
    updateInterview(analysisCompletionTargetId, { status: '已完成' });
    clearAnalysisTask(analysisCompletionTargetId);
    setAnalysisCompletionTargetId(null);
  }, [analysisCompletionTargetId, currentInterview?.id, updateInterview, clearAnalysisTask]);

  // 持久化登录状态与用户档案
  useEffect(() => {
    if (isLoggedIn && currentUserProfile) {
      localStorage.setItem('interreview_isLoggedIn', 'true');
      localStorage.setItem('interreview_currentUserProfile', JSON.stringify(currentUserProfile));
    }
  }, [isLoggedIn, currentUserProfile]);

  // 用户维度持久化：面试列表（本地备份）
  useEffect(() => {
    if (!currentUserProfile) return;
    const key = `interreview_interviews_${currentUserProfile.userId}`;
    if (isDemoUser) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(interviews));
  }, [interviews, currentUserProfile, isDemoUser]);

  // 用户维度持久化：对话消息（本地备份）
  useEffect(() => {
    if (!currentUserProfile) return;
    const key = `interreview_messages_${currentUserProfile.userId}`;
    if (isDemoUser) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(interviewMessages));
  }, [interviewMessages, currentUserProfile, isDemoUser]);

  // 用户维度持久化：分析结果（本地备份）
  useEffect(() => {
    if (!currentUserProfile) return;
    const key = `interreview_analysis_${currentUserProfile.userId}`;
    if (isDemoUser) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(analysisResults));
  }, [analysisResults, currentUserProfile, isDemoUser]);

  // 同步到后端：面试列表
  useEffect(() => {
    if (!currentUserProfile || !hasLoadedRemoteData || isDemoUser) return;
    (async () => {
      try { await saveInterviews(currentUserProfile.userId, interviews as any); } catch (e) {
        console.warn('[backend] saveInterviews 失败：', e);
      }
    })();
  }, [interviews, currentUserProfile?.userId, hasLoadedRemoteData, isDemoUser]);

  // 同步到后端：对话消息
  useEffect(() => {
    if (!currentUserProfile || !hasLoadedRemoteData || isDemoUser) return;
    (async () => {
      try { await saveMessages(currentUserProfile.userId, interviewMessages as any); } catch (e) {
        console.warn('[backend] saveMessages 失败：', e);
      }
    })();
  }, [interviewMessages, currentUserProfile?.userId, hasLoadedRemoteData, isDemoUser]);

  // 同步到后端：分析结果
  useEffect(() => {
    if (!currentUserProfile || !hasLoadedRemoteData || isDemoUser) return;
    if (!analysisResults || Object.keys(analysisResults).length === 0) return;
    (async () => {
      try { await saveAnalysis(currentUserProfile.userId, analysisResults as any); } catch (e) {
        console.warn('[backend] saveAnalysis 失败：', e);
      }
    })();
  }, [analysisResults, currentUserProfile?.userId, hasLoadedRemoteData, isDemoUser]);

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

    let savedAnalysis = localStorage.getItem(`interreview_analysis_${userId}`);
    let analysisPayload: Record<string, AnalysisData> = {};
    if (savedAnalysis) {
      try {
        analysisPayload = JSON.parse(savedAnalysis);
      } catch {
        analysisPayload = {};
      }
    }

    setInterviews(interviewsPayload);
    setInterviewMessages(messagesPayload);
    setAnalysisResults(analysisPayload);
    restoreSelectedInterview(userId);
  }, [getDefaultInterviews, restoreSelectedInterview]);

  const hydrateFromBackend = useCallback(async (profile: UserProfile) => {
    setHasLoadedRemoteData(false);
    const isDemoProfile = ((profile.email || '').toLowerCase() === DEMO_USER_EMAIL);
    try {
      const [remoteInterviews, remoteMessages, remoteAnalysis] = await Promise.all([
        fetchInterviews(profile.userId),
        fetchMessages(profile.userId),
        fetchAnalysis(profile.userId),
      ]);

      const finalInterviews = (remoteInterviews && remoteInterviews.length > 0)
        ? remoteInterviews
        : getDefaultInterviews();
      const finalMessages = remoteMessages || {};
      const finalAnalysis = remoteAnalysis || {};

      setInterviews(finalInterviews as any);
      setInterviewMessages(finalMessages as any);
      setAnalysisResults(finalAnalysis as Record<string, AnalysisData>);
      restoreSelectedInterview(profile.userId);
    } catch (e) {
      console.warn('[backend] 无法连接后端，使用本地数据：', e);
      if (isDemoProfile) {
        setInterviews(getDefaultInterviews());
        setInterviewMessages({});
        setAnalysisResults({});
        restoreSelectedInterview(profile.userId);
      } else {
        loadLocalBackup(profile.userId, profile.username);
      }
    } finally {
      setHasLoadedRemoteData(true);
    }
  }, [getDefaultInterviews, loadLocalBackup, restoreSelectedInterview]);

  useEffect(() => {
    if (!isLoggedIn || !currentUserProfile) return;
    hydrateFromBackend(currentUserProfile);
  }, [isLoggedIn, currentUserProfile?.userId, hydrateFromBackend]);

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

    setInterviewToDelete(interview);
    setDeleteDialogOpen(true);
  };

  // Confirm delete interview
  const confirmDeleteInterview = () => {
    if (!interviewToDelete) return;
    
    const id = interviewToDelete.id;
    const title = interviewToDelete.title;
    const wasAnalyzing = interviewToDelete.status === '分析中';

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

    setAnalysisResults(prev => {
      const copy = { ...prev } as Record<string, AnalysisData>;
      delete copy[id];
      return copy;
    });

    clearUploadTask(id);
    clearAnalysisTask(id);
    if (wasAnalyzing) {
      abortedAnalysisIdsRef.current.add(id);
      if (analysisCompletionTargetId === id) {
        setAnalysisCompletionTargetId(null);
      }
      toast.info(`「${title}」的分析已被终止并删除`);
    }
    
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
  const handleUploadComplete = (info: {
    interviewId: string;
    fileName: string;
    filePath: string;
    fileType?: string;
    durationSeconds?: number;
    durationText?: string;
  }) => {
    if (!info.interviewId) return;
    completeUploadTaskState(info.interviewId);
    if (selectedInterviewIdRef.current === info.interviewId) {
      setCurrentStep(2);
    }
    updateInterview(info.interviewId, {
      status: '已上传文件',
      fileUrl: info.filePath,
      fileType: info.fileType,
      durationSeconds: info.durationSeconds,
      durationText: info.durationText,
    });
    toast.success(`「${info.fileName}」上传完成`);
  };

  const handleTranscriptUpdate = (text: string) => {
    if (!selectedInterviewId) return;
    updateInterview(selectedInterviewId, { transcriptText: text });
  };

  // Handle start analysis
  const handleStartAnalysis = async () => {
    if (!selectedInterviewId || !currentUserProfile) {
      toast.error('请先选择需要分析的面试');
      return;
    }

    if (!currentInterview?.fileUrl && !currentInterview?.fileType) {
      toast.error('请先上传文件', { description: '需要上传音频、视频或文本文件才能进行分析' });
      return;
    }

    const analyzingInterviewId = selectedInterviewId;
    const { durationSeconds, durationText } = currentInterview ?? {};

    updateInterview(analyzingInterviewId, { status: '分析中' });
    setAnalysisCompletionTargetId(null);
    abortedAnalysisIdsRef.current.delete(analyzingInterviewId);
    beginAnalysisTask(analyzingInterviewId);
    setCurrentStep(3);

    toast.success('开始分析面试内容...', {
      description: '正在进行转录和分析，预计需要 1-2 分钟',
    });

    let analysisGenerated = false;

    try {
      let transcriptText = currentInterview?.transcriptText;
      if (!transcriptText) {
        try {
          const transcriptData = await transcribeInterview(
            currentUserProfile.userId,
            analyzingInterviewId
          );
          transcriptText = transcriptData?.text || '';
          updateInterview(analyzingInterviewId, { transcriptText });
        } catch (transcribeError) {
          console.warn('[transcribe] 转录失败，继续进行分析：', transcribeError);
        }
      }

      const analysis = await analyzeInterviewReport(currentUserProfile.userId, analyzingInterviewId, {
        maxPairs: 12,
      });
      if (abortedAnalysisIdsRef.current.has(analyzingInterviewId)) {
        clearAnalysisTask(analyzingInterviewId);
        abortedAnalysisIdsRef.current.delete(analyzingInterviewId);
        return;
      }
      setAnalysisResults((prev) => ({
        ...prev,
        [analyzingInterviewId]: analysis,
      }));
      analysisGenerated = true;
      toast.success('分析完成！', {
        description: '面试报告已生成',
      });

      completeAnalysisTask(analyzingInterviewId);

      if (selectedInterviewIdRef.current === analyzingInterviewId) {
        setAnalysisCompletionTargetId(analyzingInterviewId);
      } else {
        updateInterview(analyzingInterviewId, { status: '已完成' });
        clearAnalysisTask(analyzingInterviewId);
        setViewMode('report');
      }
    } catch (error) {
      console.error('[analysis] 调用失败：', error);
      let failureReason = error instanceof Error ? error.message : '请稍后重试';
      if (abortedAnalysisIdsRef.current.has(analyzingInterviewId)) {
        clearAnalysisTask(analyzingInterviewId);
        abortedAnalysisIdsRef.current.delete(analyzingInterviewId);
        return;
      }
      toast.error('分析失败', { description: failureReason });

      try {
        const mockData = getMockAnalysisData({
          durationSeconds,
          durationText,
        });
        setAnalysisResults((prev) => ({
          ...prev,
          [analyzingInterviewId]: mockData,
        }));
        analysisGenerated = true;
        toast.info('已加载示例分析', {
          description: 'LLM 服务不可用，已展示示例数据用于演示效果',
        });

        completeAnalysisTask(analyzingInterviewId);
        if (selectedInterviewIdRef.current === analyzingInterviewId) {
          setAnalysisCompletionTargetId(analyzingInterviewId);
        } else {
          updateInterview(analyzingInterviewId, { status: '已完成' });
          clearAnalysisTask(analyzingInterviewId);
          setViewMode('report');
        }
      } catch (mockError) {
        console.warn('[analysis] 加载示例数据失败：', mockError);
        updateInterview(analyzingInterviewId, { status: '分析失败' });
        failureReason =
          mockError instanceof Error ? mockError.message : '示例数据加载失败，请稍后重试';
      }
      if (!analysisGenerated) {
        failAnalysisTask(analyzingInterviewId, failureReason);
        clearAnalysisTask(analyzingInterviewId);
      }
    }
  };

  // Get interview name for header
  const getInterviewName = () => {
    return currentInterview?.title || '未命名面试';
  };

  // Handle login - 保存用户档案并加载该用户的历史数据
  const handleLogin = async (profileInput: { userId: string; username: string; email: string; createdAt?: string }) => {
    const profile: UserProfile = {
      userId: profileInput.userId,
      username: profileInput.username,
      email: profileInput.email,
      createdAt: profileInput.createdAt || new Date().toISOString(),
    };

    setCurrentUserProfile(profile);
    setIsLoggedIn(true);
    setHasLoadedRemoteData(false);
    localStorage.setItem('interreview_isLoggedIn', 'true');
    localStorage.setItem('interreview_currentUserProfile', JSON.stringify(profile));
  };

  // Handle logout
  const handleLogout = () => {
    const lastProfile = currentUserProfile;
    const wasDemoUser = ((lastProfile?.email || '').toLowerCase() === DEMO_USER_EMAIL);
    setIsLoggedIn(false);
    setCurrentUserProfile(null);
    setHasLoadedRemoteData(false);
    setUploadTasks({});
    setAnalysisTasks({});
    localStorage.removeItem('interreview_isLoggedIn');
    localStorage.removeItem('interreview_currentUserProfile');
    if (lastProfile && wasDemoUser) {
      localStorage.removeItem(`interreview_interviews_${lastProfile.userId}`);
      localStorage.removeItem(`interreview_messages_${lastProfile.userId}`);
      localStorage.removeItem(`interreview_analysis_${lastProfile.userId}`);
      localStorage.removeItem(`interreview_selectedInterview_${lastProfile.userId}`);
    }
    // 内存中保留当前的 interviews/messages，不清空本地存储，便于下次登录继续
  };

  // Handle send message
  const handleSendMessage = async (content: string) => {
    if (!selectedInterviewId || !currentUserProfile) return;
    const question = (content || '').trim();
    if (!question) return;
    if (isAITyping) {
      toast.info('AI 正在回答，请稍候');
      return;
    }

    const prevHistory = [...(interviewMessages[selectedInterviewId] || [])];
    const optimisticMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };
    const assistantMessageId = `msg-${Date.now()}-assistant`;
    const placeholderAssistant: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    setInterviewMessages(prev => ({
      ...prev,
      [selectedInterviewId]: [
        ...(prev[selectedInterviewId] || []),
        optimisticMessage,
        placeholderAssistant,
      ],
    }));
    setIsAITyping(true);

    try {
      await streamChatWithInterview(
        currentUserProfile.userId,
        selectedInterviewId,
        { question },
        {
          onChunk: (chunk) => {
            setInterviewMessages(prev => {
              const history = prev[selectedInterviewId] || [];
              return {
                ...prev,
                [selectedInterviewId]: history.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: (msg.content || '') + chunk }
                    : msg
                ),
              };
            });
          },
          onDone: (payload) => {
            setInterviewMessages(prev => ({
              ...prev,
              [selectedInterviewId]: payload.history as Message[],
            }));
          },
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '请稍后重试';
      toast.error('智能问讯失败', { description: message });
      setInterviewMessages(prev => ({
        ...prev,
        [selectedInterviewId]: prevHistory,
      }));
    } finally {
      setIsAITyping(false);
    }
  };

  // Get current interview messages
  const currentMessages = interviewMessages[selectedInterviewId] || [];
  const currentAnalysis = selectedInterviewId ? analysisResults[selectedInterviewId] : undefined;

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
          if (currentUserProfile && !isDemoUser) {
            localStorage.setItem(`interreview_selectedInterview_${currentUserProfile.userId}`, id);
          } else if (currentUserProfile && isDemoUser) {
            localStorage.removeItem(`interreview_selectedInterview_${currentUserProfile.userId}`);
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
              <AnalyzingLoader
                interviewName={currentInterview?.title}
                task={currentInterview?.id ? analysisTasks[currentInterview.id] : undefined}
                onVisualComplete={() => {
                  if (!currentInterview) return;
                  updateInterview(currentInterview.id, { status: '已完成' });
                  setViewMode('report');
                  clearAnalysisTask(currentInterview.id);
                  setAnalysisCompletionTargetId(null);
                }}
              />
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
                  uploadTask={uploadTasks[selectedInterviewId]}
                  onUploadStart={beginUploadTask}
                  onUploadError={failUploadTask}
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
                  analysisData={currentAnalysis}
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

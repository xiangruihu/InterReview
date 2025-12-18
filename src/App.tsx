import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { StepProgress } from './components/StepProgress';
import { ChatArea } from './components/ChatArea';
import { UploadArea, type UploadUIState } from './components/UploadArea';
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
import type { TranscriptChunk } from './utils/backend';
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
type ViewMode = 'upload' | 'report';
type StepValue = 1 | 2 | 3;
type ByInterview<T> = Record<string, T>;
const IS_DEV = import.meta.env?.DEV ?? false;

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
  status: '待上传' | '上传中' | '已上传文件' | '分析中' | '已完成' | '分析失败';
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

interface TranscriptPanelState {
  text: string;
  updatedAt: string | null;
  isLoading: boolean;
  isTranscribing: boolean;
  error: string | null;
  chunks: TranscriptChunk[];
  failedChunks: TranscriptChunk[];
  overallStatus: 'idle' | 'empty' | 'completed' | 'partial' | 'error' | 'pending';
}

const DEFAULT_TRANSCRIPT_PANEL_STATE: TranscriptPanelState = {
  text: '',
  updatedAt: null,
  isLoading: false,
  isTranscribing: false,
  error: null,
  chunks: [],
  failedChunks: [],
  overallStatus: 'idle',
};

const DEFAULT_UPLOAD_UI_STATE: UploadUIState = {
  stage: 'idle',
};

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
  const [viewModeByInterview, setViewModeByInterview] = useState<ByInterview<ViewMode>>({});
  const [stepByInterview, setStepByInterview] = useState<ByInterview<StepValue>>({});
  const [selectedInterviewId, setSelectedInterviewIdState] = useState('2');
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<InterviewData | null>(null);
  
  // Chat messages state - separate messages for each interview
  const [interviewMessages, setInterviewMessages] = useState<Record<string, Message[]>>({});
  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisData>>({});
  const [uploadTasks, setUploadTasks] = useState<Record<string, UploadTaskState>>({});
  const [analysisTasks, setAnalysisTasks] = useState<Record<string, AnalysisTaskState>>({});
  const [transcriptStates, setTranscriptStates] = useState<Record<string, TranscriptPanelState>>({});
  const [hasLoadedRemoteData, setHasLoadedRemoteData] = useState(false);
  const [isAITypingByInterview, setIsAITypingByInterview] = useState<ByInterview<boolean>>({});
  const [uploadUIByInterview, setUploadUIByInterview] = useState<ByInterview<UploadUIState>>({});
  
  // Interview data state - Load from localStorage
  const [interviews, setInterviews] = useState<InterviewData[]>(() => getDefaultInterviews());

  // Get current interview
  const currentInterview = interviews.find(i => i.id === selectedInterviewId);
  const [analysisCompletionTargetId, setAnalysisCompletionTargetId] = useState<string | null>(null);
  const selectedInterviewIdRef = useRef(selectedInterviewId);
  const abortedAnalysisIdsRef = useRef<Set<string>>(new Set());
  const uploadPreviousStatusRef = useRef<Record<string, InterviewData['status']>>({});
  const analysisRequestVersionRef = useRef<Record<string, number>>({});
  const chatRequestVersionRef = useRef<Record<string, number>>({});
  const chatAbortControllerRef = useRef<Record<string, AbortController | null>>({});
  const patchUploadUIState = useCallback(
    (interviewId: string | undefined, patch: Partial<UploadUIState>) => {
      if (!interviewId) return;
      setUploadUIByInterview((prev) => {
        const previous = prev[interviewId] ?? DEFAULT_UPLOAD_UI_STATE;
        const nextState: UploadUIState = { ...previous, ...patch };
        if (IS_DEV) {
          console.debug('[UploadUI] patch', {
            targetInterviewId: interviewId,
            currentInterviewId: selectedInterviewIdRef.current,
            stage: nextState.stage,
          });
        }
        return {
          ...prev,
          [interviewId]: nextState,
        };
      });
    },
    []
  );
  const clearUploadUIState = useCallback((interviewId: string | undefined) => {
    if (!interviewId) return;
    setUploadUIByInterview((prev) => {
      if (!(interviewId in prev)) return prev;
      const next = { ...prev };
      delete next[interviewId];
      return next;
    });
  }, []);

  const getDefaultViewMode = useCallback((interview?: InterviewData | null): ViewMode => {
    return interview?.status === '已完成' ? 'report' : 'upload';
  }, []);

  const getDefaultStep = useCallback((interview?: InterviewData | null): StepValue => {
    if (!interview) return 1;
    if (interview.status === '待上传') return 1;
    if (interview.status === '上传中' || interview.status === '已上传文件') return 2;
    return 3;
  }, []);
  const getDerivedUploadUIState = useCallback((interview?: InterviewData | null): UploadUIState => {
    if (!interview) return DEFAULT_UPLOAD_UI_STATE;
    if (interview.status === '上传中') {
      return {
        stage: 'uploading',
        fileName: interview.fileUrl?.split('/').pop() ?? undefined,
      };
    }
    if (interview.fileUrl) {
      return {
        stage: 'uploaded',
        fileName: interview.fileUrl.split('/').pop() ?? undefined,
      };
    }
    if (['已上传文件', '分析中', '已完成', '分析失败'].includes(interview.status)) {
      return { stage: 'uploaded' };
    }
    return DEFAULT_UPLOAD_UI_STATE;
  }, []);

  const setInterviewViewMode = useCallback((id: string | undefined | null, mode: ViewMode) => {
    if (!id) return;
    setViewModeByInterview((prev) => ({
      ...prev,
      [id]: mode,
    }));
  }, []);

  const setInterviewStep = useCallback((id: string | undefined | null, step: StepValue) => {
    if (!id) return;
    setStepByInterview((prev) => ({
      ...prev,
      [id]: step,
    }));
  }, []);

  const setInterviewTypingState = useCallback((id: string | undefined | null, state: boolean) => {
    if (!id) return;
    setIsAITypingByInterview((prev) => ({
      ...prev,
      [id]: state,
    }));
  }, []);

  const bumpAnalysisRequestVersion = useCallback((interviewId: string) => {
    analysisRequestVersionRef.current[interviewId] =
      (analysisRequestVersionRef.current[interviewId] ?? 0) + 1;
    return analysisRequestVersionRef.current[interviewId];
  }, []);

  const isAnalysisRequestActive = useCallback(
    (interviewId: string, version: number) =>
      analysisRequestVersionRef.current[interviewId] === version,
    []
  );

  const bumpChatRequestVersion = useCallback((interviewId: string) => {
    chatRequestVersionRef.current[interviewId] =
      (chatRequestVersionRef.current[interviewId] ?? 0) + 1;
    return chatRequestVersionRef.current[interviewId];
  }, []);

  const isChatRequestActive = useCallback(
    (interviewId: string, version: number) =>
      chatRequestVersionRef.current[interviewId] === version,
    []
  );

  const assignChatAbortController = useCallback(
    (interviewId: string, controller: AbortController) => {
      if (chatAbortControllerRef.current[interviewId]) {
        chatAbortControllerRef.current[interviewId]?.abort();
      }
      chatAbortControllerRef.current[interviewId] = controller;
    },
    []
  );

  const clearChatAbortController = useCallback((interviewId: string) => {
    const controller = chatAbortControllerRef.current[interviewId];
    if (controller) {
      controller.abort();
      delete chatAbortControllerRef.current[interviewId];
    }
  }, []);

  const abortAllChatStreams = useCallback(() => {
    Object.keys(chatAbortControllerRef.current).forEach((key) => {
      chatAbortControllerRef.current[key]?.abort();
      delete chatAbortControllerRef.current[key];
    });
  }, []);

  const setSelectedInterviewId = useCallback((id: string) => {
    selectedInterviewIdRef.current = id;
    setSelectedInterviewIdState(id);
  }, []);

  const updateInterview = useCallback((id: string, data: Partial<InterviewData>) => {
    setInterviews(prev =>
      prev.map((interview) => (interview.id === id ? { ...interview, ...data } : interview))
    );
  }, []);

  const updateTranscriptPanelState = useCallback((id: string, changes: Partial<TranscriptPanelState>) => {
    if (!id) return;
    setTranscriptStates((prev) => {
      const prevState = prev[id] ?? DEFAULT_TRANSCRIPT_PANEL_STATE;
      const nextState = { ...prevState, ...changes };
      return {
        ...prev,
        [id]: nextState,
      };
    });
  }, []);

  const beginUploadTask = useCallback((info: { interviewId: string; fileName: string; previousStatus?: InterviewData['status'] }) => {
    if (!info.interviewId) return;
    const { interviewId, fileName, previousStatus } = info;
    setUploadTasks((prev) => ({
      ...prev,
      [interviewId]: {
        status: 'running',
        fileName,
        startedAt: Date.now(),
      },
    }));

    setInterviews((prev) =>
      prev.map((interview) => {
        if (interview.id !== interviewId) return interview;
        if (uploadPreviousStatusRef.current[interviewId] === undefined) {
          uploadPreviousStatusRef.current[interviewId] = previousStatus || interview.status;
        }
        return { ...interview, status: '上传中' };
      })
    );
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
    setInterviews((prev) =>
      prev.map((interview) => {
        if (interview.id !== info.interviewId) return interview;
        const previousStatus =
          uploadPreviousStatusRef.current[info.interviewId] ||
          (interview.status === '上传中' ? '待上传' : interview.status);
        return { ...interview, status: previousStatus };
      })
    );
    delete uploadPreviousStatusRef.current[info.interviewId];
  }, []);

  const clearUploadTask = useCallback((interviewId: string) => {
    if (!interviewId) return;
    setUploadTasks((prev) => {
      const next = { ...prev };
      delete next[interviewId];
      return next;
    });
    delete uploadPreviousStatusRef.current[interviewId];
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
    setInterviewViewMode(analysisCompletionTargetId, 'report');
    setInterviewStep(analysisCompletionTargetId, 3);
    clearAnalysisTask(analysisCompletionTargetId);
    setAnalysisCompletionTargetId(null);
  }, [
    analysisCompletionTargetId,
    currentInterview?.id,
    updateInterview,
    clearAnalysisTask,
    setInterviewStep,
    setInterviewViewMode,
  ]);

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
        setInterviewViewMode(
          nextInterview.id,
          nextInterview.status === '已完成' ? 'report' : 'upload'
        );
        setInterviewStep(nextInterview.id, getDefaultStep(nextInterview));
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
    setTranscriptStates(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setViewModeByInterview(prev => {
      if (!(id in prev)) return prev;
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setStepByInterview(prev => {
      if (!(id in prev)) return prev;
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setIsAITypingByInterview(prev => {
      if (!(id in prev)) return prev;
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    clearUploadUIState(id);

    clearUploadTask(id);
    clearAnalysisTask(id);
    clearChatAbortController(id);
    delete chatRequestVersionRef.current[id];
    delete analysisRequestVersionRef.current[id];
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
    setInterviewViewMode(newId, 'upload');
    setInterviewStep(newId, 1);
    
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
    setInterviewStep(info.interviewId, 2);
    setInterviewViewMode(info.interviewId, 'upload');
    updateInterview(info.interviewId, {
      status: '已上传文件',
      fileUrl: info.filePath,
      fileType: info.fileType,
      durationSeconds: info.durationSeconds,
      durationText: info.durationText,
    });
    delete uploadPreviousStatusRef.current[info.interviewId];
    toast.success(`「${info.fileName}」上传完成`);
  };

  const handleTranscriptUpdate = useCallback((interviewId: string, text: string) => {
    if (!interviewId) return;
    updateInterview(interviewId, { transcriptText: text });
  }, [updateInterview]);

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
    setInterviewStep(analyzingInterviewId, 3);

    const analysisRequestVersion = bumpAnalysisRequestVersion(analyzingInterviewId);
    if (IS_DEV) {
      console.debug('[analysis] request-start', {
        targetInterviewId: analyzingInterviewId,
        currentInterviewId: selectedInterviewIdRef.current,
        version: analysisRequestVersion,
      });
    }
    const logStale = (phase: string) => {
      if (IS_DEV) {
        console.debug('[analysis] stale-skip', {
          phase,
          targetInterviewId: analyzingInterviewId,
          currentInterviewId: selectedInterviewIdRef.current,
          version: analysisRequestVersion,
        });
      }
    };

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
          if (!isAnalysisRequestActive(analyzingInterviewId, analysisRequestVersion)) {
            logStale('transcribe');
            return;
          }
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
      if (!isAnalysisRequestActive(analyzingInterviewId, analysisRequestVersion)) {
        logStale('analysis');
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
        setInterviewViewMode(analyzingInterviewId, 'report');
        setInterviewStep(analyzingInterviewId, 3);
        clearAnalysisTask(analyzingInterviewId);
      }
    } catch (error) {
      if (!isAnalysisRequestActive(analyzingInterviewId, analysisRequestVersion)) {
        logStale('error');
        return;
      }
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
          setInterviewViewMode(analyzingInterviewId, 'report');
          setInterviewStep(analyzingInterviewId, 3);
          clearAnalysisTask(analyzingInterviewId);
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
    setTranscriptStates({});
    setViewModeByInterview({});
    setStepByInterview({});
    setIsAITypingByInterview({});
    setUploadUIByInterview({});
    abortAllChatStreams();
    chatRequestVersionRef.current = {};
    analysisRequestVersionRef.current = {};
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
    const targetInterviewId = selectedInterviewId;
    const question = (content || '').trim();
    if (!question) return;
    if (isAITypingByInterview[targetInterviewId]) {
      toast.info('AI 正在回答，请稍候');
      return;
    }

    const prevHistory = [...(interviewMessages[targetInterviewId] || [])];
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
      [targetInterviewId]: [
        ...(prev[targetInterviewId] || []),
        optimisticMessage,
        placeholderAssistant,
      ],
    }));

    const chatVersion = bumpChatRequestVersion(targetInterviewId);
    const controller = new AbortController();
    assignChatAbortController(targetInterviewId, controller);
    setInterviewTypingState(targetInterviewId, true);
    const logChatStale = (phase: string) => {
      if (IS_DEV) {
        console.debug('[chat] stale-skip', {
          phase,
          targetInterviewId,
          currentInterviewId: selectedInterviewIdRef.current,
          version: chatVersion,
        });
      }
    };

    try {
      await streamChatWithInterview(
        currentUserProfile.userId,
        targetInterviewId,
        { question },
        {
          onChunk: (chunk) => {
            if (!isChatRequestActive(targetInterviewId, chatVersion)) {
              logChatStale('chunk');
              return;
            }
            setInterviewMessages(prev => {
              const history = prev[targetInterviewId] || [];
              return {
                ...prev,
                [targetInterviewId]: history.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: (msg.content || '') + chunk }
                    : msg
                ),
              };
            });
          },
          onDone: (payload) => {
            if (!isChatRequestActive(targetInterviewId, chatVersion)) {
              logChatStale('done');
              return;
            }
            setInterviewMessages(prev => ({
              ...prev,
              [targetInterviewId]: payload.history as Message[],
            }));
          },
          signal: controller.signal,
        }
      );
    } catch (error) {
      if (isChatRequestActive(targetInterviewId, chatVersion)) {
        const message = error instanceof Error ? error.message : '请稍后重试';
        toast.error('智能问讯失败', { description: message });
        setInterviewMessages(prev => ({
          ...prev,
          [targetInterviewId]: prevHistory,
        }));
      } else {
        logChatStale('catch');
      }
    } finally {
      if (isChatRequestActive(targetInterviewId, chatVersion)) {
        setInterviewTypingState(targetInterviewId, false);
        if (chatAbortControllerRef.current[targetInterviewId] === controller) {
          delete chatAbortControllerRef.current[targetInterviewId];
        }
      }
    }
  };

  // Get current interview messages
  const currentMessages = selectedInterviewId ? interviewMessages[selectedInterviewId] || [] : [];
  const currentAnalysis = selectedInterviewId ? analysisResults[selectedInterviewId] : undefined;
  const currentTranscriptPanelState = currentInterview ? transcriptStates[currentInterview.id] : undefined;
  const currentUploadUIState =
    (selectedInterviewId ? uploadUIByInterview[selectedInterviewId] : undefined) ??
    getDerivedUploadUIState(currentInterview);
  const currentViewMode: ViewMode = currentInterview
    ? (selectedInterviewId ? viewModeByInterview[selectedInterviewId] : undefined) ??
      getDefaultViewMode(currentInterview)
    : 'upload';
  const currentStep: StepValue = currentInterview
    ? stepByInterview[currentInterview.id] ?? getDefaultStep(currentInterview)
    : 1;
  const isCurrentInterviewAITyping = selectedInterviewId
    ? Boolean(isAITypingByInterview[selectedInterviewId])
    : false;

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
            setInterviewViewMode(id, mode);
            const target = interviews.find((item) => item.id === id);
            setInterviewStep(id, getDefaultStep(target));
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
          viewMode={currentViewMode} 
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
                  setInterviewViewMode(currentInterview.id, 'report');
                  setInterviewStep(currentInterview.id, 3);
                  clearAnalysisTask(currentInterview.id);
                  setAnalysisCompletionTargetId(null);
                }}
              />
            ) : currentViewMode === 'upload' ? (
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
                {isCurrentInterviewAITyping && <TypingIndicator />}
                
                {/* Chat Area - Only show if no messages */}
                {currentMessages.length === 0 && (
                  <ChatArea onSendMessage={handleSendMessage} disabled={isCurrentInterviewAITyping} />
                )}
                
                {/* Upload Area */}
                <UploadArea 
                  userId={currentUserProfile?.userId}
                  interviewId={selectedInterviewId}
                  interviewTitle={currentInterview?.title}
                  interviewStatus={currentInterview?.status}
                  interviewFileUrl={currentInterview?.fileUrl}
                  uploadTask={uploadTasks[selectedInterviewId]}
                  transcriptState={currentTranscriptPanelState}
                  uploadUIState={currentUploadUIState}
                  onTranscriptStateChange={updateTranscriptPanelState}
                  onUploadStart={beginUploadTask}
                  onUploadError={failUploadTask}
                  onUploadComplete={handleUploadComplete} 
                  onStartAnalysis={handleStartAnalysis}
                  initialTranscript={currentInterview?.transcriptText}
                  onTranscriptUpdate={handleTranscriptUpdate}
                  onPatchUploadUI={patchUploadUIState}
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
                {isCurrentInterviewAITyping && <TypingIndicator />}
              </>
            )}
          </div>
        </div>
        
        {/* Chat Input - Fixed at Bottom (only show in report view) */}
        {interviews.length > 0 && 
         currentInterview?.status !== '分析中' && 
         currentViewMode === 'report' && (
          <ChatInput onSendMessage={handleSendMessage} disabled={isCurrentInterviewAITyping} />
        )}
      </main>
    </div>
  );
}

import {
  CloudUpload,
  FileAudio,
  Loader2,
  CheckCircle2,
  File,
  Sparkles,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';
import { uploadInterviewFile, transcribeInterview, fetchTranscript, retryTranscriptChunks } from '../utils/backend';
import type { TranscriptChunk, TranscriptPayload } from '../utils/backend';
import type { InterviewStatus } from '../utils/backend';
import { formatDuration } from '../utils/time';
import type { UploadTaskState } from '../types/uploads';

const MEDIA_DURATION_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mp4'];
const TEXT_EXTENSIONS = ['.txt'];

const isMediaFileForDuration = (file: File) => {
  const type = (file.type || '').toLowerCase();
  if (type.startsWith('audio/') || type.startsWith('video/')) {
    return true;
  }
  const lowerName = file.name.toLowerCase();
  return MEDIA_DURATION_EXTENSIONS.some(ext => lowerName.endsWith(ext));
};

const isTextTranscriptFile = (file: File) => {
  const type = (file.type || '').toLowerCase();
  if (type === 'text/plain') return true;
  const lowerName = file.name.toLowerCase();
  return TEXT_EXTENSIONS.some(ext => lowerName.endsWith(ext));
};

const readTextTranscript = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error || new Error('读取文本失败'));
    reader.readAsText(file, 'utf-8');
  });
};

const getMediaElementTag = (file: File): 'audio' | 'video' => {
  const type = (file.type || '').toLowerCase();
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.mp4')) return 'video';
  return 'audio';
};

const getMediaDuration = (file: File): Promise<number | null> => {
  if (!isMediaFileForDuration(file)) {
    return Promise.resolve(null);
  }

  return new Promise(resolve => {
    const objectUrl = URL.createObjectURL(file);
    const mediaEl = document.createElement(getMediaElementTag(file));
    mediaEl.preload = 'metadata';

    const cleanup = () => {
      mediaEl.removeAttribute('src');
      mediaEl.load();
      URL.revokeObjectURL(objectUrl);
    };

    mediaEl.onloadedmetadata = () => {
      const duration = Number.isFinite(mediaEl.duration) ? mediaEl.duration : null;
      cleanup();
      resolve(duration);
    };

    mediaEl.onerror = () => {
      cleanup();
      resolve(null);
    };

    mediaEl.src = objectUrl;
  });
};

const createLocalChunk = (text: string, fileName?: string): TranscriptChunk => ({
  index: 0,
  filename: fileName || 'transcript.txt',
  status: 'ok',
  text,
  error: undefined,
  retryCount: 0,
  updatedAt: new Date().toISOString(),
});

type TranscriptPanelState = {
  text: string;
  updatedAt: string | null;
  isLoading: boolean;
  isTranscribing: boolean;
  error: string | null;
  chunks: TranscriptChunk[];
  failedChunks: TranscriptChunk[];
  overallStatus: 'idle' | 'empty' | 'completed' | 'partial' | 'error' | 'pending';
};

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

export type UploadUIStage = 'idle' | 'uploading' | 'uploaded';

export interface UploadUIState {
  stage: UploadUIStage;
  fileName?: string;
  fileSize?: number;
}

const DEFAULT_UPLOAD_UI_STATE: UploadUIState = {
  stage: 'idle',
};

interface UploadAreaProps {
  userId?: string;
  interviewId?: string;
  interviewTitle?: string;
  interviewStatus?: InterviewStatus;
  interviewFileUrl?: string;
  initialTranscript?: string;
  uploadTask?: UploadTaskState;
  transcriptState?: TranscriptPanelState;
  uploadUIState?: UploadUIState;
  progressPercent?: number;
  onTranscriptStateChange?: (interviewId: string, changes: Partial<TranscriptPanelState>) => void;
  onUploadStart?: (info: { interviewId: string; fileName: string; previousStatus?: InterviewStatus }) => void;
  onUploadError?: (info: { interviewId: string; error?: string }) => void;
  onUploadComplete?: (info: { interviewId: string; fileName: string; filePath: string; fileType?: string; durationSeconds?: number; durationText?: string }) => void;
  onStartAnalysis?: () => void;
  onTranscriptUpdate?: (interviewId: string, text: string) => void;
  onPatchUploadUI?: (interviewId: string, patch: Partial<UploadUIState>) => void;
}

export function UploadArea({
  userId,
  interviewId,
  interviewTitle,
  interviewStatus,
  interviewFileUrl,
  initialTranscript,
  uploadTask,
  transcriptState,
  uploadUIState,
  progressPercent,
  onTranscriptStateChange,
  onUploadStart,
  onUploadError,
  onUploadComplete,
  onStartAnalysis,
  onTranscriptUpdate,
  onPatchUploadUI,
}: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const normalizedProgress = Math.min(
    100,
    Math.max(0, typeof progressPercent === 'number' ? Math.round(progressPercent) : 0)
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resolvedTranscriptState = transcriptState ?? DEFAULT_TRANSCRIPT_PANEL_STATE;
  const {
    text: transcript,
    updatedAt: transcriptUpdatedAt,
    isLoading: isLoadingTranscript,
    isTranscribing,
    error: transcriptionError,
    chunks = [],
    failedChunks = [],
    overallStatus,
  } = resolvedTranscriptState;
  const sortedChunks = [...chunks].sort((a, b) => a.index - b.index);
  const hasChunkData = sortedChunks.length > 0;
  const hasFailedChunks = failedChunks.length > 0;
  const getChunkStatusMeta = useCallback((status: TranscriptChunk['status']) => {
    if (status === 'ok') {
      return { label: '成功', classes: 'bg-green-100 text-green-700' };
    }
    if (status === 'error') {
      return { label: '失败', classes: 'bg-red-100 text-red-700' };
    }
    return { label: '转写中', classes: 'bg-amber-100 text-amber-700' };
  }, []);
  const getChunkContent = useCallback((chunk: TranscriptChunk) => {
    if (chunk.status === 'ok') {
      return chunk.text?.trim() || '该分片暂无可显示的内容';
    }
    if (chunk.status === 'error') {
      return `转写失败：${chunk.error || '请稍后重试'}`;
    }
    return '该分片正在重新转写中...';
  }, []);
  const patchTranscriptState = useCallback(
    (targetInterviewId: string | undefined, patch: Partial<TranscriptPanelState>) => {
      if (!targetInterviewId) return;
      onTranscriptStateChange?.(targetInterviewId, patch);
    },
    [onTranscriptStateChange]
  );
  const patchUploadUIState = useCallback(
    (targetInterviewId: string | undefined, patch: Partial<UploadUIState>) => {
      if (!targetInterviewId) return;
      onPatchUploadUI?.(targetInterviewId, patch);
    },
    [onPatchUploadUI]
  );

  const normalizeTranscriptPayload = useCallback((payload?: TranscriptPayload | null) => {
    if (!payload) {
      return {
        text: '',
        updatedAt: null,
        chunks: [],
        failedChunks: [],
        overallStatus: 'empty',
      } as Partial<TranscriptPanelState>;
    }
    const chunkList = [...(payload.chunks ?? [])].sort((a, b) => a.index - b.index);
    const failedList = payload.failedChunks ?? chunkList.filter(chunk => chunk.status === 'error');
    let status: TranscriptPanelState['overallStatus'] | undefined = payload.overallStatus as TranscriptPanelState['overallStatus'];
    if (!status) {
      if (chunkList.length === 0) {
        status = 'empty';
      } else if (failedList.length > 0) {
        status = failedList.length === chunkList.length ? 'error' : 'partial';
      } else {
        status = 'completed';
      }
    }
    return {
      text: payload.text || '',
      updatedAt: payload.updatedAt || payload.createdAt || null,
      chunks: chunkList,
      failedChunks: failedList,
      overallStatus: status,
    } as Partial<TranscriptPanelState>;
  }, []);

  const applyTranscriptPayload = useCallback(
    (targetInterviewId: string | undefined, payload?: TranscriptPayload | null) => {
      if (!targetInterviewId) return;
      const normalized = normalizeTranscriptPayload(payload);
      patchTranscriptState(targetInterviewId, {
        ...normalized,
        isLoading: false,
        isTranscribing: false,
        error: null,
      });
      if (payload && typeof payload.text === 'string') {
        onTranscriptUpdate?.(targetInterviewId, payload.text);
      }
    },
    [normalizeTranscriptPayload, onTranscriptUpdate, patchTranscriptState]
  );

  const fallbackUploadState: UploadUIState = (() => {
    if (interviewStatus === '上传中') {
      return {
        stage: 'uploading',
        fileName: interviewFileUrl ? interviewFileUrl.split('/').pop() ?? undefined : undefined,
      };
    }

    if (interviewFileUrl) {
      return {
        stage: 'uploaded',
        fileName: interviewFileUrl.split('/').pop() ?? undefined,
      };
    }

    if (['已上传文件', '分析中', '已完成', '分析失败'].includes(interviewStatus || '')) {
      return { stage: 'uploaded' };
    }

    return DEFAULT_UPLOAD_UI_STATE;
  })();
  const resolvedUploadUIState = uploadUIState ?? fallbackUploadState;
  const displayFileName = uploadUIState?.fileName ?? fallbackUploadState.fileName;
  const displayFileSize = uploadUIState?.fileSize;
  const hasUploaded = resolvedUploadUIState.stage === 'uploaded' || Boolean(interviewFileUrl);

  // Supported file types
  const supportedTypes = [
    'audio/mpeg', // MP3
    'audio/wav', // WAV
    'audio/x-m4a', // M4A
    'audio/mp4', // M4A alternative
    'video/mp4', // MP4
    'text/plain', // TXT
  ];

  const supportedExtensions = ['.mp3', '.wav', '.m4a', '.mp4', '.txt'];
  const maxFileSize = 200 * 1024 * 1024; // 200MB

  // Validate file
  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxFileSize) {
      toast.error('文件大小超过限制（最大 200MB）');
      return false;
    }

    // Check file type by extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = supportedExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension && !supportedTypes.includes(file.type)) {
      toast.error('不支持的文件格式，请上传 MP3、WAV、M4A、MP4 或 TXT 文件');
      return false;
    }

    return true;
  };

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    if (!validateFile(file)) {
      return;
    }

    if (!userId || !interviewId) {
      toast.error('请先登录并选择要上传的面试');
      return;
    }

    const targetInterviewId = interviewId;

    if (uploadTask?.status === 'running') {
      toast.info('当前文件仍在上传，请稍候完成后再试');
      return;
    }

    try {
      patchUploadUIState(targetInterviewId, {
        stage: 'uploading',
        fileName: file.name,
        fileSize: file.size,
      });
      onUploadStart?.({
        interviewId: targetInterviewId,
        fileName: file.name,
        previousStatus: interviewStatus,
      });
      const isTextFile = isTextTranscriptFile(file);
      const durationPromise = getMediaDuration(file);
      const [result, durationSeconds] = await Promise.all([
        uploadInterviewFile(userId, targetInterviewId, file),
        durationPromise,
      ]);
      const durationText = formatDuration(durationSeconds ?? undefined);
      toast.success(`「${file.name}」上传成功`);
      patchUploadUIState(targetInterviewId, {
        stage: 'uploaded',
        fileName: file.name,
        fileSize: file.size,
      });
      onUploadComplete?.({
        interviewId: targetInterviewId,
        fileName: file.name,
        filePath: result.file_path,
        fileType: result.file_type || file.type,
        durationSeconds: durationSeconds ?? undefined,
        durationText: durationText,
      });
      if (isTextFile) {
        try {
          const text = await readTextTranscript(file);
          const chunk = createLocalChunk(text, file.name);
          patchTranscriptState(targetInterviewId, {
            text,
            updatedAt: chunk.updatedAt || new Date().toISOString(),
            error: null,
            chunks: [chunk],
            failedChunks: [],
            overallStatus: 'completed',
          });
          onTranscriptUpdate?.(targetInterviewId, text);
          toast.success('已导入文本转录内容');
        } catch (readError) {
          const message = readError instanceof Error ? readError.message : '读取文本失败';
          toast.error('导入文本失败', { description: message });
        }
      } else {
        toast.info('上传完成，点击“重新转写”即可生成文字稿');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '上传失败，请稍后重试';
      onUploadError?.({ interviewId: targetInterviewId, error: message });
      patchUploadUIState(targetInterviewId, { stage: 'idle' });
      toast.error('上传失败', { description: message });
    }
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Handle click to open file picker
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Start analysis
  const handleStartAnalysis = () => {
    if (!hasUploaded) {
      toast.error('请先上传文件');
      return;
    }

    onStartAnalysis?.();
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Get file icon
  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.txt')) {
      return File;
    }
    return FileAudio;
  };

  const runTranscription = async (options?: { trackUploadProgress?: boolean }) => {
    if (!userId || !interviewId) {
      toast.error('请先选择面试');
      return;
    }

    if (!hasUploaded) {
      toast.error('请先上传文件');
      return;
    }

    const targetInterviewId = interviewId;

    try {
      patchTranscriptState(targetInterviewId, { isTranscribing: true, error: null });
      const transcriptData = await transcribeInterview(userId, targetInterviewId);
      applyTranscriptPayload(targetInterviewId, transcriptData);
      toast.success('转写完成');
    } catch (error) {
      const message = error instanceof Error ? error.message : '转录失败';
      patchTranscriptState(targetInterviewId, { isTranscribing: false, error: message });
      toast.error('转写失败', { description: message });
    } finally {
      patchTranscriptState(targetInterviewId, { isTranscribing: false });
    }
  };

  const handleRetryChunks = async (chunkIndices?: number[]) => {
    if (!userId || !interviewId) {
      toast.error('请先选择面试');
      return;
    }
    if (!hasUploaded) {
      toast.error('请先上传文件');
      return;
    }
    const targetInterviewId = interviewId;
    try {
      const indicesSet = chunkIndices ? new Set(chunkIndices) : null;
      const optimisticChunks = chunks.map(chunk =>
        !indicesSet || indicesSet.has(chunk.index)
          ? { ...chunk, status: 'pending' as const, error: undefined }
          : chunk
      );
      patchTranscriptState(targetInterviewId, {
        isTranscribing: true,
        error: null,
        chunks: optimisticChunks,
      });
      const payload = chunkIndices && chunkIndices.length > 0 ? { chunkIndices } : undefined;
      const data = await retryTranscriptChunks(userId, targetInterviewId, payload);
      applyTranscriptPayload(targetInterviewId, data);
      toast.success(chunkIndices && chunkIndices.length === 1 ? '分片重试完成' : '失败分片已重新转写');
    } catch (error) {
      const message = error instanceof Error ? error.message : '重试失败';
      patchTranscriptState(targetInterviewId, { isTranscribing: false, error: message });
      toast.error('重试失败', { description: message });
    }
  };

  useEffect(() => {
    if (!userId || !interviewId) {
      return;
    }

    let cancelled = false;
    const targetInterviewId = interviewId;
    patchTranscriptState(targetInterviewId, { error: null, isLoading: true });
    fetchTranscript(userId, targetInterviewId)
      .then((data) => {
        if (cancelled) return;
        if (data) {
          applyTranscriptPayload(targetInterviewId, data);
        } else if (initialTranscript) {
          const chunk = createLocalChunk(
            initialTranscript,
            interviewFileUrl ? interviewFileUrl.split('/').pop() ?? undefined : undefined
          );
          patchTranscriptState(targetInterviewId, {
            text: initialTranscript,
            updatedAt: chunk.updatedAt || null,
            isLoading: false,
            error: null,
            chunks: [chunk],
            failedChunks: [],
            overallStatus: 'completed',
          });
          onTranscriptUpdate?.(targetInterviewId, initialTranscript);
        } else {
          patchTranscriptState(targetInterviewId, {
            text: '',
            updatedAt: null,
            isLoading: false,
            error: null,
            chunks: [],
            failedChunks: [],
            overallStatus: 'empty',
          });
        }
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : '获取转录失败';
        patchTranscriptState(targetInterviewId, {
          error: message,
          isLoading: false,
          overallStatus: 'error',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    userId,
    interviewId,
    initialTranscript,
    interviewFileUrl,
    applyTranscriptPayload,
    onTranscriptUpdate,
    patchTranscriptState,
  ]);

  const existingFileName =
    displayFileName ||
    (interviewFileUrl ? interviewFileUrl.split('/').pop() || '已上传的文件' : null);
  const isUploadInProgress = uploadTask?.status === 'running';
  const shouldShowProgressBar =
    !!uploadTask &&
    (uploadTask.status === 'running' ||
      (uploadTask.status === 'success' && normalizedProgress < 100));
  const progressLabel = normalizedProgress;

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <div
        className={`bg-white border-2 border-dashed rounded-xl px-8 py-12 transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : hasUploaded
            ? 'border-green-400 bg-green-50'
            : 'border-gray-300 hover:border-blue-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={supportedExtensions.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />

        {!hasUploaded ? (
          <div className="text-center space-y-4">
            {/* Title */}
            <h3 className="text-gray-900">上传面试录音 / 视频 / 文本</h3>

            {/* Upload Icon */}
            <div className="flex justify-center">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
                  isDragging ? 'bg-blue-200' : 'bg-blue-50'
                }`}
              >
                <CloudUpload
                  className={`w-10 h-10 transition-colors ${
                    isDragging ? 'text-blue-700' : 'text-blue-600'
                  }`}
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-1">
              <p className="text-gray-600">拖拽文件到这里，或点击按钮选择文件</p>
              <p className="text-sm text-gray-500">
                支持 MP3, WAV, M4A, MP4, TXT，单文件 ≤ 200MB
              </p>
            </div>

            {/* Upload Button */}
            {!isUploadInProgress && (
              <div className="pt-2">
                <button
                  onClick={handleUploadClick}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  选择文件
                </button>
              </div>
            )}
          </div>
        ) : (
          /* File Uploaded Successfully */
          <div className="text-center space-y-4">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            </div>

            {/* File Info */}
            <div>
              <h3 className="text-gray-900 mb-2">文件上传成功</h3>
              <div className="inline-flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg">
                {(() => {
                  const displayName = existingFileName || '已上传的文件';
                  const FileIcon = getFileIcon(displayName);
                  return (
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileIcon className="w-5 h-5 text-blue-600" />
                    </div>
                  );
                })()}
                <div className="text-left">
                  <div className="text-sm text-gray-900">
                    {existingFileName || '已上传的文件'}
                  </div>
                  {typeof displayFileSize === 'number' && (
                    <div className="text-xs text-gray-500">
                      {formatFileSize(displayFileSize)}
                    </div>
                  )}
                  {typeof displayFileSize !== 'number' && interviewFileUrl && (
                    <div className="text-xs text-gray-500">
                      来自服务器的已上传文件
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleUploadClick}
                disabled={isUploadInProgress}
                className={`px-5 py-2.5 border rounded-lg transition-colors ${
                  isUploadInProgress
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                重新上传
              </button>
              <button
                onClick={handleStartAnalysis}
                disabled={isUploadInProgress}
                className={`px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 ${
                  isUploadInProgress
                    ? 'bg-blue-300 text-white cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                开始分析
              </button>
            </div>
          </div>
        )}
        {shouldShowProgressBar && (
          <div className="pt-4 max-w-md mx-auto">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">上传中...</span>
              <span className="text-blue-600">{progressLabel}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${normalizedProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs">💡</span>
          </div>
          <div className="flex-1">
            <h4 className="text-sm text-blue-900 mb-2">上传建议</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• 音频质量越好，AI 分析越准确</li>
              <li>• 建议使用清晰的录音设备，避免环境噪音</li>
              <li>• 支持中英文混合内容</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Transcript Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-gray-900 font-medium">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>转写结果</span>
            </div>
            {transcriptUpdatedAt && (
              <p className="text-xs text-gray-500 mt-1">
                最近更新：{new Date(transcriptUpdatedAt).toLocaleString()}
              </p>
            )}
            {!transcriptUpdatedAt && (
              <p className="text-xs text-gray-500 mt-1">
                上传后会自动调用 AI 生成文字稿
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => runTranscription()}
              disabled={isTranscribing || !userId || !interviewId || !hasUploaded}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 border transition-colors ${
                isTranscribing || !userId || !interviewId || !hasUploaded
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isTranscribing ? '转写中...' : '重新转写'}
            </button>
            {hasFailedChunks && (
              <button
                onClick={() => handleRetryChunks()}
                disabled={isTranscribing || !userId || !interviewId}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 border transition-colors ${
                  isTranscribing || !userId || !interviewId
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                重试失败分片
              </button>
            )}
          </div>
        </div>

        <div className="min-h-[140px] border border-dashed border-gray-200 rounded-xl bg-gray-50 p-4 overflow-y-auto space-y-3">
          {isLoadingTranscript && !hasChunkData ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>AI 正在生成文字稿...</span>
            </div>
          ) : hasChunkData ? (
            <div className="space-y-3">
              {isTranscribing && (
                <div className="flex items-center gap-2 text-blue-600 text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>正在重新转写，请稍候...</span>
                </div>
              )}
              {sortedChunks.map((chunk, idx) => {
                const meta = getChunkStatusMeta(chunk.status);
                return (
                  <div
                    key={`${chunk.index}-${chunk.updatedAt ?? idx}`}
                    className="bg-white rounded-lg border border-gray-200 p-4 space-y-2 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          分片 {chunk.index + 1}/{sortedChunks.length} · {chunk.filename}
                        </p>
                        {chunk.updatedAt && (
                          <p className="text-xs text-gray-500">
                            更新于 {new Date(chunk.updatedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.classes}`}
                        >
                          {meta.label}
                        </span>
                        {chunk.status === 'error' && (
                          <button
                            onClick={() => handleRetryChunks([chunk.index])}
                            disabled={isTranscribing}
                            className={`text-xs px-2 py-1 rounded border transition-colors ${
                              isTranscribing
                                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            重试
                          </button>
                        )}
                      </div>
                    </div>
                    <p
                      className={`text-sm whitespace-pre-wrap leading-relaxed ${
                        chunk.status === 'error' ? 'text-red-600' : 'text-gray-800'
                      }`}
                    >
                      {getChunkContent(chunk)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              暂无转写内容。上传文件后，系统会自动将音频/视频转成文本供你查看。
            </p>
          )}
        </div>
        {transcript && (
          <div className="border border-gray-200 rounded-xl bg-white p-4 space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">合并视图</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{transcript}</p>
          </div>
        )}
        {transcriptionError && (
          <p className="text-sm text-red-600">转写出错：{transcriptionError}</p>
        )}
      </div>
    </div>
  );
}

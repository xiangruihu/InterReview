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
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { uploadInterviewFile, transcribeInterview, fetchTranscript } from '../utils/backend';
import { formatDuration } from '../utils/time';

const MEDIA_DURATION_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mp4'];

const isMediaFileForDuration = (file: File) => {
  const type = (file.type || '').toLowerCase();
  if (type.startsWith('audio/') || type.startsWith('video/')) {
    return true;
  }
  const lowerName = file.name.toLowerCase();
  return MEDIA_DURATION_EXTENSIONS.some(ext => lowerName.endsWith(ext));
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

interface UploadAreaProps {
  userId?: string;
  interviewId?: string;
  interviewTitle?: string;
  interviewStatus?: string;
  interviewFileUrl?: string;
  initialTranscript?: string;
  onUploadComplete?: (info: { fileName: string; filePath: string; fileType?: string; durationSeconds?: number; durationText?: string }) => void;
  onStartAnalysis?: () => void;
  onTranscriptUpdate?: (text: string) => void;
}

type UploadStage = 'idle' | 'uploading' | 'transcribing';

export function UploadArea({
  userId,
  interviewId,
  interviewTitle,
  interviewStatus,
  interviewFileUrl,
  initialTranscript,
  onUploadComplete,
  onStartAnalysis,
  onTranscriptUpdate,
}: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [transcript, setTranscript] = useState(initialTranscript || '');
  const [transcriptUpdatedAt, setTranscriptUpdatedAt] = useState<string | null>(null);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    try {
      setIsUploading(true);
      setUploadStage('uploading');
      setUploadProgress(10);
      const durationPromise = getMediaDuration(file);
      const [result, durationSeconds] = await Promise.all([
        uploadInterviewFile(userId, interviewId, file),
        durationPromise,
      ]);
      const durationText = formatDuration(durationSeconds ?? undefined);
      setUploadProgress(60);
      setUploadedFile(file);
      toast.success(`「${file.name}」上传成功`);
      onUploadComplete?.({
        fileName: file.name,
        filePath: result.file_path,
        fileType: result.file_type || file.type,
        durationSeconds: durationSeconds ?? undefined,
        durationText: durationText,
      });
      setUploadStage('transcribing');
      await runTranscription({ trackUploadProgress: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : '上传失败，请稍后重试';
      toast.error('上传失败', { description: message });
      setUploadProgress(0);
      setUploadStage('idle');
    } finally {
      setUploadStage('idle');
      setIsUploading(false);
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
    if (!uploadedFile && !interviewFileUrl) {
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

    if (!uploadedFile && !interviewFileUrl) {
      toast.error('请先上传文件');
      return;
    }

    let progressTimer: ReturnType<typeof setInterval> | null = null;
    try {
      setIsTranscribing(true);
      setTranscriptionError(null);
      if (options?.trackUploadProgress) {
        progressTimer = setInterval(() => {
          setUploadProgress(prev => (prev >= 95 ? prev : prev + 1));
        }, 400);
      }
      const transcriptData = await transcribeInterview(userId, interviewId);
      const text = transcriptData?.text || '';
      setTranscript(text);
      setTranscriptUpdatedAt(transcriptData?.createdAt || new Date().toISOString());
      onTranscriptUpdate?.(text);
      toast.success('转写完成');
    } catch (error) {
      const message = error instanceof Error ? error.message : '转录失败';
      setTranscriptionError(message);
      toast.error('转写失败', { description: message });
    } finally {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      if (options?.trackUploadProgress) {
        setUploadProgress(100);
      }
      if (uploadStage !== 'idle') {
        setUploadStage('idle');
      }
      setIsTranscribing(false);
    }
  };

  useEffect(() => {
    if (!userId || !interviewId) {
      setTranscript('');
      setTranscriptUpdatedAt(null);
      return;
    }

    let cancelled = false;
    setTranscriptionError(null);
    setIsLoadingTranscript(true);
    fetchTranscript(userId, interviewId)
      .then((data) => {
        if (cancelled) return;
        if (data?.text) {
          setTranscript(data.text);
          setTranscriptUpdatedAt(data.createdAt || null);
          onTranscriptUpdate?.(data.text);
        } else if (initialTranscript) {
          setTranscript(initialTranscript);
          onTranscriptUpdate?.(initialTranscript);
        } else {
          setTranscript('');
          setTranscriptUpdatedAt(null);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : '获取转录失败';
        setTranscriptionError(message);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingTranscript(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId, interviewId, initialTranscript, onTranscriptUpdate]);

  const existingFileName =
    uploadedFile?.name ||
    (interviewFileUrl ? interviewFileUrl.split('/').pop() || '已上传的文件' : null);

  const hasUploaded = Boolean(uploadedFile || interviewFileUrl);

  useEffect(() => {
    setUploadedFile(null);
    setUploadProgress(0);
    setUploadStage('idle');
  }, [userId, interviewId]);

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <div
        className={`bg-white border-2 border-dashed rounded-xl px-8 py-12 transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : uploadedFile
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
            {!isUploading && (
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
                  {uploadedFile && (
                    <div className="text-xs text-gray-500">
                      {formatFileSize(uploadedFile.size)}
                    </div>
                  )}
                  {!uploadedFile && interviewFileUrl && (
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
                disabled={uploadStage !== 'idle'}
                className={`px-5 py-2.5 border rounded-lg transition-colors ${
                  uploadStage !== 'idle'
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                重新上传
              </button>
              <button
                onClick={handleStartAnalysis}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                开始分析
              </button>
            </div>
          </div>
        )}
        {uploadStage !== 'idle' && (
          <div className="pt-4 max-w-md mx-auto">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">
                {uploadStage === 'transcribing' ? '转写中...' : '上传中...'}
              </span>
              <span className="text-blue-600">{uploadProgress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
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
        <div className="flex items-center justify-between">
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
        </div>

        <div className="min-h-[140px] border border-dashed border-gray-200 rounded-xl bg-gray-50 p-4 overflow-y-auto">
          {isLoadingTranscript || isTranscribing ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>AI 正在生成文字稿...</span>
            </div>
          ) : transcript ? (
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{transcript}</p>
          ) : (
            <p className="text-sm text-gray-500">
              暂无转写内容。上传文件后，系统会自动将音频/视频转成文本供你查看。
            </p>
          )}
        </div>
        {transcriptionError && (
          <p className="text-sm text-red-600">转写出错：{transcriptionError}</p>
        )}
      </div>
    </div>
  );
}

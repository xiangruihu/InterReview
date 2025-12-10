import { CloudUpload, FileAudio, Loader2, X, CheckCircle2, AlertCircle, File, Sparkles } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner@2.0.3';

interface UploadAreaProps {
  onUploadComplete?: (file: File) => void;
  onStartAnalysis?: () => void;
}

export function UploadArea({ onUploadComplete, onStartAnalysis }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
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
  const handleFileSelect = (file: File) => {
    if (!validateFile(file)) {
      return;
    }

    // Simulate upload progress
    setIsUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          setUploadedFile(file);
          toast.success(`「${file.name}」上传成功`);
          onUploadComplete?.(file);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
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

  // Remove uploaded file
  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.info('已移除文件');
  };

  // Start analysis
  const handleStartAnalysis = () => {
    if (!uploadedFile) {
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

        {!uploadedFile ? (
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

            {/* Upload Progress */}
            {isUploading && (
              <div className="pt-2 max-w-md mx-auto">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">上传中...</span>
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
                  const FileIcon = getFileIcon(uploadedFile.name);
                  return (
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileIcon className="w-5 h-5 text-blue-600" />
                    </div>
                  );
                })()}
                <div className="text-left">
                  <div className="text-sm text-gray-900">{uploadedFile.name}</div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(uploadedFile.size)}
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleRemoveFile}
                className="px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
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
    </div>
  );
}
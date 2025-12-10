import { Sparkles, Loader2, FileAudio, Brain, ListChecks } from 'lucide-react';
import { useState, useEffect } from 'react';

interface AnalyzingLoaderProps {
  interviewName?: string;
}

export function AnalyzingLoader({ interviewName = '面试录音' }: AnalyzingLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    {
      id: 1,
      icon: FileAudio,
      title: '正在处理音频文件',
      desc: '提取音频特征，识别语音内容',
      duration: 3000,
    },
    {
      id: 2,
      icon: Brain,
      title: '正在分析面试内容',
      desc: '理解问答内容，评估回答质量',
      duration: 4000,
    },
    {
      id: 3,
      icon: ListChecks,
      title: '正在生成分析报告',
      desc: '整理数据，准备改进建议',
      duration: 3000,
    },
  ];

  // Simulate progress animation
  useEffect(() => {
    const totalSteps = steps.length;
    const stepDuration = 3500; // Average duration per step
    
    // Progress within current step
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          return 100;
        }
        return Math.min(prev + 1, 100);
      });
    }, (stepDuration * totalSteps) / 100);

    // Step advancement
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < totalSteps - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, stepDuration);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4 relative">
              <Sparkles className="w-8 h-8 text-blue-600 animate-pulse" />
              <div className="absolute inset-0 bg-blue-400 rounded-2xl animate-ping opacity-20"></div>
            </div>
            <h2 className="text-gray-900 mb-2">AI 正在分析你的面试</h2>
            <p className="text-sm text-gray-600">
              正在为「<span className="text-gray-900">{interviewName}</span>」生成详细的分析报告...
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">分析进度</span>
              <span className="text-blue-600">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div
                  key={step.id}
                  className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-300 ${
                    isActive
                      ? 'bg-blue-50 border-blue-200 scale-[1.02]'
                      : isCompleted
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {isActive ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isCompleted ? (
                      <div className="w-5 h-5 flex items-center justify-center">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm mb-1 transition-colors ${
                        isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-600'
                      }`}
                    >
                      {step.title}
                    </div>
                    <div
                      className={`text-xs transition-colors ${
                        isActive ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-gray-500'
                      }`}
                    >
                      {step.desc}
                    </div>
                  </div>

                  {/* Status Indicator */}
                  {isActive && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-full">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
                      <span className="text-xs text-blue-700">进行中</span>
                    </div>
                  )}
                  {isCompleted && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
                      <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                      <span className="text-xs text-green-700">已完成</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Tip */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-start gap-3 text-sm text-gray-600">
              <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p>
                <span className="text-gray-700">预计还需 30-60 秒</span>
                <span className="text-gray-500">
                  {' '}• 分析完成后将自动显示详细报告，包含问答解析、评分和改进建议
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Decorative Dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}

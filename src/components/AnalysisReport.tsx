import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  MessageSquare, 
  Lightbulb,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useState } from 'react';

export function AnalysisReport() {
  const [expandedQA, setExpandedQA] = useState<number | null>(0);

  const qaItems = [
    {
      question: "请介绍一下你最近做的项目",
      yourAnswer: "我最近做了一个电商后台管理系统，主要负责前端开发。使用了 React 和 TypeScript，实现了商品管理、订单管理等功能。在性能优化方面，我使用了虚拟滚动来处理大量数据的渲染...",
      aiSuggestion: "回答比较完整，但可以更加结构化。建议使用 STAR 法则：1) 项目背景（Situation）2) 你的职责（Task）3) 具体行动（Action）4) 最终结果（Result）。比如可以量化成果：'优化后首屏加载时间从 3.2s 降低到 1.8s，用户满意度提升 25%'",
      score: 75,
    },
    {
      question: "你在项目中遇到过什么技术难点？如何解决的？",
      yourAnswer: "遇到过一个内存泄漏的问题，后来通过 Chrome DevTools 定位到是某个组件的事件监听器没有清理...",
      aiSuggestion: "很好的技术深度！建议补充：1) 问题的具体表现和影响范围 2) 排查过程的思路 3) 解决方案的权衡考虑 4) 事后的预防措施。这样能体现你的问题解决能力和工程思维。",
      score: 82,
    },
    {
      question: "你对我们公司了解多少？为什么选择我们？",
      yourAnswer: "呃...我知道贵公司是做互联网的，规模挺大的...",
      aiSuggestion: "这个回答准备不足。建议面试前做充分调研：1) 公司的核心业务和产品 2) 近期的重大新闻或融资情况 3) 公司文化和价值观 4) 为什么这个岗位吸引你。表现出对公司的真诚兴趣很重要。",
      score: 45,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title and Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1>字节跳动一面 - 分析报告</h1>
          <p className="text-gray-500 text-sm mt-1">分析完成于 2025-12-05 16:45</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            导出 PDF
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>继续优化回答</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">面试时长</span>
          </div>
          <div className="text-gray-900">45 分 32 秒</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm">问答轮次</span>
          </div>
          <div className="text-gray-900">12 轮</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Target className="w-4 h-4" />
            <span className="text-sm">综合评分</span>
          </div>
          <div className="text-blue-600">72 / 100</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">通过概率</span>
          </div>
          <div className="text-green-600">65%</div>
        </div>
      </div>

      {/* Strengths and Weaknesses */}
      <div className="grid grid-cols-2 gap-4">
        {/* Strengths */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="text-gray-900">表现优秀的方面</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <ThumbsUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-gray-900 text-sm">技术深度扎实</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  对 React 生态、性能优化等问题回答专业
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <ThumbsUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-gray-900 text-sm">逻辑思维清晰</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  问题分析有条理，解决方案完整
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <ThumbsUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-gray-900 text-sm">项目经验丰富</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  有多个完整项目的实战经历
                </div>
              </div>
            </li>
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-orange-600" />
            </div>
            <h3 className="text-gray-900">需要改进的地方</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-gray-900 text-sm">对公司了解不足</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  建议提前深入研究目标公司的业务和文化
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-gray-900 text-sm">回答缺少量化数据</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  用具体数字展示项目成果会更有说服力
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-gray-900 text-sm">有些回答过于简短</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  可以用 STAR 法则让回答更结构化
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Q&A Details */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-gray-900">问答详情与 AI 建议</h3>
        </div>

        <div className="space-y-4">
          {qaItems.map((item, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Question Header */}
              <button
                onClick={() => setExpandedQA(expandedQA === index ? null : index)}
                className="w-full px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1 text-left">
                  <span className="text-gray-900">Q{index + 1}:</span>
                  <span className="text-gray-700 flex-1">{item.question}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">得分：</span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        item.score >= 80
                          ? 'bg-green-100 text-green-700'
                          : item.score >= 60
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {item.score}
                    </span>
                  </div>
                </div>
                {expandedQA === index ? (
                  <ChevronUp className="w-5 h-5 text-gray-400 ml-3" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 ml-3" />
                )}
              </button>

              {/* Expanded Content */}
              {expandedQA === index && (
                <div className="px-5 py-4 space-y-4 bg-white">
                  {/* Your Answer */}
                  <div>
                    <div className="text-sm text-gray-600 mb-2">你的回答：</div>
                    <div className="text-gray-800 text-sm bg-gray-50 rounded-lg p-4 leading-relaxed">
                      {item.yourAnswer}
                    </div>
                  </div>

                  {/* AI Suggestion */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-600">AI 优化建议：</span>
                    </div>
                    <div className="text-gray-800 text-sm bg-blue-50 border border-blue-100 rounded-lg p-4 leading-relaxed">
                      {item.aiSuggestion}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                      查看完整转写
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                      生成优化后的回答
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-purple-600" />
          </div>
          <h3 className="text-gray-900">下一步行动建议</h3>
        </div>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
              1
            </div>
            <div className="flex-1">
              <div className="text-gray-900">深入了解目标公司</div>
              <div className="text-sm text-gray-600 mt-1">
                研究字节跳动的核心产品（抖音、今日头条等）、公司文化和技术栈，准备 2-3 个相关问题
              </div>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
              2
            </div>
            <div className="flex-1">
              <div className="text-gray-900">使用 STAR 法则重新组织项目经历</div>
              <div className="text-sm text-gray-600 mt-1">
                将你的 3 个核心项目用 Situation-Task-Action-Result 框架重新梳理，加入量化数据
              </div>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
              3
            </div>
            <div className="flex-1">
              <div className="text-gray-900">进行模拟面试练习</div>
              <div className="text-sm text-gray-600 mt-1">
                针对本次面试中得分较低的问题（Q3），重新录制回答并上传分析，直到得分达到 75 分以上
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}

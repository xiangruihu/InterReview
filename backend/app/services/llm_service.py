from openai import OpenAI
from typing import List, Dict, Optional, Any
import json
import os
from datetime import datetime

class LLMService:
    """LLM 服务 - 使用阿里云 DashScope"""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1",
        default_model: str = "qwen3-max"
    ):
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url
        )
        self.default_model = default_model

    async def analyze_interview(
        self,
        interview_text: str,
        interview_info: Dict,
        *,
        model: Optional[str] = None,
        max_pairs: int = 12
    ) -> Dict[str, Any]:
        """
        分析面试文本并生成结构化报告

        Args:
            interview_text: 面试转录文本
            interview_info: 面试信息 (公司名称, 岗位等)

        Returns:
            结构化分析报告
        """
        prompt = f"""
你是一名专业的面试复盘助手。请阅读下面的转录稿，并提取不超过 {max_pairs} 组高质量的问答对，并总结候选人的表现。

面试信息：
- 面试名称：{interview_info.get('title', '未知')}
- 公司名称：{interview_info.get('company', '未知')}
- 岗位：{interview_info.get('position', '未知')}

要求：
1. 合并同一问题的追问，抽象出核心问题。
2. 在答案中概括候选人的主要观点，不要逐字照搬。
3. 尽量保留原文中的时间戳（如“07:03”），若答案跨多个时间段可以写成范围。
4. 输出 JSON，包含问答、表现亮点、需要改进的地方、快速总结及改进建议。
   - strengths.title / improvements.title ≤ 12 个中文字符，detail ≤ 40 字。
   - quick_summary ≤ 60 字。
   - suggestions 中：title ≤ 15 字，description ≤ 40 字，priority 仅可取 "高优先级"/"中优先级"/"低优先级"，actions 为 3-4 条具体行动。

JSON 模板：
{{
  "duration": "面试时长，若无法推断可为空字符串",
  "rounds": 问答轮次数,
  "score": 综合评分(0-100),
  "passRate": 通过概率(0-100),
  "qa_pairs": [
    {{
      "id": 1,
      "questioner": "说话人 2",
      "question_time": "06:41",
      "question": "用一句话复述问题",
      "answerer": "说话人 1",
      "answer_time": "07:03-07:53",
      "answer": "概括回答要点",
      "notes": "可选，补充如回答薄弱点或评价",
      "score": 评分0-100,
      "category": "问题分类"
    }}
  ],
  "strengths": [
    {{"title": "技术深度扎实", "detail": "示例：能深入阐述 React 生态"}}
  ],
  "improvements": [
    {{"title": "回答缺少量化", "detail": "示例：缺少具体数字支撑"}}
  ],
  "quick_summary": "一句话总结本次面试表现",
  "suggestions": [
    {{
      "title": "深入了解目标公司",
      "description": "面试前至少花 2 小时研究公司",
      "priority": "高优先级",
      "actions": [
        "阅读公司官网/产品介绍/技术博客",
        "搜索最近 3 个月的新闻动态",
        "在社区了解公司文化与面试经验",
        "准备 2-3 个与公司相关的问题"
      ]
    }}
  ]
}}

转录内容：
{interview_text}
"""

        try:
            response = self.client.chat.completions.create(
                model=model or self.default_model,
                messages=[
                    {"role": "system", "content": "你是一个专业的面试复盘助手，请输出合法的JSON格式。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            raw = json.loads(content)
            return self._normalize_result(raw, interview_info, max_pairs)

        except Exception as e:
            raise RuntimeError(f"LLM 分析失败: {e}") from e

    def _normalize_result(
        self,
        raw: Dict[str, Any],
        interview_info: Dict,
        max_pairs: int
    ) -> Dict[str, Any]:
        def _clamp(value: Optional[float], min_value: int, max_value: int, default: int) -> int:
            try:
                if value is None:
                    return default
                return max(min(int(round(value)), max_value), min_value)
            except Exception:
                return default

        def _map_strengths(items: Optional[List[Dict[str, Any]]]) -> List[Dict[str, str]]:
            mapped = []
            for item in items or []:
                title = item.get("title") or ""
                desc = item.get("desc") or item.get("detail") or item.get("description") or ""
                if title:
                    mapped.append({"title": title, "desc": desc})
            return mapped

        def _map_suggestions(items: Optional[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
            mapped = []
            for item in items or []:
                title = item.get("title") or ""
                if not title:
                    continue
                desc = item.get("desc") or item.get("description") or ""
                priority = item.get("priority") or ""
                if "高" in priority:
                    priority_value = "高"
                elif "低" in priority:
                    priority_value = "低"
                else:
                    priority_value = "中"
                actions = [action for action in (item.get("actions") or []) if action]
                mapped.append({
                    "title": title,
                    "desc": desc,
                    "priority": priority_value,
                    "actions": actions[:4]
                })
            return mapped

        qa_pairs = raw.get("qa_pairs") or raw.get("qaList") or []
        qa_list: List[Dict[str, Any]] = []
        for idx, pair in enumerate(qa_pairs[:max_pairs]):
            qa_list.append({
                "id": pair.get("id") or (idx + 1),
                "question": pair.get("question") or "",
                "questioner": pair.get("questioner"),
                "questionTime": pair.get("question_time"),
                "answer": pair.get("answer") or "",
                "answerer": pair.get("answerer"),
                "answerTime": pair.get("answer_time"),
                "notes": pair.get("notes"),
                "score": pair.get("score"),
                "category": pair.get("category"),
            })

        duration = raw.get("duration") or interview_info.get("durationText") or ""
        rounds = raw.get("rounds")
        if not isinstance(rounds, int):
            rounds = len(qa_list)

        score = _clamp(raw.get("score"), 45, 95, 72)
        pass_rate = _clamp(raw.get("passRate"), 30, 98, 65)

        strengths = _map_strengths(raw.get("strengths"))
        weaknesses = _map_strengths(raw.get("improvements") or raw.get("weaknesses"))

        if not strengths:
            strengths = [{
                "title": "技术亮点待补充",
                "desc": "建议加强项目细节准备"
            }]

        if not weaknesses:
            weaknesses = [{
                "title": "表达可优化",
                "desc": "可以用 STAR 法则提升结构化程度"
            }]

        suggestions = _map_suggestions(raw.get("suggestions"))

        return {
            "duration": duration or "未提供",
            "rounds": rounds,
            "score": score,
            "passRate": pass_rate,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "qaList": qa_list,
            "suggestions": suggestions,
            "quickSummary": raw.get("quick_summary") or raw.get("quickSummary"),
            "generatedAt": raw.get("generated_at") or datetime.utcnow().isoformat()
        }

    async def chat_with_analysis(
        self,
        messages: List[Dict[str, str]],
        analysis_context: Dict
    ) -> str:
        """
        基于面试分析的对话

        Args:
            messages: 对话历史
            analysis_context: 面试分析上下文

        Returns:
            AI回复
        """
        context = f"""
当前面试分析上下文：
综合评分：{analysis_context.get('score', 0)}/100
通过概率：{analysis_context.get('passRate', 0)}%
问题数量：{len(analysis_context.get('qaList', []))}
"""

        enhanced_messages = [
            {"role": "system", "content": f"你是面试复盘助手。{context}请基于已有的面试分析结果回答用户问题。"}
        ] + messages

        response = self.client.chat.completions.create(
            model="qwen3-max",
            messages=enhanced_messages,
            temperature=0.7,
            max_tokens=2000
        )

        return response.choices[0].message.content

# 测试函数
if __name__ == "__main__":
    import asyncio

    api_key = os.getenv("DASHSCOPE_API_KEY")
    if not api_key:
        print("错误: 请设置 DASHSCOPE_API_KEY 环境变量")
        exit(1)

    service = LLMService(api_key)

    async def test():
        test_text = """
面试官: 请介绍一下你自己。
候选人: 我叫张三，有5年前端开发经验，熟悉React和Vue。

面试官: 说说React和Vue的区别。
候选人: React是Facebook开发的，使用JSX，Vue是渐进式框架，使用模板语法。
        """

        interview_info = {
            "company": "字节跳动",
            "position": "前端工程师"
        }

        print("开始分析面试...")
        result = await service.analyze_interview(test_text, interview_info)
        print("分析结果:")
        print(json.dumps(result, ensure_ascii=False, indent=2))

    asyncio.run(test())

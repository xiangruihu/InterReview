import json
from typing import Any, Dict, List


class LLMProcessor:
    """封装多阶段 Prompt，便于单独迭代调优。"""

    def __init__(self, client, model: str):
        self.client = client
        self.model = model

    # ---- 公共工具 ----

    def _invoke(
        self,
        *,
        system: str,
        user: str,
        temperature: float = 0.2
    ) -> Dict[str, Any]:
        """统一发起 JSON 响应的调用。"""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        return json.loads(content)

    def _compact(self, data: Any) -> str:
        """用于在 Prompt 中嵌入已生成的结构化数据。"""
        return json.dumps(data, ensure_ascii=False, separators=(",", ":"))

    # ---- 单独的 Prompt 逻辑 ----

    def extract_qa_pairs(
        self,
        transcript_text: str,
        interview_info: Dict[str, Any],
        *,
        max_pairs: int,
    ) -> Dict[str, Any]:
        """
        第一步：仅关注问答对抽取，输出更干净的结构。
        """
        prompt = f"""
你是「问答对抽取」助手。请阅读面试转录，输出不超过 {max_pairs} 组问答，要求：
- 合并同一问题的追问，抽象核心问题；
- 尽量覆盖全部真实问答（在 {max_pairs} 的限制内）；
- question ≤ 40 字，answer ≤ 80 字，回答需高度提炼；
- 尽量提取时间戳（无法判断可留空）；
- category 仅从 ["技术深度","项目实践","团队协作","职业规划","自我介绍","其他"] 中选。

JSON 模板：
{{
  "duration": "1h20min 或空字符串",
  "rounds": 问答轮次数,
  "qa_pairs": [
    {{
      "id": 1,
      "questioner": "说话人 2",
      "question_time": "06:41",
      "question": "用一句话复述问题",
      "answerer": "说话人 1",
      "answer_time": "07:03-07:53",
      "answer": "概括回答要点",
      "notes": "可选点评 ≤40字",
      "score": 0-100,
      "category": "技术深度"
    }}
  ]
}}

面试信息：{self._compact(interview_info)}

转录内容：
{transcript_text}
""".strip()

        return self._invoke(
            system="你是专业的会议纪要助手，只输出合法 JSON。",
            user=prompt,
        )

    def summarize_performance(
        self,
        transcript_text: str,
        interview_info: Dict[str, Any],
        qa_pairs: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        第二步：基于问答摘要，单独生成表现亮点、改进点以及快速总结。
        """
        qa_context = self._compact(qa_pairs)
        prompt = f"""
你是「表现评估」助手。根据面试转录与已提取的问答摘要，给出候选人的亮点、需要改进处及一句话总结。

限制：
- strengths.title / improvements.title ≤ 10 字；
- detail ≤ 36 字；
- quick_summary ≤ 50 字，需覆盖 技术深度 / 沟通表达 / 落地能力；
- score、passRate 为 0-100 之间整数。

JSON 模板：
{{
  "score": 75,
  "passRate": 68,
  "strengths": [
    {{"title": "技术深度扎实", "detail": "对 React 生态和性能优化答复专业"}}
  ],
  "improvements": [
    {{"title": "缺乏量化", "detail": "项目成果缺少数据支撑"}}
  ],
  "quick_summary": "一句话总结"
}}

面试信息：{self._compact(interview_info)}
问答摘要：{qa_context}

转录内容：
{transcript_text}
""".strip()

        return self._invoke(
            system="你是负责给候选人打分与总结的面试官助手。",
            user=prompt,
            temperature=0.25,
        )

    def generate_suggestions(
        self,
        transcript_text: str,
        interview_info: Dict[str, Any],
        strengths: List[Dict[str, Any]],
        improvements: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        第三步：独立生成可执行的改进建议。
        """
        context = {
            "strengths": strengths,
            "improvements": improvements,
        }
        prompt = f"""
你是「改进建议」教练。请结合面试亮点与不足，输出 3 条以内改进建议，字段要求：
- title ≤ 12 字，description ≤ 40 字；
- priority 仅可取 "高优先级"、"中优先级"、"低优先级"；
- actions 为 3-4 条，每条 ≤ 28 字，描述具体行动。

JSON 模板：
{{
  "suggestions": [
    {{
      "title": "深入了解目标公司",
      "description": "面试前至少花 2 小时研究公司",
      "priority": "高优先级",
      "actions": [
        "阅读官网/产品/技术博客",
        "搜索近 3 个月新闻动态",
        "在社区了解文化与面经",
        "准备 2-3 个相关提问"
      ]
    }}
  ]
}}

面试信息：{self._compact(interview_info)}
表现评估：{self._compact(context)}

转录内容：
{transcript_text}
""".strip()

        return self._invoke(
            system="你是行为教练，输出可执行建议并严格使用 JSON。",
            user=prompt,
        )

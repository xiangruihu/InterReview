from openai import OpenAI
from typing import List, Dict, Optional, Any, Iterable
import json
import os
from datetime import datetime

from app.services.llm_processor import LLMProcessor

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
        max_pairs: int = 100
    ) -> Dict[str, Any]:
        """
        分析面试文本并生成结构化报告

        Args:
            interview_text: 面试转录文本
            interview_info: 面试信息 (公司名称, 岗位等)

        Returns:
            结构化分析报告
        """
        processor = LLMProcessor(self.client, model or self.default_model)

        try:
            qa_payload = processor.extract_qa_pairs(
                interview_text,
                interview_info,
                max_pairs=max_pairs,
            )
        except Exception as e:
            raise RuntimeError(f"问答抽取失败: {e}") from e

        qa_pairs = qa_payload.get("qa_pairs") or []

        try:
            performance_payload = processor.summarize_performance(
                interview_text,
                interview_info,
                qa_pairs=qa_pairs,
            )
        except Exception as e:
            raise RuntimeError(f"表现总结失败: {e}") from e

        strengths = performance_payload.get("strengths") or []
        improvements = performance_payload.get("improvements") or []

        try:
            suggestion_payload = processor.generate_suggestions(
                interview_text,
                interview_info,
                strengths=strengths,
                improvements=improvements,
            )
        except Exception as e:
            raise RuntimeError(f"改进建议生成失败: {e}") from e

        raw = {
            "duration": qa_payload.get("duration"),
            "rounds": qa_payload.get("rounds"),
            "qa_pairs": qa_pairs,
            "score": performance_payload.get("score"),
            "passRate": performance_payload.get("passRate"),
            "strengths": strengths,
            "improvements": improvements,
            "quick_summary": performance_payload.get("quick_summary"),
            "suggestions": suggestion_payload.get("suggestions"),
        }

        return self._normalize_result(raw, interview_info, max_pairs)

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
        rounds = len(qa_list) if qa_list else raw.get("rounds")
        if not isinstance(rounds, int):
            rounds = 0

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

    async def chat_with_interview_context(
        self,
        *,
        question: str,
        history: List[Dict[str, str]],
        transcript_text: str,
        qa_pairs: List[Dict[str, Any]],
        interview_meta: Dict[str, Any],
        model: Optional[str] = None
    ) -> str:
        """
        将面试上下文（转录、问答、元信息）与多轮对话结合，生成回答。
        """

        chat_messages = self._build_interview_chat_messages(
            question=question,
            history=history,
            transcript_text=transcript_text,
            qa_pairs=qa_pairs,
            interview_meta=interview_meta
        )

        response = self.client.chat.completions.create(
            model=model or self.default_model,
            messages=chat_messages,
            temperature=0.2,
            max_tokens=1500
        )

        return response.choices[0].message.content

    def stream_chat_with_interview_context(
        self,
        *,
        question: str,
        history: List[Dict[str, str]],
        transcript_text: str,
        qa_pairs: List[Dict[str, Any]],
        interview_meta: Dict[str, Any],
        model: Optional[str] = None
    ) -> Iterable[str]:
        """
        以流式方式返回面试问答
        """
        chat_messages = self._build_interview_chat_messages(
            question=question,
            history=history,
            transcript_text=transcript_text,
            qa_pairs=qa_pairs,
            interview_meta=interview_meta
        )

        stream = self.client.chat.completions.create(
            model=model or self.default_model,
            messages=chat_messages,
            temperature=0.2,
            max_tokens=1500,
            stream=True
        )

        for chunk in stream:
            choice = (chunk.choices or [None])[0]
            if not choice:
                continue
            delta = getattr(choice, "delta", None)
            if not delta:
                continue
            content = getattr(delta, "content", None)
            if isinstance(content, list):
                text = "".join([
                    part.get("text", "") if isinstance(part, dict) else ""
                    for part in content
                ])
            else:
                text = content or ""
            if text:
                yield text

    @staticmethod
    def _clip_text(value: Optional[str], limit: int = 1800) -> str:
        if not value:
            return ""
        value = value.strip()
        if len(value) <= limit:
            return value
        return value[:limit] + "..."

    @staticmethod
    def _format_meta(meta: Dict[str, Any]) -> str:
        fields = [
            ("面试标题", meta.get("title")),
            ("公司", meta.get("company")),
            ("岗位", meta.get("position")),
            ("面试轮次", meta.get("roundType")),
            ("时间", meta.get("date")),
            ("状态", meta.get("status")),
            ("时长", meta.get("duration")),
            ("问答轮数", meta.get("rounds")),
            ("综合评分", meta.get("score")),
            ("通过率", meta.get("passRate")),
        ]
        lines = [f"- {label}：{value}" for label, value in fields if value]
        return "\n".join(lines) if lines else "（暂无元信息）"

    @staticmethod
    def _format_qa(qa: List[Dict[str, Any]], limit: int = 8) -> str:
        if not qa:
            return "（暂无问答对）"
        items = []
        for idx, pair in enumerate(qa[:limit], start=1):
            q = (pair.get("question") or "").strip()
            a = (pair.get("answer") or "").strip()
            category = pair.get("category")
            prefix = f"{idx}. [{category}] " if category else f"{idx}. "
            formatted = f"{prefix}Q: {q}\n   A: {a}"
            items.append(formatted)
        if len(qa) > limit:
            items.append(f"...（共 {len(qa)} 个问答，仅展示前 {limit} 条）")
        return "\n".join(items)

    @staticmethod
    def _trim_history_messages(messages: List[Dict[str, str]], max_chars: int = 4000) -> List[Dict[str, str]]:
        trimmed: List[Dict[str, str]] = []
        total = 0
        for msg in reversed(messages):
            role = msg.get("role")
            content = (msg.get("content") or "").strip()
            if role not in {"user", "assistant"} or not content:
                continue
            length = len(content) + 20
            if total + length > max_chars:
                break
            trimmed.append({"role": role, "content": content})
            total += length
        trimmed.reverse()
        return trimmed

    def _build_interview_chat_messages(
        self,
        *,
        question: str,
        history: List[Dict[str, str]],
        transcript_text: str,
        qa_pairs: List[Dict[str, Any]],
        interview_meta: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        system_prompt = (
            "你是一名专业的面试复盘助手。你只能基于当前这场面试提供的上下文回答，"
            "不允许调用其他面试或未知信息。当用户询问本场面试中不存在的内容时，"
            "请明确说明“本次面试未涉及该内容”，不要编造。回答时尽量引用具体问答或转录片段，"
            "并区分事实复述与分析 / 建议。"
        )

        qa_summary = self._format_qa(qa_pairs or [])
        transcript_excerpt = self._clip_text(transcript_text, 1800) or "（暂无有效转录）"
        meta_block = self._format_meta(interview_meta or {})

        context_block = (
            "【面试元信息】\n"
            f"{meta_block}\n\n"
            "【结构化问答摘要】\n"
            f"{qa_summary}\n\n"
            "【转录节选】\n"
            f"{transcript_excerpt}\n"
            "——请仅在上述上下文范围内回答问题。"
        )

        trimmed_history = self._trim_history_messages(history or [])

        chat_messages: List[Dict[str, str]] = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": context_block},
        ] + trimmed_history

        chat_messages.append({"role": "user", "content": question.strip()})
        return chat_messages

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

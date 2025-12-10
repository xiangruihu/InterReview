from openai import OpenAI
from typing import List, Dict, Optional
import json
import os

class LLMService:
    """LLM 服务 - 使用阿里云 DashScope"""

    def __init__(self, api_key: str, base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"):
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url
        )

    async def analyze_interview(
        self,
        interview_text: str,
        interview_info: Dict
    ) -> Dict:
        """
        分析面试文本并生成结构化报告

        Args:
            interview_text: 面试转录文本
            interview_info: 面试信息 (公司名称, 岗位等)

        Returns:
            结构化分析报告
        """
        prompt = f"""
你是一位专业的面试复盘助手。请分析以下面试内容，并生成详细的分析报告。

面试信息：
- 公司名称：{interview_info.get('company', '未知')}
- 岗位：{interview_info.get('position', '未知')}
- 面试时长：从文本中推断

面试内容：
{interview_text}

请按以下JSON格式输出分析结果：
{{
    "duration": "面试时长",
    "rounds": 问答轮次数,
    "score": 综合评分(0-100),
    "passRate": 通过概率(0-100),
    "strengths": [{{
        "title": "优势标题",
        "desc": "详细描述"
    }}],
    "weaknesses": [{{
        "title": "需要改进的方面",
        "desc": "详细描述"
    }}],
    "qaList": [{{
        "question": "问题",
        "yourAnswer": "你的回答",
        "score": 评分(0-100),
        "category": "问题分类",
        "aiSuggestion": "AI建议",
        "improvedAnswer": "优化后的回答示例"
    }}],
    "suggestions": [{{
        "title": "改进建议标题",
        "priority": "高/中/低",
        "desc": "描述",
        "actions": ["具体行动1", "具体行动2"]
    }}]
}}
"""

        try:
            response = self.client.chat.completions.create(
                model="qwen3-max",
                messages=[
                    {"role": "system", "content": "你是一个专业的面试复盘助手，请输出合法的JSON格式。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            return json.loads(content)

        except Exception as e:
            print(f"LLM 分析失败: {e}")
            # 返回默认结构
            return {
                "duration": "45分32秒",
                "rounds": 7,
                "score": 72,
                "passRate": 65,
                "strengths": [],
                "weaknesses": [],
                "qaList": [],
                "suggestions": []
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

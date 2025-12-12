import argparse
import asyncio
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Tuple

from dotenv import load_dotenv
from openai import OpenAI, AsyncOpenAI

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_TRANSCRIPT = BASE_DIR / "data" / "moc_transcript.txt"


def create_client() -> OpenAI:
    api_key = os.getenv("DASHSCOPE_API_KEY")
    if not api_key:
        raise RuntimeError("请先在环境变量中设置 DASHSCOPE_API_KEY")
    return OpenAI(
        api_key=api_key,
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    )


def create_async_client() -> AsyncOpenAI:
    api_key = os.getenv("DASHSCOPE_API_KEY")
    if not api_key:
        raise RuntimeError("请先在环境变量中设置 DASHSCOPE_API_KEY")
    return AsyncOpenAI(
        api_key=api_key,
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    )


def read_transcript(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"找不到转录文件：{path}")
    text = path.read_text(encoding="utf-8").strip()
    if not text:
        raise ValueError(f"转录文件为空：{path}")
    return text


# --- Prompt 构造：拆分为多个函数，便于并行产生不同指令风格 ---

def build_prompt_base(transcript: str, max_pairs: int) -> str:
    return f"""
你是一名专业的面试复盘助手。请阅读下面的转录稿，并提取不超过 {max_pairs} 组高质量的问答对，并总结候选人的表现。

要求：
1. 合并同一问题的追问，抽象出核心问题。
2. 在答案中概括候选人的主要观点，不要逐字照搬。
3. 尽量保留原文中的时间戳（如“07:03”），若答案跨多个时间段可以写成范围。
4. 输出 JSON，包含问答、表现亮点、需要改进的地方、快速总结及改进建议。
   - strengths.title / improvements.title ≤ 12 字，detail ≤ 40 字。
   - quick_summary ≤ 60 字。
   - suggestions 中：title ≤ 15 字，description ≤ 40 字，priority 取 "高优先级" / "中优先级" / "低优先级"，actions 为 3-4 条具体行动。

JSON 模板：
{{
  "qa_pairs": [
    {{
      "id": 1,
      "questioner": "说话人 2",
      "question_time": "06:41",
      "question": "用一句话复述问题",
      "answerer": "说话人 1",
      "answer_time": "07:03-07:53",
      "answer": "概括回答要点",
      "notes": "可选，补充如回答薄弱点或评价"
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
{transcript}
"""


def build_prompt_precision(transcript: str, max_pairs: int) -> str:
    # 更强调严格 JSON 与量化信息
    return f"""
你是严格的面试纪要整理助手。请基于转录稿，提取不超过 {max_pairs} 组问答对，聚焦：
- 问题要抽象成核心问题；
- 回答需尽量量化（给出数据、规模、性能、影响等）；
- 保留时间戳；
- 只输出有效 JSON（不得包含注释或额外文本）。

字段约束：
- strengths.title / improvements.title ≤ 10 字，detail ≤ 36 字；
- quick_summary ≤ 50 字；

JSON 模板：
{{
  "qa_pairs": [
    {{"id": 1, "questioner": "说话人 2", "question_time": "06:41", "question": "核心问题", "answerer": "说话人 1", "answer_time": "07:03-07:53", "answer": "量化后的要点", "notes": "可选"}}
  ],
  "strengths": [{{"title": "量化能力强", "detail": "示例：能用数据支撑论点"}}],
  "improvements": [{{"title": "场景细节弱", "detail": "示例：缺少实现/落地细节"}}],
  "quick_summary": "一句话总结"
}}

转录内容：
{transcript}
"""


def build_prompt_insight(transcript: str, max_pairs: int) -> str:
    # 更强调洞察与建议
    return f"""
你是面试官复盘助手，重点提炼洞察。基于转录稿，输出不超过 {max_pairs} 组问答对，并给出：
- strengths 更聚焦候选人可迁移的能力与潜力；
- improvements 更聚焦可操作的改进建议；
- quick_summary 要覆盖“技术深度、沟通清晰度、落地经验”。

严格输出 JSON：
{{
  "qa_pairs": [
    {{"id": 1, "questioner": "说话人 2", "question_time": "06:41", "question": "核心问题", "answerer": "说话人 1", "answer_time": "07:03-07:53", "answer": "聚焦思路与取舍", "notes": "可选，标注风险点"}}
  ],
  "strengths": [{{"title": "取舍得当", "detail": "示例：能权衡性能与成本"}}],
  "improvements": [{{"title": "边界意识弱", "detail": "示例：缺少失败/回退预案"}}],
  "quick_summary": "一句话总结（含技术/沟通/落地）"
}}

转录内容：
{transcript}
"""


# 保留原函数名以兼容旧调用

def build_prompt(transcript: str, max_pairs: int) -> str:
    return build_prompt_base(transcript, max_pairs)


def build_prompt_variants(transcript: str, max_pairs: int, n: int | None = None) -> List[Tuple[str, str]]:
    """返回多种风格的 prompt 列表 (label, prompt)。
    如果 n 指定，则裁剪到 n 种。
    """
    variants: List[Tuple[str, str]] = [
        ("standard", build_prompt_base(transcript, max_pairs)),
        ("precision", build_prompt_precision(transcript, max_pairs)),
        ("insight", build_prompt_insight(transcript, max_pairs)),
    ]
    return variants[:n] if n else variants


async def _request_once(client: AsyncOpenAI, *, model: str, temperature: float, prompt: str) -> Dict[str, Any]:
    resp = await client.chat.completions.create(
        model=model,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": "你是一个只输出有效 JSON 的问答抽取助手。"},
            {"role": "user", "content": prompt},
        ],
    )
    raw = resp.choices[0].message.content
    try:
        return json.loads(raw)
    except Exception as e:
        return {"error": f"JSON 解析失败: {e}", "raw": raw}


async def _extract_parallel(
    prompts: List[Tuple[str, str]],
    *,
    model: str,
    temperature: float,
) -> List[Dict[str, Any]]:
    client = create_async_client()
    tasks = [
        _request_once(client, model=model, temperature=temperature, prompt=p)
        for _, p in prompts
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    bundled: List[Dict[str, Any]] = []
    for (label, _), res in zip(prompts, results):
        if isinstance(res, Exception):
            bundled.append({"variant": label, "error": str(res)})
        else:
            bundled.append({"variant": label, "data": res})
    return bundled


def extract_qa_pairs_parallel(
    transcript_path: Path,
    *,
    model: str = "qwen3-max",
    max_pairs: int = 100,
    temperature: float = 0.2,
    variants: int = 3,
) -> List[Dict[str, Any]]:
    """并行请求多种 Prompt，返回多份结果。

    返回示例：[{"variant": "standard", "data": {...}}, {"variant": "precision", ...}]
    """
    transcript = read_transcript(transcript_path)
    prompts = build_prompt_variants(transcript, max_pairs, n=variants)
    return asyncio.run(_extract_parallel(prompts, model=model, temperature=temperature))


def extract_qa_pairs(
    transcript_path: Path,
    *,
    model: str = "qwen3-max",
    max_pairs: int = 100,
    temperature: float = 0.2,
) -> Dict[str, Any]:
    client = create_client()
    transcript = read_transcript(transcript_path)
    prompt = build_prompt(transcript, max_pairs)

    response = client.chat.completions.create(
        model=model,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": "你是一个只输出有效 JSON 的问答抽取助手。"},
            {"role": "user", "content": prompt},
        ],
    )

    raw_content = response.choices[0].message.content
    return json.loads(raw_content)


def pretty_print_result(result: Dict[str, Any]) -> None:
    qa_pairs = result.get("qa_pairs", [])
    if qa_pairs:
        print("---- 问答对 ----")
        for pair in qa_pairs:
            q_id = pair.get("id")
            question_meta = f"{pair.get('questioner', '未知')}@{pair.get('question_time', '未知')}"
            answer_meta = f"{pair.get('answerer', '未知')}@{pair.get('answer_time', '未知')}"
            print(f"[Q{q_id}] {question_meta} -> {pair.get('question')}")
            print(f"      {answer_meta} -> {pair.get('answer')}")
            notes = pair.get("notes")
            if notes:
                print(f"      Notes: {notes}")
            print()

    strengths = result.get("strengths", [])
    if strengths:
        print("---- 表现优秀的方面 ----")
        for item in strengths:
            print(f"- {item.get('title', '亮点')}: {item.get('detail', '')}")
        print()

    improvements = result.get("improvements", [])
    if improvements:
        print("---- 需要改进的地方 ----")
        for item in improvements:
            print(f"- {item.get('title', '改进点')}: {item.get('detail', '')}")
        print()

    summary = result.get("quick_summary")
    if summary:
        print("---- 快速总结 ----")
        print(summary)
        print()

    suggestions = result.get("suggestions", [])
    if suggestions:
        print("---- 改进建议 ----")
        for idx, sug in enumerate(suggestions, start=1):
            title = sug.get("title", f"建议 {idx}")
            desc = sug.get("description", "")
            priority = sug.get("priority", "")
            actions = sug.get("actions") or []
            print(f"{idx}. {title}（{priority}）- {desc}")
            for action in actions:
                print(f"   • {action}")
            print()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="使用 LLM 从面试转录文本中抽取问答对")
    parser.add_argument(
        "--transcript",
        type=Path,
        default=DEFAULT_TRANSCRIPT,
        help="转录文本路径（默认 data/moc_transcript.txt）",
    )
    parser.add_argument(
        "--model",
        default="qwen3-max",
        help="DashScope 模型名称，默认 qwen3-max",
    )
    parser.add_argument(
        "--max-pairs",
        type=int,
        default=100,
        help="最多抽取的问答对数量",
    )
    parser.add_argument(
        "--temperature",
        type=float,
        default=0.2,
        help="LLM 温度，控制输出多样性",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="可选：把问答结果保存为 JSON 文件（并行时保存为数组）",
    )
    parser.add_argument(
        "--parallel",
        type=int,
        default=1,
        help="并行调用的变体数量（>1 时将并发发起多种 Prompt）",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.parallel and args.parallel > 1:
        results = extract_qa_pairs_parallel(
            args.transcript,
            model=args.model,
            max_pairs=args.max_pairs,
            temperature=args.temperature,
            variants=args.parallel,
        )
        # 输出或保存
        if args.output:
            args.output.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"已将多结果写入 {args.output}")
        else:
            print(json.dumps(results, ensure_ascii=False, indent=2))

        # 预览每个变体摘要
        for item in results:
            print("\n====== 变体: ", item.get("variant"), " ======\n")
            data = item.get("data") or {}
            if isinstance(data, dict):
                pretty_print_result(data)
        return

    # 单次（向后兼容）
    result = extract_qa_pairs(
        args.transcript,
        model=args.model,
        max_pairs=args.max_pairs,
        temperature=args.temperature,
    )

    if args.output:
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"已将问答对写入 {args.output}")
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    print("\n====== 摘要预览 ======\n")
    pretty_print_result(result)


if __name__ == "__main__":
    main()

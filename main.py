import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, List
from typing import Union
import requests
from llm import LLMClient
from transcrib import AudioTranscriber

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class InterviewAnalyzer:
    """面试复盘分析系统"""
    
    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client
        self.interview_types = ["技术面试", "产品面试", "行为面试", "英语面试", "管理面试"]
        self.target_roles = ["算法工程师", "前端工程师", "后端工程师", "产品经理", "数据分析师"]
        
    def load_transcription(self, file_path: Union[str, Path]) -> str:
        """
        加载面试录音转写文件
        
        支持：
        - .mp3, .wav, .flac 等音频文件：自动进行语音转录
        - .txt, .json 等文本文件：直接读取转写内容
        
        Args:
            file_path: 文件路径
            
        Returns:
            str: 转写文本内容
            
        Raises:
            FileNotFoundError: 文件不存在
            ValueError: 文件内容为空或格式不支持
        """
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                raise FileNotFoundError(f"文件不存在: {file_path}")
            
            # 获取文件扩展名
            file_ext = file_path.suffix.lower()
            
            # 音频文件：使用AudioTranscriber进行转录
            if file_ext in ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg']:
                logger.info(f"检测到音频文件，开始转录: {file_path.name}")
                
                # 确保AudioTranscriber已初始化
                if not hasattr(self, 'audio_transcriber'):
                    # from .audio_transcriber import AudioTranscriber  # 根据实际路径调整
                    self.audio_transcriber = AudioTranscriber()
                
                # 进行音频转录
                transcription_result = self.audio_transcriber.transcribe(str(file_path))
                
                # 解析API返回结果
                try:
                    if isinstance(transcription_result, str):
                        # 尝试解析JSON格式的响应
                        # result_data = json.loads(transcription_result)
                        # if 'text' in result_data:
                        #     content = result_data['text']
                        # elif 'transcription' in result_data:
                        #     content = result_data['transcription']
                        # else:
                        #     # 如果不是JSON或没有预期字段，直接使用原始内容
                            content = transcription_result
                    else:
                        content = str(transcription_result)
                    
                    logger.info(f"音频转录完成，文本长度: {len(content)} 字符")
                    
                    # 可选：保存转录结果到文本文件
                    txt_path = file_path.with_suffix('.txt')
                    with open(txt_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    logger.info(f"转录结果已保存到: {txt_path}")
                    
                except json.JSONDecodeError:
                    # 如果不是JSON格式，直接使用原始结果
                    content = transcription_result
                    # logger.warning("转录结果不是JSON格式，使用原始内容")
            
            # 文本文件：直接读取内容
            elif file_ext in ['.txt', '.json']:
                logger.info(f"读取文本文件: {file_path.name}")
                
                with open(file_path, 'r', encoding='utf-8') as f:
                    raw_content = f.read().strip()
                
                # 如果是JSON文件，尝试提取文本内容
                if file_ext == '.json':
                    try:
                        json_data = json.loads(raw_content)
                        # 常见的JSON结构
                        if 'text' in json_data:
                            content = json_data['text']
                        elif 'transcription' in json_data:
                            content = json_data['transcription']
                        elif 'content' in json_data:
                            content = json_data['content']
                        else:
                            content = raw_content
                    except json.JSONDecodeError:
                        logger.warning("JSON文件格式错误，作为纯文本处理")
                        content = raw_content
                else:
                    content = raw_content
            
            else:
                raise ValueError(f"不支持的文件格式: {file_ext}。支持的格式: .mp3, .wav, .flac, .m4a, .aac, .ogg, .txt, .json")
            
            # 验证内容
            if not content or not content.strip():
                raise ValueError("文件内容为空")
            
            content = content.strip()
            
            logger.info(f"成功加载转写内容")
            logger.info(f"文件: {file_path.name}")
            logger.info(f"内容长度: {len(content)} 字符")
            # logger.info(f"内容预览: {content[:100]}..." if len(content) > 100 else f"内容: {content}")
            
            return content
            
                
        except Exception as e:
            logger.error(f"加载转写文件失败: {str(e)}")
            raise
    
    def create_analysis_data(self, transcription: str, language: str = "zh", 
                           interview_type: str = "技术面试", target_role: str = "算法工程师") -> Dict:
        """创建分析数据结构"""
        return {
            "transcription": transcription,
            "language": language,
            "interview_type": interview_type,
            "target_role": target_role,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "metadata": {
                "word_count": len(transcription),
                "estimated_duration": self._estimate_duration(transcription)
            }
        }
    
    def _estimate_duration(self, transcription: str) -> str:
        """估算面试时长"""
        word_count = len(transcription)
        minutes = max(1, word_count // 200)  # 假设每分钟200字
        return f"约{minutes}分钟"
    
    def generate_prompt(self, data: Dict) -> str:
        """生成分析提示词"""
        prompt_template = """你是一个专业的面试教练，现在需要你根据以下面试录音转写内容，为用户生成一份详细的面试复盘报告。

---

🧾 面试内容（请逐段理解内容）：
{transcription}

---

🧠 面试类型：{interview_type}  
🎯 目标岗位：{target_role}
⏱️ 预估时长：{estimated_duration}
📊 内容长度：{word_count} 字符

---

请你生成如下结构化报告（务必使用中文）：

## 1. 🎤 【面试问题拆解】
识别出面试中提问的每一个问题，以及应答内容简要概括。请按以下格式：
- **问题1**：[面试官问题]
  - 回答要点：[候选人回答的核心内容]
  - 表现评价：[简要评价回答质量]

## 2. ✅ 【优点总结】
总结该候选人在本次面试中的亮点，包括但不限于：
- 专业技能表现
- 沟通表达能力
- 逻辑思维能力
- 项目经验展示
- 学习态度等

## 3. ⚠️ 【待改进点】
指出存在的问题，如：
- 技术知识盲区
- 表达方式问题
- 回答结构性不足
- 准备不充分等

## 4. 📈 【提升建议】
针对发现的问题，提出具体可操作的改进建议：
- 技术能力提升方向
- 面试技巧改进
- 表达能力训练
- 具体学习资源推荐

## 5. 🔍 【整体评价】
从面试官角度做一次总结评价：
- 综合表现评分（1-10分）
- 岗位匹配度分析
- 录用建议
- 发展潜力评估

请确保语言自然清晰，有逻辑性，分析客观公正，建议具体可行。"""

        return prompt_template.format(
            transcription=data["transcription"],
            interview_type=data["interview_type"],
            target_role=data["target_role"],
            estimated_duration=data["metadata"]["estimated_duration"],
            word_count=data["metadata"]["word_count"]
        )
    
    def analyze_interview(self, data: Dict,stream) -> str:
        """分析面试内容"""
        try:
            logger.info("开始生成面试分析...")
            
            # 生成提示词
            prompt = self.generate_prompt(data)
            
            # 构建消息
            messages = [
                {"role": "system", "content": "你是一位专业的面试教练和人才评估专家，具有丰富的招聘和面试经验。"},
                {"role": "user", "content": prompt}
            ]
            
            # 调用LLM API
            logger.info("正在调用AI模型进行分析...")
            response = self.llm_client.chat(messages, max_tokens=3000,stream=stream)
            
            logger.info("面试分析完成")
            return response
            
        except Exception as e:
            logger.error(f"面试分析失败: {str(e)}")
            raise
    
    def save_analysis_result(self, analysis_result: str, output_path: str = None) -> str:
        """保存分析结果"""
        try:
            if not output_path:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_path = f"output/面试复盘报告_{timestamp}.md"
            
            output_path = Path(output_path)
            
            # 添加报告头部信息
            report_header = f"""# 面试复盘分析报告

**生成时间**: {datetime.now().strftime("%Y年%m月%d日 %H:%M:%S")}
**分析工具**: AI面试复盘助手

---

"""
            
            full_content = report_header + analysis_result
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(full_content)
            
            logger.info(f"分析报告已保存至: {output_path}")
            return str(output_path)
            
        except Exception as e:
            logger.error(f"保存分析结果失败: {str(e)}")
            raise


def main():
    """主函数 - 完整的面试分析流程"""
    try:
        print("🚀 AI面试复盘分析系统启动")
        print("=" * 50)
        
        # 1. 初始化LLM客户端
        print("📡 初始化AI客户端...")
        
        # 可以选择不同的API类型
        api_type = input("选择API类型 (dashscope/openai/local) [默认:dashscope]: ").strip() or "dashscope"
        
        if api_type == "dashscope":
            api_key = input("请输入DashScope API密钥 (或设置环境变量DASHSCOPE_API_KEY): ").strip() or None
        else:
            api_key = input(f"请输入{api_type.upper()} API密钥: ").strip() or None
        
        llm_client = LLMClient(api_type=api_type, api_key=api_key)
        analyzer = InterviewAnalyzer(llm_client)
        
        # 2. 获取用户输入
        print("\n📝 请提供面试信息:")
        
        # 获取转写文件路径 或者上传 .mp3文件
        default_path = "/Users/xiangrui/code/InterReview/5月20日商汤文本大模型一面.txt"
        # 或者音频路径
        file_path = input(f"转写文件路径 [默认: {default_path}]: ").strip() or default_path

        
        # 获取面试类型和目标岗位
        interview_type = input("面试类型 (技术面试/产品面试/行为面试/英语面试) [默认:技术面试]: ").strip() or "技术面试"
        target_role = input("目标岗位 (算法工程师/前端工程师/后端工程师/产品经理等) [默认:算法工程师]: ").strip() or "算法工程师"
        
        # 3. 加载转写文件
        print(f"\n📁 加载转写文件: {file_path}") # 可以是转录好的.txt 也可以是.mp3 类型的音频
        transcription = analyzer.load_transcription(file_path)
        
        # 4. 创建分析数据
        print("🔧 准备分析数据...")
        data = analyzer.create_analysis_data(
            transcription=transcription,
            language="zh",
            interview_type=interview_type,
            target_role=target_role
        )
        
        print(f"   面试类型: {data['interview_type']}")
        print(f"   目标岗位: {data['target_role']}")
        print(f"   内容长度: {data['metadata']['word_count']} 字符")
        print(f"   预估时长: {data['metadata']['estimated_duration']}")
        
        # 5. 执行AI分析
        print(f"\n🤖 开始AI分析...")
        
        # 询问是否使用流式输出
        use_stream = input("是否使用流式输出? (y/n) [默认:y]: ").strip().lower() != 'n'
        
        analysis_result = analyzer.analyze_interview(data, stream=use_stream)
        
        # 6. 保存和展示结果
        print(f"\n💾 保存分析结果...")
        output_file = analyzer.save_analysis_result(analysis_result)
        
        print(f"\n✅ 分析完成!")
        print(f"📄 报告文件: {output_file}")
        
        # 7. 预览结果
        preview = input("\n是否显示分析结果预览? (y/n) [默认:y]: ").strip().lower()
        if preview != 'n':
            print(f"\n" + "="*60)
            print("📊 面试复盘分析结果预览")
            print("="*60)
            print(analysis_result[:1000] + "..." if len(analysis_result) > 1000 else analysis_result)
            print("="*60)
        
        print(f"\n🎉 面试复盘分析完成！")
        
    except KeyboardInterrupt:
        print(f"\n❌ 用户取消操作")
    except Exception as e:
        logger.error(f"程序执行出错: {str(e)}")
        print(f"❌ 执行失败: {str(e)}")


if __name__ == "__main__":
    main()
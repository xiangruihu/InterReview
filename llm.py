from typing import Dict, Optional, List
# import logging
import json
import os
import requests


import logging
logger = logging.getLogger(__name__)


class DashScopeClient:
    """DashScope API客户端（基于OpenAI兼容接口）"""
    
    def __init__(self, api_key: str = None):
        """
        初始化DashScope客户端
        
        Args:
            api_key: API密钥，如果未提供则从环境变量DASHSCOPE_API_KEY读取
        """
        from openai import OpenAI
        from dotenv import load_dotenv
        
        # 加载环境变量
        load_dotenv()
        
        self.api_key = api_key or os.getenv("DASHSCOPE_API_KEY")
        if not self.api_key:
            raise ValueError("DASHSCOPE_API_KEY is not set in environment or passed explicitly.")
        
        # 使用OpenAI SDK连接DashScope兼容接口
        self.client = OpenAI(
            api_key=self.api_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
        )
        
        logger.info("DashScope客户端初始化成功")

    def chat(self, messages: List[Dict], model: str = "qwen-plus", max_tokens: int = 2000, stream: bool = True, **kwargs):
        """
        与DashScope模型对话（支持流式输出）
        
        Args:
            messages: 对话消息列表 [{"role": "user", "content": "xxx"}, ...]
            model: 模型名称，默认qwen-plus，可选：qwen-turbo, qwen-max等
            max_tokens: 最大输出token数
            stream: 是否使用流式输出，默认True
            **kwargs: 其他参数如temperature等
            
        Returns:
            str: 模型的完整回答内容
        """
        try:
            # 设置默认参数
            chat_params = {
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": kwargs.get("temperature", 0.7),
                "stream": stream,
                **kwargs
            }
            
            # 如果是Qwen3开源版模型，可能需要设置enable_thinking
            if model.startswith("qwen") and kwargs.get("enable_thinking_control", False):
                chat_params["extra_body"] = {"enable_thinking": False}
            
            logger.info(f"调用DashScope API - 模型: {model}, 消息数: {len(messages)}, 流式: {stream}")
            
            response = self.client.chat.completions.create(**chat_params)
            
            if stream:
                return self._handle_stream_response(response)
            else:
                result = response.choices[0].message.content
                logger.info(f"API调用成功，返回内容长度: {len(result)}")
                return result
                
        except Exception as e:
            logging.logger.error(f"DashScope API调用失败: {str(e)}")
            raise Exception(f"API调用出错: {str(e)}")
    
    def _handle_stream_response(self, response):
        """处理流式响应"""
        full_content = ""
        print("🤖 AI正在回答...")
        print("-" * 50)
        
        try:
            for chunk in response:
                # 检查chunk是否有choices字段且不为空
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_content += content
                    print(content, end="", flush=True)
                    
                # 如果有usage信息，记录token使用量
                if hasattr(chunk, 'usage') and chunk.usage:
                    logger.info(f"Token使用量: {chunk.usage}")
            
            print("\n" + "-" * 50)
            logger.info(f"流式响应完成，总内容长度: {len(full_content)}")
            
            return full_content
            
        except Exception as e:
            logging.logger.error(f"处理流式响应失败: {str(e)}")
            return full_content if full_content else f"流式处理出错: {str(e)}"


class SiliconFlowClient:
    """硅基流动 API客户端"""
    
    def __init__(self, api_key: str = None):
        """
        初始化硅基流动客户端
        
        Args:
            api_key: API密钥，如果未提供则从环境变量SILICON_API_KEY读取
        """
        from dotenv import load_dotenv
        
        # 加载环境变量
        load_dotenv() 
        self.api_key = api_key or os.getenv("SILICON_API_KEY") or os.getenv("SILICON")
        if not self.api_key:
            raise ValueError("SILICON_API_KEY is not set in environment or passed explicitly.")
        
        self.base_url = "https://api.siliconflow.cn/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        logger.info("硅基流动客户端初始化成功")

    def chat(self, messages: List[Dict], model: str = "Qwen/QwQ-32B", max_tokens: int = 4000, stream: bool = True, **kwargs):
        """
        与硅基流动模型对话（支持流式输出）
        
        Args:
            messages: 对话消息列表 [{"role": "user", "content": "xxx"}, ...]
            model: 模型名称，默认Qwen/QwQ-32B，可选：Qwen/Qwen2.5-72B-Instruct等
            max_tokens: 最大输出token数
            stream: 是否使用流式输出，默认True
            **kwargs: 其他参数
            
        Returns:
            str: 模型的完整回答内容
        """
        try:
            # 构建请求参数
            payload = {
                "model": model,
                "messages": messages,
                "stream": stream,
                "max_tokens": max_tokens,
                "temperature": kwargs.get("temperature", 0.7),
                "top_p": kwargs.get("top_p", 0.7),
                "top_k": kwargs.get("top_k", 50),
                "frequency_penalty": kwargs.get("frequency_penalty", 0.5),
                "min_p": kwargs.get("min_p", 0.05),
                "n": kwargs.get("n", 1),
                "response_format": kwargs.get("response_format", {"type": "text"}),
                "stop": kwargs.get("stop", None),
            }
            
            # 特殊参数处理
            if "enable_thinking" in kwargs:
                payload["enable_thinking"] = kwargs["enable_thinking"]
            if "thinking_budget" in kwargs:
                payload["thinking_budget"] = kwargs["thinking_budget"]
            if "tools" in kwargs:
                payload["tools"] = kwargs["tools"]
            
            logger.info(f"调用硅基流动 API - 模型: {model}, 消息数: {len(messages)}, 流式: {stream}")
            
            if stream:
                return self._handle_stream_request(payload)
            else:
                return self._handle_non_stream_request(payload)
                
        except Exception as e:
            logger.error(f"硅基流动 API调用失败: {str(e)}")
            raise Exception(f"API调用出错: {str(e)}")
    
    def _handle_stream_request(self, payload):
        """处理流式请求"""
        url = f"{self.base_url}/chat/completions"
        
        try:
            response = requests.post(url, json=payload, headers=self.headers, stream=True)
            response.raise_for_status()
            
            full_content = ""
            print("🤖 硅基流动 AI正在回答...")
            print("-" * 50)
            
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    
                    # 跳过空行和非数据行
                    if not line_str.strip() or not line_str.startswith('data: '):
                        continue
                    
                    # 移除 "data: " 前缀
                    json_str = line_str[6:].strip()
                    
                    # 跳过结束标志
                    if json_str == '[DONE]':
                        break
                    
                    try:
                        chunk_data = json.loads(json_str)
                        if ('choices' in chunk_data and 
                            chunk_data['choices'] and 
                            'delta' in chunk_data['choices'][0] and
                            'content' in chunk_data['choices'][0]['delta']):
                            
                            content = chunk_data['choices'][0]['delta']['content']
                            if content:
                                full_content += content
                                print(content, end="", flush=True)
                                
                        # 记录使用量信息
                        if 'usage' in chunk_data:
                            logger.info(f"Token使用量: {chunk_data['usage']}")
                            
                    except json.JSONDecodeError as e:
                        logger.debug(f"解析JSON失败: {json_str}, 错误: {e}")
                        continue
            
            print("\n" + "-" * 50)
            logger.info(f"流式响应完成，总内容长度: {len(full_content)}")
            
            return full_content
            
        except requests.RequestException as e:
            logger.error(f"请求失败: {str(e)}")
            raise Exception(f"网络请求出错: {str(e)}")
        except Exception as e:
            logger.error(f"处理流式响应失败: {str(e)}")
            raise Exception(f"流式处理出错: {str(e)}")
    
    def _handle_non_stream_request(self, payload):
        """处理非流式请求"""
        url = f"{self.base_url}/chat/completions"
        payload["stream"] = False
        
        try:
            response = requests.post(url, json=payload, headers=self.headers)
            response.raise_for_status()
            
            result = response.json()
            
            if 'choices' in result and result['choices']:
                content = result['choices'][0]['message']['content']
                logger.info(f"API调用成功，返回内容长度: {len(content)}")
                
                # 记录使用量信息
                if 'usage' in result:
                    logger.info(f"Token使用量: {result['usage']}")
                
                return content
            else:
                raise Exception("响应格式异常：缺少choices字段")
                
        except requests.RequestException as e:
            logger.error(f"请求失败: {str(e)}")
            raise Exception(f"网络请求出错: {str(e)}")
        except Exception as e:
            logger.error(f"处理响应失败: {str(e)}")
            raise Exception(f"响应处理出错: {str(e)}")


class LLMClient:
    """通用LLM客户端（兼容多种API，支持流式输出）"""
    
    def __init__(self, api_type="dashscope", api_key=None, **kwargs):
        """
        初始化LLM客户端
        
        Args:
            api_type: API类型 (dashscope, openai, claude, local)
            api_key: API密钥
            **kwargs: 其他初始化参数
        """
        self.api_type = api_type.lower()
        self.api_key = api_key
        
        # 根据API类型初始化对应客户端
        if self.api_type == "dashscope":
            self.client = DashScopeClient(api_key=api_key)
        elif self.api_type == "openai":
            self.client = self._init_openai_client(api_key)
        elif self.api_type == "siliconflow":
            self.client = SiliconFlowClient(api_key=api_key)
        elif self.api_type == "local":
            self.client = self._init_local_client(**kwargs)
        else:
            raise ValueError(f"不支持的API类型: {self.api_type}")
            
        logger.info(f"LLM客户端初始化完成，类型: {self.api_type}")
    
    def _init_openai_client(self, api_key):
        """初始化OpenAI客户端"""
        from openai import OpenAI
        api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY is not set")
        return OpenAI(api_key=api_key)
    
    def _init_local_client(self, base_url="http://localhost:11434", **kwargs):
        """初始化本地客户端（如Ollama）"""
        self.base_url = base_url
        return None  # 本地客户端使用requests直接调用
    
    def chat(self, messages: List[Dict], model: str = None, max_tokens: int = 2000, stream: bool = True, **kwargs):
        """
        统一的聊天接口（支持流式输出）
        
        Args:
            messages: 对话消息列表
            model: 模型名称
            max_tokens: 最大token数
            stream: 是否使用流式输出，默认True
            **kwargs: 其他参数
            
        Returns:
            str: 模型回答
        """
        try:
            if self.api_type == "dashscope":
                default_model = model or "qwen-plus"
                return self.client.chat(messages, model=default_model, max_tokens=max_tokens, stream=stream, **kwargs)
                
            elif self.api_type == "openai":
                return self._call_openai_stream(messages, model, max_tokens, stream, **kwargs)
            
            elif self.api_type == "siliconflow":
                default_model = model or "Qwen/QwQ-32B"
                return self.client.chat(messages, model=default_model, max_tokens=max_tokens, stream=stream, **kwargs)
 
            elif self.api_type == "local":
                return self._call_local_api(messages, model, max_tokens, stream, **kwargs)
                
        except Exception as e:
            logging.logger.error(f"LLM调用失败: {str(e)}")
            raise
    
    def _call_openai_stream(self, messages, model, max_tokens, stream, **kwargs):
        """调用OpenAI API（支持流式）"""
        default_model = model or "gpt-3.5-turbo"
        
        response = self.client.chat.completions.create(
            model=default_model,
            messages=messages,
            max_tokens=max_tokens,
            stream=stream,
            **kwargs
        )
        
        if stream:
            full_content = ""
            print("🤖 AI正在回答...")
            print("-" * 50)
            
            for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_content += content
                    print(content, end="", flush=True)
            
            print("\n" + "-" * 50)
            return full_content
        else:
            return response.choices[0].message.content
    
    def _call_local_api(self, messages, model, max_tokens, stream, **kwargs):
        """调用本地API（支持流式）"""
        import requests
        
        data = {
            "model": model or "llama2",
            "messages": messages,
            "stream": stream,
            "options": {
                "num_predict": max_tokens,
                **kwargs
            }
        }
        
        if stream:
            # 流式请求处理
            response = requests.post(f"{self.base_url}/api/chat", json=data, stream=True)
            response.raise_for_status()
            
            full_content = ""
            print("🤖 AI正在回答...")
            print("-" * 50)
            
            for line in response.iter_lines():
                if line:
                    try:
                        chunk_data = json.loads(line.decode('utf-8'))
                        if 'message' in chunk_data and 'content' in chunk_data['message']:
                            content = chunk_data['message']['content']
                            full_content += content
                            print(content, end="", flush=True)
                    except json.JSONDecodeError:
                        continue
            
            print("\n" + "-" * 50)
            return full_content
        else:
            # 非流式请求
            response = requests.post(f"{self.base_url}/api/chat", json=data)
            response.raise_for_status()
            result = response.json()
            return result["message"]["content"]


# if __name__ == "__main__":
#     # 硅基流动客户端示例
#     try:
#         # 使用硅基流动
#         client = LLMClient(api_type="siliconflow")
        
#         messages = [
#             {"role": "user", "content": "What opportunities and challenges will the Chinese large model industry face in 2025?"}
#         ]
        
#         response = client.chat(
#             messages=messages,
#             model="Qwen/QwQ-32B",
#             max_tokens=512,
#             stream=True,
#             enable_thinking=False,
#             thinking_budget=4096,
#             temperature=0.7,
#             top_p=0.7,
#             top_k=50,
#             frequency_penalty=0.5
#         )
        
#         print(f"\n回答: {response}")
        
#     except Exception as e:
#         # print(f"错误: {e}")
#         print("error")


# import requests

# url = "https://api.siliconflow.cn/v1/chat/completions"

# payload = {
#     "model": "Qwen/QwQ-32B",
#     "messages": [
#         {
#             "role": "user",
#             "content": "What opportunities and challenges will the Chinese large model industry face in 2025?"
#         }
#     ],
#     "stream": False,
#     "max_tokens": 512,
#     "enable_thinking": False,
#     "thinking_budget": 4096,
#     "min_p": 0.05,
#     "stop": None,
#     "temperature": 0.7,
#     "top_p": 0.7,
#     "top_k": 50,
#     "frequency_penalty": 0.5,
#     "n": 1,
#     "response_format": {"type": "text"},
#     "tools": [
#         {
#             "type": "function",
#             "function": {
#                 "description": "<string>",
#                 "name": "<string>",
#                 "parameters": {},
#                 "strict": False
#             }
#         }
#     ]
# }
# headers = {
#     "Authorization": f"Bearer {os.getenv('SILICON')}",
#     "Content-Type": "application/json"
# }

# response = requests.request("POST", url, json=payload, headers=headers)

# print(response.text)
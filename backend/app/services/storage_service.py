"""
数据存储服务
支持 JSON 文件存储（本地开发）和 Supabase 数据库（生产环境）
"""
import json
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime

class StorageService:
    """本地 JSON 文件存储服务"""

    def __init__(self):
        self.data_dir = Path("data")
        self.data_dir.mkdir(exist_ok=True)

    def _get_user_file(self, user_id: str, file_name: str) -> Path:
        """获取用户数据文件路径"""
        user_dir = self.data_dir / user_id
        user_dir.mkdir(exist_ok=True)
        return user_dir / file_name

    def save_user(self, user_id: str, user_data: Dict[str, Any]) -> bool:
        """保存用户数据"""
        try:
            file_path = self._get_user_file(user_id, "user.json")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(user_data, f, ensure_ascii=False, indent=2, default=str)
            return True
        except Exception as e:
            print(f"保存用户数据失败: {e}")
            return False

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """获取用户数据"""
        try:
            file_path = self._get_user_file(user_id, "user.json")
            if not file_path.exists():
                return None
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"读取用户数据失败: {e}")
            return None

    def save_interviews(self, user_id: str, interviews: List[Dict[str, Any]]) -> bool:
        """保存面试列表"""
        try:
            file_path = self._get_user_file(user_id, "interviews.json")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(interviews, f, ensure_ascii=False, indent=2, default=str)
            return True
        except Exception as e:
            print(f"保存面试数据失败: {e}")
            return False

    def get_interviews(self, user_id: str) -> List[Dict[str, Any]]:
        """获取面试列表"""
        try:
            file_path = self._get_user_file(user_id, "interviews.json")
            if not file_path.exists():
                return []
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"读取面试数据失败: {e}")
            return []

    def create_interview(self, user_id: str, interview_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """创建面试"""
        try:
            # 确保有创建时间
            if 'createdAt' not in interview_data:
                interview_data['createdAt'] = datetime.utcnow().isoformat()

            interviews = self.get_interviews(user_id)
            interviews.append(interview_data)

            if self.save_interviews(user_id, interviews):
                return interview_data
            return None
        except Exception as e:
            print(f"创建面试失败: {e}")
            return None

    def update_interview(self, user_id: str, interview_id: str, updates: Dict[str, Any]) -> bool:
        """更新面试"""
        try:
            interviews = self.get_interviews(user_id)
            updated = False

            for interview in interviews:
                if interview.get('id') == interview_id:
                    interview.update(updates)
                    if 'updatedAt' not in updates:
                        interview['updatedAt'] = datetime.utcnow().isoformat()
                    updated = True
                    break

            if updated:
                return self.save_interviews(user_id, interviews)
            return False
        except Exception as e:
            print(f"更新面试失败: {e}")
            return False

    def delete_interview(self, user_id: str, interview_id: str) -> bool:
        """删除面试"""
        try:
            interviews = self.get_interviews(user_id)
            interviews = [i for i in interviews if i.get('id') != interview_id]
            return self.save_interviews(user_id, interviews)
        except Exception as e:
            print(f"删除面试失败: {e}")
            return False

    def get_messages(self, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        """获取对话消息"""
        try:
            file_path = self._get_user_file(user_id, "messages.json")
            if not file_path.exists():
                return {}
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"读取对话消息失败: {e}")
            return {}

    def save_messages(self, user_id: str, messages: Dict[str, List[Dict[str, Any]]]) -> bool:
        """保存对话消息"""
        try:
            file_path = self._get_user_file(user_id, "messages.json")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(messages, f, ensure_ascii=False, indent=2, default=str)
            return True
        except Exception as e:
            print(f"保存对话消息失败: {e}")
            return False

    def save_analysis_map(self, user_id: str, analysis_map: Dict[str, Any]) -> bool:
        """保存整份分析结果"""
        try:
            file_path = self._get_user_file(user_id, "analysis.json")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(analysis_map, f, ensure_ascii=False, indent=2, default=str)
            return True
        except Exception as e:
            print(f"保存分析数据失败: {e}")
            return False

    def save_analysis(self, user_id: str, interview_id: str, analysis_data: Dict[str, Any]) -> bool:
        """保存分析结果"""
        try:
            all_analysis = self.get_analysis(user_id) or {}
            all_analysis[interview_id] = analysis_data
            return self.save_analysis_map(user_id, all_analysis)
        except Exception as e:
            print(f"保存分析数据失败: {e}")
            return False

    def get_analysis(self, user_id: str, interview_id: str = None) -> Optional[Dict[str, Any]]:
        """获取分析结果"""
        try:
            file_path = self._get_user_file(user_id, "analysis.json")
            if not file_path.exists():
                return None if interview_id else {}

            with open(file_path, 'r', encoding='utf-8') as f:
                all_analysis = json.load(f)

            if interview_id:
                return all_analysis.get(interview_id)
            return all_analysis
        except Exception as e:
            print(f"读取分析数据失败: {e}")
            return None if interview_id else {}

    def get_transcripts(self, user_id: str) -> Dict[str, Any]:
        """获取所有转录结果"""
        try:
            file_path = self._get_user_file(user_id, "transcripts.json")
            if not file_path.exists():
                return {}
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"读取转录数据失败: {e}")
            return {}

    def get_transcript(self, user_id: str, interview_id: str) -> Optional[Dict[str, Any]]:
        """获取单个面试的转录"""
        transcripts = self.get_transcripts(user_id)
        return transcripts.get(interview_id)

    def save_transcripts(self, user_id: str, transcripts: Dict[str, Any]) -> bool:
        """保存全部转录"""
        try:
            file_path = self._get_user_file(user_id, "transcripts.json")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(transcripts, f, ensure_ascii=False, indent=2, default=str)
            return True
        except Exception as e:
            print(f"保存转录数据失败: {e}")
            return False

    def save_transcript(self, user_id: str, interview_id: str, transcript: Dict[str, Any]) -> bool:
        """保存单个面试的转录"""
        transcripts = self.get_transcripts(user_id)
        transcripts[interview_id] = transcript
        return self.save_transcripts(user_id, transcripts)

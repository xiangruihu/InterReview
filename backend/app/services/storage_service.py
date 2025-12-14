"""
数据存储服务
支持 JSON 文件存储（本地开发）和 Supabase 数据库（生产环境）
"""
import json
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
from app.config import settings

class StorageService:
    """本地 JSON 文件存储服务"""

    def __init__(self):
        self.data_dir = Path("data")
        self.data_dir.mkdir(exist_ok=True)
        self.demo_user_id = (settings.DEMO_USER_ID or "").strip()
        self.demo_user_email = (settings.DEMO_USER_EMAIL or "").strip().lower()
        template_dir = (settings.DEMO_DATA_TEMPLATE_DIR or "").strip()
        self.demo_template_dir = Path(template_dir).resolve() if template_dir else None

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

    def find_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """通过邮箱查找用户"""
        try:
            normalized = (email or "").strip().lower()
            if not normalized or not self.data_dir.exists():
                return None

            for user_dir in self.data_dir.iterdir():
                if not user_dir.is_dir():
                    continue
                file_path = user_dir / "user.json"
                if not file_path.exists():
                    continue
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                stored_email = (data.get("email") or "").strip().lower()
                if stored_email == normalized:
                    data["passwordHash"] = data.get("passwordHash", "")
                    return data
        except Exception as e:
            print(f"通过邮箱查找用户失败: {e}")
            return None

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

    # Demo helpers -----------------------------------------------------
    def is_demo_user(self, user_id: Optional[str] = None, email: Optional[str] = None) -> bool:
        """判断是否为演示账号"""
        uid = (user_id or "").strip()
        mail = (email or "").strip().lower()
        if self.demo_user_id and uid == self.demo_user_id:
            return True
        if self.demo_user_email and mail == self.demo_user_email:
            return True
        return False

    def demo_user_exists(self) -> bool:
        """演示账号数据是否已经初始化"""
        if not self.demo_user_id:
            return False
        user_file = self._get_user_file(self.demo_user_id, "user.json")
        return user_file.exists()

    def prepare_demo_user(self, password_hash: str, reset: bool = False) -> Optional[Dict[str, Any]]:
        """
        初始化/重置演示账号数据
        reset=True 会强制覆盖为模板数据，用于用户每次登录时恢复 demo 内容
        """
        if not self.demo_user_id:
            return None

        force = reset or not self.demo_user_exists()
        return self._sync_demo_template(password_hash=password_hash, force=force)

    def _sync_demo_template(self, password_hash: str, force: bool) -> Optional[Dict[str, Any]]:
        """复制模板数据到演示账号目录"""
        if not self.demo_user_id:
            return None

        user_dir = self.data_dir / self.demo_user_id
        if force and user_dir.exists():
            shutil.rmtree(user_dir)
        user_dir.mkdir(parents=True, exist_ok=True)

        if self.demo_template_dir and self.demo_template_dir.exists():
            for template_file in self.demo_template_dir.glob("*.json"):
                if template_file.name == "user.json":
                    continue
                destination = user_dir / template_file.name
                if force or not destination.exists():
                    shutil.copyfile(template_file, destination)

        user_file = user_dir / "user.json"
        existing = None
        if user_file.exists() and not force:
            try:
                with open(user_file, "r", encoding="utf-8") as f:
                    existing = json.load(f)
            except Exception:
                existing = None

        user_payload = self._build_demo_user_payload(password_hash, existing)
        with open(user_file, "w", encoding="utf-8") as f:
            json.dump(user_payload, f, ensure_ascii=False, indent=2, default=str)
        return user_payload

    def _build_demo_user_payload(
        self,
        password_hash: str,
        existing: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """构造演示用户 user.json 内容"""
        created_at = existing.get("createdAt") if isinstance(existing, dict) else None
        if not created_at:
            created_at = datetime.utcnow().isoformat()

        username = None
        if isinstance(existing, dict):
            username = existing.get("username")
        if not username:
            username = "演示用户"

        email = self.demo_user_email or (existing.get("email") if isinstance(existing, dict) else None) or "demo@example.com"

        return {
            "userId": self.demo_user_id,
            "username": username,
            "email": email,
            "createdAt": created_at,
            "passwordHash": password_hash,
            "version": 1
        }

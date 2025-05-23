import os
import sys
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, List, Union
import threading
import time
import markdown
from dotenv import load_dotenv

from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                           QHBoxLayout, QLabel, QPushButton, QTextEdit, 
                           QComboBox, QFileDialog, QProgressBar, QFrame,
                           QScrollArea, QSplitter, QTabWidget, QGroupBox,
                           QMessageBox, QStatusBar, QGridLayout, QTextBrowser)
from PyQt5.QtCore import Qt, QThread, pyqtSignal, QTimer
from PyQt5.QtGui import QFont, QPixmap, QPalette, QColor, QIcon

# 加载环境变量
load_dotenv()

# 假设这些模块已经存在
try:
    from llm import LLMClient
    from transcrib import AudioTranscriber
except ImportError:
    # 如果导入失败，创建占位符类
    class LLMClient:
        def __init__(self, api_type, api_key):
            self.api_type = api_type
            
        def chat(self, messages, max_tokens=3000, stream=False):
            return "这是模拟的AI分析结果...\n\n## 面试问题拆解\n- 问题1: 请介绍一下你的项目经验\n  - 回答要点: 详细介绍了深度学习项目\n  - 表现评价: 回答清晰有条理"
    
    class AudioTranscriber:
        def __init__(self, speed_ratio=1.6):
            self.speed_ratio = speed_ratio
            
        def transcribe(self, file_path):
            return "这是模拟的转录文本内容..."
            
        def _get_audio_duration_minutes(self, file_path):
            # 模拟返回音频时长（分钟）
            return 10.5

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TranscriptionWorker(QThread):
    """音频转录工作线程"""
    progress_updated = pyqtSignal(str, int)  # 消息, 进度百分比
    transcription_completed = pyqtSignal(str)
    error_occurred = pyqtSignal(str)
    
    def __init__(self, file_path, speed_ratio=1.6):
        super().__init__()
        self.file_path = file_path
        self.speed_ratio = speed_ratio
        
    def run(self):
        try:
            self.progress_updated.emit("正在初始化转录器...", 10)
            transcriber = AudioTranscriber(speed_ratio=self.speed_ratio)
            
            self.progress_updated.emit("正在分析音频文件...", 20)
            duration = transcriber._get_audio_duration_minutes(self.file_path)
            estimate_time = self.speed_ratio * duration
            
            self.progress_updated.emit(f"音频时长: {duration:.1f}分钟，预计转录时间: {estimate_time:.1f}秒", 30)
            
            # 模拟转录进度
            for i in range(30, 90, 10):
                time.sleep(0.5)  # 模拟处理时间
                self.progress_updated.emit(f"正在转录中... ({i}%)", i)
            
            self.progress_updated.emit("正在完成转录...", 90)
            result = transcriber.transcribe(self.file_path)
            
            self.progress_updated.emit("转录完成", 100)
            self.transcription_completed.emit(result)
            
        except Exception as e:
            self.error_occurred.emit(str(e))

class AnalysisWorker(QThread):
    """后台分析工作线程"""
    progress_updated = pyqtSignal(str)
    analysis_completed = pyqtSignal(str)
    error_occurred = pyqtSignal(str)
    
    def __init__(self, analyzer, data, use_stream=True):
        super().__init__()
        self.analyzer = analyzer
        self.data = data
        self.use_stream = use_stream
        
    def run(self):
        try:
            self.progress_updated.emit("开始AI分析...")
            result = self.analyzer.analyze_interview(self.data, stream=self.use_stream)
            self.analysis_completed.emit(result)
        except Exception as e:
            self.error_occurred.emit(str(e))

class InterviewAnalyzer:
    """面试复盘分析系统 - 核心逻辑"""
    
    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client
        self.interview_types = ["技术面试", "产品面试", "行为面试", "英语面试", "管理面试"]
        self.target_roles = ["算法工程师", "前端工程师", "后端工程师", "产品经理", "数据分析师"]
        
    def load_transcription(self, file_path: Union[str, Path]) -> str:
        """加载面试录音转写文件"""
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                raise FileNotFoundError(f"文件不存在: {file_path}")
            
            file_ext = file_path.suffix.lower()
            
            # 文本文件处理（.txt 和 .json 直接加载）
            if file_ext in ['.txt', '.json']:
                with open(file_path, 'r', encoding='utf-8') as f:
                    raw_content = f.read().strip()
                
                if file_ext == '.json':
                    try:
                        json_data = json.loads(raw_content)
                        content = json_data.get('text', json_data.get('transcription', raw_content))
                    except json.JSONDecodeError:
                        content = raw_content
                else:
                    content = raw_content
                    
                if not content or not content.strip():
                    raise ValueError("文件内容为空")
                    
                return content.strip()
            
            # 音频文件处理
            elif file_ext in ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg']:
                raise ValueError("音频文件需要通过转录流程处理")
            else:
                raise ValueError(f"不支持的文件格式: {file_ext}")
                
        except Exception as e:
            logger.error(f"加载转写文件失败: {str(e)}")
            raise
    
    def transcribe_audio(self, file_path: Union[str, Path], speed_ratio: float = 1.6) -> str:
        """转录音频文件"""
        try:
            if not hasattr(self, 'audio_transcriber'):
                self.audio_transcriber = AudioTranscriber(speed_ratio=speed_ratio)
            
            transcription_result = self.audio_transcriber.transcribe(str(file_path))
            content = str(transcription_result)
            
            # 保存转录结果
            file_path = Path(file_path)
            txt_path = file_path.with_suffix('.txt')
            with open(txt_path, 'w', encoding='utf-8') as f:
                f.write(content)
                
            return content.strip()
            
        except Exception as e:
            logger.error(f"音频转录失败: {str(e)}")
            raise
    
    def get_audio_duration_estimate(self, file_path: Union[str, Path], speed_ratio: float = 1.6) -> Dict:
        """获取音频时长和转录预估时间"""
        try:
            if not hasattr(self, 'audio_transcriber'):
                self.audio_transcriber = AudioTranscriber(speed_ratio=speed_ratio)
            
            duration = self.audio_transcriber._get_audio_duration_minutes(str(file_path))
            estimate_time = speed_ratio * duration
            
            return {
                "duration_minutes": duration,
                "estimate_seconds": estimate_time,
                "speed_ratio": speed_ratio
            }
            
        except Exception as e:
            logger.error(f"获取音频信息失败: {str(e)}")
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
        minutes = max(1, word_count // 200)
        return f"约{minutes}分钟"
    
    def generate_prompt(self, data: Dict) -> str:
        """生成分析提示词"""
        prompt_template = """你是一个专业的面试教练，现在需要你根据以下面试录音转写内容，为用户生成一份详细的面试复盘报告。

---

🧾 面试内容：
{transcription}

---

🧠 面试类型：{interview_type}  
🎯 目标岗位：{target_role}
⏱️ 预估时长：{estimated_duration}
📊 内容长度：{word_count} 字符

---

请你生成如下结构化报告（务必使用中文）：

## 1. 🎤 【面试问题拆解】
识别出面试中提问的每一个问题，以及应答内容简要概括。

## 2. ✅ 【优点总结】
总结该候选人在本次面试中的亮点。

## 3. ⚠️ 【待改进点】
指出存在的问题。

## 4. 📈 【提升建议】
针对发现的问题，提出具体可操作的改进建议。

## 5. 🔍 【整体评价】
从面试官角度做一次总结评价。

请确保语言自然清晰，有逻辑性，分析客观公正，建议具体可行。"""

        return prompt_template.format(
            transcription=data["transcription"],
            interview_type=data["interview_type"],
            target_role=data["target_role"],
            estimated_duration=data["metadata"]["estimated_duration"],
            word_count=data["metadata"]["word_count"]
        )
    
    def analyze_interview(self, data: Dict, stream=True) -> str:
        """分析面试内容"""
        try:
            prompt = self.generate_prompt(data)
            messages = [
                {"role": "system", "content": "你是一位专业的面试教练和人才评估专家。"},
                {"role": "user", "content": prompt}
            ]
            
            response = self.llm_client.chat(messages, max_tokens=3000, stream=stream)
            return response
            
        except Exception as e:
            logger.error(f"面试分析失败: {str(e)}")
            raise
    
    def save_analysis_result(self, analysis_result: str, output_path: str = None) -> str:
        """保存分析结果"""
        try:
            if not output_path:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_path = f"面试复盘报告_{timestamp}.md"
            
            output_path = Path(output_path)
            report_header = f"""# 面试复盘分析报告

**生成时间**: {datetime.now().strftime("%Y年%m月%d日 %H:%M:%S")}
**分析工具**: AI面试复盘助手

---

"""
            
            full_content = report_header + analysis_result
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(full_content)
            
            return str(output_path)
            
        except Exception as e:
            logger.error(f"保存分析结果失败: {str(e)}")
            raise

class InterviewAnalyzerGUI(QMainWindow):
    """AI面试复盘分析系统 - 主界面"""
    
    def __init__(self):
        super().__init__()
        self.analyzer = None
        self.transcription_content = ""
        self.analysis_result = ""
        self.current_file_path = ""
        self.init_ui()
        self.apply_styles()
        self.load_api_config()
        
    def load_api_config(self):
        """从环境变量加载API配置"""
        api_key = os.getenv('API_KEY')
        api_type = os.getenv('API_TYPE', 'dashscope')
        
        if api_key:
            self.api_key_input.setPlainText(api_key)
            self.api_type_combo.setCurrentText(api_type)
            # 自动初始化
            self.init_llm_client()
        
    def init_ui(self):
        """初始化用户界面"""
        self.setWindowTitle("🚀 AI面试复盘分析系统")
        self.setGeometry(100, 100, 1400, 900)
        
        # 创建中央部件
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 创建主布局
        main_layout = QHBoxLayout(central_widget)
        main_layout.setSpacing(10)
        main_layout.setContentsMargins(10, 10, 10, 10)
        
        # 创建分割器
        splitter = QSplitter(Qt.Horizontal)
        main_layout.addWidget(splitter)
        
        # 左侧控制面板
        self.create_control_panel()
        splitter.addWidget(self.control_panel)
        
        # 右侧内容面板
        self.create_content_panel()
        splitter.addWidget(self.content_panel)
        
        # 设置分割器比例
        splitter.setSizes([400, 1000])
        
        # 创建状态栏
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_bar.showMessage("准备就绪")
        
    def create_control_panel(self):
        """创建左侧控制面板"""
        self.control_panel = QFrame()
        self.control_panel.setFrameStyle(QFrame.StyledPanel)
        self.control_panel.setMaximumWidth(400)
        
        layout = QVBoxLayout(self.control_panel)
        layout.setSpacing(15)
        
        # 标题
        title_label = QLabel("🎯 AI面试复盘助手")
        title_label.setAlignment(Qt.AlignCenter)
        title_label.setStyleSheet("font-size: 18px; font-weight: bold; color: #2c3e50; margin: 10px;")
        layout.addWidget(title_label)
        
        # API配置组
        api_group = QGroupBox("🔧 API配置")
        api_layout = QVBoxLayout(api_group)
        
        # API类型选择
        api_type_layout = QHBoxLayout()
        api_type_layout.addWidget(QLabel("API类型:"))
        self.api_type_combo = QComboBox()
        self.api_type_combo.addItems(["dashscope", "openai", "local"])
        api_type_layout.addWidget(self.api_type_combo)
        api_layout.addLayout(api_type_layout)
        
        # API密钥输入
        self.api_key_input = QTextEdit()
        self.api_key_input.setMaximumHeight(60)
        self.api_key_input.setPlaceholderText("请输入API密钥（或在.env文件中配置）...")
        api_layout.addWidget(QLabel("API密钥:"))
        api_layout.addWidget(self.api_key_input)
        
        # 初始化按钮
        self.init_btn = QPushButton("🚀 初始化AI客户端")
        self.init_btn.clicked.connect(self.init_llm_client)
        api_layout.addWidget(self.init_btn)
        
        layout.addWidget(api_group)
        
        # 文件选择组
        file_group = QGroupBox("📁 文件选择")
        file_layout = QVBoxLayout(file_group)
        
        self.file_path_label = QLabel("未选择文件")
        self.file_path_label.setWordWrap(True)
        self.file_path_label.setStyleSheet("color: #7f8c8d; font-style: italic;")
        file_layout.addWidget(self.file_path_label)
        
        self.select_file_btn = QPushButton("📂 选择面试文件")
        self.select_file_btn.clicked.connect(self.select_file)
        file_layout.addWidget(self.select_file_btn)
        
        # 转录进度条和信息
        self.transcription_progress = QProgressBar()
        self.transcription_progress.setVisible(False)
        file_layout.addWidget(self.transcription_progress)
        
        self.transcription_info = QLabel("")
        self.transcription_info.setWordWrap(True)
        self.transcription_info.setVisible(False)
        self.transcription_info.setStyleSheet("color: #17a2b8; font-size: 12px;")
        file_layout.addWidget(self.transcription_info)
        
        layout.addWidget(file_group)
        
        # 面试配置组
        config_group = QGroupBox("⚙️ 面试配置")
        config_layout = QVBoxLayout(config_group)
        
        # 面试类型
        config_layout.addWidget(QLabel("面试类型:"))
        self.interview_type_combo = QComboBox()
        self.interview_type_combo.addItems(["技术面试", "产品面试", "行为面试", "英语面试", "管理面试"])
        config_layout.addWidget(self.interview_type_combo)
        
        # 目标岗位
        config_layout.addWidget(QLabel("目标岗位:"))
        self.target_role_combo = QComboBox()
        self.target_role_combo.addItems(["算法工程师", "前端工程师", "后端工程师", "产品经理", "数据分析师"])
        config_layout.addWidget(self.target_role_combo)
        
        layout.addWidget(config_group)
        
        # 分析按钮
        self.analyze_btn = QPushButton("🤖 开始AI分析")
        self.analyze_btn.clicked.connect(self.start_analysis)
        self.analyze_btn.setEnabled(False)
        layout.addWidget(self.analyze_btn)
        
        # 分析进度条
        self.analysis_progress_bar = QProgressBar()
        self.analysis_progress_bar.setVisible(False)
        layout.addWidget(self.analysis_progress_bar)
        
        # 保存按钮
        self.save_btn = QPushButton("💾 保存分析报告")
        self.save_btn.clicked.connect(self.save_analysis)
        self.save_btn.setEnabled(False)
        layout.addWidget(self.save_btn)
        
        layout.addStretch()
        
    def create_content_panel(self):
        """创建右侧内容面板"""
        self.content_panel = QTabWidget()
        
        # 转录内容标签页
        self.transcription_tab = QTextEdit()
        self.transcription_tab.setPlaceholderText("转录内容将在这里显示...")
        self.transcription_tab.setReadOnly(True)
        self.content_panel.addTab(self.transcription_tab, "📝 转录内容")
        
        # 分析结果标签页 - 使用QTextBrowser支持Markdown渲染
        self.analysis_tab = QTextBrowser()
        self.analysis_tab.setPlaceholderText("AI分析结果将在这里显示...")
        self.content_panel.addTab(self.analysis_tab, "📊 分析报告")
        
    def apply_styles(self):
        """应用样式"""
        self.setStyleSheet("""
            QMainWindow {
                background-color: #f8f9fa;
            }
            
            QGroupBox {
                font-weight: bold;
                border: 2px solid #dee2e6;
                border-radius: 8px;
                margin-top: 1ex;
                padding-top: 10px;
                background-color: white;
            }
            
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 5px 0 5px;
                color: #495057;
            }
            
            QPushButton {
                background-color: #007bff;
                color: white;
                border: none;
                padding: 10px;
                border-radius: 6px;
                font-weight: bold;
                font-size: 14px;
            }
            
            QPushButton:hover {
                background-color: #0056b3;
            }
            
            QPushButton:pressed {
                background-color: #004085;
            }
            
            QPushButton:disabled {
                background-color: #6c757d;
            }
            
            QComboBox {
                border: 2px solid #ced4da;
                border-radius: 4px;
                padding: 8px;
                background-color: white;
                selection-background-color: #007bff;
            }
            
            QTextEdit {
                border: 2px solid #ced4da;
                border-radius: 6px;
                padding: 8px;
                background-color: white;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 13px;
                line-height: 1.5;
            }
            
            QTextBrowser {
                border: 2px solid #ced4da;
                border-radius: 6px;
                padding: 12px;
                background-color: white;
                font-family: 'Arial', 'Microsoft YaHei', sans-serif;
                font-size: 14px;
                line-height: 1.6;
            }
            
            QTabWidget::pane {
                border: 2px solid #dee2e6;
                border-radius: 6px;
                background-color: white;
            }
            
            QTabBar::tab {
                background-color: #e9ecef;
                padding: 10px 20px;
                margin-right: 2px;
                border-top-left-radius: 6px;
                border-top-right-radius: 6px;
            }
            
            QTabBar::tab:selected {
                background-color: #007bff;
                color: white;
            }
            
            QProgressBar {
                border: 2px solid #ced4da;
                border-radius: 5px;
                text-align: center;
                background-color: #e9ecef;
            }
            
            QProgressBar::chunk {
                background-color: #28a745;
                border-radius: 3px;
            }
            
            QStatusBar {
                background-color: #343a40;
                color: white;
                font-weight: bold;
            }
        """)
    
    def init_llm_client(self):
        """初始化LLM客户端"""
        try:
            api_type = self.api_type_combo.currentText()
            api_key = self.api_key_input.toPlainText().strip()
            
            if not api_key:
                QMessageBox.warning(self, "警告", "请输入API密钥或在.env文件中配置")
                return
            
            # 创建LLM客户端
            llm_client = LLMClient(api_type=api_type, api_key=api_key)
            self.analyzer = InterviewAnalyzer(llm_client)
            
            self.init_btn.setText("✅ 初始化成功")
            self.init_btn.setEnabled(False)
            self.status_bar.showMessage("AI客户端初始化成功")
            
            QMessageBox.information(self, "成功", "AI客户端初始化成功！")
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"初始化失败: {str(e)}")
            self.status_bar.showMessage("初始化失败")
    
    def select_file(self):
        """选择面试文件"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, 
            "选择面试文件",
            "",
            "音频文件 (*.mp3 *.wav *.flac *.m4a *.aac *.ogg);;文本文件 (*.txt *.json);;所有文件 (*)"
        )
        
        if file_path:
            try:
                if not self.analyzer:
                    QMessageBox.warning(self, "警告", "请先初始化AI客户端")
                    return
                
                self.current_file_path = file_path
                file_path_obj = Path(file_path)
                file_ext = file_path_obj.suffix.lower()
                
                # 更新文件路径显示
                self.file_path_label.setText(f"已选择: {file_path_obj.name}")
                self.file_path_label.setStyleSheet("color: #17a2b8; font-weight: bold;")
                
                # 处理不同类型的文件
                if file_ext in ['.txt', '.json']:
                    # 直接加载文本文件
                    self.transcription_content = self.analyzer.load_transcription(file_path)
                    self.transcription_tab.setPlainText(self.transcription_content)
                    self.analyze_btn.setEnabled(True)
                    self.status_bar.showMessage(f"文件加载成功: {len(self.transcription_content)} 字符")
                    
                elif file_ext in ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg']:
                    # 音频文件需要转录
                    self.start_transcription(file_path)
                else:
                    QMessageBox.warning(self, "警告", f"不支持的文件格式: {file_ext}")
                    
            except Exception as e:
                QMessageBox.critical(self, "错误", f"文件处理失败: {str(e)}")
                self.status_bar.showMessage("文件处理失败")
    
    def start_transcription(self, file_path):
        """开始音频转录"""
        try:
            # 获取音频信息和预估时间
            audio_info = self.analyzer.get_audio_duration_estimate(file_path)
            
            # 显示转录信息
            info_text = f"音频时长: {audio_info['duration_minutes']:.1f}分钟\n预计转录时间: {audio_info['estimate_seconds']:.1f}秒"
            self.transcription_info.setText(info_text)
            self.transcription_info.setVisible(True)
            
            # 显示进度条
            self.transcription_progress.setVisible(True)
            self.transcription_progress.setValue(0)
            
            # 禁用文件选择按钮
            self.select_file_btn.setEnabled(False)
            
            # 创建并启动转录线程
            self.transcription_worker = TranscriptionWorker(file_path, speed_ratio=1.6)
            self.transcription_worker.progress_updated.connect(self.update_transcription_progress)
            self.transcription_worker.transcription_completed.connect(self.transcription_completed)
            self.transcription_worker.error_occurred.connect(self.transcription_error)
            self.transcription_worker.start()
            
            self.status_bar.showMessage("正在转录音频文件...")
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"转录启动失败: {str(e)}")
            self.reset_transcription_ui()
    
    def update_transcription_progress(self, message, progress):
        """更新转录进度"""
        self.transcription_progress.setValue(progress)
        self.status_bar.showMessage(message)
    
    def transcription_completed(self, result):
        """转录完成"""
        self.transcription_content = result
        self.transcription_tab.setPlainText(result)
        
        # 启用分析按钮
        self.analyze_btn.setEnabled(True)
        
        self.reset_transcription_ui()
        self.status_bar.showMessage(f"转录完成: {len(result)} 字符")
        
        QMessageBox.information(self, "成功", "音频转录完成！")
    
    def transcription_error(self, error_msg):
        """转录出错"""
        QMessageBox.critical(self, "转录错误", f"转录过程中出现错误:\n{error_msg}")
        self.reset_transcription_ui()
        self.status_bar.showMessage("转录失败")
    
    def reset_transcription_ui(self):
        """重置转录界面状态"""
        self.transcription_progress.setVisible(False)
        self.transcription_info.setVisible(False)
        self.select_file_btn.setEnabled(True)
    
    def start_analysis(self):
        """开始分析"""
        if not self.analyzer or not self.transcription_content:
            QMessageBox.warning(self, "警告", "请先选择文件并初始化AI客户端")
            return
        
        try:
            # 创建分析数据
            data = self.analyzer.create_analysis_data(
                transcription=self.transcription_content,
                interview_type=self.interview_type_combo.currentText(),
                target_role=self.target_role_combo.currentText()
            )
            
            # 禁用分析按钮，显示进度条
            self.analyze_btn.setEnabled(False)
            self.analysis_progress_bar.setVisible(True)
            self.analysis_progress_bar.setRange(0, 0)  # 不确定进度
            
            # 创建并启动工作线程
            self.worker = AnalysisWorker(self.analyzer, data, use_stream=True)
            self.worker.progress_updated.connect(self.update_analysis_progress)
            self.worker.analysis_completed.connect(self.analysis_completed)
            self.worker.error_occurred.connect(self.analysis_error)
            self.worker.start()
            
            self.status_bar.showMessage("正在进行AI分析...")
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"分析启动失败: {str(e)}")
            self.reset_analysis_ui()
    
    def update_analysis_progress(self, message):
        """更新分析进度信息"""
        self.status_bar.showMessage(message)
    
    def analysis_completed(self, result):
        """分析完成"""
        self.analysis_result = result
        
        # 将Markdown转换为HTML并显示
        try:
            html_content = markdown.markdown(result, extensions=['tables', 'toc', 'codehilite'])
            # 添加CSS样式使其更美观
            styled_html = f"""
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {{
                        font-family: 'Arial', 'Microsoft YaHei', sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 100%;
                        margin: 0;
                        padding: 20px;
                    }}
                    h1, h2, h3, h4, h5, h6 {{
                        color: #2c3e50;
                        border-bottom: 2px solid #3498db;
                        padding-bottom: 5px;
                    }}
                    h1 {{ font-size: 24px; }}
                    h2 {{ font-size: 20px; }}
                    h3 {{ font-size: 18px; }}
                    h4 {{ font-size: 16px; }}
                    ul, ol {{
                        padding-left: 20px;
                    }}
                    li {{
                        margin-bottom: 5px;
                    }}
                    p {{
                        margin-bottom: 12px;
                    }}
                    strong {{
                        color: #e74c3c;
                    }}
                    code {{
                        background-color: #f8f9fa;
                        padding: 2px 4px;
                        border-radius: 3px;
                        font-family: 'Consolas', 'Monaco', monospace;
                    }}
                    pre {{
                        background-color: #f8f9fa;
                        padding: 10px;
                        border-radius: 5px;
                        border-left: 4px solid #3498db;
                        overflow-x: auto;
                    }}
                    blockquote {{
                        border-left: 4px solid #3498db;
                        padding-left: 15px;
                        margin-left: 0;
                        font-style: italic;
                        color: #7f8c8d;
                    }}
                    table {{
                        border-collapse: collapse;
                        width: 100%;
                        margin-bottom: 15px;
                    }}
                    th, td {{
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: left;
                    }}
                    th {{
                        background-color: #f2f2f2;
                        font-weight: bold;
                    }}
                </style>
            </head>
            <body>
                {html_content}
            </body>
            </html>
            """
            self.analysis_tab.setHtml(styled_html)
        except Exception as e:
            # 如果Markdown转换失败，显示原始文本
            logger.warning(f"Markdown转换失败: {str(e)}")
            self.analysis_tab.setPlainText(result)
        
        # 切换到分析结果标签页
        self.content_panel.setCurrentIndex(1)
        
        # 启用保存按钮
        self.save_btn.setEnabled(True)
        
        self.reset_analysis_ui()
        self.status_bar.showMessage("分析完成")
        
        QMessageBox.information(self, "成功", "面试分析完成！")
    
    def analysis_error(self, error_msg):
        """分析出错"""
        QMessageBox.critical(self, "分析错误", f"分析过程中出现错误:\n{error_msg}")
        self.reset_analysis_ui()
        self.status_bar.showMessage("分析失败")
    
    def reset_analysis_ui(self):
        """重置分析界面状态"""
        self.analyze_btn.setEnabled(True)
        self.analysis_progress_bar.setVisible(False)
    
    def save_analysis(self):
        """保存分析报告"""
        if not self.analysis_result:
            QMessageBox.warning(self, "警告", "没有分析结果可以保存")
            return
        
        file_path, _ = QFileDialog.getSaveFileName(
            self,
            "保存分析报告",
            f"面试复盘报告_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md",
            "Markdown文件 (*.md);;文本文件 (*.txt);;所有文件 (*)"
        )
        
        if file_path:
            try:
                output_path = self.analyzer.save_analysis_result(self.analysis_result, file_path)
                QMessageBox.information(self, "成功", f"报告已保存至:\n{output_path}")
                self.status_bar.showMessage(f"报告已保存: {Path(output_path).name}")
                
            except Exception as e:
                QMessageBox.critical(self, "错误", f"保存失败: {str(e)}")

def main():
    """主函数"""
    app = QApplication(sys.argv)
    
    # 设置应用信息
    app.setApplicationName("AI面试复盘分析系统")
    app.setApplicationVersion("2.0.0")
    app.setOrganizationName("AI Assistant")
    
    # 创建并显示主窗口
    window = InterviewAnalyzerGUI()
    window.show()
    
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()


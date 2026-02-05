"""
测试应用启动和转录服务初始化
"""
import sys
import logging
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def test_transcription_initialization():
    """测试转录服务初始化"""
    logger.info("开始测试转录服务初始化...")

    try:
        from app.core.transcription import initialize_transcription_service, get_transcriber

        # 初始化转录服务
        logger.info("调用 initialize_transcription_service()...")
        transcriber = initialize_transcription_service()

        # 验证服务已初始化
        logger.info("调用 get_transcriber()...")
        transcriber2 = get_transcriber()

        assert transcriber is not None, "转录服务未初始化"
        assert transcriber is transcriber2, "转录服务实例不一致"

        logger.info("✓ 转录服务初始化成功")
        logger.info(f"✓ 转录服务类型: {type(transcriber).__name__}")

        return True

    except Exception as e:
        logger.error(f"✗ 转录服务初始化失败: {e}", exc_info=True)
        return False


def test_app_startup():
    """测试应用启动"""
    logger.info("开始测试应用启动...")

    try:
        from app.main import app

        logger.info("✓ 应用导入成功")

        # 检查启动事件是否注册
        startup_handlers = app.router.on_startup
        logger.info(f"✓ 启动事件处理器数量: {len(startup_handlers)}")

        return True

    except Exception as e:
        logger.error(f"✗ 应用启动测试失败: {e}", exc_info=True)
        return False


if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("开始测试...")
    logger.info("=" * 60)

    # 测试转录服务初始化
    test1 = test_transcription_initialization()

    logger.info("")
    logger.info("=" * 60)

    # 测试应用启动
    test2 = test_app_startup()

    logger.info("")
    logger.info("=" * 60)
    logger.info("测试结果:")
    logger.info(f"  转录服务初始化: {'✓ 通过' if test1 else '✗ 失败'}")
    logger.info(f"  应用启动: {'✓ 通过' if test2 else '✗ 失败'}")
    logger.info("=" * 60)

    sys.exit(0 if (test1 and test2) else 1)

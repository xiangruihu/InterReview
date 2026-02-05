#!/usr/bin/env python3
"""
测试转录服务懒加载和线程安全功能
"""
import sys
import os
import threading
import time

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_lazy_loading():
    """测试懒加载功能"""
    print("=" * 60)
    print("测试 1: 懒加载功能")
    print("=" * 60)

    from app.core.transcription import get_transcriber, _initialized

    print(f"初始化状态: {_initialized}")

    # 第一次调用 get_transcriber，应该触发自动初始化
    print("\n第一次调用 get_transcriber()...")
    transcriber1 = get_transcriber()
    print(f"获取到的服务类型: {type(transcriber1).__name__}")

    # 第二次调用，应该返回相同的实例
    print("\n第二次调用 get_transcriber()...")
    transcriber2 = get_transcriber()
    print(f"获取到的服务类型: {type(transcriber2).__name__}")

    # 验证是同一个实例
    assert transcriber1 is transcriber2, "两次调用应该返回相同的实例"
    print("✓ 验证通过：两次调用返回相同的实例")

    print("\n" + "=" * 60)
    print("测试 1 通过！")
    print("=" * 60 + "\n")


def test_thread_safety():
    """测试线程安全"""
    print("=" * 60)
    print("测试 2: 线程安全")
    print("=" * 60)

    # 重置模块状态
    import app.core.transcription as trans_module
    trans_module._transcriber = None
    trans_module._initialized = False

    results = []
    errors = []

    def worker(worker_id):
        try:
            from app.core.transcription import get_transcriber
            time.sleep(0.01)  # 模拟一些延迟
            transcriber = get_transcriber()
            results.append((worker_id, transcriber))
            print(f"线程 {worker_id}: 获取到 {type(transcriber).__name__}")
        except Exception as e:
            errors.append((worker_id, str(e)))
            print(f"线程 {worker_id}: 错误 - {e}")

    # 创建多个线程同时调用 get_transcriber
    threads = []
    num_threads = 10
    print(f"\n启动 {num_threads} 个线程并发调用 get_transcriber()...\n")

    for i in range(num_threads):
        t = threading.Thread(target=worker, args=(i,))
        threads.append(t)
        t.start()

    # 等待所有线程完成
    for t in threads:
        t.join()

    # 验证结果
    print(f"\n完成 {len(results)} 个线程，{len(errors)} 个错误")

    if errors:
        print("\n错误列表:")
        for worker_id, error in errors:
            print(f"  线程 {worker_id}: {error}")
        raise AssertionError("存在线程错误")

    # 验证所有线程获取到的是同一个实例
    first_transcriber = results[0][1]
    for worker_id, transcriber in results:
        assert transcriber is first_transcriber, f"线程 {worker_id} 获取到不同的实例"

    print("✓ 验证通过：所有线程获取到相同的实例")

    print("\n" + "=" * 60)
    print("测试 2 通过！")
    print("=" * 60 + "\n")


def test_force_reinitialize():
    """测试强制重新初始化"""
    print("=" * 60)
    print("测试 3: 强制重新初始化")
    print("=" * 60)

    from app.core.transcription import get_transcriber, initialize_transcription_service

    # 获取当前实例
    print("\n获取当前实例...")
    transcriber1 = get_transcriber()
    print(f"当前服务类型: {type(transcriber1).__name__}")

    # 强制重新初始化
    print("\n强制重新初始化...")
    transcriber2 = initialize_transcription_service(force=True)
    print(f"新服务类型: {type(transcriber2).__name__}")

    # 注意：由于我们使用相同的配置，实际上会创建新的实例
    # 但类型应该相同
    assert type(transcriber1).__name__ == type(transcriber2).__name__, "服务类型应该相同"
    print("✓ 验证通过：强制重新初始化成功")

    print("\n" + "=" * 60)
    print("测试 3 通过！")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    try:
        print("\n" + "=" * 60)
        print("开始测试转录服务修复")
        print("=" * 60 + "\n")

        test_lazy_loading()
        test_thread_safety()
        test_force_reinitialize()

        print("\n" + "=" * 60)
        print("所有测试通过！✓")
        print("=" * 60 + "\n")

    except Exception as e:
        print("\n" + "=" * 60)
        print(f"测试失败: {e}")
        print("=" * 60 + "\n")
        import traceback
        traceback.print_exc()
        sys.exit(1)

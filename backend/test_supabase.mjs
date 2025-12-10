// Supabase 连接测试脚本
// 运行方式：
// 1. 安装依赖: npm install @supabase/supabase-js dotenv
// 2. 确保 .env 文件在项目根目录，并包含 SUPABASE_URL 和 SUPABASE_ANON_KEY
// 3. 执行脚本: node backend/test_supabase.mjs

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// 加载项目根目录的 .env 文件
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
// 注意：这里使用 ANONYMOUS KEY (anon key) 进行测试，这是用于客户端的安全密钥
const supabaseKey = process.env.SUPABASE_ANON_KEY;

async function testSupabaseConnection() {
  console.log('--- Supabase 连接测试 ---');

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 错误: .env 文件中缺少 SUPABASE_URL 或 SUPABASE_ANON_KEY');
    console.log('请确保 .env 文件在项目根目录，并包含以下内容：');
    console.log('SUPABASE_URL=https://<你的项目ID>.supabase.co');
    console.log('SUPABASE_ANON_KEY=<你的anon_key>');
    return;
  }

  console.log(`正在连接到 Supabase 项目: ${supabaseUrl.slice(0, 30)}...`);

  try {
    // 1. 创建 Supabase 客户端实例
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ 客户端创建成功');

    // 2. 执行一个安全的只读操作来验证连接和权限
    //    我们尝试获取存储桶（Storage Buckets）列表
    console.log('正在尝试执行只读查询 (storage.listBuckets)...');
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('❌ 查询失败:');
      console.error('  - 状态码:', error.statusCode);
      console.error('  - 错误信息:', error.message);
      console.error('  - 可能原因:');
      console.error('    - SUPABASE_ANON_KEY 不正确或权限不足');
      console.error('    - 网络问题或 Supabase 服务暂时不可用');
      console.error('    - RLS (Row Level Security) 策略限制');
      return;
    }

    console.log('✅ 查询成功！');
    console.log(`成功获取到 ${data.length} 个存储桶 (Buckets)`);
    if (data.length > 0) {
      console.log('存储桶列表:', data.map(b => b.name));
    }
    console.log('\n🎉 Supabase 连接和 ANON KEY 均验证成功！');

  } catch (e) {
    console.error('❌ 发生意外错误:', e.message);
  }
}

testSupabaseConnection();


-- InterReview Supabase Schema
-- 版本: 1.0
-- 描述: 创建核心数据表并配置行级安全策略 (RLS)

-- 1. 用户信息表 (users)
-- 存储用户的公开档案信息，关联到 Supabase 的认证用户。
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 安全策略: 允许用户读取自己的信息，允许新用户插入自己的记录。
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow individual user access" ON public.users;
CREATE POLICY "Allow individual user access"
  ON public.users FOR ALL
  USING (auth.uid() = id);


-- 2. 面试记录表 (interviews)
-- 存放每一次面试的核心信息。
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT,
  position TEXT,
  status TEXT NOT NULL DEFAULT '待上传',
  interview_date TIMESTAMPTZ,
  audio_storage_path TEXT, -- 音频文件在 Supabase Storage 中的路径
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 安全策略: 用户只能创建、查看、修改、删除自己的面试记录。
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow individual user access" ON public.interviews;
CREATE POLICY "Allow individual user access"
  ON public.interviews FOR ALL
  USING (auth.uid() = user_id);

-- 性能优化: 为外键创建索引
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON public.interviews(user_id);


-- 3. 分析结果表 (analyses)
-- 存储 AI 对某次面试的分析报告。
CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL UNIQUE REFERENCES public.interviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  overall_score INT,
  summary TEXT,
  strengths JSONB, -- 存储为 JSON 数组, e.g., ["表达清晰", "技术扎实"]
  weaknesses JSONB,
  suggestions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 安全策略: 用户只能操作与自己面试相关的分析报告。
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow individual user access" ON public.analyses;
CREATE POLICY "Allow individual user access"
  ON public.analyses FOR ALL
  USING (auth.uid() = user_id);

-- 性能优化: 为外键创建索引
CREATE INDEX IF NOT EXISTS idx_analyses_interview_id ON public.analyses(interview_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);


-- 4. 对话历史表 (chat_messages)
-- 记录用户与 AI 关于某次面试的所有对话。
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 安全策略: 用户只能操作与自己面试相关的对话消息。
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow individual user access" ON public.chat_messages;
CREATE POLICY "Allow individual user access"
  ON public.chat_messages FOR ALL
  USING (auth.uid() = user_id);

-- 性能优化: 为外键和时间戳创建索引，加速对话历史查询
CREATE INDEX IF NOT EXISTS idx_chat_messages_interview_id ON public.chat_messages(interview_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

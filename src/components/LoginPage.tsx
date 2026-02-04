import { useState, useEffect } from 'react';
import { LogIn, Mail, Lock, Eye, EyeOff, User, UserPlus } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { loginUser, registerAccount, googleLogin, type UserProfileDTO } from '../utils/backend';

interface LoginPageProps {
  onLogin: (profile: { userId: string; username: string; email: string; createdAt?: string }) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset form when switching modes
  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setEmail('');
    setPassword('');
    setUsername('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (mode === 'login') {
      if (!email || !password) {
        toast.error('请填写邮箱和密码');
        return;
      }

      setIsLoading(true);
      try {
        const profile = await loginUser({ email, password }) as UserProfileDTO;
        onLogin(profile);
      } catch (error) {
        const status = (error as any)?.status;
        const message =
          status === 401
            ? '邮箱或密码错误，请检查后重试'
            : error instanceof Error
              ? error.message
              : '请稍后重试';
        toast.error('登录失败', { description: message });
        setFormError(message);
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!username || !email || !password || !confirmPassword) {
        toast.error('请填写所有必填项');
        return;
      }

      if (password !== confirmPassword) {
        toast.error('两次输入的密码不一致');
        return;
      }

      if (password.length < 6) {
        toast.error('密码长度至少为 6 位');
        return;
      }

      setIsLoading(true);
      try {
        const profile = await registerAccount({ username, email, password }) as UserProfileDTO;
        toast.success('注册成功，已自动登录');
        onLogin(profile);
        setFormError(null);
      } catch (error) {
        const status = (error as any)?.status;
        const message =
          status === 409
            ? '该邮箱已注册，请直接使用登录'
            : error instanceof Error
              ? error.message
              : '请稍后重试';
        toast.error('注册失败', { description: message });
        setFormError(message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Quick login with demo account
  const handleQuickLogin = async () => {
    setIsLoading(true);
    setFormError(null);
    const demoEmail = 'demo@example.com';
    const demoPassword = 'demo123';
    const fallbackUsername = '演示用户';

    try {
      let profile: UserProfileDTO | null = null;
      try {
        profile = await loginUser({ email: demoEmail, password: demoPassword }) as UserProfileDTO;
      } catch (error) {
        const status = (error as any)?.status;
        if (status === 401 || status === 404) {
          profile = await registerAccount({
            username: fallbackUsername,
            email: demoEmail,
            password: demoPassword,
          }) as UserProfileDTO;
        } else {
          throw error;
        }
      }
      if (profile) {
        onLogin(profile);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '请稍后重试';
      toast.error('快捷登录失败', { description: message });
      setFormError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Google login callback
  const handleGoogleLogin = async (response: any) => {
    setIsGoogleLoading(true);
    setFormError(null);

    try {
      const credential = response.credential; // Google ID Token
      const profile = await googleLogin({ token: credential });
      onLogin(profile);
    } catch (error) {
      const message = error instanceof Error ? error.message : '请稍后重试';
      toast.error('Google 登录失败', { description: message });
      setFormError(message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Initialize Google Sign-In
  useEffect(() => {
    if (typeof window.google !== 'undefined') {
      window.google.accounts.id.initialize({
        client_id: '893987418304-9778qnv8vhbt8tfokule6so1hm82uv66.apps.googleusercontent.com',
        callback: handleGoogleLogin,
        auto_select: false,
      });

      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: '100%',
        }
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <span className="text-white text-2xl">IR</span>
          </div>
          <h1 className="text-gray-900 mb-2">InterReview 面试复盘助手</h1>
          <p className="text-gray-600">让每一次面试都成为进步的阶梯</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h2 className="text-gray-900 mb-6 text-center">
            {mode === 'login' ? '登录账号' : '注册账号'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input - Only for Register */}
            {mode === 'register' && (
              <div>
                <label htmlFor="username" className="block text-sm text-gray-700 mb-2">
                  用户名 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm text-gray-700 mb-2">
                邮箱地址 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm text-gray-700 mb-2">
                密码 <span className="text-red-500">*</span>
                {mode === 'register' && (
                  <span className="text-gray-500 ml-1">(至少 6 位)</span>
                )}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input - Only for Register */}
            {mode === 'register' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm text-gray-700 mb-2">
                  确认密码 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Remember & Forgot - Only for Login */}
            {mode === 'login' && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-600">记住我</span>
                </label>
                <button type="button" className="text-blue-600 hover:text-blue-700 transition-colors">
                  忘记密码？
                </button>
              </div>
            )}

            {/* Terms Agreement - Only for Register */}
            {mode === 'register' && (
              <div className="text-sm text-gray-600">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 mt-0.5"
                  />
                  <span>
                    我已阅读并同意
                    <button type="button" className="text-blue-600 hover:text-blue-700 mx-1">
                      用户协议
                    </button>
                    和
                    <button type="button" className="text-blue-600 hover:text-blue-700 mx-1">
                      隐私政策
                    </button>
                  </span>
                </label>
              </div>
            )}

            {formError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {formError}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{mode === 'login' ? '登录中...' : '注册中...'}</span>
                </>
              ) : (
                <>
                  {mode === 'login' ? (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>登录</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      <span>注册</span>
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          {/* Divider - Only for Login */}
          {mode === 'login' && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">或</span>
                </div>
              </div>

              {/* Quick Login */}
              <button
                type="button"
                onClick={handleQuickLogin}
                disabled={isLoading || isGoogleLoading}
                className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                快速体验（演示账号）
              </button>

              {/* Google Sign-In Button */}
              <div className="mt-3">
                <div
                  id="google-signin-button"
                  className="w-full flex justify-center"
                />
              </div>
            </>
          )}

          {/* Toggle Mode Link */}
          <p className="text-center text-sm text-gray-600 mt-6">
            {mode === 'login' ? (
              <>
                还没有账号？
                <button 
                  type="button" 
                  onClick={() => switchMode('register')}
                  className="text-blue-600 hover:text-blue-700 ml-1 transition-colors"
                >
                  立即注册
                </button>
              </>
            ) : (
              <>
                已有账号？
                <button 
                  type="button" 
                  onClick={() => switchMode('login')}
                  className="text-blue-600 hover:text-blue-700 ml-1 transition-colors"
                >
                  立即登录
                </button>
              </>
            )}
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Beta 测试版本 · 自动复盘技术支持</p>
          <p className="mt-2">© 2025 InterReview. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Auth mode: 'choose' | 'login' | 'register-email' | 'register-verify' | 'register-setup'
type AuthMode = 'choose' | 'login' | 'register-email' | 'register-verify' | 'register-setup';

const TEST_EMAIL = 'hokhimtang@gmail.com';

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('choose');
  
  // Login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Register state
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  
  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cooldown, setCooldown] = useState(0);
  
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('univibe_token');
    const user = localStorage.getItem('univibe_user');
    if (token && user) {
      navigate('/feed');
    }
  }, [navigate]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  // ============ EMAIL VERIFICATION (Registration) ============
  const isValidEmail = (e: string) => e.endsWith('.edu.hk') || e === TEST_EMAIL;

  const handleSendCode = async () => {
    if (!email) { setError('請輸入電郵地址'); return; }
    if (!isValidEmail(email)) { setError('請使用 .edu.hk 學校電郵'); return; }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || '發送失敗');
      
      setSuccess('驗證碼已發送至你的電郵，10分鐘內有效');
      setMode('register-verify');
      setCooldown(60);
      cooldownRef.current = setInterval(() => {
        setCooldown(c => { if (c <= 1) { clearInterval(cooldownRef.current); return 0; } return c - 1; });
      }, 1000);
      
      setTimeout(() => codeRefs.current[0]?.focus(), 300);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const codeStr = code.join('');
    if (codeStr.length !== 6) { setError('請輸入完整的6位驗證碼'); return; }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: codeStr })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || '驗證失敗');
      
      setSuccess('電郵驗證成功！請設定你的帳號');
      setMode('register-setup');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============ REGISTRATION SETUP ============
  const handleRegister = async () => {
    if (!regUsername) { setError('請輸入用戶名'); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(regUsername)) { setError('用戶名：3-20個字符，只能包含字母、數字和底線'); return; }
    if (regPassword.length < 6) { setError('密碼至少需要6個字符'); return; }
    if (regPassword !== regConfirmPassword) { setError('兩次輸入的密碼不一致'); return; }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          username: regUsername,
          password: regPassword,
          displayName: displayName || regUsername
        })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || '註冊失敗');
      
      // Save session
      localStorage.setItem('univibe_token', data.token);
      localStorage.setItem('univibe_user', JSON.stringify(data.user));
      
      setSuccess('註冊成功！歡迎加入 UniVibe HK 🎉');
      setTimeout(() => navigate('/feed'), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============ LOGIN ============
  const handleLogin = async () => {
    if (!loginUsername || !loginPassword) { setError('請輸入用戶名和密碼'); return; }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || '登入失敗');
      
      // Save session
      localStorage.setItem('univibe_token', data.token);
      localStorage.setItem('univibe_user', JSON.stringify(data.user));
      
      setSuccess('登入成功！');
      setTimeout(() => navigate('/feed'), 800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============ CODE INPUT HANDLERS ============
  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) codeRefs.current[index + 1]?.focus();
  };

  const handleCodeKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newCode = [...code];
      if (code[index]) {
        newCode[index] = '';
        setCode(newCode);
      } else if (index > 0) {
        newCode[index - 1] = '';
        setCode(newCode);
        codeRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      codeRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      codeRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter' && code.every(c => c)) {
      handleVerifyCode();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    pasted.split('').forEach((char, i) => { newCode[i] = char; });
    setCode(newCode);
    codeRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  // ============ SHARED UI COMPONENTS ============
  const inputClass = "w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50 transition-all";
  
  const buttonClass = (disabled = false) =>
    `w-full py-3 rounded-xl font-semibold text-white transition-all ${
      disabled
        ? 'bg-white/10 cursor-not-allowed opacity-50'
        : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/25 active:scale-[0.98]'
    }`;

  const backButton = (target: AuthMode) => (
    <button
      onClick={() => { setMode(target); setError(''); setSuccess(''); }}
      className="flex items-center gap-1 text-white/50 hover:text-white/80 transition-colors text-sm mb-4"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      返回
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
            UniVibe HK
          </h1>
          <p className="text-white/50 mt-1 text-sm">香港大學生社交平台</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <AnimatePresence mode="wait">
            
            {/* ========== CHOOSE: Login or Register ========== */}
            {mode === 'choose' && (
              <motion.div key="choose" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <h2 className="text-xl font-bold text-white text-center mb-6">歡迎來到 UniVibe</h2>
                
                <div className="space-y-3">
                  <button
                    onClick={() => { setMode('login'); setError(''); }}
                    className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                      登入 Login
                    </div>
                  </button>
                  
                  <button
                    onClick={() => { setMode('register-email'); setError(''); }}
                    className="w-full py-4 rounded-xl font-semibold text-white bg-white/10 border border-white/20 hover:bg-white/15 active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                      註冊新帳號 Register
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ========== LOGIN: Username + Password ========== */}
            {mode === 'login' && (
              <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                {backButton('choose')}
                <h2 className="text-xl font-bold text-white mb-5">登入你的帳號</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/60 text-sm mb-1.5">用戶名 Username</label>
                    <input
                      type="text"
                      value={loginUsername}
                      onChange={e => setLoginUsername(e.target.value)}
                      placeholder="your_username"
                      className={inputClass}
                      autoComplete="username"
                      onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/60 text-sm mb-1.5">密碼 Password</label>
                    <div className="relative">
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        placeholder="••••••"
                        className={inputClass}
                        autoComplete="current-password"
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                      >
                        {showLoginPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {error && <p className="text-red-400 text-sm">{error}</p>}
                  {success && <p className="text-green-400 text-sm">{success}</p>}

                  <button
                    onClick={handleLogin}
                    disabled={loading || !loginUsername || !loginPassword}
                    className={buttonClass(loading || !loginUsername || !loginPassword)}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        登入中...
                      </span>
                    ) : '登入 Login'}
                  </button>
                </div>

                <p className="text-center text-white/40 text-sm mt-4">
                  還沒有帳號？{' '}
                  <button onClick={() => { setMode('register-email'); setError(''); setSuccess(''); }} className="text-orange-400 hover:text-orange-300">
                    立即註冊
                  </button>
                </p>
              </motion.div>
            )}

            {/* ========== REGISTER STEP 1: Email ========== */}
            {mode === 'register-email' && (
              <motion.div key="reg-email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                {backButton('choose')}
                <h2 className="text-xl font-bold text-white mb-1">建立帳號</h2>
                <p className="text-white/40 text-sm mb-5">第 1 步：驗證你的學校電郵</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/60 text-sm mb-1.5">學校電郵 School Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="s1234567@connect.hku.hk"
                      className={inputClass}
                      onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                    />
                    <p className="text-white/30 text-xs mt-1">需要 .edu.hk 學校電郵地址</p>
                  </div>

                  {error && <p className="text-red-400 text-sm">{error}</p>}
                  {success && <p className="text-green-400 text-sm">{success}</p>}

                  <button
                    onClick={handleSendCode}
                    disabled={loading || !email || cooldown > 0}
                    className={buttonClass(loading || !email || cooldown > 0)}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        發送中...
                      </span>
                    ) : cooldown > 0 ? `重新發送 (${cooldown}s)` : '發送驗證碼'}
                  </button>
                </div>

                <p className="text-center text-white/40 text-sm mt-4">
                  已有帳號？{' '}
                  <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="text-orange-400 hover:text-orange-300">
                    登入
                  </button>
                </p>
              </motion.div>
            )}

            {/* ========== REGISTER STEP 2: Verify Code ========== */}
            {mode === 'register-verify' && (
              <motion.div key="reg-verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                {backButton('register-email')}
                <h2 className="text-xl font-bold text-white mb-1">輸入驗證碼</h2>
                <p className="text-white/40 text-sm mb-5">已發送至 {email}</p>

                <div className="flex justify-center gap-2 mb-4" onPaste={handleCodePaste}>
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { codeRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleCodeChange(i, e.target.value)}
                      onKeyDown={e => handleCodeKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-bold bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50 transition-all"
                    />
                  ))}
                </div>

                {error && <p className="text-red-400 text-sm text-center mb-3">{error}</p>}
                {success && <p className="text-green-400 text-sm text-center mb-3">{success}</p>}

                <button
                  onClick={handleVerifyCode}
                  disabled={loading || code.some(c => !c)}
                  className={buttonClass(loading || code.some(c => !c))}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      驗證中...
                    </span>
                  ) : '驗證 Verify'}
                </button>

                <p className="text-center text-white/40 text-sm mt-3">
                  {cooldown > 0 ? `${cooldown}秒後可重新發送` : (
                    <button onClick={handleSendCode} className="text-orange-400 hover:text-orange-300">重新發送驗證碼</button>
                  )}
                </p>
              </motion.div>
            )}

            {/* ========== REGISTER STEP 3: Set Username & Password ========== */}
            {mode === 'register-setup' && (
              <motion.div key="reg-setup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <h2 className="text-xl font-bold text-white mb-1">設定你的帳號</h2>
                <p className="text-white/40 text-sm mb-5">第 2 步：建立用戶名和密碼</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-white/60 text-sm mb-1.5">用戶名 Username *</label>
                    <input
                      type="text"
                      value={regUsername}
                      onChange={e => setRegUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      placeholder="cool_student_2026"
                      className={inputClass}
                      maxLength={20}
                      autoComplete="username"
                    />
                    <p className="text-white/30 text-xs mt-1">3-20個字符，字母、數字、底線</p>
                  </div>

                  <div>
                    <label className="block text-white/60 text-sm mb-1.5">顯示名稱 Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="你的暱稱（可選）"
                      className={inputClass}
                      maxLength={30}
                    />
                  </div>

                  <div>
                    <label className="block text-white/60 text-sm mb-1.5">密碼 Password *</label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        placeholder="至少6個字符"
                        className={inputClass}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                      >
                        {showRegPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/60 text-sm mb-1.5">確認密碼 Confirm Password *</label>
                    <input
                      type="password"
                      value={regConfirmPassword}
                      onChange={e => setRegConfirmPassword(e.target.value)}
                      placeholder="再次輸入密碼"
                      className={inputClass}
                      autoComplete="new-password"
                      onKeyDown={e => e.key === 'Enter' && handleRegister()}
                    />
                    {regConfirmPassword && regPassword !== regConfirmPassword && (
                      <p className="text-red-400 text-xs mt-1">密碼不一致</p>
                    )}
                  </div>

                  {error && <p className="text-red-400 text-sm">{error}</p>}
                  {success && <p className="text-green-400 text-sm">{success}</p>}

                  <button
                    onClick={handleRegister}
                    disabled={loading || !regUsername || regPassword.length < 6 || regPassword !== regConfirmPassword}
                    className={buttonClass(loading || !regUsername || regPassword.length < 6 || regPassword !== regConfirmPassword)}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        建立帳號中...
                      </span>
                    ) : '建立帳號 Create Account'}
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className="text-center text-white/20 text-xs mt-6">
          UniVibe HK © 2026 · 保護你的隱私
        </p>
      </motion.div>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { simpleToast as toast } from '../../../lib/client-toast';

function getDeviceFingerprint() {
  if (typeof window === 'undefined') return '';
  try {
    const ua = navigator.userAgent || '';
    const w = window.screen?.width ?? 0;
    const h = window.screen?.height ?? 0;
    const lang = navigator.language || '';
    let stored = localStorage.getItem('device_fingerprint');
    if (stored) return stored;
    const raw = `${ua}|${w}x${h}|${lang}|${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const c = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + c;
      hash = hash & hash;
    }
    const fp = 'fp_' + Math.abs(hash).toString(36);
    localStorage.setItem('device_fingerprint', fp);
    return fp;
  } catch {
    return '';
  }
}

function getDeviceInfo() {
  if (typeof window === 'undefined' || !navigator?.userAgent) return null;
  const ua = navigator.userAgent;
  const browser = detectBrowser(ua);
  const os = detectOS(ua);
  const deviceType = detectDeviceType(ua);
  return { browser, os, deviceType };
}

function detectBrowser(ua) {
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Unknown';
}

function detectOS(ua) {
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'Mac';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPad')) return 'iPad';
  if (ua.includes('iPhone') || ua.includes('iPod')) return 'iOS';
  return 'Unknown';
}

function detectDeviceType(ua) {
  const isMobileLike = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  if (!isMobileLike) return 'Desktop';
  const isTablet = ua.includes('iPad') || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
  return isTablet ? 'Tablet' : 'Mobile';
}

function getErrorMessageFromQuery(errorParam) {
  if (errorParam === 'unauthorized') {
    return 'Your session is invalid or expired. Please sign in.';
  }
  if (errorParam === 'session_expired') {
    return 'Your session has expired. Please sign in again.';
  }
  return '';
}

function handleLoginResponse(
  data,
  { router, setPendingToken, setStep, setQrCodeDataUrl, setTwoFactorCode, setInlineError }
) {
  if (data.success && data.requiresTwoFactor && data.pendingToken) {
    sessionStorage.setItem(
      'pending_2fa_login',
      JSON.stringify({ pendingToken: data.pendingToken, qrCodeDataUrl: '' })
    );
    setPendingToken(data.pendingToken);
    setStep('2fa');
    setQrCodeDataUrl('');
    setTwoFactorCode('');
    toast.success('Enter your authenticator code');
    router.replace('/dashboard/login?step=2fa');
    return;
  }

  if (data.success && data.requiresTwoFactorSetup && data.pendingToken && data.qrCodeDataUrl) {
    sessionStorage.setItem(
      'pending_2fa_login',
      JSON.stringify({
        pendingToken: data.pendingToken,
        qrCodeDataUrl: data.qrCodeDataUrl,
      })
    );
    setPendingToken(data.pendingToken);
    setQrCodeDataUrl(data.qrCodeDataUrl);
    setStep('2fa-setup');
    setTwoFactorCode('');
    toast.success('Scan the QR code, then enter the code');
    router.replace('/dashboard/login?step=2fa-setup');
    return;
  }

  const msg = data.message || 'Invalid email or password';
  setInlineError(msg);
  toast.error(msg);
}

const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [step, setStep] = useState('credentials'); // 'credentials' | '2fa' | '2fa-setup'
  const [pendingToken, setPendingToken] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(''); // for first-time 2FA setup
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    const message = getErrorMessageFromQuery(error);
    if (message) {
      setInlineError(message);
      toast.error(message);
    }

    const stepParam = searchParams.get('step');
    if (stepParam !== '2fa' && stepParam !== '2fa-setup') return;

    try {
      const stored = JSON.parse(sessionStorage.getItem('pending_2fa_login') || '{}');
      if (stored?.pendingToken) {
        setPendingToken(stored.pendingToken);
        setQrCodeDataUrl(stored.qrCodeDataUrl || '');
        setTwoFactorCode('');
        setStep(stepParam);
      }
    } catch {
      sessionStorage.removeItem('pending_2fa_login');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setInlineError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      const data = await response.json();
      handleLoginResponse(data, {
        router,
        setPendingToken,
        setStep,
        setQrCodeDataUrl,
        setTwoFactorCode,
        setInlineError,
      });
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    if (!pendingToken || !twoFactorCode.trim()) {
      setInlineError('Enter the 6-digit code from your authenticator app');
      return;
    }
    setLoading(true);
    setInlineError('');
    try {
      const deviceFingerprint = getDeviceFingerprint();
      const deviceInfo = getDeviceInfo();
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          pendingToken,
          code: twoFactorCode.trim().replace(/\s/g, ''),
          deviceFingerprint: deviceFingerprint || undefined,
          deviceInfo: deviceInfo || undefined,
        }),
      });
      const data = await response.json();
      if (data.success && data.data) {
        sessionStorage.removeItem('pending_2fa_login');
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        toast.success('Login successful!');
        router.push('/dashboard');
      } else {
        setInlineError(data.message || 'Invalid code');
        toast.error(data.message || 'Invalid code');
      }
    } catch (error) {
      toast.error('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const backToCredentials = useCallback(() => {
    setStep('credentials');
    setPendingToken('');
    setQrCodeDataUrl('');
    setTwoFactorCode('');
    setInlineError('');
    sessionStorage.removeItem('pending_2fa_login');
    router.replace('/dashboard/login');
  }, [router]);

  const is2FAStep = step === '2fa' || step === '2fa-setup';

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 ${is2FAStep ? 'py-6 md:py-8' : 'py-12'}`}>
      <div className={`w-full ${is2FAStep ? 'max-w-2xl' : 'max-w-md'} ${is2FAStep ? 'space-y-0' : 'space-y-8'}`}>
        {is2FAStep ? (
          <TwoFactorStep
            step={step}
            inlineError={inlineError}
            qrCodeDataUrl={qrCodeDataUrl}
            twoFactorCode={twoFactorCode}
            loading={loading}
            backToCredentials={backToCredentials}
            setTwoFactorCode={setTwoFactorCode}
            handleVerify2FA={handleVerify2FA}
          />
        ) : (
          <CredentialsStep
            inlineError={inlineError}
            loading={loading}
            formData={formData}
            setFormData={setFormData}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            handleSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
};

const TwoFactorStep = ({
  step,
  inlineError,
  qrCodeDataUrl,
  twoFactorCode,
  loading,
  backToCredentials,
  setTwoFactorCode,
  handleVerify2FA,
}) => (
  <div className="w-full overflow-hidden rounded-2xl bg-white shadow-xl shadow-gray-200/50 ring-1 ring-gray-200/80 md:min-h-[400px]">
    <div className="md:flex md:min-h-[400px]">
      <div className="flex flex-col items-center justify-center border-b border-gray-100 bg-gradient-to-br from-indigo-50/80 to-white px-6 py-6 md:w-48 md:flex-shrink-0 md:border-b-0 md:border-r md:border-gray-100 md:py-8">
        <Image
          src="/U9-logo.svg"
          alt="Dashboard"
          width={56}
          height={56}
          className="h-14 w-14"
          unoptimized
        />
        <h2 className="mt-3 text-lg font-semibold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-xs text-gray-500">
          {step === '2fa-setup' ? 'Set up 2FA' : 'Enter code'}
        </p>
      </div>
      <div className="flex flex-1 flex-col justify-center px-6 py-6 md:px-8 md:py-8">
        {inlineError && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {inlineError}
          </div>
        )}
        <form className="flex flex-col items-center space-y-4" onSubmit={handleVerify2FA}>
          {step === '2fa-setup' && qrCodeDataUrl && (
            <div className="flex flex-col items-center">
              <div className="rounded-xl bg-gray-50/80 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCodeDataUrl} alt="2FA QR code" width={180} height={180} className="rounded-lg w-[180px] h-[180px]" />
              </div>
              <p className="mt-2 text-center text-xs text-gray-500 max-w-[240px]">
                Scan with your authenticator app, then enter the code below.
              </p>
            </div>
          )}
          {step === '2fa' && (
            <p className="text-center text-sm text-gray-600">Enter the 6-digit code from your app.</p>
          )}
          <div className="w-full max-w-[240px]">
            <label htmlFor="twoFactorCode" className="sr-only">Code</label>
            <input
              id="twoFactorCode"
              name="twoFactorCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              placeholder="Enter code"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-center text-lg tracking-[0.25em] text-gray-900 placeholder:tracking-normal placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/25"
            />
          </div>
          <div className="flex w-full max-w-[240px] gap-2 pt-0.5">
            <button
              type="button"
              onClick={backToCredentials}
              disabled={loading}
              className="flex-1 rounded-lg border border-gray-200 py-2.5 px-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || twoFactorCode.length < 6}
              className="flex-1 rounded-lg bg-indigo-600 py-2.5 px-3 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Verify'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);

const CredentialsStep = ({
  inlineError,
  loading,
  formData,
  setFormData,
  showPassword,
  setShowPassword,
  handleSubmit,
}) => (
  <>
    <div>
      <div className="mx-auto h-24 w-24 flex items-center justify-center">
        <Image
          src="/U9-logo.svg"
          alt="Dashboard"
          width={96}
          height={96}
          className="h-20 w-20"
          unoptimized
        />
      </div>
      <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Dashboard
      </h2>
      <p className="mt-2 text-center text-sm text-gray-600">
        Blank Dashboard
      </p>
    </div>
    {inlineError && (
      <div className="mt-4 p-3 rounded-md bg-red-100 text-red-700 text-sm">
        {inlineError}
      </div>
    )}

    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="appearance-none relative block w-full px-4 py-3 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder="Email address"
          />
        </div>
        <div className="relative">
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="appearance-none relative block w-full px-4 py-3 pr-12 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder="Password"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 z-20 flex items-center pr-3"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-500" />
            ) : (
              <Eye className="h-5 w-5 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            'Sign in'
          )}
        </button>
      </div>
    </form>
  </>
);

const LoginPage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
};

export default LoginPage;

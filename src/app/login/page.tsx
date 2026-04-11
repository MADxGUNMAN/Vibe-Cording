'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import { LogoIcon } from '@/components/icons';
import { OTPInput } from '@/components/OTPInput';

type AuthStep = 'form' | 'otp' | 'newPassword';
type OTPType = 'signup' | 'reset';

export default function LoginPage() {
    const router = useRouter();
    const { user, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

    const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    // Multi-step auth state
    const [authStep, setAuthStep] = useState<AuthStep>('form');
    const [otpType, setOtpType] = useState<OTPType>('signup');

    // Form states
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [signupName, setSignupName] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Forgot password states
    const [resetEmail, setResetEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    // OTP states
    const [otpError, setOtpError] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    // Google sign-in states
    const [showGoogleNameInput, setShowGoogleNameInput] = useState(false);
    const [googleName, setGoogleName] = useState('');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            router.push('/');
        }
    }, [user, router]);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    // Password strength
    const getPasswordStrength = (password: string): number => {
        let strength = 0;
        if (password.length >= 6) strength++;
        if (password.length >= 8 && /[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) strength++;
        return strength;
    };

    const passwordStrength = getPasswordStrength(signupPassword);
    const pendingEmail = otpType === 'signup' ? signupEmail : resetEmail;

    // ─── Send OTP ───
    const sendOTP = useCallback(async (email: string, type: OTPType) => {
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, type }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to send verification code');
                setIsLoading(false);
                return false;
            }

            setResendCooldown(60);
            setIsLoading(false);
            return true;
        } catch {
            setError('Network error. Please try again.');
            setIsLoading(false);
            return false;
        }
    }, []);

    // ─── Verify OTP ───
    const verifyOTP = useCallback(async (otp: string) => {
        setError('');
        setOtpError(false);
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: pendingEmail,
                    otp,
                    type: otpType,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Invalid verification code');
                setOtpError(true);
                setIsLoading(false);
                return;
            }

            // OTP verified — proceed
            if (otpType === 'signup') {
                try {
                    await signUpWithEmail(signupEmail, signupPassword, signupName);
                    setSuccess('Account created successfully!');
                    setTimeout(() => router.push('/'), 800);
                } catch (err: unknown) {
                    const errorMessage = err instanceof Error ? err.message : 'Registration failed';
                    if (errorMessage.includes('email-already-in-use')) setError('Email already exists.');
                    else if (errorMessage.includes('weak-password')) setError('Password too weak.');
                    else setError('Registration failed.');
                }
            } else {
                setAuthStep('newPassword');
            }

            setIsLoading(false);
        } catch {
            setError('Network error. Please try again.');
            setIsLoading(false);
        }
    }, [pendingEmail, otpType, signupEmail, signupPassword, signupName, signUpWithEmail, router]);

    // ─── Handle Login ───
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await signInWithEmail(loginEmail, loginPassword);
            setSuccess('Access granted!');
            setTimeout(() => router.push('/'), 800);
        } catch (err: unknown) {
            const error = err as { code?: string; message?: string };
            if (error.code === 'auth/user-not-found') setError('No account found.');
            else if (error.code === 'auth/wrong-password') setError('Invalid password.');
            else if (error.code === 'auth/invalid-email') setError('Invalid email.');
            else if (error.code === 'auth/invalid-credential') setError('Invalid credentials.');
            else setError('Authentication failed.');
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Handle Signup (Step 1: Send OTP) ───
    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (signupPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (signupPassword.length < 6) {
            setError('Min 6 characters required.');
            return;
        }

        const sent = await sendOTP(signupEmail, 'signup');
        if (sent) {
            setOtpType('signup');
            setAuthStep('otp');
        }
    };

    // ─── Handle Forgot Password (Step 1: Send OTP) ───
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!resetEmail) {
            setError('Please enter your email address.');
            return;
        }

        const sent = await sendOTP(resetEmail, 'reset');
        if (sent) {
            setOtpType('reset');
            setAuthStep('otp');
        }
    };

    // ─── Handle Password Reset (Final Step) ───
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmNewPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (newPassword.length < 6) {
            setError('Min 6 characters required.');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: resetEmail,
                    newPassword,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to reset password');
                setIsLoading(false);
                return;
            }

            setSuccess('Password updated! You can now sign in.');
            setAuthStep('form');
            setActiveTab('login');
            setOtpType('signup');
            setLoginEmail(resetEmail);
            setResetEmail('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Handle Resend OTP ───
    const handleResendOTP = async () => {
        if (resendCooldown > 0) return;
        await sendOTP(pendingEmail, otpType);
    };

    // ─── Handle Google Sign In ───
    const handleGoogleSignIn = async () => {
        if (showGoogleNameInput) {
            if (!googleName.trim()) {
                setError('Please enter your name first');
                return;
            }
            setIsLoading(true);
            try {
                await signInWithGoogle(googleName);
                router.push('/');
            } catch (err: unknown) {
                const error = err as { message?: string };
                setError(error.message || 'Failed to sign in with Google');
            } finally {
                setIsLoading(false);
            }
        } else {
            setShowGoogleNameInput(true);
        }
    };

    const handleDirectGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            await signInWithGoogle();
            router.push('/');
        } catch (err: unknown) {
            const error = err as { message?: string };
            setError(error.message || 'Failed to sign in with Google');
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Go Back ───
    const handleBack = () => {
        setError('');
        setSuccess('');
        setOtpError(false);

        if (authStep === 'newPassword') {
            setAuthStep('form');
            setActiveTab('login');
            setOtpType('signup');
        } else if (authStep === 'otp') {
            setAuthStep('form');
        } else if (authStep === 'form' && otpType === 'reset') {
            setOtpType('signup');
        }
    };

    // ─── Start Forgot Password Flow ───
    const startForgotPassword = () => {
        setError('');
        setSuccess('');
        setOtpType('reset');
        setResetEmail(loginEmail);
        setActiveTab('login');
        setAuthStep('form');
    };

    // ─── Determine what to show ───
    const showForgotForm = otpType === 'reset' && authStep === 'form' && activeTab === 'login';
    const showLoginForm = activeTab === 'login' && authStep === 'form' && otpType !== 'reset';
    const showSignupForm = activeTab === 'signup' && authStep === 'form';
    const showOTPForm = authStep === 'otp';
    const showNewPasswordForm = authStep === 'newPassword';

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4 relative overflow-hidden">
            {/* Ambient background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/8 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                        <LogoIcon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-2xl font-bold text-white">Vibe Coder</span>
                </Link>

                {/* Card */}
                <div className="bg-[#12121a] border border-white/10 rounded-2xl p-8">
                    {/* Header */}
                    <div className="mb-6">
                        {/* Back Button for multi-step flows */}
                        {(showOTPForm || showNewPasswordForm || showForgotForm) && (
                            <button
                                onClick={handleBack}
                                className="flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors mb-4"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                                Back
                            </button>
                        )}

                        {/* Tabs (only on form step, not forgot flow) */}
                        {(showLoginForm || showSignupForm) && (
                            <div className="flex mb-6 bg-white/5 rounded-lg p-1">
                                <button
                                    onClick={() => { setActiveTab('login'); setError(''); setOtpType('signup'); setShowGoogleNameInput(false); }}
                                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'login'
                                        ? 'bg-purple-600 text-white'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Sign In
                                </button>
                                <button
                                    onClick={() => { setActiveTab('signup'); setError(''); setOtpType('signup'); setShowGoogleNameInput(false); }}
                                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'signup'
                                        ? 'bg-purple-600 text-white'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Sign Up
                                </button>
                            </div>
                        )}

                        <h2 className="text-xl font-semibold text-white text-center mb-1">
                            {showOTPForm
                                ? 'Enter verification code'
                                : showNewPasswordForm
                                    ? 'Set new password'
                                    : showForgotForm
                                        ? 'Reset your password'
                                        : activeTab === 'login'
                                            ? 'Welcome back!'
                                            : 'Create your account'
                            }
                        </h2>
                        <p className="text-sm text-gray-400 text-center">
                            {showOTPForm
                                ? <>We sent a 6-digit code to <span className="text-white/70 font-medium">{pendingEmail}</span></>
                                : showNewPasswordForm
                                    ? 'Choose a new password for your account'
                                    : showForgotForm
                                        ? 'Enter your email to receive a verification code'
                                        : activeTab === 'login'
                                            ? 'Sign in to access Vibe Coder'
                                            : 'Sign up to start building with AI'
                            }
                        </p>
                    </div>

                    {/* Error/Success Messages */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
                            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {success}
                        </div>
                    )}

                    {/* ═════════════════════════════════════════ */}
                    {/* OTP Verification Screen                   */}
                    {/* ═════════════════════════════════════════ */}
                    {showOTPForm && (
                        <div className="space-y-6">
                            {/* Lock icon */}
                            <div className="flex justify-center mb-2">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                    </svg>
                                </div>
                            </div>

                            <OTPInput
                                onComplete={verifyOTP}
                                disabled={isLoading}
                                error={otpError}
                            />

                            {isLoading && (
                                <div className="flex items-center justify-center gap-2 text-white/50 text-sm">
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-purple-500 rounded-full animate-spin" />
                                    Verifying...
                                </div>
                            )}

                            {/* Resend */}
                            <div className="text-center text-sm">
                                {resendCooldown > 0 ? (
                                    <p className="text-white/40">
                                        Resend code in <span className="text-white/60 font-medium">{resendCooldown}s</span>
                                    </p>
                                ) : (
                                    <button
                                        onClick={handleResendOTP}
                                        disabled={isLoading}
                                        className="text-purple-400 hover:text-purple-300 transition-colors font-medium disabled:opacity-50"
                                    >
                                        Resend verification code
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═════════════════════════════════════════ */}
                    {/* New Password Form                         */}
                    {/* ═════════════════════════════════════════ */}
                    {showNewPasswordForm && (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">New password</label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        required
                                        minLength={6}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showNewPassword ? (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Confirm new password</label>
                                <input
                                    type="password"
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    required
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                            >
                                {isLoading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    'Update password'
                                )}
                            </button>
                        </form>
                    )}

                    {/* ═════════════════════════════════════════ */}
                    {/* Forgot Password Email Form                */}
                    {/* ═════════════════════════════════════════ */}
                    {showForgotForm && (
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Email address</label>
                                <input
                                    type="email"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    required
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    'Send verification code'
                                )}
                            </button>
                        </form>
                    )}

                    {/* ═════════════════════════════════════════ */}
                    {/* Login Form                                */}
                    {/* ═════════════════════════════════════════ */}
                    {showLoginForm && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Email</label>
                                <input
                                    type="email"
                                    value={loginEmail}
                                    onChange={(e) => setLoginEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-gray-400 text-sm">Password</label>
                                    <button
                                        type="button"
                                        onClick={startForgotPassword}
                                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                                    >
                                        Forgot?
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Signing in...
                                    </span>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>
                    )}

                    {/* ═════════════════════════════════════════ */}
                    {/* Signup Form                               */}
                    {/* ═════════════════════════════════════════ */}
                    {showSignupForm && (
                        <form onSubmit={handleSignup} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Name</label>
                                <input
                                    type="text"
                                    value={signupName}
                                    onChange={(e) => setSignupName(e.target.value)}
                                    placeholder="Enter your name"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Email</label>
                                <input
                                    type="email"
                                    value={signupEmail}
                                    onChange={(e) => setSignupEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={signupPassword}
                                        onChange={(e) => setSignupPassword(e.target.value)}
                                        placeholder="Create password (min 6 chars)"
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        )}
                                    </button>
                                </div>
                                {/* Password strength */}
                                {signupPassword.length > 0 && (
                                    <div className="flex gap-1.5 mt-2 px-1">
                                        {[0, 1, 2].map((level) => (
                                            <div
                                                key={level}
                                                className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                                                    passwordStrength > level
                                                        ? passwordStrength === 1
                                                            ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                                                            : passwordStrength === 2
                                                                ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]'
                                                                : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                                                        : 'bg-white/10'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Confirm password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm password"
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showConfirmPassword ? (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Sending code...
                                    </span>
                                ) : (
                                    'Create Account'
                                )}
                            </button>
                        </form>
                    )}

                    {/* ═════════════════════════════════════════ */}
                    {/* Google Sign-In & Toggle                   */}
                    {/* ═════════════════════════════════════════ */}
                    {(showLoginForm || showSignupForm) && (
                        <>
                            {/* Divider */}
                            <div className="flex items-center gap-4 my-6">
                                <div className="flex-1 h-px bg-white/10" />
                                <span className="text-gray-500 text-sm">or</span>
                                <div className="flex-1 h-px bg-white/10" />
                            </div>

                            {/* Google */}
                            {showGoogleNameInput ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-2">Enter your name first</label>
                                        <input
                                            type="text"
                                            value={googleName}
                                            onChange={(e) => setGoogleName(e.target.value)}
                                            placeholder="Your name"
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowGoogleNameInput(false)}
                                            className="flex-1 py-3 bg-white/5 text-gray-400 rounded-xl font-medium hover:bg-white/10 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleGoogleSignIn}
                                            disabled={isLoading || !googleName.trim()}
                                            className="flex-1 py-3 bg-white text-gray-900 rounded-xl font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            <GoogleIcon />
                                            Continue
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {activeTab === 'signup' ? (
                                        <button
                                            onClick={handleGoogleSignIn}
                                            disabled={isLoading}
                                            className="w-full py-3 bg-white text-gray-900 rounded-xl font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            <GoogleIcon />
                                            Sign up with Google
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleDirectGoogleSignIn}
                                            disabled={isLoading}
                                            className="w-full py-3 bg-white text-gray-900 rounded-xl font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            <GoogleIcon />
                                            Sign in with Google
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-gray-500 text-sm mt-6">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
        </div>
    );
}

// Google icon component
function GoogleIcon() {
    return (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
    );
}

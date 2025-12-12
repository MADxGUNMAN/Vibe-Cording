'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const { user, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [showGoogleNameInput, setShowGoogleNameInput] = useState(false);
    const [googleName, setGoogleName] = useState('');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Redirect if already logged in
    if (user) {
        router.push('/');
        return null;
    }

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await signInWithEmail(email, password);
            } else {
                if (!name.trim()) {
                    setError('Please enter your name');
                    setLoading(false);
                    return;
                }
                await signUpWithEmail(email, password, name);
            }
            router.push('/');
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/user-not-found') {
                setError('No account found with this email');
            } else if (err.code === 'auth/wrong-password') {
                setError('Incorrect password');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('Email already in use');
            } else if (err.code === 'auth/weak-password') {
                setError('Password should be at least 6 characters');
            } else if (err.code === 'auth/invalid-email') {
                setError('Invalid email address');
            } else {
                setError(err.message || 'An error occurred');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        if (showGoogleNameInput) {
            if (!googleName.trim()) {
                setError('Please enter your name first');
                return;
            }
            setLoading(true);
            try {
                await signInWithGoogle(googleName);
                router.push('/');
            } catch (err: any) {
                setError(err.message || 'Failed to sign in with Google');
            } finally {
                setLoading(false);
            }
        } else {
            setShowGoogleNameInput(true);
        }
    };

    const handleDirectGoogleSignIn = async () => {
        setLoading(true);
        try {
            await signInWithGoogle();
            router.push('/');
        } catch (err: any) {
            setError(err.message || 'Failed to sign in with Google');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-lg">&lt;/&gt;</span>
                    </div>
                    <span className="text-2xl font-bold text-white">Vibe Corder</span>
                </Link>

                {/* Card */}
                <div className="bg-[#12121a] border border-white/10 rounded-2xl p-8">
                    {/* Tabs */}
                    <div className="flex mb-6 bg-white/5 rounded-lg p-1">
                        <button
                            onClick={() => { setIsLogin(true); setError(''); setShowGoogleNameInput(false); }}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${isLogin
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => { setIsLogin(false); setError(''); setShowGoogleNameInput(false); }}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${!isLogin
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    <h2 className="text-xl font-semibold text-white text-center mb-6">
                        {isLogin ? 'Welcome back!' : 'Create your account'}
                    </h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Email/Password Form */}
                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                        {!isLogin && (
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your name"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                                    required={!isLogin}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={isLogin ? "Enter your password" : "Create a password (min 6 chars)"}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                                required
                                minLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {isLogin ? 'Signing in...' : 'Creating account...'}
                                </span>
                            ) : (
                                isLogin ? 'Sign In' : 'Create Account'
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-gray-500 text-sm">or</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Google Sign In */}
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
                                    disabled={loading || !googleName.trim()}
                                    className="flex-1 py-3 bg-white text-gray-900 rounded-xl font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Continue
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {!isLogin && (
                                <button
                                    onClick={handleGoogleSignIn}
                                    disabled={loading}
                                    className="w-full py-3 bg-white text-gray-900 rounded-xl font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Sign up with Google
                                </button>
                            )}
                            {isLogin && (
                                <button
                                    onClick={handleDirectGoogleSignIn}
                                    disabled={loading}
                                    className="w-full py-3 bg-white text-gray-900 rounded-xl font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Sign in with Google
                                </button>
                            )}
                        </div>
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

'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { useActiveGenerations } from './ActiveGenerationsProvider';
import { useState } from 'react';

export default function Header() {
    const { user, userData, loading, signOut } = useAuth();
    const { activeGenerations } = useActiveGenerations();
    const [showDropdown, setShowDropdown] = useState(false);

    const ongoingCount = activeGenerations.filter(g => g.status !== 'complete' && g.status !== 'error').length;

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold text-white">Vibe Corder</span>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        <Link href="/" className="text-gray-300 hover:text-white transition-colors text-sm">
                            Home
                        </Link>
                        <Link href="/projects" className="text-gray-300 hover:text-white transition-colors text-sm">
                            My Projects
                        </Link>
                        <Link href="/community" className="text-gray-300 hover:text-white transition-colors text-sm">
                            Community
                        </Link>
                        <Link href="/pricing" className="text-gray-300 hover:text-white transition-colors text-sm">
                            Pricing
                        </Link>
                        <a
                            href="https://ansarisouaib.in"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-300 hover:text-white transition-colors text-sm flex items-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Developer
                        </a>
                        {/* Active Generations Button */}
                        <Link
                            href="/active"
                            className="relative text-gray-300 hover:text-white transition-colors text-sm flex items-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Active
                            {ongoingCount > 0 && (
                                <span className="absolute -top-2 -right-3 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                                    {ongoingCount}
                                </span>
                            )}
                        </Link>
                        <Link
                            href="/generate"
                            className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-purple-500/25"
                        >
                            + Create
                        </Link>
                    </nav>

                    {/* Right side */}
                    <div className="flex items-center gap-4">
                        {loading ? (
                            <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
                        ) : user ? (
                            <>
                                {/* Credits badge */}
                                <div className="px-3 py-1 bg-purple-600/20 border border-purple-500/30 rounded-full">
                                    <span className="text-purple-400 text-sm font-medium">
                                        Credits: {userData?.credits || 0}
                                    </span>
                                </div>

                                {/* User dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowDropdown(!showDropdown)}
                                        className="flex items-center gap-2 focus:outline-none"
                                    >
                                        {user.photoURL ? (
                                            <img
                                                src={user.photoURL}
                                                alt={user.displayName || 'User'}
                                                className="w-8 h-8 rounded-full border border-white/10"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-medium">
                                                {user.displayName?.[0] || user.email?.[0] || 'U'}
                                            </div>
                                        )}
                                    </button>

                                    {showDropdown && (
                                        <div className="absolute right-0 mt-2 w-48 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl py-1">
                                            <div className="px-4 py-2 border-b border-white/10">
                                                <p className="text-sm text-white font-medium truncate">{user.displayName}</p>
                                                <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    signOut();
                                                    setShowDropdown(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                                            >
                                                Sign out
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <Link
                                href="/login"
                                className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                            >
                                Sign in
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

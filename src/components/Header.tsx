'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { useActiveGenerations } from './ActiveGenerationsProvider';
import { useState } from 'react';

export default function Header() {
    const { user, userData, loading, signOut } = useAuth();
    const { activeGenerations } = useActiveGenerations();
    const [showDropdown, setShowDropdown] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

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

                    {/* Desktop Navigation */}
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
                    <div className="flex items-center gap-3">
                        {loading ? (
                            <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
                        ) : user ? (
                            <>
                                {/* Credits badge - Compact on mobile */}
                                <div className="px-2 sm:px-3 py-1 bg-purple-600/20 border border-purple-500/30 rounded-full flex items-center gap-1">
                                    <svg className="w-3 h-3 sm:hidden text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                    <span className="text-purple-400 text-xs sm:text-sm font-medium">
                                        <span className="hidden sm:inline">Credits: </span>{userData?.credits || 0}
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
                                        <div className="absolute right-0 mt-2 w-48 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl py-1 z-50">
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

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                            className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            {showMobileMenu ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation Menu */}
            {showMobileMenu && (
                <div className="md:hidden bg-[#0a0a0f]/95 backdrop-blur-md border-t border-white/5">
                    <nav className="px-4 py-4 space-y-2">
                        <Link
                            href="/"
                            onClick={() => setShowMobileMenu(false)}
                            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Home
                        </Link>
                        <Link
                            href="/projects"
                            onClick={() => setShowMobileMenu(false)}
                            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            My Projects
                        </Link>
                        <Link
                            href="/community"
                            onClick={() => setShowMobileMenu(false)}
                            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Community
                        </Link>
                        <Link
                            href="/pricing"
                            onClick={() => setShowMobileMenu(false)}
                            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Pricing
                        </Link>
                        <Link
                            href="/active"
                            onClick={() => setShowMobileMenu(false)}
                            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Active
                            {ongoingCount > 0 && (
                                <span className="ml-auto w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                                    {ongoingCount}
                                </span>
                            )}
                        </Link>
                        <a
                            href="https://ansarisouaib.in"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setShowMobileMenu(false)}
                            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Developer
                        </a>

                        {/* Create Button */}
                        <div className="pt-2 border-t border-white/10">
                            <Link
                                href="/generate"
                                onClick={() => setShowMobileMenu(false)}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-purple-500/25"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Create New Website
                            </Link>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}

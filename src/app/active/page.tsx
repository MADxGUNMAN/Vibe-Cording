'use client';

import Link from 'next/link';
import { useActiveGenerations } from '@/components/ActiveGenerationsProvider';

export default function ActivePage() {
    const { activeGenerations, removeGeneration } = useActiveGenerations();

    const ongoingGenerations = activeGenerations.filter(
        g => g.status !== 'complete' && g.status !== 'error'
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'enhancing': return 'text-blue-400 bg-blue-500/20';
            case 'generating': return 'text-purple-400 bg-purple-500/20';
            case 'saving': return 'text-green-400 bg-green-500/20';
            default: return 'text-gray-400 bg-gray-500/20';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'enhancing': return 'Enhancing Prompt...';
            case 'generating': return 'Generating Code...';
            case 'saving': return 'Saving Project...';
            default: return status;
        }
    };

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Active Generations
                        </h1>
                        <p className="text-gray-400 mt-2">
                            Track your ongoing website builds
                        </p>
                    </div>
                    <Link
                        href="/generate"
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-500 hover:to-blue-500 transition-all"
                    >
                        + New Build
                    </Link>
                </div>

                {ongoingGenerations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">
                            No Active Generations
                        </h2>
                        <p className="text-gray-500 max-w-md mb-6">
                            You don't have any websites being built right now. Start a new build to see it here!
                        </p>
                        <Link
                            href="/generate"
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-blue-500 transition-all"
                        >
                            Create New Website
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {ongoingGenerations.map((gen) => (
                            <Link
                                key={gen.id}
                                href={`/generate?resume=${gen.id}`}
                                className="block bg-[#12121a] border border-white/10 rounded-xl p-6 hover:border-purple-500/50 transition-all group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(gen.status)}`}>
                                                <span className="inline-block w-2 h-2 bg-current rounded-full mr-2 animate-pulse"></span>
                                                {getStatusText(gen.status)}
                                            </span>
                                            <span className="text-gray-500 text-xs">
                                                Started {formatTime(gen.startedAt)}
                                            </span>
                                        </div>
                                        <p className="text-white line-clamp-2">{gen.prompt}</p>
                                    </div>
                                    <svg className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        {gen.model.split('/').pop()?.split(':')[0] || gen.model}
                                    </span>
                                </div>

                                {/* Progress bar */}
                                <div className="mt-4 h-1 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${gen.status === 'enhancing' ? 'w-1/4 bg-blue-500' :
                                                gen.status === 'generating' ? 'w-2/3 bg-purple-500' :
                                                    gen.status === 'saving' ? 'w-11/12 bg-green-500' :
                                                        'w-0'
                                            }`}
                                    />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Completed/Error generations section */}
                {activeGenerations.filter(g => g.status === 'complete' || g.status === 'error').length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-lg font-semibold text-gray-400 mb-4">Recently Completed</h2>
                        <div className="space-y-3">
                            {activeGenerations
                                .filter(g => g.status === 'complete' || g.status === 'error')
                                .map((gen) => (
                                    <div
                                        key={gen.id}
                                        className="bg-[#12121a] border border-white/10 rounded-xl p-4 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            {gen.status === 'complete' ? (
                                                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-white text-sm line-clamp-1">{gen.prompt}</p>
                                                <p className="text-gray-500 text-xs">{formatTime(gen.startedAt)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {gen.status === 'complete' && gen.projectId && (
                                                <Link
                                                    href={`/project/${gen.projectId}`}
                                                    className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-lg text-sm hover:bg-purple-600/30 transition-colors"
                                                >
                                                    View Project
                                                </Link>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    removeGeneration(gen.id);
                                                }}
                                                className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

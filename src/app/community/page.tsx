'use client';

import { useEffect, useState } from 'react';
import { getPublishedProjects, Project, getUser } from '@/lib/firestore';
import { Timestamp } from 'firebase/firestore';

interface ProjectWithUser extends Project {
    userName?: string;
    userImage?: string;
}

export default function CommunityPage() {
    const [projects, setProjects] = useState<ProjectWithUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProjects() {
            const publishedProjects = await getPublishedProjects();

            // Fetch user info for each project
            const projectsWithUsers = await Promise.all(
                publishedProjects.map(async (project) => {
                    const user = await getUser(project.userId);
                    return {
                        ...project,
                        userName: user?.name || 'Anonymous',
                        userImage: user?.imageUrl,
                    };
                })
            );

            setProjects(projectsWithUsers);
            setLoading(false);
        }

        loadProjects();
    }, []);

    const formatDate = (timestamp: Timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });
    };

    const getModelDisplayName = (modelId?: string) => {
        if (!modelId) return null;
        const modelNames: Record<string, string> = {
            'gemini-2.5-flash': 'Gemini 2.5 Flash',
            'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite',
            'gemini-2.0-flash': 'Gemini 2.0 Flash',
            'gemini-2.0-flash-lite': 'Gemini 2.0 Flash Lite',
            'z-ai/glm-4.5-air:free': 'GLM 4.5 Air',
            'openai/gpt-oss-120b': 'GPT OSS 120B',
            'openai/gpt-oss-20b': 'GPT OSS 20B',
            'llama-3.3-70b-versatile': 'Llama 3.3 70B',
            'llama-3.1-8b-instant': 'Llama 3.1 8B',
        };
        return modelNames[modelId] || modelId.split('/').pop()?.split(':')[0] || modelId;
    };

    if (loading) {
        return (
            <div className="min-h-screen gradient-bg flex items-center justify-center">
                <div className="w-12 h-12 spinner" />
            </div>
        );
    }

    return (
        <div className="min-h-screen gradient-bg">
            <div className="max-w-7xl mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold text-white mb-8">Published Projects</h1>

                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <p className="text-xl text-gray-400">No published projects yet!</p>
                        <p className="text-gray-500 mt-2">Be the first to publish your creation.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                onClick={() => window.open(`/preview/${project.id}`, '_blank')}
                                className="bg-[#1a1a2e] border border-white/10 rounded-xl overflow-hidden hover:border-purple-500/50 hover:scale-[1.02] transition-all cursor-pointer group"
                            >
                                {/* Preview */}
                                <div className="h-40 bg-[#0d0d1a] relative overflow-hidden">
                                    {project.current_code ? (
                                        <iframe
                                            srcDoc={project.current_code}
                                            className="w-full h-full pointer-events-none transform scale-50 origin-top-left"
                                            style={{ width: '200%', height: '200%' }}
                                            sandbox="allow-scripts"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <div className="w-8 h-8 spinner" />
                                        </div>
                                    )}
                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/10 transition-colors flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                            Open Preview
                                        </div>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="text-white font-medium text-sm truncate flex-1">
                                            {project.name}
                                        </h3>
                                        <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 text-xs rounded">
                                            Website
                                        </span>
                                    </div>
                                    <p className="text-gray-500 text-xs line-clamp-2 mb-3">
                                        {project.initial_prompt}
                                    </p>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-gray-500 text-xs">
                                            {project.createdAt && formatDate(project.createdAt)}
                                        </span>
                                        {project.model && (
                                            <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-xs rounded flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                {getModelDisplayName(project.model)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-full">
                                            {project.userImage ? (
                                                <img src={project.userImage} className="w-4 h-4 rounded-full" alt="" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full bg-purple-600" />
                                            )}
                                            <span className="text-gray-400 text-xs">{project.userName}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

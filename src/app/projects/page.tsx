'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getUserProjects, Project, deleteProject } from '@/lib/firestore';
import { Timestamp } from 'firebase/firestore';

export default function ProjectsPage() {
    const { user, userData, loading: authLoading, signInWithGoogle } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function loadProjects() {
            if (user) {
                const userProjects = await getUserProjects(user.uid);
                setProjects(userProjects);
            }
            setLoading(false);
        }

        if (!authLoading) {
            loadProjects();
        }
    }, [user, authLoading]);

    const handleDelete = async (projectId: string) => {
        if (confirm('Are you sure you want to delete this project?')) {
            await deleteProject(projectId);
            setProjects(projects.filter(p => p.id !== projectId));
        }
    };

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
            'z-ai/glm-4.5-air:free': 'GLM 4.5 Air',
            'openai/gpt-oss-120b': 'GPT OSS 120B',
            'openai/gpt-oss-20b': 'GPT OSS 20B',
            'llama-3.3-70b-versatile': 'Llama 3.3 70B',
            'llama-3.1-8b-instant': 'Llama 3.1 8B',
        };
        return modelNames[modelId] || modelId.split('/').pop()?.split(':')[0] || modelId;
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen gradient-bg flex items-center justify-center">
                <div className="w-12 h-12 spinner" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen gradient-bg flex flex-col items-center justify-center">
                <h1 className="text-2xl text-white mb-4">Sign in to view your projects</h1>
                <button
                    onClick={signInWithGoogle}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                >
                    Sign in with Google
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen gradient-bg">
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-white">My Projects</h1>
                    <Link
                        href="/"
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        Create New
                    </Link>
                </div>

                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <p className="text-xl text-gray-400 mb-6">You have no projects yet!</p>
                        <Link
                            href="/"
                            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                        >
                            Create New
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                className="bg-[#1a1a2e] border border-white/10 rounded-xl overflow-hidden hover:border-purple-500/30 transition-all group"
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
                                    {/* Overlay on hover */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => router.push(`/editor/${project.id}`)}
                                            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(project.id)}
                                            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="text-white font-medium text-sm truncate flex-1">
                                            {project.name}
                                        </h3>
                                        {project.isPublished && (
                                            <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 text-xs rounded">
                                                Website
                                            </span>
                                        )}
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
                                            {user.photoURL ? (
                                                <img src={user.photoURL} className="w-4 h-4 rounded-full" alt="" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full bg-purple-600" />
                                            )}
                                            <span className="text-gray-400 text-xs">{userData?.name || 'You'}</span>
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

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getProject } from '@/lib/firestore';

export default function PreviewPage() {
    const params = useParams();
    const projectId = params.id as string;
    const [html, setHtml] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function loadProject() {
            try {
                const project = await getProject(projectId);
                if (project) {
                    setHtml(project.current_code);
                } else {
                    setError('Project not found');
                }
            } catch (err) {
                console.error('Error loading project:', err);
                setError('Failed to load project');
            } finally {
                setLoading(false);
            }
        }

        if (projectId) {
            loadProject();
        }
    }, [projectId]);

    if (loading) {
        return (
            <div className="fixed inset-0 z-[100] bg-[#0a0a0f] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading preview...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 z-[100] bg-[#0a0a0f] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 text-lg mb-4">{error}</p>
                    <a href="/" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                        Go Home
                    </a>
                </div>
            </div>
        );
    }

    // Render the HTML directly using an iframe that covers the entire viewport
    // Fixed position with high z-index to cover the header
    return (
        <iframe
            srcDoc={html || ''}
            className="fixed inset-0 w-full h-full border-none z-[100]"
            title="Website Preview"
        />
    );
}

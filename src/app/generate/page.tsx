'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

type GenerationStep = 'idle' | 'analyzing' | 'enhancing' | 'generating' | 'saving' | 'complete' | 'error';

// Available models
const AVAILABLE_MODELS = [
    { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air', description: 'OpenRouter free model', provider: 'openrouter', tier: 'Most Powerful', color: 'red' },
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', description: 'Large open source GPT', provider: 'openrouter', tier: 'Powerful', color: 'orange' },
    { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', description: 'Smaller open source GPT', provider: 'openrouter', tier: 'High', color: 'yellow' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Groq model', provider: 'groq', tier: 'Fast', color: 'green' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Groq instant model', provider: 'groq', tier: 'Fast', color: 'green' },
];

export default function GeneratePage() {
    const router = useRouter();
    const { user, userData, loading: authLoading, refreshUserData } = useAuth();
    const [step, setStep] = useState<GenerationStep>('idle');
    const [prompt, setPrompt] = useState('');
    const [inputPrompt, setInputPrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState('z-ai/glm-4.5-air:free');
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const [error, setError] = useState('');
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant' | 'system'; content: string }[]>([]);
    const [streamingCode, setStreamingCode] = useState('');
    const [showCodePanel, setShowCodePanel] = useState(false);
    const [isGeneratingCode, setIsGeneratingCode] = useState(false);
    const hasStarted = useRef(false);
    const codeContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll code container when new code arrives
    useEffect(() => {
        if (codeContainerRef.current && isGeneratingCode) {
            requestAnimationFrame(() => {
                if (codeContainerRef.current) {
                    codeContainerRef.current.scrollTop = codeContainerRef.current.scrollHeight;
                }
            });
        }
    }, [streamingCode, isGeneratingCode]);

    // Auto-scroll messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        // Check if we have pending data from homepage
        const pendingPrompt = sessionStorage.getItem('pendingPrompt');
        const pendingUserId = sessionStorage.getItem('pendingUserId');
        const pendingModel = sessionStorage.getItem('pendingModel');

        if (pendingPrompt && pendingUserId && !hasStarted.current) {
            hasStarted.current = true;
            setPrompt(pendingPrompt);
            setMessages([{ role: 'user', content: pendingPrompt }]);

            // Use pending model if available
            const modelToUse = pendingModel || selectedModel;
            if (pendingModel) {
                setSelectedModel(pendingModel);
            }

            // Clear session storage
            sessionStorage.removeItem('pendingPrompt');
            sessionStorage.removeItem('pendingUserId');
            sessionStorage.removeItem('pendingModel');

            // Start generation
            generateProjectWithStream(pendingPrompt, pendingUserId, modelToUse);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputPrompt.trim() || !user) return;

        hasStarted.current = true;
        setPrompt(inputPrompt);
        setMessages([{ role: 'user', content: inputPrompt }]);
        setInputPrompt('');
        generateProjectWithStream(inputPrompt, user.uid, selectedModel);
    };

    const generateProjectWithStream = async (promptText: string, userId: string, model: string) => {
        try {
            setStep('analyzing');
            setStreamingCode('');
            setIsGeneratingCode(false);
            setError('');

            const response = await fetch('/api/projects/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptText, userId, model }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create project');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('No response stream');
            }

            let projectId = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const messages_arr = buffer.split('\n\n');
                buffer = messages_arr.pop() || '';

                for (const message of messages_arr) {
                    const lines = message.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const jsonStr = line.slice(6);
                                if (jsonStr.trim()) {
                                    const data = JSON.parse(jsonStr);

                                    switch (data.type) {
                                        case 'status':
                                            if (data.status === 'enhancing') {
                                                setStep('enhancing');
                                            } else if (data.status === 'generating') {
                                                setStep('generating');
                                                setIsGeneratingCode(true);
                                            } else if (data.status === 'saving') {
                                                setStep('saving');
                                                setIsGeneratingCode(false);
                                            }
                                            break;

                                        case 'message':
                                            // Add AI message to chat
                                            setMessages(prev => [...prev, {
                                                role: 'assistant',
                                                content: data.content
                                            }]);
                                            break;

                                        case 'enhanced':
                                            // Show enhanced prompt summary
                                            setMessages(prev => [...prev, {
                                                role: 'assistant',
                                                content: `📝 Enhanced: "${data.enhancedPrompt.substring(0, 150)}..."`
                                            }]);
                                            break;

                                        case 'code':
                                            setStreamingCode(prev => prev + data.content);
                                            break;

                                        case 'complete':
                                            projectId = data.projectId;
                                            await refreshUserData();
                                            setStep('complete');
                                            setTimeout(() => {
                                                router.push(`/editor/${projectId}`);
                                            }, 2000);
                                            break;

                                        case 'error':
                                            setError(data.error);
                                            setStep('error');
                                            setIsGeneratingCode(false);
                                            break;
                                    }
                                }
                            } catch (parseError) {
                                console.log('Parse error:', parseError);
                            }
                        }
                    }
                }
            }

        } catch (err: any) {
            console.error('Generation error:', err);
            setStep('error');
            setError(err.message || 'Failed to generate website');
            setIsGeneratingCode(false);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ Error: ${err.message || 'Failed to generate website'}`
            }]);
        }
    };

    const getSelectedModelName = () => {
        const model = AVAILABLE_MODELS.find(m => m.id === selectedModel);
        return model?.name || 'Select Model';
    };

    // Show prompt input form if not generating
    if (step === 'idle' && !hasStarted.current) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
                <div className="flex-1 flex flex-col items-center justify-center px-4 pt-20">
                    <div className="text-center mb-8">
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                            Create Your Website
                        </h1>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                            Choose an AI model and describe your website
                        </p>
                    </div>

                    {/* Model Selector */}
                    <div className="w-full max-w-2xl mb-6">
                        <label className="block text-gray-400 text-sm mb-2">Select AI Model</label>
                        <div className="relative">
                            <button
                                onClick={() => setShowModelDropdown(!showModelDropdown)}
                                className="w-full px-4 py-3 bg-[#12121a] border border-white/10 rounded-xl text-white flex items-center justify-between hover:border-purple-500/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${AVAILABLE_MODELS.find(m => m.id === selectedModel)?.color === 'red' ? 'bg-gradient-to-br from-red-500 to-red-700' :
                                        AVAILABLE_MODELS.find(m => m.id === selectedModel)?.color === 'orange' ? 'bg-gradient-to-br from-orange-500 to-orange-700' :
                                            AVAILABLE_MODELS.find(m => m.id === selectedModel)?.color === 'yellow' ? 'bg-gradient-to-br from-yellow-500 to-yellow-700' :
                                                'bg-gradient-to-br from-green-500 to-green-700'
                                        }`}>
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div className="text-left">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{getSelectedModelName()}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${AVAILABLE_MODELS.find(m => m.id === selectedModel)?.color === 'red' ? 'bg-red-500/20 text-red-400' :
                                                AVAILABLE_MODELS.find(m => m.id === selectedModel)?.color === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                                                    AVAILABLE_MODELS.find(m => m.id === selectedModel)?.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-green-500/20 text-green-400'
                                                }`}>
                                                {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.tier}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.description}
                                        </div>
                                    </div>
                                </div>
                                <svg className={`w-5 h-5 text-gray-400 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {showModelDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#12121a] border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl">
                                    {AVAILABLE_MODELS.map((model) => (
                                        <button
                                            key={model.id}
                                            onClick={() => {
                                                setSelectedModel(model.id);
                                                setShowModelDropdown(false);
                                            }}
                                            className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center justify-between ${selectedModel === model.id ? 'bg-purple-500/10 border-l-2 border-purple-500' : ''
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-3 h-3 rounded-full ${model.color === 'red' ? 'bg-red-500' :
                                                    model.color === 'orange' ? 'bg-orange-500' :
                                                        model.color === 'yellow' ? 'bg-yellow-500' :
                                                            'bg-green-500'
                                                    }`}></div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white font-medium">{model.name}</span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${model.color === 'red' ? 'bg-red-500/20 text-red-400' :
                                                            model.color === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                                                                model.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                    'bg-green-500/20 text-green-400'
                                                            }`}>
                                                            {model.tier}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-gray-500">{model.description}</div>
                                                </div>
                                            </div>
                                            {selectedModel === model.id && (
                                                <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Prompt input */}
                    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
                        <div className="relative">
                            <textarea
                                value={inputPrompt}
                                onChange={(e) => setInputPrompt(e.target.value)}
                                placeholder="Describe your website... e.g., 'A modern portfolio website for a photographer with a dark theme'"
                                className="w-full px-6 py-4 bg-[#12121a] border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none text-lg"
                                rows={4}
                                disabled={authLoading}
                            />
                            <div className="absolute bottom-4 right-4 flex items-center gap-2">
                                {!authLoading && user && userData && (
                                    <span className="text-sm text-gray-500">
                                        {userData.credits || 0} credits
                                    </span>
                                )}
                            </div>
                        </div>

                        {!authLoading && !user ? (
                            <button
                                type="button"
                                onClick={() => router.push('/login')}
                                className="mt-4 w-full py-4 bg-white text-gray-900 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Sign in to Create
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={!inputPrompt.trim() || authLoading}
                                className="mt-4 w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold text-lg hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Create with {getSelectedModelName()}
                            </button>
                        )}
                    </form>

                    {/* Tips */}
                    <div className="mt-12 max-w-2xl w-full">
                        <p className="text-gray-500 text-sm mb-4 text-center">Tips for better results:</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-[#12121a] border border-white/10 rounded-xl">
                                <p className="text-gray-300 text-sm">Be specific about the type of website (portfolio, landing page, blog)</p>
                            </div>
                            <div className="p-4 bg-[#12121a] border border-white/10 rounded-xl">
                                <p className="text-gray-300 text-sm">Mention preferred colors, themes, or styles (dark, minimal, vibrant)</p>
                            </div>
                            <div className="p-4 bg-[#12121a] border border-white/10 rounded-xl">
                                <p className="text-gray-300 text-sm">Include key sections you want (hero, features, pricing, contact)</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#0a0a0f] flex flex-col overflow-hidden">
            {/* Top bar */}
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-white font-medium text-sm">
                                {prompt ? prompt.substring(0, 30) + (prompt.length > 30 ? '...' : '') : 'New Project'}
                            </h1>
                            <p className="text-gray-500 text-xs">{getSelectedModelName()}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Code button - always visible during generation */}
                    <button
                        onClick={() => setShowCodePanel(!showCodePanel)}
                        className={`px-3 py-1.5 rounded text-sm flex items-center gap-1 transition-colors ${showCodePanel
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/5 text-gray-300 hover:text-white'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        Code
                        {isGeneratingCode && (
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse ml-1"></span>
                        )}
                    </button>

                    <div className="text-gray-500 text-sm">
                        {streamingCode.split('\n').length} lines
                    </div>
                </div>
            </div>

            {/* Main content - Split view */}
            <div className="flex-1 flex overflow-hidden">
                {/* Chat Panel */}
                <div className="w-[350px] border-r border-white/10 flex flex-col bg-[#12121a]">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((message, index) => (
                            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {message.role === 'user' ? (
                                    <div className="flex items-start gap-2">
                                        <div className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm max-w-[250px]">
                                            {message.content}
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm flex-shrink-0">
                                            {userData?.name?.[0] || 'U'}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className={`px-4 py-2 rounded-xl text-sm max-w-[250px] ${message.content.startsWith('❌')
                                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                            : 'bg-white/5 text-gray-300'
                                            }`}>
                                            {message.content}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Loading dots */}
                        {step !== 'complete' && step !== 'error' && step !== 'idle' && (
                            <div className="flex items-start gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="px-4 py-2 bg-white/5 rounded-xl">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error retry button */}
                        {step === 'error' && (
                            <div className="flex justify-center">
                                <button
                                    onClick={() => {
                                        setStep('idle');
                                        setError('');
                                        hasStarted.current = false;
                                        setMessages([]);
                                        setPrompt('');
                                        setStreamingCode('');
                                    }}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                                >
                                    Try Again
                                </button>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Preview/Code Panel */}
                <div className="flex-1 bg-[#1a1a2e] flex flex-col overflow-hidden">
                    {showCodePanel ? (
                        /* Code Panel with real-time streaming */
                        <div className="flex-1 flex flex-col bg-[#0d1117] overflow-hidden">
                            {/* Code Header */}
                            <div className="flex items-center justify-between p-3 border-b border-white/10 flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg">
                                        <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="text-gray-300 text-sm font-mono">index.html</span>
                                    </div>
                                    {isGeneratingCode && (
                                        <div className="flex items-center gap-2 text-green-400 text-sm">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                            Writing code...
                                        </div>
                                    )}
                                </div>
                                <div className="text-gray-500 text-sm">
                                    {streamingCode.split('\n').length} lines
                                </div>
                            </div>

                            {/* Code Content with real-time streaming */}
                            <div ref={codeContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 font-mono text-sm" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                                <pre className="text-gray-300">
                                    <code>
                                        {streamingCode.split('\n').map((line, i) => (
                                            <div key={i} className="flex hover:bg-white/5 leading-6">
                                                <span className="select-none w-12 text-right pr-4 text-gray-600 border-r border-white/10 mr-4 flex-shrink-0">
                                                    {i + 1}
                                                </span>
                                                <span className="flex-1 whitespace-pre-wrap break-all">{line}</span>
                                            </div>
                                        ))}
                                        {isGeneratingCode && (
                                            <span className="inline-block w-2 h-5 bg-green-400 animate-pulse ml-1"></span>
                                        )}
                                    </code>
                                </pre>
                            </div>
                        </div>
                    ) : (
                        /* Loading State */
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                {/* Animated loading icon */}
                                <div className="w-20 h-20 mx-auto mb-8 relative">
                                    <div className="absolute inset-0 border-2 border-purple-500/30 rounded-lg"></div>
                                    <div className="absolute inset-2 border-2 border-dashed border-purple-400/50 rounded animate-spin" style={{ animationDuration: '3s' }}></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </div>
                                </div>

                                <h2 className="text-xl text-white font-medium mb-2">
                                    {step === 'enhancing' && 'Enhancing your prompt...'}
                                    {step === 'generating' && 'Generating your website...'}
                                    {step === 'saving' && 'Saving your project...'}
                                    {step === 'complete' && 'Website created!'}
                                    {step === 'error' && 'Something went wrong'}
                                    {step === 'analyzing' && 'Analyzing your request...'}
                                </h2>
                                <p className="text-gray-500 text-sm">
                                    {isGeneratingCode ? 'Click "Code" to see real-time generation...' : 'This may take a moment...'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

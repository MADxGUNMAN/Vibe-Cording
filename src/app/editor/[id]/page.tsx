'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getProject, getConversation, getVersions, updateProject, publishProject, addVersion, Project, Message, Version } from '@/lib/firestore';
import { Timestamp } from 'firebase/firestore';

type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface SelectedElement {
    tagName: string;
    textContent: string;
    hasText: boolean;
    className: string;
    href: string;
    src: string;
    padding: string;
    margin: string;
    fontSize: string;
    color: string;
    backgroundColor: string;
    xpath: string;
}

// Available models
const AVAILABLE_MODELS = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Latest Gemini model', provider: 'gemini', tier: 'Most Powerful', color: 'blue' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Fast Gemini model', provider: 'gemini', tier: 'Powerful', color: 'blue' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Stable Gemini model', provider: 'gemini', tier: 'High', color: 'blue' },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', description: 'Lightweight Gemini', provider: 'gemini', tier: 'Fast', color: 'blue' },
    { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air', description: 'OpenRouter free model', provider: 'openrouter', tier: 'Most Powerful', color: 'red' },
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', description: 'Large open source GPT', provider: 'openrouter', tier: 'Powerful', color: 'orange' },
    { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', description: 'Smaller open source GPT', provider: 'openrouter', tier: 'High', color: 'yellow' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Groq model', provider: 'groq', tier: 'Fast', color: 'green' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Groq instant model', provider: 'groq', tier: 'Fast', color: 'green' },
];

export default function EditorPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [project, setProject] = useState<Project | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [versions, setVersions] = useState<Version[]>([]);
    const [currentCode, setCurrentCode] = useState('');
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [saving, setSaving] = useState(false);
    const [device, setDevice] = useState<DeviceType>('desktop');
    const [isChatVisible, setIsChatVisible] = useState(true);
    const [showVersions, setShowVersions] = useState(false);
    const [showEditPanel, setShowEditPanel] = useState(false);
    const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
    const [isCodeFullscreen, setIsCodeFullscreen] = useState(false);
    const [displayedCode, setDisplayedCode] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
    const [showModelDropdown, setShowModelDropdown] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const pendingCodeRef = useRef<string>('');  // Store pending changes without re-render
    const codeContainerRef = useRef<HTMLDivElement>(null); // For auto-scroll
    const projectId = params.id as string;

    // Script to inject into iframe for element selection
    const getInjectionScript = () => `
        <!-- VIBE_EDIT_SCRIPT_START -->
        <script>
        (function() {
            let selectedEl = null;
            let hoverDiv = null;
            let selectDiv = null;
            
            function createHoverHighlight() {
                hoverDiv = document.createElement('div');
                hoverDiv.setAttribute('data-vibe-highlight', 'hover');
                hoverDiv.style.cssText = 'position:fixed;pointer-events:none;border:2px dashed #8b5cf6;z-index:999998;display:none;box-sizing:border-box;';
                document.body.appendChild(hoverDiv);
            }
            
            function createSelectHighlight() {
                selectDiv = document.createElement('div');
                selectDiv.setAttribute('data-vibe-highlight', 'select');
                selectDiv.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #8b5cf6;z-index:999999;display:none;box-sizing:border-box;';
                document.body.appendChild(selectDiv);
            }
            
            function updateHover(el) {
                if (!hoverDiv) createHoverHighlight();
                if (!el || el === selectedEl) {
                    hoverDiv.style.display = 'none';
                    return;
                }
                const rect = el.getBoundingClientRect();
                hoverDiv.style.display = 'block';
                hoverDiv.style.left = rect.left + 'px';
                hoverDiv.style.top = rect.top + 'px';
                hoverDiv.style.width = rect.width + 'px';
                hoverDiv.style.height = rect.height + 'px';
            }
            
            function updateSelect(el) {
                if (!selectDiv) createSelectHighlight();
                if (!el) {
                    selectDiv.style.display = 'none';
                    return;
                }
                const rect = el.getBoundingClientRect();
                selectDiv.style.display = 'block';
                selectDiv.style.left = rect.left + 'px';
                selectDiv.style.top = rect.top + 'px';
                selectDiv.style.width = rect.width + 'px';
                selectDiv.style.height = rect.height + 'px';
            }
            
            function getXPath(el) {
                if (!el) return '';
                if (el.id) return '//*[@id="' + el.id + '"]';
                if (el === document.body) return '/html/body';
                let ix = 0;
                const siblings = el.parentNode ? el.parentNode.childNodes : [];
                for (let i = 0; i < siblings.length; i++) {
                    const sibling = siblings[i];
                    if (sibling === el) return getXPath(el.parentNode) + '/' + el.tagName.toLowerCase() + '[' + (ix + 1) + ']';
                    if (sibling.nodeType === 1 && sibling.tagName === el.tagName) ix++;
                }
                return '';
            }
            
            function getComputedStyles(el) {
                const cs = window.getComputedStyle(el);
                return {
                    padding: cs.padding,
                    margin: cs.margin,
                    fontSize: cs.fontSize,
                    color: cs.color,
                    backgroundColor: cs.backgroundColor
                };
            }
            
            document.addEventListener('mouseover', function(e) {
                const el = e.target;
                if (el && el !== document.body && el !== document.documentElement && el !== hoverDiv && el !== selectDiv) {
                    updateHover(el);
                }
            });
            
            document.addEventListener('mouseout', function(e) {
                updateHover(null);
            });
            
            document.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const el = e.target;
                if (!el || el === document.body || el === document.documentElement || el === hoverDiv || el === selectDiv) return;
                
                selectedEl = el;
                updateHover(null);
                updateSelect(el);
                
                const styles = getComputedStyles(el);
                const textTags = ['a', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'label', 'li', 'td', 'th', 'div'];
                const tagLower = el.tagName.toLowerCase();
                const isTextElement = el.childNodes.length <= 1 && (el.childNodes.length === 0 || el.childNodes[0].nodeType === 3);
                const canHaveText = textTags.includes(tagLower) || isTextElement;
                const data = {
                    type: 'elementSelected',
                    tagName: tagLower,
                    textContent: el.textContent || '',
                    hasText: canHaveText,
                    className: el.className || '',
                    href: el.href || '',
                    src: el.src || '',
                    padding: styles.padding,
                    margin: styles.margin,
                    fontSize: styles.fontSize,
                    color: styles.color,
                    backgroundColor: styles.backgroundColor,
                    xpath: getXPath(el)
                };
                
                window.parent.postMessage(data, '*');
            }, true);
            
            window.addEventListener('message', function(e) {
                if (e.data.type === 'updateElement' && selectedEl) {
                    const updates = e.data.updates;
                    // Allow text update on elements with 0 or 1 child (empty or simple text)
                    if (updates.textContent !== undefined && selectedEl.childNodes.length <= 1) {
                        selectedEl.textContent = updates.textContent;
                    }
                    if (updates.className !== undefined) {
                        selectedEl.className = updates.className;
                    }
                    if (updates.href !== undefined && selectedEl.tagName === 'A') {
                        selectedEl.href = updates.href;
                    }
                    if (updates.src !== undefined && selectedEl.tagName === 'IMG') {
                        selectedEl.src = updates.src;
                    }
                    if (updates.padding !== undefined) {
                        selectedEl.style.padding = updates.padding;
                    }
                    if (updates.margin !== undefined) {
                        selectedEl.style.margin = updates.margin;
                    }
                    if (updates.fontSize !== undefined) {
                        selectedEl.style.fontSize = updates.fontSize;
                    }
                    if (updates.color !== undefined) {
                        selectedEl.style.color = updates.color;
                    }
                    if (updates.backgroundColor !== undefined) {
                        selectedEl.style.backgroundColor = updates.backgroundColor;
                    }
                    
                    // Update selection highlight position
                    updateSelect(selectedEl);
                    
                    // Send back updated HTML
                    window.parent.postMessage({
                        type: 'htmlUpdated',
                        html: document.documentElement.outerHTML
                    }, '*');
                }
                
                if (e.data.type === 'clearSelection') {
                    selectedEl = null;
                    updateSelect(null);
                    updateHover(null);
                }
            });
        })();
        </script>
        <!-- VIBE_EDIT_SCRIPT_END -->
    `;

    const injectEditScript = useCallback(() => {
        if (!currentCode || !editMode) return currentCode;
        // Inject script right before closing </body> tag
        const script = getInjectionScript();
        if (currentCode.includes('</body>')) {
            return currentCode.replace('</body>', script + '</body>');
        }
        return currentCode + script;
    }, [currentCode, editMode]);

    // Inject base tag and link interceptor to prevent navigation to parent
    const injectLinkHandler = useCallback((code: string) => {
        if (!code) return code;

        const linkInterceptorScript = `
            <!-- VIBE_LINK_HANDLER_START -->
            <base target="_self">
            <script>
            (function() {
                // Intercept all link clicks to prevent parent navigation
                document.addEventListener('click', function(e) {
                    const link = e.target.closest('a');
                    if (link) {
                        const href = link.getAttribute('href');
                        if (href) {
                            if (href.startsWith('#')) {
                                // Handle anchor links within the page
                                e.preventDefault();
                                const target = document.querySelector(href);
                                if (target) {
                                    target.scrollIntoView({ behavior: 'smooth' });
                                }
                            } else if (href !== 'javascript:void(0)' && !href.startsWith('javascript:')) {
                                // Prevent external links from navigating parent
                                e.preventDefault();
                                console.log('Navigation prevented:', href);
                            }
                        }
                    }
                }, true);
            })();
            </script>
            <!-- VIBE_LINK_HANDLER_END -->
        `;

        // Inject after <head> or at the start
        if (code.includes('<head>')) {
            return code.replace('<head>', '<head>' + linkInterceptorScript);
        } else if (code.includes('<html>')) {
            return code.replace('<html>', '<html><head>' + linkInterceptorScript + '</head>');
        }
        return linkInterceptorScript + code;
    }, []);

    useEffect(() => {
        function handleMessage(e: MessageEvent) {
            if (e.data.type === 'elementSelected') {
                setSelectedElement({
                    tagName: e.data.tagName,
                    textContent: e.data.textContent || '',
                    hasText: e.data.hasText || false,
                    className: e.data.className,
                    href: e.data.href,
                    src: e.data.src,
                    padding: e.data.padding,
                    margin: e.data.margin,
                    fontSize: e.data.fontSize,
                    color: e.data.color,
                    backgroundColor: e.data.backgroundColor,
                    xpath: e.data.xpath
                });
                setShowEditPanel(true);
            } else if (e.data.type === 'htmlUpdated') {
                // Store updated HTML in ref without triggering re-render
                // This prevents iframe from re-rendering while editing
                let cleanHtml = e.data.html;

                // Remove injected script using markers
                cleanHtml = cleanHtml.replace(/<!-- VIBE_EDIT_SCRIPT_START -->[\s\S]*?<!-- VIBE_EDIT_SCRIPT_END -->/g, '');

                // Remove highlight divs with data attribute markers
                cleanHtml = cleanHtml.replace(/<div data-vibe-highlight[^>]*><\/div>/g, '');

                pendingCodeRef.current = cleanHtml;
            }
        }

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    useEffect(() => {
        async function loadProject() {
            if (!projectId) return;

            const proj = await getProject(projectId);
            if (proj) {
                setProject(proj);
                setCurrentCode(proj.current_code);

                const conv = await getConversation(projectId);
                setMessages(conv);

                const vers = await getVersions(projectId);
                setVersions(vers);
            }
            setLoading(false);
        }

        if (!authLoading) {
            loadProject();
        }
    }, [projectId, authLoading]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-scroll code container when new code arrives
    useEffect(() => {
        if (codeContainerRef.current && isTyping) {
            requestAnimationFrame(() => {
                if (codeContainerRef.current) {
                    codeContainerRef.current.scrollTop = codeContainerRef.current.scrollHeight;
                }
            });
        }
    }, [displayedCode, isTyping]);

    // Convert RGB/RGBA color to hex for color picker
    const rgbToHex = (color: string): string => {
        if (!color) return '#000000';
        if (color.startsWith('#')) return color;

        // Handle rgb() and rgba()
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
            const r = parseInt(match[1]);
            const g = parseInt(match[2]);
            const b = parseInt(match[3]);
            return '#' + [r, g, b].map(x => {
                const hex = x.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('');
        }

        // Handle color names - return as-is, browser will handle in text input
        return '#000000';
    };

    const handleElementUpdate = (field: keyof SelectedElement, value: string) => {
        if (!selectedElement) return;

        setSelectedElement(prev => prev ? { ...prev, [field]: value } : null);

        // Send update to iframe
        iframeRef.current?.contentWindow?.postMessage({
            type: 'updateElement',
            updates: { [field]: value }
        }, '*');
    };

    const handleSaveChanges = async () => {
        if (!projectId) return;

        // Use pending code if available, otherwise use current code
        const codeToSave = pendingCodeRef.current || currentCode;
        if (!codeToSave) return;

        setSaving(true);
        try {
            await updateProject(projectId, { current_code: codeToSave });
            await addVersion(projectId, codeToSave, 'Visual edit');

            // Update currentCode with the saved changes
            setCurrentCode(codeToSave);
            pendingCodeRef.current = '';

            // Refresh versions
            const vers = await getVersions(projectId);
            setVersions(vers);

            setShowEditPanel(false);
            setSelectedElement(null);
            setEditMode(false);
        } catch (error) {
            console.error('Error saving:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || sending || !user) return;

        const userMessage = input.trim();
        setInput('');
        setSending(true);
        setActiveTab('code'); // Auto-open code panel to show live updates
        setIsTyping(true);

        const tempMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: userMessage,
            timestamp: Timestamp.now(),
        };
        setMessages([...messages, tempMessage]);

        try {
            const response = await fetch('/api/projects/revise-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    message: userMessage,
                    userId: user.uid,
                    model: selectedModel,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to revise project');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('No response stream');
            }

            let buffer = '';
            let streamingCode = '';

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
                                            // Could show status indicator
                                            break;

                                        case 'message':
                                            // Add status message to chat
                                            setMessages(prev => [...prev, {
                                                id: Date.now().toString(),
                                                role: 'assistant' as const,
                                                content: data.content,
                                                timestamp: Timestamp.now(),
                                            }]);
                                            break;

                                        case 'code':
                                            // Live code streaming - update displayed code
                                            streamingCode += data.content;
                                            setDisplayedCode(streamingCode);
                                            break;

                                        case 'complete':
                                            // Update with final clean code
                                            setCurrentCode(data.code);
                                            setDisplayedCode(data.code);
                                            setProject(prev => prev ? { ...prev, current_code: data.code } : prev);

                                            // Add completion message
                                            setMessages(prev => [...prev, {
                                                id: (Date.now() + 1).toString(),
                                                role: 'assistant' as const,
                                                content: 'I\'ve updated your website based on your request.',
                                                timestamp: Timestamp.now(),
                                            }]);

                                            // Refresh versions
                                            const vers = await getVersions(projectId);
                                            setVersions(vers);
                                            break;

                                        case 'error':
                                            setMessages(prev => [...prev, {
                                                id: Date.now().toString(),
                                                role: 'assistant' as const,
                                                content: `❌ Error: ${data.error}`,
                                                timestamp: Timestamp.now(),
                                            }]);
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
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant' as const,
                content: '❌ Failed to update website. Please try again.',
                timestamp: Timestamp.now(),
            }]);
        } finally {
            setSending(false);
            setIsTyping(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleDownload = () => {
        const blob = new Blob([currentCode], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project?.name || 'website'}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handlePreview = () => {
        window.open(`/preview/${projectId}`, '_blank');
    };

    const handlePublish = async () => {
        if (!projectId) return;
        await publishProject(projectId);
        setProject(prev => prev ? { ...prev, isPublished: true } : prev);
        alert('Project published successfully!');
    };

    const handleVersionSelect = (version: Version) => {
        setCurrentCode(version.code);
        setShowVersions(false);
    };

    const getDeviceWidth = () => {
        switch (device) {
            case 'mobile': return '375px';
            case 'tablet': return '768px';
            default: return '100%';
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="w-12 h-12 spinner" />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center">
                <h1 className="text-2xl text-white mb-4">Project not found</h1>
                <button
                    onClick={() => router.push('/projects')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg"
                >
                    Go to Projects
                </button>
            </div>
        );
    }

    return (
        <div className="bg-[#0a0a0f] flex flex-col" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
            {/* Top bar */}
            <div
                className="h-14 border-b border-white/10 flex items-center justify-between px-2 md:px-4 gap-2 overflow-x-auto scrollbar-thin"
                style={{
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#6b21a8 transparent'
                }}
            >
                {/* Left side - Back button + Title + Conditional buttons when chat is hidden */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => router.push('/projects')}
                        className="p-2 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-white font-medium truncate max-w-[100px] md:max-w-[200px]">{project.name}</h1>

                    {/* Show Edit and Device buttons on left when chat is hidden (for mobile/tablet) */}
                    {!isChatVisible && (
                        <>
                            <div className="w-px h-6 bg-white/10 hidden md:block" />

                            {/* Edit Mode Toggle */}
                            <button
                                onClick={() => {
                                    setEditMode(!editMode);
                                    if (editMode) {
                                        setShowEditPanel(false);
                                        setSelectedElement(null);
                                    }
                                }}
                                className={`px-2 md:px-3 py-1.5 rounded text-sm flex items-center gap-1 transition-colors flex-shrink-0 ${editMode ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-300 hover:text-white'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                <span className="hidden md:inline">{editMode ? 'Editing' : 'Edit'}</span>
                            </button>

                            {/* Device toggles */}
                            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg flex-shrink-0">
                                <button
                                    onClick={() => setDevice('mobile')}
                                    className={`p-1.5 md:p-2 rounded ${device === 'mobile' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                    title="Mobile"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setDevice('tablet')}
                                    className={`p-1.5 md:p-2 rounded ${device === 'tablet' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                    title="Tablet"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setDevice('desktop')}
                                    className={`p-1.5 md:p-2 rounded ${device === 'desktop' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                    title="Desktop"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>

                            <div className="w-px h-6 bg-white/10 hidden md:block" />

                            {/* History button */}
                            <button
                                onClick={() => setShowVersions(!showVersions)}
                                className="px-2 md:px-3 py-1.5 text-gray-300 hover:text-white text-sm flex items-center gap-1 flex-shrink-0"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="hidden md:inline">History</span>
                            </button>
                        </>
                    )}
                </div>

                {/* Right side - Main action buttons (always visible, but conditionally show Edit/Device when chat is visible) */}
                <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                    {/* Only show these when chat IS visible (desktop view by default) */}
                    {isChatVisible && (
                        <>
                            {/* Edit Mode Toggle */}
                            <button
                                onClick={() => {
                                    setEditMode(!editMode);
                                    if (editMode) {
                                        setShowEditPanel(false);
                                        setSelectedElement(null);
                                    }
                                }}
                                className={`px-2 md:px-3 py-1.5 rounded text-sm flex items-center gap-1 transition-colors flex-shrink-0 ${editMode ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-300 hover:text-white'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                <span className="hidden md:inline">{editMode ? 'Editing' : 'Edit'}</span>
                            </button>

                            {/* Device toggles */}
                            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg flex-shrink-0">
                                <button
                                    onClick={() => setDevice('mobile')}
                                    className={`p-1.5 md:p-2 rounded ${device === 'mobile' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                    title="Mobile"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setDevice('tablet')}
                                    className={`p-1.5 md:p-2 rounded ${device === 'tablet' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                    title="Tablet"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setDevice('desktop')}
                                    className={`p-1.5 md:p-2 rounded ${device === 'desktop' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                    title="Desktop"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>

                            <div className="w-px h-6 bg-white/10 hidden md:block" />

                            {/* History button */}
                            <button
                                onClick={() => setShowVersions(!showVersions)}
                                className="px-2 md:px-3 py-1.5 text-gray-300 hover:text-white text-sm flex items-center gap-1 flex-shrink-0"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="hidden md:inline">History</span>
                            </button>
                        </>
                    )}

                    {/* Preview/Code Toggle Tabs - Always visible */}
                    <div className="flex items-center bg-white/5 rounded-lg p-1 flex-shrink-0">
                        <button
                            onClick={() => setActiveTab('preview')}
                            className={`px-2 md:px-4 py-1.5 rounded text-sm font-medium flex items-center gap-1 md:gap-2 transition-all ${activeTab === 'preview'
                                ? 'bg-white/10 text-white'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {activeTab === 'preview' && (
                                <span className="w-2 h-2 bg-white rounded-full"></span>
                            )}
                            <span className="hidden md:inline">Preview</span>
                            <svg className="w-4 h-4 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('code');
                                setDisplayedCode(currentCode);
                            }}
                            className={`px-2 md:px-4 py-1.5 rounded text-sm font-medium flex items-center gap-1 md:gap-2 transition-all ${activeTab === 'code'
                                ? 'bg-white/10 text-white'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {activeTab === 'code' && (
                                <span className="w-2 h-2 bg-white rounded-full"></span>
                            )}
                            <span className="hidden md:inline">Code</span>
                            <svg className="w-4 h-4 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                            {isTyping && (
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            )}
                        </button>
                    </div>

                    {/* New Tab button */}
                    <button
                        onClick={handlePreview}
                        className="px-2 md:px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm flex items-center gap-1 md:gap-2 hover:bg-blue-500/30 transition-colors border border-blue-500/30 flex-shrink-0"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span className="hidden md:inline">New Tab</span>
                    </button>

                    <button
                        onClick={handleDownload}
                        className="px-2 md:px-3 py-1.5 bg-white/5 text-gray-300 hover:text-white rounded text-sm flex items-center gap-1 flex-shrink-0"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span className="hidden md:inline">Download</span>
                    </button>
                    <button
                        onClick={handlePublish}
                        disabled={project.isPublished}
                        className="px-2 md:px-3 py-1.5 bg-purple-600 text-white rounded text-sm flex items-center gap-1 hover:bg-purple-700 disabled:opacity-50 flex-shrink-0"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        <span className="hidden md:inline">{project.isPublished ? 'Published' : 'Publish'}</span>
                    </button>
                </div>
            </div>

            {/* Main content - Split view */}
            <div className="flex-1 flex overflow-hidden relative min-h-0">
                {/* Chat Toggle Button - Always visible, positioned at chat edge */}
                <button
                    onClick={() => setIsChatVisible(!isChatVisible)}
                    className={`absolute top-1/2 -translate-y-1/2 z-30 w-6 h-14 bg-purple-600/80 hover:bg-purple-600 border border-purple-500/50 rounded-r-lg flex items-center justify-center text-white transition-all shadow-lg ${isChatVisible ? 'left-[280px] md:left-[350px]' : 'left-0'}`}
                    style={{ transition: 'left 0.3s ease-in-out' }}
                    title={isChatVisible ? 'Hide Chat' : 'Show Chat'}
                >
                    <svg className={`w-4 h-4 transition-transform duration-300 ${isChatVisible ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                {/* Chat Panel - Collapsible */}
                <div className={`${isChatVisible ? 'w-[280px] md:w-[350px]' : 'w-0'} border-r border-white/10 flex flex-col bg-[#12121a] transition-all duration-300 overflow-hidden flex-shrink-0 min-h-0`}>
                    {/* Chat header */}
                    <div className="p-3 md:p-4 border-b border-white/10 flex-shrink-0">
                        <h2 className="text-white font-medium text-sm md:text-base">Chat</h2>
                    </div>

                    {/* Messages - Scrollable area */}
                    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 min-h-0">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] px-4 py-2 rounded-lg text-sm ${message.role === 'user'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white/5 text-gray-300'
                                        }`}
                                >
                                    {message.content}
                                </div>
                            </div>
                        ))}
                        {sending && (
                            <div className="flex justify-start">
                                <div className="bg-white/5 px-4 py-2 rounded-lg">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input - Single compact row */}
                    <div className="p-2 border-t border-white/10 flex-shrink-0 overflow-hidden">
                        <div className="flex gap-1 items-center">
                            {/* Compact Model Selector */}
                            <div className="relative flex-shrink-0">
                                <button
                                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                                    className="p-2 bg-white/5 border border-white/10 rounded-lg flex items-center gap-1 hover:border-purple-500/50 transition-colors"
                                    title={AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || 'Select Model'}
                                >
                                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <svg className={`w-3 h-3 text-gray-400 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {showModelDropdown && (
                                    <div className="absolute bottom-full left-0 mb-1 py-1 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto w-48">
                                        {AVAILABLE_MODELS.map((model) => (
                                            <button
                                                key={model.id}
                                                onClick={() => {
                                                    setSelectedModel(model.id);
                                                    setShowModelDropdown(false);
                                                }}
                                                className={`w-full px-3 py-2 text-left hover:bg-white/5 transition-colors ${selectedModel === model.id ? 'bg-purple-600/20' : ''}`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-300 text-sm">{model.name}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded ${model.color === 'red' ? 'bg-red-500/20 text-red-400' :
                                                        model.color === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                                                            model.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                'bg-green-500/20 text-green-400'
                                                        }`}>
                                                        {model.tier}
                                                    </span>
                                                </div>
                                                <p className="text-gray-500 text-xs">{model.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Text Input */}
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Describe..."
                                className="flex-1 min-w-0 px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                                disabled={sending}
                            />

                            {/* Send Button */}
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || sending}
                                className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Preview/Code Panel */}
                <div className={`flex-1 bg-[#0d0d1a] flex flex-col overflow-hidden ${isCodeFullscreen && activeTab === 'code' ? 'fixed inset-0 z-50' : ''}`}>
                    {activeTab === 'code' ? (
                        /* Code Panel with live updates */
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
                                    {isTyping && (
                                        <div className="flex items-center gap-2 text-green-400 text-sm">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                            Writing code...
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(currentCode);
                                            alert('Code copied to clipboard!');
                                        }}
                                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded text-sm flex items-center gap-1 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        Copy
                                    </button>
                                    <button
                                        onClick={() => setIsCodeFullscreen(!isCodeFullscreen)}
                                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded text-sm flex items-center gap-1 transition-colors"
                                        title={isCodeFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                                    >
                                        {isCodeFullscreen ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                            </svg>
                                        )}
                                        {isCodeFullscreen ? 'Exit' : 'Fullscreen'}
                                    </button>
                                    <div className="text-gray-500 text-sm">
                                        {displayedCode.split('\n').length} lines
                                    </div>
                                </div>
                            </div>

                            {/* Code Content */}
                            <div ref={codeContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 font-mono text-sm">
                                <pre className="text-gray-300">
                                    <code>
                                        {displayedCode.split('\n').map((line, i) => (
                                            <div key={i} className="flex hover:bg-white/5 leading-6">
                                                <span className="select-none w-12 text-right pr-4 text-gray-600 border-r border-white/10 mr-4 flex-shrink-0">
                                                    {i + 1}
                                                </span>
                                                <span className="flex-1 whitespace-pre-wrap break-all">{line}</span>
                                            </div>
                                        ))}
                                        {isTyping && (
                                            <span className="inline-block w-2 h-5 bg-green-400 animate-pulse ml-1"></span>
                                        )}
                                    </code>
                                </pre>
                            </div>
                        </div>
                    ) : (
                        /* Preview Panel */
                        <div className="flex-1 flex items-center justify-center p-4 relative">
                            {editMode && (
                                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-medium shadow-lg">
                                    Click any element to edit it
                                </div>
                            )}

                            <div
                                className="bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300"
                                style={{
                                    width: getDeviceWidth(),
                                    height: device === 'desktop' ? '100%' : '90%',
                                    transform: device === 'mobile' ? 'scale(0.75)' : device === 'tablet' ? 'scale(0.85)' : 'scale(1)',
                                    transformOrigin: 'top center',
                                }}
                            >
                                <iframe
                                    ref={iframeRef}
                                    srcDoc={injectLinkHandler(editMode ? injectEditScript() : currentCode)}
                                    className="w-full h-full"
                                    style={{
                                        height: device === 'mobile' ? '133%' : device === 'tablet' ? '118%' : '100%',
                                    }}
                                    sandbox="allow-scripts allow-same-origin"
                                />
                            </div>
                        </div>
                    )}

                    {/* Edit Element Panel */}
                    {showEditPanel && selectedElement && (
                        <div className="absolute top-0 right-0 bottom-0 w-80 bg-[#0d0d14] border-l border-white/10 overflow-y-auto z-20">
                            {/* Header */}
                            <div className="sticky top-0 bg-[#0d0d14] p-4 border-b border-white/10 flex items-center justify-between z-10">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                    <h3 className="text-white font-semibold">Edit Element</h3>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowEditPanel(false);
                                        setSelectedElement(null);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="p-4 space-y-5">
                                {/* Element Type Badge */}
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-full text-xs font-medium">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                    </svg>
                                    &lt;{selectedElement.tagName}&gt;
                                </div>

                                {/* Text Content */}
                                {selectedElement.hasText && (
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-gray-300 text-sm font-medium">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                                            </svg>
                                            Text Content
                                        </label>
                                        <textarea
                                            value={selectedElement.textContent}
                                            onChange={(e) => handleElementUpdate('textContent', e.target.value)}
                                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 resize-none transition-all"
                                            rows={3}
                                            placeholder="Enter text content..."
                                        />
                                    </div>
                                )}

                                {/* Class Name */}
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-gray-300 text-sm font-medium">
                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                        Classes
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedElement.className}
                                        onChange={(e) => handleElementUpdate('className', e.target.value)}
                                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                    />
                                </div>

                                {/* Link href */}
                                {selectedElement.tagName === 'a' && (
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-gray-300 text-sm font-medium">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                            </svg>
                                            Link URL
                                        </label>
                                        <input
                                            type="text"
                                            value={selectedElement.href}
                                            onChange={(e) => handleElementUpdate('href', e.target.value)}
                                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                            placeholder="https://..."
                                        />
                                    </div>
                                )}

                                {/* Image src */}
                                {selectedElement.tagName === 'img' && (
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-gray-300 text-sm font-medium">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Image URL
                                        </label>
                                        <input
                                            type="text"
                                            value={selectedElement.src}
                                            onChange={(e) => handleElementUpdate('src', e.target.value)}
                                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                            placeholder="https://..."
                                        />
                                    </div>
                                )}

                                {/* Divider */}
                                <div className="border-t border-white/5 pt-4">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Spacing & Size</p>

                                    {/* Padding & Margin */}
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="space-y-1.5">
                                            <label className="text-gray-400 text-xs">Padding</label>
                                            <input
                                                type="text"
                                                value={selectedElement.padding}
                                                onChange={(e) => handleElementUpdate('padding', e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50 transition-all"
                                                placeholder="0px"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-gray-400 text-xs">Margin</label>
                                            <input
                                                type="text"
                                                value={selectedElement.margin}
                                                onChange={(e) => handleElementUpdate('margin', e.target.value)}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50 transition-all"
                                                placeholder="0px"
                                            />
                                        </div>
                                    </div>

                                    {/* Font Size */}
                                    <div className="space-y-1.5">
                                        <label className="text-gray-400 text-xs">Font Size</label>
                                        <input
                                            type="text"
                                            value={selectedElement.fontSize}
                                            onChange={(e) => handleElementUpdate('fontSize', e.target.value)}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50 transition-all"
                                            placeholder="16px"
                                        />
                                    </div>
                                </div>

                                {/* Colors Section */}
                                <div className="border-t border-white/5 pt-4">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Colors</p>

                                    {/* Background Color */}
                                    <div className="mb-4">
                                        <label className="flex items-center gap-2 text-gray-300 text-sm font-medium mb-2">
                                            <div
                                                className="w-4 h-4 rounded border border-white/20"
                                                style={{ backgroundColor: rgbToHex(selectedElement.backgroundColor) }}
                                            ></div>
                                            Background
                                        </label>
                                        <div className="flex gap-2 items-center">
                                            <div className="relative">
                                                <input
                                                    type="color"
                                                    value={rgbToHex(selectedElement.backgroundColor)}
                                                    onChange={(e) => handleElementUpdate('backgroundColor', e.target.value)}
                                                    className="w-12 h-12 rounded-xl border-2 border-white/10 bg-transparent cursor-pointer appearance-none"
                                                    style={{ padding: 0 }}
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                value={selectedElement.backgroundColor}
                                                onChange={(e) => handleElementUpdate('backgroundColor', e.target.value)}
                                                className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50 transition-all font-mono"
                                                placeholder="#000000"
                                            />
                                        </div>
                                    </div>

                                    {/* Text Color */}
                                    <div>
                                        <label className="flex items-center gap-2 text-gray-300 text-sm font-medium mb-2">
                                            <div
                                                className="w-4 h-4 rounded border border-white/20"
                                                style={{ backgroundColor: rgbToHex(selectedElement.color) }}
                                            ></div>
                                            Text Color
                                        </label>
                                        <div className="flex gap-2 items-center">
                                            <div className="relative">
                                                <input
                                                    type="color"
                                                    value={rgbToHex(selectedElement.color)}
                                                    onChange={(e) => handleElementUpdate('color', e.target.value)}
                                                    className="w-12 h-12 rounded-xl border-2 border-white/10 bg-transparent cursor-pointer appearance-none"
                                                    style={{ padding: 0 }}
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                value={selectedElement.color}
                                                onChange={(e) => handleElementUpdate('color', e.target.value)}
                                                className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50 transition-all font-mono"
                                                placeholder="#000000"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Save Button */}
                                <button
                                    onClick={handleSaveChanges}
                                    disabled={saving}
                                    className="w-full mt-2 px-4 py-3.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-medium hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/20"
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Version history sidebar */}
                    {showVersions && (
                        <div className="absolute top-0 right-0 bottom-0 w-80 bg-[#12121a] border-l border-white/10 overflow-y-auto z-10">
                            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                <h3 className="text-white font-medium">Version History</h3>
                                <button
                                    onClick={() => setShowVersions(false)}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-4 space-y-2">
                                {versions.map((version, index) => (
                                    <button
                                        key={version.id}
                                        onClick={() => handleVersionSelect(version)}
                                        className="w-full p-3 bg-white/5 rounded-lg hover:bg-white/10 text-left transition-colors"
                                    >
                                        <div className="text-white text-sm font-medium">
                                            Version {versions.length - index}
                                        </div>
                                        <div className="text-gray-400 text-xs mt-1 truncate">
                                            {version.description || 'No description'}
                                        </div>
                                        <div className="text-gray-500 text-xs mt-1">
                                            {version.timestamp?.toDate?.()?.toLocaleString() || ''}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div >


        </div >
    );
}

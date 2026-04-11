import { NextRequest } from 'next/server';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getProject, updateProject, addMessage, addVersion, getUser, updateUserCredits } from '@/lib/firestore';
import { AVAILABLE_MODELS } from '@/lib/models';
import { ENHANCE_REVISION_SYSTEM, GENERATE_REVISION_SYSTEM } from '@/prompts';

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || "",
});

// Initialize OpenRouter client
const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || "",
    defaultHeaders: {
        "HTTP-Referer": "https://vibe-corder.app",
        "X-Title": "Vibe Corder",
    },
});

// Initialize Gemini client
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Initialize NVIDIA client (OpenAI-compatible)
const nvidia = new OpenAI({
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKey: process.env.NVIDIA_API_KEY || "",
});

// Helper to get correct provider based on model
function getModelProvider(modelId: string): 'gemini' | 'groq' | 'openrouter' | 'nvidia' {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    return model?.provider as 'gemini' | 'groq' | 'openrouter' | 'nvidia' || 'openrouter';
}

// System prompts are loaded from src/prompts/*.md files
// Edit those files directly to modify AI behavior

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    function sendEvent(data: object) {
        return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
    }

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const body = await request.json();
                const { projectId, message, userId, model } = body;
                const useModel = model || 'z-ai/glm-4.5-air:free';
                const provider = getModelProvider(useModel);

                if (!projectId || !message) {
                    controller.enqueue(sendEvent({ type: 'error', error: 'Project ID and message are required' }));
                    controller.close();
                    return;
                }

                if (!userId) {
                    controller.enqueue(sendEvent({ type: 'error', error: 'User must be logged in' }));
                    controller.close();
                    return;
                }

                // Get current project
                controller.enqueue(sendEvent({ type: 'status', status: 'loading' }));
                const project = await getProject(projectId);
                if (!project) {
                    controller.enqueue(sendEvent({ type: 'error', error: 'Project not found' }));
                    controller.close();
                    return;
                }

                // Check user credits (bypass for admins)
                const user = await getUser(userId);
                if (!user) {
                    controller.enqueue(sendEvent({ type: 'error', error: 'User not found' }));
                    controller.close();
                    return;
                }

                const isAdmin = user.isAdmin === true;
                if (!isAdmin && user.credits <= 0) {
                    controller.enqueue(sendEvent({ type: 'error', error: 'Insufficient credits' }));
                    controller.close();
                    return;
                }

                // Add user message to conversation
                await addMessage(projectId, 'user', message);

                // 1. Enhance the revision prompt
                controller.enqueue(sendEvent({ type: 'status', status: 'enhancing' }));
                controller.enqueue(sendEvent({ type: 'message', content: '🔄 Analyzing your request...' }));

                let enhancedRevision: string;

                if (provider === 'gemini') {
                    const geminiModel = gemini.getGenerativeModel({
                        model: useModel,
                        systemInstruction: ENHANCE_REVISION_SYSTEM(),
                    });
                    const enhanceResult = await geminiModel.generateContent(
                        `User request: ${message}`
                    );
                    enhancedRevision = enhanceResult.response.text() || message;
                } else if (provider === 'nvidia') {
                    const enhanceResponse = await nvidia.chat.completions.create({
                        model: useModel,
                        messages: [
                            { role: "system", content: ENHANCE_REVISION_SYSTEM() },
                            { role: "user", content: message }
                        ],
                        max_tokens: 500,
                    });
                    enhancedRevision = enhanceResponse.choices[0]?.message?.content || message;
                } else if (provider === 'groq') {
                    const enhanceResponse = await groq.chat.completions.create({
                        model: useModel,
                        messages: [
                            { role: "system", content: ENHANCE_REVISION_SYSTEM() },
                            { role: "user", content: message }
                        ],
                        max_tokens: 500,
                    });
                    enhancedRevision = enhanceResponse.choices[0]?.message?.content || message;
                } else {
                    const enhanceResponse = await openrouter.chat.completions.create({
                        model: useModel,
                        messages: [
                            { role: "system", content: ENHANCE_REVISION_SYSTEM() },
                            { role: "user", content: message }
                        ],
                        max_tokens: 500,
                    });
                    enhancedRevision = enhanceResponse.choices[0]?.message?.content || message;
                }

                controller.enqueue(sendEvent({ type: 'enhanced', content: enhancedRevision }));

                // 2. Generate revised code with streaming
                controller.enqueue(sendEvent({ type: 'status', status: 'generating' }));
                controller.enqueue(sendEvent({ type: 'message', content: '✨ Generating updated code...' }));

                let fullCode = '';

                if (provider === 'gemini') {
                    const geminiModel = gemini.getGenerativeModel({
                        model: useModel,
                        systemInstruction: GENERATE_REVISION_SYSTEM(),
                    });
                    const generateStream = await geminiModel.generateContentStream(
                        `Current website code:\n${project.current_code}\n\nRevision request: ${enhancedRevision}`
                    );

                    for await (const chunk of generateStream.stream) {
                        const content = chunk.text();
                        if (content) {
                            fullCode += content;
                            controller.enqueue(sendEvent({ type: 'code', content }));
                        }
                    }
                } else if (provider === 'nvidia') {
                    const generateStream = await nvidia.chat.completions.create({
                        model: useModel,
                        messages: [
                            { role: "system", content: GENERATE_REVISION_SYSTEM() },
                            { role: "user", content: `Current website code:\n${project.current_code}\n\nRevision request: ${enhancedRevision}` }
                        ],
                        max_tokens: 16384,
                        temperature: 1.00,
                        top_p: 1.00,
                        stream: true,
                    });

                    for await (const chunk of generateStream) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            fullCode += content;
                            controller.enqueue(sendEvent({ type: 'code', content }));
                        }
                    }
                } else if (provider === 'groq') {
                    const generateStream = await groq.chat.completions.create({
                        model: useModel,
                        messages: [
                            { role: "system", content: GENERATE_REVISION_SYSTEM() },
                            { role: "user", content: `Current website code:\n${project.current_code}\n\nRevision request: ${enhancedRevision}` }
                        ],
                        max_tokens: 8000,
                        stream: true,
                    });

                    for await (const chunk of generateStream) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            fullCode += content;
                            controller.enqueue(sendEvent({ type: 'code', content }));
                        }
                    }
                } else {
                    const generateStream = await openrouter.chat.completions.create({
                        model: useModel,
                        messages: [
                            { role: "system", content: GENERATE_REVISION_SYSTEM() },
                            { role: "user", content: `Current website code:\n${project.current_code}\n\nRevision request: ${enhancedRevision}` }
                        ],
                        max_tokens: 16000,
                        stream: true,
                    });

                    for await (const chunk of generateStream) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            fullCode += content;
                            controller.enqueue(sendEvent({ type: 'code', content }));
                        }
                    }
                }

                // Clean up the code
                let cleanCode = fullCode
                    .replace(/<think>[\s\S]*?<\/think>/gi, '')
                    .replace(/```html\n?/g, '')
                    .replace(/```\n?/g, '')
                    .trim();

                // 3. Save to database
                controller.enqueue(sendEvent({ type: 'status', status: 'saving' }));
                await updateProject(projectId, { current_code: cleanCode, model: useModel });
                await addMessage(projectId, 'assistant', 'I\'ve updated your website based on your request.');
                await addVersion(projectId, cleanCode, message.substring(0, 100));

                // Deduct credits (skip for admins)
                if (!isAdmin) {
                    await updateUserCredits(userId, -1);
                }

                // 4. Complete
                controller.enqueue(sendEvent({
                    type: 'complete',
                    code: cleanCode,
                    enhancedRevision
                }));
                controller.close();

            } catch (error) {
                console.error('Error creating revision:', error);
                controller.enqueue(sendEvent({ type: 'error', error: 'Failed to revise project' }));
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

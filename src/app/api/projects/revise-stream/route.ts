import { NextRequest } from 'next/server';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getProject, updateProject, addMessage, addVersion, getUser, updateUserCredits } from '@/lib/firestore-admin';
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

                // --- Stream filter: strips thinking blocks, markdown fences, and buffers until HTML starts ---
                let htmlStarted = false;
                let preHtmlBuffer = '';
                let insideThinkBlock = false;
                let thinkBuffer = '';

                function emitCodeContent(rawChunk: string) {
                    let remaining = rawChunk;

                    // Handle <think> blocks — route to chat instead of code
                    while (remaining.length > 0) {
                        if (insideThinkBlock) {
                            const closeIdx = remaining.indexOf('</think>');
                            if (closeIdx !== -1) {
                                thinkBuffer += remaining.substring(0, closeIdx);
                                remaining = remaining.substring(closeIdx + 8);
                                insideThinkBlock = false;
                                // Route thinking to chat
                                if (thinkBuffer.trim()) {
                                    controller.enqueue(sendEvent({ type: 'message', content: `💭 ${thinkBuffer.trim().substring(0, 200)}` }));
                                }
                                thinkBuffer = '';
                            } else {
                                thinkBuffer += remaining;
                                return; // Still inside think block, wait for more
                            }
                        } else {
                            const openIdx = remaining.indexOf('<think>');
                            if (openIdx !== -1) {
                                const before = remaining.substring(0, openIdx);
                                if (before) processCodeChunk(before);
                                remaining = remaining.substring(openIdx + 7);
                                insideThinkBlock = true;
                            } else {
                                // Check for partial <think at end of chunk
                                const partialMatch = remaining.match(/<t(?:h(?:i(?:n(?:k)?)?)?)?$/);
                                if (partialMatch) {
                                    const safe = remaining.substring(0, partialMatch.index);
                                    if (safe) processCodeChunk(safe);
                                    preHtmlBuffer += partialMatch[0]; // Save partial for next chunk
                                    return;
                                }
                                processCodeChunk(remaining);
                                return;
                            }
                        }
                    }
                }

                function processCodeChunk(chunk: string) {
                    if (!htmlStarted) {
                        preHtmlBuffer += chunk;
                        // Check if we've found the start of actual HTML
                        const doctypeIdx = preHtmlBuffer.indexOf('<!DOCTYPE');
                        const htmlIdx = preHtmlBuffer.indexOf('<html');
                        const startIdx = doctypeIdx !== -1 ? doctypeIdx : htmlIdx;

                        if (startIdx !== -1) {
                            htmlStarted = true;
                            // Anything before HTML start is non-code (thinking/intro text)
                            const nonCode = preHtmlBuffer.substring(0, startIdx).trim();
                            if (nonCode) {
                                controller.enqueue(sendEvent({ type: 'message', content: `💭 ${nonCode.substring(0, 200)}` }));
                            }
                            const codeContent = preHtmlBuffer.substring(startIdx);
                            fullCode += codeContent;
                            controller.enqueue(sendEvent({ type: 'code', content: codeContent }));
                            preHtmlBuffer = '';
                        }
                        // If buffer is getting very large without HTML, something is wrong — flush it
                        if (!htmlStarted && preHtmlBuffer.length > 500) {
                            // Assume it's all code anyway
                            htmlStarted = true;
                            fullCode += preHtmlBuffer;
                            controller.enqueue(sendEvent({ type: 'code', content: preHtmlBuffer }));
                            preHtmlBuffer = '';
                        }
                    } else {
                        fullCode += chunk;
                        controller.enqueue(sendEvent({ type: 'code', content: chunk }));
                    }
                }
                // --- End stream filter ---

                const revisionUserPrompt = `===== ORIGINAL CODE (PRESERVE UNCHANGED PARTS EXACTLY) =====
${project.current_code}
===== END OF ORIGINAL CODE =====

===== REVISION REQUEST =====
${enhancedRevision}
===== END OF REVISION REQUEST =====

IMPORTANT INSTRUCTIONS:
1. Output the COMPLETE HTML document with ONLY the requested changes applied.
2. Every line of code that is NOT related to the revision request must remain EXACTLY as it appears in the original code above — same classes, same content, same order, same structure.
3. Do NOT simplify, reformat, reorganize, or "improve" any part of the code that wasn't mentioned in the revision request.
4. Do NOT remove existing animations, gradients, shadows, hover effects, or any visual styling.
5. Do NOT change section ordering or page layout unless specifically requested.
6. Think of this as a surgical edit — change the minimum amount of code to fulfill the request.
7. Start your response with <!DOCTYPE html> immediately.`;

                if (provider === 'gemini') {
                    const geminiModel = gemini.getGenerativeModel({
                        model: useModel,
                        systemInstruction: GENERATE_REVISION_SYSTEM(),
                    });
                    const generateStream = await geminiModel.generateContentStream(revisionUserPrompt);

                    for await (const chunk of generateStream.stream) {
                        const content = chunk.text();
                        if (content) {
                            emitCodeContent(content);
                        }
                    }
                } else if (provider === 'nvidia') {
                    const generateStream = await nvidia.chat.completions.create({
                        model: useModel,
                        messages: [
                            { role: "system", content: GENERATE_REVISION_SYSTEM() },
                            { role: "user", content: revisionUserPrompt }
                        ],
                        max_tokens: 65536,
                        temperature: 0.6,
                        top_p: 0.95,
                        stream: true,
                    });

                    for await (const chunk of generateStream) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            emitCodeContent(content);
                        }
                    }
                } else if (provider === 'groq') {
                    const generateStream = await groq.chat.completions.create({
                        model: useModel,
                        messages: [
                            { role: "system", content: GENERATE_REVISION_SYSTEM() },
                            { role: "user", content: revisionUserPrompt }
                        ],
                        max_tokens: 32768,
                        stream: true,
                    });

                    for await (const chunk of generateStream) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            emitCodeContent(content);
                        }
                    }
                } else {
                    const generateStream = await openrouter.chat.completions.create({
                        model: useModel,
                        messages: [
                            { role: "system", content: GENERATE_REVISION_SYSTEM() },
                            { role: "user", content: revisionUserPrompt }
                        ],
                        max_tokens: 65536,
                        stream: true,
                    });

                    for await (const chunk of generateStream) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            emitCodeContent(content);
                        }
                    }
                }

                // Flush any remaining buffer
                if (preHtmlBuffer.trim()) {
                    fullCode += preHtmlBuffer;
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

            } catch (error: any) {
                console.error('Error creating revision:', error);
                const errorMessage = error?.message || error?.error?.message || 'Failed to revise project';
                controller.enqueue(sendEvent({ type: 'error', error: `Revision failed: ${errorMessage}` }));
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

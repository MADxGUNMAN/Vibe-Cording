import { NextRequest } from 'next/server';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getProject, updateProject, addMessage, addVersion, getUser, updateUserCredits } from '@/lib/firestore';

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

// Available models with provider info
const AVAILABLE_MODELS = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', provider: 'gemini' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini' },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', provider: 'gemini' },
    { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air', provider: 'openrouter' },
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', provider: 'openrouter' },
    { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', provider: 'openrouter' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'groq' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', provider: 'groq' },
];

// Helper to get correct provider based on model
function getModelProvider(modelId: string): 'gemini' | 'groq' | 'openrouter' {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    return model?.provider as 'gemini' | 'groq' | 'openrouter' || 'openrouter';
}

const ENHANCE_REVISION_SYSTEM = `You are an expert web design consultant specializing in website revisions and improvements. Transform the user's revision request into a detailed, actionable specification.

When enhancing a revision request, include:
1. **Specific Elements**: Identify exactly which HTML elements, sections, or components to modify
2. **Design Details**: Specify exact colors (hex codes), spacing (px/rem values), typography changes, and visual effects
3. **Technical Implementation**: Mention specific Tailwind classes, CSS properties, or JavaScript behaviors to add/modify
4. **Visual Outcome**: Describe the expected visual result clearly
5. **Responsive Considerations**: Note any mobile/tablet/desktop specific changes needed
6. **Animation/Interaction**: Specify any hover effects, transitions, or animations to add

Transform the simple request into a comprehensive revision specification (2-3 detailed sentences covering all relevant aspects). Be specific enough that the changes can be implemented precisely and consistently.

Return ONLY the enhanced revision specification, nothing else.`;

const GENERATE_REVISION_SYSTEM = `You are an expert web developer.

CRITICAL REQUIREMENTS:
- Return ONLY the complete updated HTML code with the requested changes.
- Use Tailwind CSS for ALL styling (NO custom CSS).
- Use Tailwind utility classes for all styling changes.
- Include all JavaScript in <script> tags before closing </body>
- Make sure it's a complete, standalone HTML document with Tailwind CSS
- Return the HTML Code Only, nothing else

Apply the requested changes while maintaining the Tailwind CSS styling approach.`;

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
                    const geminiModel = gemini.getGenerativeModel({ model: useModel });
                    const enhanceResult = await geminiModel.generateContent(
                        `${ENHANCE_REVISION_SYSTEM}\n\nUser request: ${message}`
                    );
                    enhancedRevision = enhanceResult.response.text() || message;
                } else if (provider === 'groq') {
                    const enhanceResponse = await groq.chat.completions.create({
                        model: useModel,
                        messages: [
                            { role: "system", content: ENHANCE_REVISION_SYSTEM },
                            { role: "user", content: message }
                        ],
                        max_tokens: 500,
                    });
                    enhancedRevision = enhanceResponse.choices[0]?.message?.content || message;
                } else {
                    const enhanceResponse = await openrouter.chat.completions.create({
                        model: useModel,
                        messages: [
                            { role: "system", content: ENHANCE_REVISION_SYSTEM },
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
                    const geminiModel = gemini.getGenerativeModel({ model: useModel });
                    const generateStream = await geminiModel.generateContentStream(
                        `${GENERATE_REVISION_SYSTEM}\n\nCurrent website code:\n${project.current_code}\n\nRevision request: ${enhancedRevision}`
                    );

                    for await (const chunk of generateStream.stream) {
                        const content = chunk.text();
                        if (content) {
                            fullCode += content;
                            controller.enqueue(sendEvent({ type: 'code', content }));
                        }
                    }
                } else if (provider === 'groq') {
                    const generateStream = await groq.chat.completions.create({
                        model: useModel,
                        messages: [
                            { role: "system", content: GENERATE_REVISION_SYSTEM },
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
                            { role: "system", content: GENERATE_REVISION_SYSTEM },
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

import { NextRequest } from 'next/server';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { createProject, addMessage, addVersion, incrementUserCreation, getUser } from '@/lib/firestore';

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

// Available models with provider info
export const AVAILABLE_MODELS = [
    { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air', description: 'OpenRouter free model', provider: 'openrouter', tier: 'Most Powerful', color: 'red' },
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', description: 'Large open source GPT', provider: 'openrouter', tier: 'Powerful', color: 'orange' },
    { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', description: 'Smaller open source GPT', provider: 'openrouter', tier: 'High', color: 'yellow' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Groq model', provider: 'groq', tier: 'Fast', color: 'green' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Groq instant model', provider: 'groq', tier: 'Fast', color: 'green' },
];

const ENHANCE_PROMPT_SYSTEM = `You are a prompt enhancement specialist. Take the user's website request and expand it into a detailed, comprehensive prompt that will help create the best possible website.

Enhance this prompt by:
1. Adding specific design details (layout, color scheme, typography)
2. Specifying key sections and features
3. Describing the user experience and interactions
4. Including modern web design best practices
5. Mentioning responsive design requirements
6. Adding any missing but important elements

Return ONLY the enhanced prompt, nothing else. Make it detailed but concise (2-3 paragraphs max).`;

const GENERATE_CODE_SYSTEM = `You are an expert web developer. Create a complete, production-ready, single-page website based on the user's request.

CRITICAL REQUIREMENTS:
- You MUST output valid HTML ONLY.
- Use Tailwind CSS for ALL styling
- Include this EXACT script in the <head>: <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
- Use Tailwind utility classes extensively for styling, animations, and responsiveness
- Make it fully functional and interactive with JavaScript in <script> tag before closing </body>
- Use modern, beautiful design with great UX using Tailwind classes
- Make it responsive using Tailwind responsive classes (sm:, md:, lg:, xl:)
- Use Tailwind animations and transitions (animate-*, transition-*)
- Include all necessary meta tags
- Use Google Fonts CDN if needed for custom fonts
- Use placeholder images from https://placehold.co/600x400
- Use Tailwind gradient classes for beautiful backgrounds
- Make sure all buttons, cards, and components use Tailwind styling

CRITICAL RULES:
1. Return ONLY the HTML code, nothing else.
2. Do NOT include markdown, explanations, notes, or code fences.
3. The HTML should be complete and ready to render as-is.`;

// Helper to get correct client based on model
function getModelInfo(modelId: string) {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    return model || { id: modelId, provider: 'openrouter', name: modelId, description: '', tier: '', color: '' };
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { prompt, userId, model = 'z-ai/glm-4.5-air:free' } = body;

    if (!prompt) {
        return new Response(JSON.stringify({ error: 'Prompt is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (!userId) {
        return new Response(JSON.stringify({ error: 'User must be logged in' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Check user credits
    const user = await getUser(userId);
    if (!user) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (user.credits <= 0) {
        return new Response(JSON.stringify({ error: 'Insufficient credits' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Get model info
    const modelInfo = getModelInfo(model);
    const isOpenRouter = modelInfo.provider === 'openrouter';

    // Create a TransformStream for SSE
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Helper function to safely write to stream
    const safeWrite = async (data: string) => {
        try {
            await writer.write(encoder.encode(data));
        } catch (e) {
            // Stream closed, ignore
        }
    };

    // Start the async generation process
    (async () => {
        try {
            // Send status: enhancing
            await safeWrite(`data: ${JSON.stringify({ type: 'status', status: 'enhancing' })}\n\n`);
            await safeWrite(`data: ${JSON.stringify({ type: 'message', content: `Using model: ${modelInfo.name} (${modelInfo.provider})` })}\n\n`);

            // Enhance prompt - use appropriate client
            let enhancedPrompt = prompt;
            if (isOpenRouter) {
                const enhanceResponse = await openrouter.chat.completions.create({
                    model: model,
                    messages: [
                        { role: "system", content: ENHANCE_PROMPT_SYSTEM },
                        { role: "user", content: prompt }
                    ],
                    max_tokens: 1000,
                });
                enhancedPrompt = enhanceResponse.choices[0]?.message?.content || prompt;
            } else {
                const enhanceResponse = await groq.chat.completions.create({
                    model: model,
                    messages: [
                        { role: "system", content: ENHANCE_PROMPT_SYSTEM },
                        { role: "user", content: prompt }
                    ],
                    max_tokens: 1000,
                });
                enhancedPrompt = enhanceResponse.choices[0]?.message?.content || prompt;
            }

            await safeWrite(`data: ${JSON.stringify({ type: 'enhanced', enhancedPrompt })}\n\n`);
            await safeWrite(`data: ${JSON.stringify({ type: 'message', content: `Enhanced your prompt for better results...` })}\n\n`);

            // Send status: generating
            await safeWrite(`data: ${JSON.stringify({ type: 'status', status: 'generating' })}\n\n`);
            await safeWrite(`data: ${JSON.stringify({ type: 'message', content: `Generating website code...` })}\n\n`);

            // Generate website with streaming - use appropriate client
            let fullCode = '';

            if (isOpenRouter) {
                const generateResponse = await openrouter.chat.completions.create({
                    model: model,
                    messages: [
                        { role: "system", content: GENERATE_CODE_SYSTEM },
                        { role: "user", content: enhancedPrompt }
                    ],
                    max_tokens: 16000,
                    stream: true,
                });

                for await (const chunk of generateResponse) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        fullCode += content;
                        await safeWrite(`data: ${JSON.stringify({ type: 'code', content })}\n\n`);
                    }
                }
            } else {
                const generateResponse = await groq.chat.completions.create({
                    model: model,
                    messages: [
                        { role: "system", content: GENERATE_CODE_SYSTEM },
                        { role: "user", content: enhancedPrompt }
                    ],
                    max_tokens: 16000,
                    stream: true,
                });

                for await (const chunk of generateResponse) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        fullCode += content;
                        await safeWrite(`data: ${JSON.stringify({ type: 'code', content })}\n\n`);
                    }
                }
            }

            // Clean up the code
            let cleanCode = fullCode
                .replace(/```html\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();

            // Send status: saving
            await safeWrite(`data: ${JSON.stringify({ type: 'status', status: 'saving' })}\n\n`);
            await safeWrite(`data: ${JSON.stringify({ type: 'message', content: `Saving your project...` })}\n\n`);

            // Create project in Firestore
            const projectId = await createProject(
                userId,
                prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''),
                prompt,
                cleanCode
            );

            // Add messages
            await addMessage(projectId, 'user', prompt);
            await addMessage(projectId, 'assistant', 'Website generated successfully! You can now preview and modify it.');

            // Add version
            await addVersion(projectId, cleanCode, 'Initial generation');

            // Decrement credits
            await incrementUserCreation(userId);

            // Send complete
            await safeWrite(`data: ${JSON.stringify({
                type: 'complete',
                projectId,
                enhancedPrompt,
                code: cleanCode
            })}\n\n`);
            await safeWrite(`data: ${JSON.stringify({ type: 'message', content: `Website created successfully! Redirecting to editor...` })}\n\n`);

        } catch (error: any) {
            console.error('Streaming error:', error);

            let errorMessage = error?.message || 'Failed to generate website';

            // Handle specific error types
            if (error?.status === 429 || error?.message?.includes('rate limit') || error?.message?.includes('Rate limit')) {
                errorMessage = `Rate limit exceeded for ${modelInfo.name}. Please try a different model or wait a moment.`;
            } else if (error?.status === 503 || error?.message?.includes('overloaded')) {
                errorMessage = `${modelInfo.name} is currently overloaded. Please try a different model.`;
            } else if (error?.message?.includes('context length')) {
                errorMessage = `The prompt is too long for ${modelInfo.name}. Please try a shorter prompt.`;
            }

            await safeWrite(`data: ${JSON.stringify({
                type: 'error',
                error: errorMessage
            })}\n\n`);
            await safeWrite(`data: ${JSON.stringify({ type: 'message', content: `❌ Error: ${errorMessage}` })}\n\n`);
        } finally {
            try {
                await writer.close();
            } catch (e) {
                // Already closed
            }
        }
    })();

    return new Response(stream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

// GET endpoint to return available models
export async function GET() {
    return new Response(JSON.stringify({ models: AVAILABLE_MODELS }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

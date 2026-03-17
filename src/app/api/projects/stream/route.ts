import { NextRequest } from 'next/server';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createProject, addMessage, addVersion, incrementUserCreation, getUser } from '@/lib/firestore';
import { AVAILABLE_MODELS } from '@/lib/models';

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

// Initialize NVIDIA client (OpenAI-compatible)
const nvidia = new OpenAI({
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKey: process.env.NVIDIA_API_KEY || "",
});

// Initialize Gemini clients with fallback keys
const GEMINI_API_KEYS = [
    process.env.GEMINI_API_KEY || "",
    process.env.GEMINI_BACKUP_API_KEY || "",
    process.env.GEMINI_BACKUP_API_KEY_2 || "",
].filter(key => key.length > 0);

const geminiClients = GEMINI_API_KEYS.map(key => new GoogleGenerativeAI(key));

// Helper function to check if error is retryable (quota/rate limit)
function isRetryableGeminiError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorStatus = error?.status || error?.code;

    return (
        errorStatus === 429 ||
        errorStatus === 503 ||
        errorMessage.includes('quota') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('resource exhausted') ||
        errorMessage.includes('overloaded') ||
        errorMessage.includes('too many requests')
    );
}

// Helper function to generate content with Gemini fallback
async function generateWithGeminiFallback(
    model: string,
    prompt: string,
    onKeySwitch?: (keyIndex: number) => void
): Promise<string> {
    let lastError: any;

    for (let i = 0; i < geminiClients.length; i++) {
        try {
            const geminiModel = geminiClients[i].getGenerativeModel({ model });
            const result = await geminiModel.generateContent(prompt);
            return result.response.text() || '';
        } catch (error: any) {
            lastError = error;
            console.log(`Gemini key ${i + 1} failed:`, error?.message);

            // If this is a retryable error and we have more keys, try the next one
            if (isRetryableGeminiError(error) && i < geminiClients.length - 1) {
                console.log(`Switching to backup key ${i + 2}...`);
                onKeySwitch?.(i + 1);
                continue;
            }

            // If it's not retryable or we're out of keys, throw the error
            throw error;
        }
    }

    throw lastError;
}

// Helper function to stream content with Gemini fallback
async function* streamWithGeminiFallback(
    model: string,
    prompt: string,
    onKeySwitch?: (keyIndex: number) => void
): AsyncGenerator<string, void, unknown> {
    let lastError: any;

    for (let i = 0; i < geminiClients.length; i++) {
        try {
            const geminiModel = geminiClients[i].getGenerativeModel({ model });
            const streamResult = await geminiModel.generateContentStream(prompt);

            for await (const chunk of streamResult.stream) {
                yield chunk.text();
            }
            return; // Success, exit the function
        } catch (error: any) {
            lastError = error;
            console.log(`Gemini streaming key ${i + 1} failed:`, error?.message);

            // If this is a retryable error and we have more keys, try the next one
            if (isRetryableGeminiError(error) && i < geminiClients.length - 1) {
                console.log(`Switching to backup key ${i + 2} for streaming...`);
                onKeySwitch?.(i + 1);
                continue;
            }

            // If it's not retryable or we're out of keys, throw the error
            throw error;
        }
    }

    throw lastError;
}

// Re-export for backwards compatibility
export { AVAILABLE_MODELS };


const ENHANCE_PROMPT_SYSTEM = `You are an expert web design consultant and prompt enhancement specialist. Your job is to transform simple website requests into comprehensive, production-ready design specifications that will result in stunning, professional websites.

When enhancing a prompt, you MUST include ALL of the following in detail:

**1. DESIGN SYSTEM & VISUAL IDENTITY:**
- Exact color palette with specific hex codes (primary, secondary, accent, background, text colors)
- Typography hierarchy (font families for headings and body, sizes, weights, line heights)
- Visual style (modern minimalist, bold and vibrant, elegant luxury, playful, corporate professional, etc.)
- Design patterns (glassmorphism, neumorphism, gradient overlays, shadows, rounded corners, etc.)
- Spacing and layout grid system

**2. COMPLETE PAGE STRUCTURE (specify each section in order):**
- Hero section (headline style, subtext, CTA buttons, background treatment, imagery/illustration style)
- Navigation (sticky header, mobile menu style, logo placement, links)
- Feature/Services section (layout: grid/cards/icons, number of items, content style)
- About/Story section (layout, imagery, content approach)
- Testimonials/Social proof (carousel, grid, or featured style)
- Pricing/Products section if applicable
- Call-to-action sections
- Footer (columns, links, social icons, newsletter signup)

**3. INTERACTIVE ELEMENTS & ANIMATIONS:**
- Hover effects (buttons, cards, links)
- Scroll animations (fade-in, slide-in, parallax)
- Micro-interactions (button clicks, form focus states)
- Loading states and transitions
- Mobile touch interactions

**4. RESPONSIVE DESIGN REQUIREMENTS:**
- Desktop layout specifications
- Tablet adaptations
- Mobile-first considerations
- Breakpoint behaviors

**5. CONTENT & COPY GUIDELINES:**
- Tone of voice (professional, friendly, luxurious, playful)
- Placeholder text approach (realistic dummy content, not lorem ipsum)
- Imagery style (photos, illustrations, icons, abstract graphics)
- Content hierarchy and emphasis

**6. MODERN WEB STANDARDS:**
- Accessibility considerations (contrast, focus states, semantic HTML)
- Performance optimization hints
- SEO-friendly structure
- Social media integration

Transform the user's simple request into a detailed specification document (4-6 detailed paragraphs) that covers all these aspects. Be specific with colors, layouts, and features. The output should be detailed enough that any developer could create a consistent, production-quality website from it.

Return ONLY the enhanced prompt specification, nothing else.`;


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
    const { prompt, userId, model = 'z-ai/glm-4.5-air:free', enhancePrompt = true, styles = [] } = body;

    // Build style instruction based on selected styles
    const styleDescriptions: Record<string, string> = {
        innovative: 'Creative, experimental layouts with unique visual elements, unconventional navigation patterns, bold typography choices, asymmetric designs, and cutting-edge CSS techniques',
        professional: 'Clean, corporate aesthetics with structured layouts, trustworthy color schemes (blues, grays, whites), clear hierarchy, ample whitespace, business-appropriate imagery, and polished UI components',
        futuristic: 'High-tech appearance with neon accents, dark themes, glassmorphism effects, cyber-inspired elements, gradient glows, animated particles, tech-forward typography, and sci-fi inspired interfaces'
    };

    const selectedStyleDescriptions = styles.map((s: string) => styleDescriptions[s]).filter(Boolean);
    const styleInstruction = selectedStyleDescriptions.length > 0
        ? `\n\n**REQUIRED DESIGN STYLE(S):** The website MUST incorporate these specific design styles:\n${selectedStyleDescriptions.map((desc: string, i: number) => `${i + 1}. ${desc}`).join('\n')}\n\nBlend these styles harmoniously if multiple are selected.`
        : '';

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

    const isAdmin = user.isAdmin === true;
    if (!isAdmin && user.credits <= 0) {
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
            let enhancedPrompt = prompt;

            // Only enhance prompt if enhancePrompt is true
            if (enhancePrompt) {
                // Send status: enhancing
                await safeWrite(`data: ${JSON.stringify({ type: 'status', status: 'enhancing' })}\n\n`);
                await safeWrite(`data: ${JSON.stringify({ type: 'message', content: `Using model: ${modelInfo.name} (${modelInfo.provider})` })}\n\n`);

                // Show selected styles if any
                if (styles.length > 0) {
                    const styleNames = styles.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ');
                    await safeWrite(`data: ${JSON.stringify({ type: 'message', content: `Applying styles: ${styleNames}` })}\n\n`);
                }
                // Enhance prompt - use appropriate client
                if (modelInfo.provider === 'gemini') {
                    enhancedPrompt = await generateWithGeminiFallback(
                        model,
                        `${ENHANCE_PROMPT_SYSTEM}${styleInstruction}\n\nUser request: ${prompt}`,
                        async (keyIndex) => {
                            await safeWrite(`data: ${JSON.stringify({ type: 'message', content: `Switching to backup API key ${keyIndex + 1}...` })}\n\n`);
                        }
                    ) || prompt;
                } else if (modelInfo.provider === 'nvidia') {
                    const enhanceResponse = await nvidia.chat.completions.create({
                        model: model,
                        messages: [
                            { role: "system", content: ENHANCE_PROMPT_SYSTEM + styleInstruction },
                            { role: "user", content: prompt }
                        ],
                        max_tokens: 1000,
                    });
                    enhancedPrompt = enhanceResponse.choices[0]?.message?.content || prompt;
                } else if (modelInfo.provider === 'openrouter') {
                    const enhanceResponse = await openrouter.chat.completions.create({
                        model: model,
                        messages: [
                            { role: "system", content: ENHANCE_PROMPT_SYSTEM + styleInstruction },
                            { role: "user", content: prompt }
                        ],
                        max_tokens: 1000,
                    });
                    enhancedPrompt = enhanceResponse.choices[0]?.message?.content || prompt;
                } else {
                    const enhanceResponse = await groq.chat.completions.create({
                        model: model,
                        messages: [
                            { role: "system", content: ENHANCE_PROMPT_SYSTEM + styleInstruction },
                            { role: "user", content: prompt }
                        ],
                        max_tokens: 1000,
                    });
                    enhancedPrompt = enhanceResponse.choices[0]?.message?.content || prompt;
                }

                await safeWrite(`data: ${JSON.stringify({ type: 'enhanced', enhancedPrompt })}\n\n`);
                await safeWrite(`data: ${JSON.stringify({ type: 'message', content: `Enhanced your prompt for better results...` })}\n\n`);
            } else {
                // Skip enhancement - notify user
                await safeWrite(`data: ${JSON.stringify({ type: 'message', content: `Using model: ${modelInfo.name} (${modelInfo.provider})` })}\n\n`);
                await safeWrite(`data: ${JSON.stringify({ type: 'message', content: `Using your prompt directly (enhancement disabled)...` })}\n\n`);
            }

            // Send status: generating
            await safeWrite(`data: ${JSON.stringify({ type: 'status', status: 'generating' })}\n\n`);
            await safeWrite(`data: ${JSON.stringify({ type: 'message', content: `Generating website code...` })}\n\n`);

            // Generate website with streaming - use appropriate client
            let fullCode = '';

            if (modelInfo.provider === 'gemini') {
                const streamGenerator = streamWithGeminiFallback(
                    model,
                    `${GENERATE_CODE_SYSTEM}\n\nUser request: ${enhancedPrompt}`,
                    async (keyIndex) => {
                        await safeWrite(`data: ${JSON.stringify({ type: 'message', content: `Switching to backup API key ${keyIndex + 1}...` })}\n\n`);
                    }
                );

                for await (const content of streamGenerator) {
                    if (content) {
                        fullCode += content;
                        await safeWrite(`data: ${JSON.stringify({ type: 'code', content })}\n\n`);
                    }
                }
            } else if (modelInfo.provider === 'nvidia') {
                const generateResponse = await nvidia.chat.completions.create({
                    model: model,
                    messages: [
                        { role: "system", content: GENERATE_CODE_SYSTEM },
                        { role: "user", content: enhancedPrompt }
                    ],
                    max_tokens: 16384,
                    temperature: 1.00,
                    top_p: 1.00,
                    stream: true,
                });

                for await (const chunk of generateResponse) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        fullCode += content;
                        await safeWrite(`data: ${JSON.stringify({ type: 'code', content })}\n\n`);
                    }
                }
            } else if (modelInfo.provider === 'openrouter') {
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
                cleanCode,
                model
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

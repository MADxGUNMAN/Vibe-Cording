// OpenRouter AI client for Vibe Corder
import OpenAI from 'openai';

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || "",
    defaultHeaders: {
        "HTTP-Referer": "https://vibe-corder.app",
        "X-Title": "Vibe Corder",
    },
});

// System prompts from assets
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

const ENHANCE_REVISION_SYSTEM = `You are a prompt enhancement specialist. The user wants to make changes to their website. Enhance their request to be more specific and actionable for a web developer.

Enhance this by:
1. Being specific about what elements to change
2. Mentioning design details (colors, spacing, sizes)
3. Clarifying the desired outcome
4. Using clear technical terms

Return ONLY the enhanced request, nothing else. Keep it concise (1-2 sentences).`;

const GENERATE_REVISION_SYSTEM = `You are an expert web developer.

CRITICAL REQUIREMENTS:
- Return ONLY the complete updated HTML code with the requested changes.
- Use Tailwind CSS for ALL styling (NO custom CSS).
- Use Tailwind utility classes for all styling changes.
- Include all JavaScript in <script> tags before closing </body>
- Make sure it's a complete, standalone HTML document with Tailwind CSS
- Return the HTML Code Only, nothing else

Apply the requested changes while maintaining the Tailwind CSS styling approach.`;

export async function enhancePrompt(userPrompt: string): Promise<string> {
    const response = await openai.chat.completions.create({
        model: "z-ai/glm-4.5-air:free",
        messages: [
            { role: "system", content: ENHANCE_PROMPT_SYSTEM },
            { role: "user", content: userPrompt }
        ],
        max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || userPrompt;
}

export async function generateWebsite(enhancedPrompt: string): Promise<string> {
    const response = await openai.chat.completions.create({
        model: "z-ai/glm-4.5-air:free",
        messages: [
            { role: "system", content: GENERATE_CODE_SYSTEM },
            { role: "user", content: enhancedPrompt }
        ],
        max_tokens: 16000,
    });

    return response.choices[0]?.message?.content || "";
}

export async function enhanceRevision(currentCode: string, revisionRequest: string): Promise<string> {
    const response = await openai.chat.completions.create({
        model: "z-ai/glm-4.5-air:free",
        messages: [
            { role: "system", content: ENHANCE_REVISION_SYSTEM },
            { role: "user", content: revisionRequest }
        ],
        max_tokens: 500,
    });

    return response.choices[0]?.message?.content || revisionRequest;
}

export async function generateRevision(currentCode: string, enhancedRevision: string): Promise<string> {
    const response = await openai.chat.completions.create({
        model: "z-ai/glm-4.5-air:free",
        messages: [
            { role: "system", content: GENERATE_REVISION_SYSTEM },
            { role: "user", content: `Current website code:\n${currentCode}\n\nRevision request: ${enhancedRevision}` }
        ],
        max_tokens: 16000,
    });

    return response.choices[0]?.message?.content || currentCode;
}

export { openai };

// Shared model configuration - edit this file to change models across all pages
export const AVAILABLE_MODELS = [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Latest Gemini model', provider: 'gemini', tier: 'Most Powerful', color: 'red' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Latest Gemini model', provider: 'gemini', tier: 'High', color: 'blue' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Fast Gemini model', provider: 'gemini', tier: 'Fast', color: 'blue' },
    { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air', description: 'OpenRouter free model', provider: 'openrouter', tier: 'Most Powerful', color: 'red' },
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', description: 'Large open source GPT', provider: 'openrouter', tier: 'Powerful', color: 'orange' },
    { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', description: 'Smaller open source GPT', provider: 'openrouter', tier: 'High', color: 'yellow' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Groq model', provider: 'groq', tier: 'Fast', color: 'green' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Groq instant model', provider: 'groq', tier: 'Fast', color: 'green' },
];

export type ModelInfo = typeof AVAILABLE_MODELS[number];

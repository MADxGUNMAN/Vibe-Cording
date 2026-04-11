import fs from 'fs';
import path from 'path';

/**
 * Load a system prompt from a .md file in the src/prompts directory.
 * In production, caches prompts in memory after first read.
 * In development, always reads from disk for hot-reload of prompt changes.
 */
const promptCache = new Map<string, string>();
const isDev = process.env.NODE_ENV !== 'production';

export function loadPrompt(filename: string): string {
    if (!isDev && promptCache.has(filename)) {
        return promptCache.get(filename)!;
    }

    const filePath = path.join(process.cwd(), 'src', 'prompts', filename);
    const content = fs.readFileSync(filePath, 'utf-8').trim();
    promptCache.set(filename, content);
    return content;
}

// Pre-defined prompt loaders for convenience
export const ENHANCE_PROMPT_SYSTEM = () => loadPrompt('enhance-prompt.md');
export const GENERATE_CODE_SYSTEM = () => loadPrompt('generate-code.md');
export const ENHANCE_REVISION_SYSTEM = () => loadPrompt('enhance-revision.md');
export const GENERATE_REVISION_SYSTEM = () => loadPrompt('generate-revision.md');

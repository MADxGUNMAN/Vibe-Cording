import { NextRequest, NextResponse } from 'next/server';
import { enhancePrompt, generateWebsite } from '@/lib/ai';
import { createProject, addMessage, addVersion, incrementUserCreation, getUser } from '@/lib/firestore';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { prompt, userId } = body;

        console.log('Create project request:', { prompt: prompt?.substring(0, 50), userId });

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        if (!userId) {
            return NextResponse.json({ error: 'User must be logged in' }, { status: 401 });
        }

        // Check user credits
        console.log('Checking user credits for:', userId);
        const user = await getUser(userId);
        console.log('User data:', user);

        if (!user) {
            return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
        }

        if (user.credits <= 0) {
            return NextResponse.json({ error: 'Insufficient credits' }, { status: 403 });
        }

        // 1. Enhance the prompt
        console.log('Enhancing prompt...');
        const enhancedPrompt = await enhancePrompt(prompt);
        console.log('Enhanced prompt:', enhancedPrompt?.substring(0, 100));

        // 2. Generate website code
        console.log('Generating website...');
        const generatedCode = await generateWebsite(enhancedPrompt);
        console.log('Generated code length:', generatedCode?.length);

        // Clean up the code (remove markdown code blocks if present)
        let cleanCode = generatedCode
            .replace(/```html\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        // 3. Create project in Firestore
        console.log('Creating project in Firestore...');
        const projectId = await createProject(
            userId,
            prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''),
            prompt,
            cleanCode
        );
        console.log('Project created:', projectId);

        // 4. Add messages to conversation
        await addMessage(projectId, 'user', prompt);
        await addMessage(projectId, 'assistant', 'Website generated successfully! You can now preview and modify it.');

        // 5. Add initial version
        await addVersion(projectId, cleanCode, 'Initial generation');

        // 6. Decrement user credits
        await incrementUserCreation(userId);

        return NextResponse.json({
            projectId,
            enhancedPrompt,
            code: cleanCode,
        });
    } catch (error: any) {
        console.error('Error creating project:', error);
        console.error('Error details:', error?.message, error?.stack);
        return NextResponse.json(
            { error: error?.message || 'Failed to create project' },
            { status: 500 }
        );
    }
}

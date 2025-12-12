import { NextRequest, NextResponse } from 'next/server';
import { enhanceRevision, generateRevision } from '@/lib/ai';
import { getProject, updateProject, addMessage, addVersion, getUser } from '@/lib/firestore';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { projectId, message, userId } = body;

        if (!projectId || !message) {
            return NextResponse.json({ error: 'Project ID and message are required' }, { status: 400 });
        }

        if (!userId) {
            return NextResponse.json({ error: 'User must be logged in' }, { status: 401 });
        }

        // Get current project
        const project = await getProject(projectId);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Check user credits
        const user = await getUser(userId);
        if (!user || user.credits <= 0) {
            return NextResponse.json({ error: 'Insufficient credits' }, { status: 403 });
        }

        // Add user message to conversation
        await addMessage(projectId, 'user', message);

        // 1. Enhance the revision prompt
        const enhancedRevision = await enhanceRevision(project.current_code, message);

        // 2. Generate revised code
        const revisedCode = await generateRevision(project.current_code, enhancedRevision);

        // Clean up the code
        let cleanCode = revisedCode
            .replace(/```html\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        // 3. Update project with new code
        await updateProject(projectId, { current_code: cleanCode });

        // 4. Add assistant message
        await addMessage(projectId, 'assistant', 'I\'ve updated your website based on your request.');

        // 5. Add new version
        await addVersion(projectId, cleanCode, message.substring(0, 100));

        return NextResponse.json({
            code: cleanCode,
            enhancedRevision,
        });
    } catch (error) {
        console.error('Error creating revision:', error);
        return NextResponse.json(
            { error: 'Failed to revise project' },
            { status: 500 }
        );
    }
}

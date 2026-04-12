// Server-side Firestore operations using Admin SDK
// These bypass security rules and should ONLY be used in API routes
import { getAdminDb } from './firebase-admin';
import admin from 'firebase-admin';

// Types (mirror client-side types)
export interface User {
    id: string;
    email: string;
    name: string;
    imageUrl?: string;
    credits: number;
    totalCreation: number;
    isAdmin?: boolean;
    createdAt: admin.firestore.Timestamp;
}

export interface Project {
    id: string;
    name: string;
    initial_prompt: string;
    current_code: string;
    published_code?: string;
    userId: string;
    isPublished: boolean;
    model?: string;
    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
}

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: admin.firestore.Timestamp;
}

export interface Version {
    id: string;
    code: string;
    description?: string;
    timestamp: admin.firestore.Timestamp;
}

// ==========================================
// User operations
// ==========================================

export async function getUser(userId: string): Promise<User | null> {
    const db = getAdminDb();
    const userSnap = await db.collection('users').doc(userId).get();
    if (userSnap.exists) {
        return userSnap.data() as User;
    }
    return null;
}

export async function updateUserCredits(userId: string, credits: number) {
    const db = getAdminDb();
    await db.collection('users').doc(userId).update({ credits });
}

export async function incrementUserCreation(userId: string) {
    const user = await getUser(userId);
    if (user) {
        const db = getAdminDb();
        await db.collection('users').doc(userId).update({
            totalCreation: (user.totalCreation || 0) + 1,
            credits: Math.max(0, (user.credits || 0) - 1),
        });
    }
}

// ==========================================
// Project operations
// ==========================================

export async function createProject(
    userId: string,
    name: string,
    initialPrompt: string,
    currentCode: string,
    model?: string
): Promise<string> {
    const db = getAdminDb();
    const projectRef = await db.collection('projects').add({
        name,
        initial_prompt: initialPrompt,
        current_code: currentCode,
        userId,
        isPublished: false,
        model: model || 'unknown',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return projectRef.id;
}

export async function getProject(projectId: string): Promise<Project | null> {
    const db = getAdminDb();
    const projectSnap = await db.collection('projects').doc(projectId).get();
    if (projectSnap.exists) {
        return { id: projectSnap.id, ...projectSnap.data() } as Project;
    }
    return null;
}

export async function updateProject(projectId: string, data: Partial<Project>) {
    const db = getAdminDb();
    await db.collection('projects').doc(projectId).update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

// ==========================================
// Conversation operations
// ==========================================

export async function addMessage(projectId: string, role: 'user' | 'assistant', content: string): Promise<string> {
    const db = getAdminDb();
    const convRef = await db.collection('projects').doc(projectId).collection('conversations').add({
        role,
        content,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    return convRef.id;
}

// ==========================================
// Version operations
// ==========================================

export async function addVersion(projectId: string, code: string, description?: string): Promise<string> {
    const db = getAdminDb();
    const versionRef = await db.collection('projects').doc(projectId).collection('versions').add({
        code,
        description: description || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    return versionRef.id;
}

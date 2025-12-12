// Firestore operations for Vibe Corder
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    addDoc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Types
export interface User {
    id: string;
    email: string;
    name: string;
    imageUrl?: string;
    credits: number;
    totalCreation: number;
    createdAt: Timestamp;
}

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Timestamp;
}

export interface Version {
    id: string;
    code: string;
    description?: string;
    timestamp: Timestamp;
}

export interface Project {
    id: string;
    name: string;
    initial_prompt: string;
    current_code: string;
    userId: string;
    isPublished: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Admin emails get unlimited credits
const ADMIN_EMAILS = ['ansarisouaib635@gmail.com', 'ansarisoyab908@gmail.com'];

// User operations
export async function createUser(userId: string, email: string, name: string, imageUrl?: string) {
    const userRef = doc(db, 'users', userId);
    const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

    await setDoc(userRef, {
        id: userId,
        email,
        name,
        imageUrl: imageUrl || null,
        credits: isAdmin ? 99999 : 4, // Admin gets unlimited, regular users get 4 credits
        totalCreation: 0,
        isAdmin: isAdmin,
        createdAt: serverTimestamp(),
    });
}

export async function getUser(userId: string): Promise<User | null> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        return userSnap.data() as User;
    }
    return null;
}

export async function updateUserCredits(userId: string, credits: number) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { credits });
}

export async function incrementUserCreation(userId: string) {
    const user = await getUser(userId);
    if (user) {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            totalCreation: user.totalCreation + 1,
            credits: Math.max(0, user.credits - 1)
        });
    }
}

// Ensure user has proper credits (fix for users created before rules were set)
export async function ensureUserCredits(userId: string): Promise<number> {
    const user = await getUser(userId);
    if (user && user.credits === undefined) {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { credits: 20, totalCreation: 0 });
        return 20;
    }
    return user?.credits || 0;
}

// Project operations
export async function createProject(
    userId: string,
    name: string,
    initialPrompt: string,
    currentCode: string
): Promise<string> {
    const projectRef = await addDoc(collection(db, 'projects'), {
        name,
        initial_prompt: initialPrompt,
        current_code: currentCode,
        userId,
        isPublished: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return projectRef.id;
}

export async function getProject(projectId: string): Promise<Project | null> {
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    if (projectSnap.exists()) {
        return { id: projectSnap.id, ...projectSnap.data() } as Project;
    }
    return null;
}

export async function getUserProjects(userId: string): Promise<Project[]> {
    const q = query(
        collection(db, 'projects'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
}

export async function getPublishedProjects(): Promise<Project[]> {
    const q = query(
        collection(db, 'projects'),
        where('isPublished', '==', true),
        orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
}

export async function updateProject(projectId: string, data: Partial<Project>) {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteProject(projectId: string) {
    await deleteDoc(doc(db, 'projects', projectId));
}

export async function publishProject(projectId: string) {
    await updateProject(projectId, { isPublished: true });
}

// Conversation operations
export async function addMessage(projectId: string, role: 'user' | 'assistant', content: string): Promise<string> {
    const convRef = await addDoc(collection(db, 'projects', projectId, 'conversations'), {
        role,
        content,
        timestamp: serverTimestamp(),
    });
    return convRef.id;
}

export async function getConversation(projectId: string): Promise<Message[]> {
    const q = query(
        collection(db, 'projects', projectId, 'conversations'),
        orderBy('timestamp', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
}

// Version operations
export async function addVersion(projectId: string, code: string, description?: string): Promise<string> {
    const versionRef = await addDoc(collection(db, 'projects', projectId, 'versions'), {
        code,
        description: description || null,
        timestamp: serverTimestamp(),
    });
    return versionRef.id;
}

export async function getVersions(projectId: string): Promise<Version[]> {
    const q = query(
        collection(db, 'projects', projectId, 'versions'),
        orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Version));
}

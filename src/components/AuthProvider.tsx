'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
    User as FirebaseUser,
    onAuthStateChanged,
    signInWithPopup,
    signOut as firebaseSignOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { createUser, getUser, User } from '@/lib/firestore';

interface AuthContextType {
    user: FirebaseUser | null;
    userData: User | null;
    loading: boolean;
    signInWithGoogle: (displayName?: string) => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [userData, setUserData] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUserData = useCallback(async () => {
        if (user) {
            const dbUser = await getUser(user.uid);
            setUserData(dbUser);
        }
    }, [user]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                // Check if user exists in Firestore
                let dbUser = await getUser(firebaseUser.uid);

                // If not, create them
                if (!dbUser) {
                    await createUser(
                        firebaseUser.uid,
                        firebaseUser.email || '',
                        firebaseUser.displayName || 'User',
                        firebaseUser.photoURL || undefined
                    );
                    dbUser = await getUser(firebaseUser.uid);
                }

                // Ensure user has credits (fix for users created before proper setup)
                if (dbUser && (dbUser.credits === undefined || dbUser.credits === null)) {
                    await createUser(
                        firebaseUser.uid,
                        firebaseUser.email || '',
                        firebaseUser.displayName || 'User',
                        firebaseUser.photoURL || undefined
                    );
                    dbUser = await getUser(firebaseUser.uid);
                }

                setUserData(dbUser);
            } else {
                setUserData(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async (displayName?: string) => {
        try {
            const result = await signInWithPopup(auth, googleProvider);

            // If displayName is provided and user doesn't have one, update it
            if (displayName && result.user && !result.user.displayName) {
                await updateProfile(result.user, { displayName });
            }
        } catch (error) {
            console.error('Error signing in with Google:', error);
            throw error;
        }
    };

    const signInWithEmail = async (email: string, password: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error('Error signing in with email:', error);
            throw error;
        }
    };

    const signUpWithEmail = async (email: string, password: string, name: string) => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);

            // Update the user's display name
            if (result.user) {
                await updateProfile(result.user, { displayName: name });
            }
        } catch (error) {
            console.error('Error signing up with email:', error);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            setUserData(null);
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            userData,
            loading,
            signInWithGoogle,
            signInWithEmail,
            signUpWithEmail,
            signOut,
            refreshUserData
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

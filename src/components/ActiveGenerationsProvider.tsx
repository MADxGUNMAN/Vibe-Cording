'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ActiveGeneration {
    id: string;
    prompt: string;
    model: string;
    status: 'enhancing' | 'generating' | 'saving' | 'complete' | 'error';
    startedAt: Date;
    code?: string;
    projectId?: string;
}

interface ActiveGenerationsContextType {
    activeGenerations: ActiveGeneration[];
    addGeneration: (generation: Omit<ActiveGeneration, 'startedAt'>) => void;
    updateGeneration: (id: string, updates: Partial<ActiveGeneration>) => void;
    removeGeneration: (id: string) => void;
    getGeneration: (id: string) => ActiveGeneration | undefined;
}

const ActiveGenerationsContext = createContext<ActiveGenerationsContextType | undefined>(undefined);

export function ActiveGenerationsProvider({ children }: { children: React.ReactNode }) {
    const [activeGenerations, setActiveGenerations] = useState<ActiveGeneration[]>([]);

    const addGeneration = useCallback((generation: Omit<ActiveGeneration, 'startedAt'>) => {
        setActiveGenerations(prev => [
            ...prev,
            { ...generation, startedAt: new Date() }
        ]);
    }, []);

    const updateGeneration = useCallback((id: string, updates: Partial<ActiveGeneration>) => {
        setActiveGenerations(prev =>
            prev.map(gen =>
                gen.id === id ? { ...gen, ...updates } : gen
            )
        );
    }, []);

    const removeGeneration = useCallback((id: string) => {
        setActiveGenerations(prev => prev.filter(gen => gen.id !== id));
    }, []);

    const getGeneration = useCallback((id: string) => {
        return activeGenerations.find(gen => gen.id === id);
    }, [activeGenerations]);

    return (
        <ActiveGenerationsContext.Provider value={{
            activeGenerations,
            addGeneration,
            updateGeneration,
            removeGeneration,
            getGeneration
        }}>
            {children}
        </ActiveGenerationsContext.Provider>
    );
}

export function useActiveGenerations() {
    const context = useContext(ActiveGenerationsContext);
    if (context === undefined) {
        throw new Error('useActiveGenerations must be used within an ActiveGenerationsProvider');
    }
    return context;
}

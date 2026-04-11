'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface OTPInputProps {
    length?: number;
    onComplete: (otp: string) => void;
    disabled?: boolean;
    error?: boolean;
}

export function OTPInput({ length = 6, onComplete, disabled = false, error = false }: OTPInputProps) {
    const [values, setValues] = useState<string[]>(Array(length).fill(''));
    const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(length).fill(null));

    // Focus first input on mount
    useEffect(() => {
        if (!disabled) {
            inputRefs.current[0]?.focus();
        }
    }, [disabled]);

    const triggerComplete = useCallback((newValues: string[]) => {
        const otp = newValues.join('');
        if (otp.length === length) {
            onComplete(otp);
        }
    }, [length, onComplete]);

    const handleChange = (index: number, value: string) => {
        if (disabled) return;

        // Only allow digits
        const digit = value.replace(/\D/g, '').slice(-1);

        const newValues = [...values];
        newValues[index] = digit;
        setValues(newValues);

        // Move to next input if a digit was entered
        if (digit && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // Check if OTP is complete
        triggerComplete(newValues);
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;

        if (e.key === 'Backspace') {
            if (!values[index] && index > 0) {
                // Move to previous and clear it
                const newValues = [...values];
                newValues[index - 1] = '';
                setValues(newValues);
                inputRefs.current[index - 1]?.focus();
            } else {
                const newValues = [...values];
                newValues[index] = '';
                setValues(newValues);
            }
        }

        if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }

        if (e.key === 'ArrowRight' && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        if (disabled) return;
        e.preventDefault();

        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);

        if (pastedData.length > 0) {
            const newValues = [...values];
            for (let i = 0; i < pastedData.length; i++) {
                newValues[i] = pastedData[i];
            }
            setValues(newValues);

            // Focus the next empty input or the last one
            const nextEmpty = newValues.findIndex(v => !v);
            const focusIndex = nextEmpty === -1 ? length - 1 : nextEmpty;
            inputRefs.current[focusIndex]?.focus();

            triggerComplete(newValues);
        }
    };

    // Reset inputs
    const reset = () => {
        setValues(Array(length).fill(''));
        inputRefs.current[0]?.focus();
    };

    // Expose reset via parent ref if needed
    useEffect(() => {
        if (error) {
            // Shake animation happens via CSS, but we can also reset after a delay
            const timer = setTimeout(() => {
                reset();
            }, 600);
            return () => clearTimeout(timer);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [error]);

    return (
        <div
            className={`flex gap-2 sm:gap-3 justify-center ${error ? 'animate-shake' : ''}`}
            onPaste={handlePaste}
        >
            {values.map((value, index) => (
                <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={disabled}
                    className={`
                        w-11 h-14 sm:w-12 sm:h-16
                        text-center text-xl sm:text-2xl font-bold
                        bg-white/[0.03] border-2 rounded-xl
                        text-white
                        focus:outline-none
                        transition-all duration-200
                        disabled:opacity-40 disabled:cursor-not-allowed
                        ${error
                            ? 'border-red-500/60 bg-red-500/5'
                            : value
                                ? 'border-purple-500/60 bg-purple-500/5 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                                : 'border-white/10 focus:border-purple-500/50 focus:bg-white/[0.05] focus:shadow-[0_0_20px_rgba(168,85,247,0.1)]'
                        }
                    `}
                    style={{ caretColor: '#a855f7' }}
                />
            ))}

            {/* Shake animation */}
            <style jsx>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
                    20%, 40%, 60%, 80% { transform: translateX(4px); }
                }
                .animate-shake {
                    animation: shake 0.5s ease-in-out;
                }
            `}</style>
        </div>
    );
}

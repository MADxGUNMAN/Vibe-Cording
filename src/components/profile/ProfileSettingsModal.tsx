'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/cropImage';

interface ProfileSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ProfileSettingsModal({ isOpen, onClose }: ProfileSettingsModalProps) {
    const { user, userData, updateUserProfile } = useAuth();
    
    // Core State
    const [displayName, setDisplayName] = useState(userData?.name || user?.displayName || '');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(userData?.imageUrl || user?.photoURL || null);
    
    // UI State
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);
    
    // Cropping State
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropping, setIsCropping] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    if (!isOpen) return null;

    // Reset everything when closing
    const handleClose = () => {
        setCropImageSrc(null);
        setIsCropping(false);
        setError(null);
        onClose();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file');
                return;
            }
            
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('Image must be less than 5MB');
                return;
            }
            
            // Read image for cropping
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setCropImageSrc(reader.result?.toString() || null);
                setIsCropping(true);
            });
            reader.readAsDataURL(file);
            
            setError(null);
            setImageError(false);
        }
        // Reset file input so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const showCroppedImage = async () => {
        try {
            if (!cropImageSrc || !croppedAreaPixels) return;
            const croppedFile = await getCroppedImg(cropImageSrc, croppedAreaPixels);
            setSelectedFile(croppedFile);
            setPreviewUrl(URL.createObjectURL(croppedFile));
            setIsCropping(false);
            setCropImageSrc(null);
        } catch (e: unknown) {
            console.error(e);
            setError('Failed to crop image');
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        
        try {
            let finalPhotoUrl = userData?.imageUrl || user?.photoURL;

            // If a new file is confirmed (cropped), upload it to Supabase
            if (selectedFile && user?.uid) {
                const fileExt = selectedFile.name.split('.').pop() || 'jpeg';
                const fileName = `${user.uid}-${Date.now()}.${fileExt}`;
                const filePath = `${user.uid}/${fileName}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, selectedFile, {
                        cacheControl: '3600',
                        upsert: true
                    });
                    
                if (uploadError) {
                    console.error("Upload error:", uploadError);
                    throw new Error('Failed to upload image. Please try again.');
                }
                
                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);
                    
                finalPhotoUrl = publicUrl;
            }

            // Update Firebase Auth & Firestore Profile
            await updateUserProfile(displayName.trim() || 'User', finalPhotoUrl || undefined);
            handleClose();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred while saving profile';
            setError(errorMessage);
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <div className="bg-[#12121a] rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Glow effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-[100px] bg-purple-500/10 blur-[50px] rounded-full pointer-events-none" />
                
                <h3 className="text-xl font-bold mb-6 text-white text-center relative z-10">
                    {isCropping ? 'Crop Image' : 'Profile Settings'}
                </h3>
                
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex-shrink-0">
                        {error}
                    </div>
                )}
                
                {isCropping ? (
                    <div className="flex-1 min-h-[300px] flex flex-col mb-4">
                        <div className="relative flex-1 bg-black/50 rounded-xl overflow-hidden min-h-[250px]">
                            {cropImageSrc && (
                                <Cropper
                                    image={cropImageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    cropShape="round"
                                    showGrid={false}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                />
                            )}
                        </div>
                        {/* Zoom Slider */}
                        <div className="mt-3 flex items-center gap-3 px-2">
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                            </svg>
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                        </div>
                        <div className="mt-4 flex gap-3 flex-shrink-0">
                            <button
                                onClick={() => { setIsCropping(false); setCropImageSrc(null); }}
                                className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm font-medium text-white border border-white/5 hover:border-white/10 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={showCroppedImage}
                                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all text-sm font-medium text-white shadow-lg shadow-purple-500/25 cursor-pointer"
                            >
                                Apply Crop
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-y-auto flex-1 pb-2">
                        <div className="flex flex-col items-center mb-6">
                            <div 
                                className="relative w-24 h-24 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center mb-4 cursor-pointer overflow-hidden group hover:border-purple-500/50 transition-all hover:shadow-lg hover:shadow-purple-500/10"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {previewUrl && !imageError ? (
                                    <img 
                                        src={previewUrl} 
                                        alt="Profile preview" 
                                        className="w-full h-full object-cover"
                                        onError={() => setImageError(true)}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                                        <span className="text-3xl font-bold text-white">
                                            {displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                                        </span>
                                    </div>
                                )}
                                
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                accept="image/*" 
                                className="hidden" 
                            />
                            <p className="text-xs text-gray-400 text-center">
                                Click to upload new photo<br/>(Max 5MB)
                            </p>
                        </div>
                        
                        {/* Display Name */}
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-gray-400 mb-2">Display Name</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Your name"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all text-white placeholder-gray-500"
                                maxLength={50}
                            />
                        </div>

                        {/* Email (read-only) */}
                        <div className="mb-6">
                            <label className="block text-xs font-medium text-gray-400 mb-2">Email</label>
                            <div className="w-full bg-white/3 border border-white/5 rounded-xl px-4 py-3 text-sm text-gray-500 truncate">
                                {user?.email || '—'}
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={handleClose}
                                disabled={isSaving}
                                className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm font-medium text-white disabled:opacity-50 border border-white/5 hover:border-white/10 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !displayName.trim()}
                                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all text-sm font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 cursor-pointer"
                            >
                                {isSaving ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

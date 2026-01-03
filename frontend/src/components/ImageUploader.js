import React, { useState } from 'react';
import { Upload, Link as LinkIcon, Loader2, Image as ImageIcon, Play } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

const ImageUploader = ({ value, onChange, label = "Image", className = "" }) => {
    const { token } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Create preview
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);

        // Upload
        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const response = await fetch(`${API}/upload-image`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Upload failed');
            }

            const data = await response.json();
            onChange(data.url);
            toast.success('Image uploaded successfully');
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload image: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <Label>{label}</Label>
            <Tabs defaultValue="url" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="url">
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Existing URL
                    </TabsTrigger>
                    <TabsTrigger value="upload">
                        <Upload className="h-4 w-4 mr-2" />
                        New Upload
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            value={value || ''}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder="https://example.com/image.jpg"
                        />
                    </div>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={uploading}
                            className="cursor-pointer"
                        />
                        {uploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    </div>
                </TabsContent>
            </Tabs>

            {(value || preview) && (
                <div className="relative w-full h-48 bg-muted/20 rounded-md overflow-hidden border border-input/20 flex items-center justify-center">
                    {(() => {
                        const url = value || preview;
                        const isVideo = url && (
                            url.includes('youtube.com') ||
                            url.includes('youtu.be') ||
                            url.includes('vimeo.com')
                        );

                        if (isVideo) {
                            const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\?\s]+)/);
                            const vimeoMatch = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/);

                            if (youtubeMatch) {
                                return (
                                    <div className="relative w-full h-full group cursor-pointer" onClick={() => window.open(url, '_blank')}>
                                        <img
                                            src={`https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`}
                                            alt="YouTube Thumbnail"
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.target.src = `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg`; }}
                                        />
                                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                                            <div className="w-12 h-12 bg-primary/90 rounded-full flex items-center justify-center shadow-lg">
                                                <Play className="h-6 w-6 text-white ml-1" fill="white" />
                                            </div>
                                        </div>
                                        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded">
                                            YouTube
                                        </div>
                                    </div>
                                );
                            }

                            if (vimeoMatch) {
                                return (
                                    <div className="relative w-full h-full bg-black group cursor-pointer" onClick={() => window.open(url, '_blank')}>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg">
                                                    <Play className="h-6 w-6 text-white ml-1" fill="white" />
                                                </div>
                                                <p className="text-xs text-gray-300">Vimeo Video</p>
                                            </div>
                                        </div>
                                        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded">
                                            Vimeo
                                        </div>
                                    </div>
                                );
                            }
                        }

                        return (value || preview) ? (
                            <img
                                src={value || preview}
                                alt="Preview"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://placehold.co/600x400?text=Invalid+Image';
                                }}
                            />
                        ) : (
                            <div className="flex flex-col items-center text-muted-foreground">
                                <ImageIcon className="h-8 w-8 mb-2" />
                                <span>No image selected</span>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};

export default ImageUploader;

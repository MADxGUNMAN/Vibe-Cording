'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

// Available models
const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Latest Gemini model', provider: 'gemini', tier: 'Most Powerful', color: 'blue' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Fast Gemini model', provider: 'gemini', tier: 'Powerful', color: 'blue' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Stable Gemini model', provider: 'gemini', tier: 'High', color: 'blue' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', description: 'Lightweight Gemini', provider: 'gemini', tier: 'Fast', color: 'blue' },
  { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air', description: 'OpenRouter free model', provider: 'openrouter', tier: 'Most Powerful', color: 'red' },
  { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', description: 'Large open source GPT', provider: 'openrouter', tier: 'Powerful', color: 'orange' },
  { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', description: 'Smaller open source GPT', provider: 'openrouter', tier: 'High', color: 'yellow' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Groq model', provider: 'groq', tier: 'Fast', color: 'green' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Groq instant model', provider: 'groq', tier: 'Fast', color: 'green' },
];

export default function HomePage() {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleCreate = async () => {
    if (!prompt.trim()) return;

    if (!user) {
      router.push('/login');
      return;
    }

    // Store prompt and selected model in sessionStorage and redirect to generate page
    sessionStorage.setItem('pendingPrompt', prompt.trim());
    sessionStorage.setItem('pendingUserId', user.uid);
    sessionStorage.setItem('pendingModel', selectedModel);
    router.push('/generate');
  };

  const getSelectedModelName = () => {
    const model = AVAILABLE_MODELS.find(m => m.id === selectedModel);
    return model?.name || 'Select Model';
  };

  const getSelectedModel = () => {
    return AVAILABLE_MODELS.find(m => m.id === selectedModel);
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-8">
          <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-medium rounded">NEW</span>
          <span className="text-gray-300 text-sm">Try 30 days free trial option</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* Main heading */}
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Turn thoughts into websites
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
            instantly, with AI.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-gray-400 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
          Create, customize and publish website faster than ever with our
          <br className="hidden md:block" /> AI Site Builder.
        </p>

        {/* Model Selector */}
        <div className="max-w-2xl mx-auto mb-4">
          <div className="relative">
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="w-full px-4 py-3 bg-[#1a1a2e] border border-white/10 rounded-xl text-white flex items-center justify-between hover:border-purple-500/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getSelectedModel()?.color === 'blue' ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
                  getSelectedModel()?.color === 'red' ? 'bg-gradient-to-br from-red-500 to-red-700' :
                    getSelectedModel()?.color === 'orange' ? 'bg-gradient-to-br from-orange-500 to-orange-700' :
                      getSelectedModel()?.color === 'yellow' ? 'bg-gradient-to-br from-yellow-500 to-yellow-700' :
                        'bg-gradient-to-br from-green-500 to-green-700'
                  }`}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getSelectedModelName()}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getSelectedModel()?.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                      getSelectedModel()?.color === 'red' ? 'bg-red-500/20 text-red-400' :
                        getSelectedModel()?.color === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                          getSelectedModel()?.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                      }`}>
                      {getSelectedModel()?.tier}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {getSelectedModel()?.description}
                  </div>
                </div>
              </div>
              <svg className={`w-5 h-5 text-gray-400 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showModelDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a2e] border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl">
                {AVAILABLE_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model.id);
                      setShowModelDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center justify-between ${selectedModel === model.id ? 'bg-purple-500/10 border-l-2 border-purple-500' : ''
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${model.color === 'blue' ? 'bg-blue-500' :
                        model.color === 'red' ? 'bg-red-500' :
                          model.color === 'orange' ? 'bg-orange-500' :
                            model.color === 'yellow' ? 'bg-yellow-500' :
                              'bg-green-500'
                        }`}></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{model.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${model.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                            model.color === 'red' ? 'bg-red-500/20 text-red-400' :
                              model.color === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                                model.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-green-500/20 text-green-400'
                            }`}>
                            {model.tier}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">{model.description}</div>
                      </div>
                    </div>
                    {selectedModel === model.id && (
                      <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Prompt Input */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="relative bg-[#1a1a2e] border border-white/10 rounded-xl p-4 focus-within:border-purple-500/50 transition-colors">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your website in details..."
              className="w-full h-24 bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none text-sm md:text-base"
            />
            <div className="flex justify-end">
              <button
                onClick={handleCreate}
                disabled={!prompt.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg font-medium text-sm hover:from-purple-700 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Create with AI
              </button>
            </div>
          </div>
        </div>

        {/* Brand logos */}
        <div className="border-t border-white/5 pt-12">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-50">
            {/* Framer */}
            <div className="flex items-center gap-2 text-white">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 0h16v8h-8zM4 8h8l8 8H4zM4 16h8v8z" />
              </svg>
              <span className="font-semibold">Framer</span>
            </div>

            {/* HUAWEI */}
            <div className="flex items-center gap-2 text-white">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2a10 10 0 0110 10h-4a6 6 0 00-6-6V2z" />
              </svg>
              <span className="font-semibold">HUAWEI</span>
            </div>

            {/* Instagram */}
            <div className="text-white font-serif text-xl italic">
              Instagram
            </div>

            {/* Microsoft */}
            <div className="flex items-center gap-2 text-white">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="1" y="1" width="10" height="10" />
                <rect x="13" y="1" width="10" height="10" />
                <rect x="1" y="13" width="10" height="10" />
                <rect x="13" y="13" width="10" height="10" />
              </svg>
              <span className="font-semibold">Microsoft</span>
            </div>

            {/* Walmart */}
            <div className="flex items-center gap-2 text-white">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2 6h-4l2-6zm0 20l-2-6h4l-2 6zm-10-10l6-2v4l-6-2zm20 0l-6 2v-4l6 2zm-15.66-5.66l4.24 4.24-2.83 2.83-4.24-4.24zm11.32 11.32l-4.24-4.24 2.83-2.83 4.24 4.24z" />
              </svg>
              <span className="font-semibold">Walmart</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

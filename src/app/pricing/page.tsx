'use client';

import { useAuth } from '@/components/AuthProvider';

const plans = [
    {
        id: 'basic',
        name: 'Basic',
        price: '$5',
        credits: 100,
        description: 'Start Now, scale up as you grow.',
        features: [
            'Upto 20 Creations',
            'Limited Revisions',
            'Basic AI Models',
            'email support',
            'Basic analytics',
        ],
    },
    {
        id: 'pro',
        name: 'Pro',
        price: '$19',
        credits: 400,
        description: 'Add credits to create more projects',
        features: [
            'Upto 80 Creations',
            'Extended Revisions',
            'Advanced AI Models',
            'priority email support',
            'Advanced analytics',
        ],
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: '$49',
        credits: 1000,
        description: 'Add credits to create more projects',
        features: [
            'Upto 200 Creations',
            'Increased Revisions',
            'Advanced AI Models',
            'email + chat support',
            'Advanced analytics',
        ],
    },
];

export default function PricingPage() {
    const { user, signInWithGoogle } = useAuth();

    const handleBuy = async (planId: string) => {
        if (!user) {
            await signInWithGoogle();
            return;
        }
        // TODO: Implement Stripe checkout
        alert('Payment integration coming soon! For now, enjoy free credits.');
    };

    return (
        <div className="min-h-screen gradient-bg">
            <div className="max-w-6xl mx-auto px-4 py-16">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white italic mb-4">Choose Your Plan</h1>
                    <p className="text-gray-400 max-w-xl mx-auto">
                        Start for free and scale up as you grow. Find the perfect plan for your
                        content creation needs.
                    </p>
                </div>

                {/* Pricing cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className="bg-[#1a1a2e]/50 border border-white/10 rounded-2xl p-8 hover:border-purple-500/30 transition-all"
                        >
                            <h2 className="text-xl font-semibold text-white mb-2">{plan.name}</h2>

                            <div className="flex items-baseline gap-1 mb-2">
                                <span className="text-4xl font-bold text-white">{plan.price}</span>
                                <span className="text-gray-400">/ {plan.credits} credits</span>
                            </div>

                            <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

                            <ul className="space-y-3 mb-8">
                                {plan.features.map((feature, index) => (
                                    <li key={index} className="flex items-center gap-2 text-gray-300 text-sm">
                                        <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleBuy(plan.id)}
                                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
                            >
                                Buy Now
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

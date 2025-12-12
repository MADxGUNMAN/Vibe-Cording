'use client';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full py-4 px-4 bg-[#0a0a0f] border-t border-white/5">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 text-center">
                <p className="text-gray-400 text-sm">
                    © {currentYear} All Rights Reserved.
                </p>
                <p className="text-gray-400 text-sm">
                    Made with ❤️ by{' '}
                    <a
                        href="https://ansarisouaib.in"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                    >
                        Ansari Souaib
                    </a>
                </p>
            </div>
        </footer>
    );
}

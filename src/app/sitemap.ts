import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://vibecoder.gunbot.tech';

    // Routes available in the app
    const routes = [
        '',
        '/active',
        '/community',
        '/editor',
        '/generate',
        '/login',
        '/preview',
        '/pricing',
        '/projects',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    return [...routes];
}

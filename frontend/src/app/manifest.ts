import type { MetadataRoute } from 'next';

/**
 * Web app manifest — makes WindowsPE installable as a PWA (home-screen / app
 * window) and offline-capable alongside the service worker. Standalone display
 * + the near-black theme match the in-app design tokens.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WindowsPE — Privilege Escalation Methodology',
    short_name: 'WindowsPE',
    description:
      'Interactive Windows privilege-escalation methodology for OSCP / CTF / red-team learners — offline-capable.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0A0B0F',
    theme_color: '#0A0B0F',
    categories: ['education', 'productivity', 'security'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

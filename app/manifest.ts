import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'nodepad',
    short_name: 'nodepad',
    description: 'A spatial research tool where AI augments your thinking',
    start_url: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#050505',
    icons: [
      {
        src: '/icon.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/nodepad.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ],
  }
}

// Your videos. Add entries here and they show up on the homepage + /videos.
// platform: 'youtube' | 'bilibili'
// id: the video ID.
//   - YouTube: the part after watch?v=  (e.g. dQw4w9WgXcQ)
//   - Bilibili: the BV id (e.g. BV1xx411c7mD)
export interface Video {
  title: string;
  platform: 'youtube' | 'bilibili';
  id: string;
  date?: string;
}

export const videos: Video[] = [
  {
    title: 'Sample YouTube video — replace me',
    platform: 'youtube',
    id: 'dQw4w9WgXcQ',
    date: '2026-05-01',
  },
  {
    title: 'Sample Bilibili video — replace me',
    platform: 'bilibili',
    id: 'BV1GJ411x7h7',
    date: '2026-04-12',
  },
];

export function embedUrl(v: Video): string {
  if (v.platform === 'youtube') {
    return `https://www.youtube-nocookie.com/embed/${v.id}`;
  }
  // Bilibili player embed
  return `https://player.bilibili.com/player.html?bvid=${v.id}&autoplay=0`;
}

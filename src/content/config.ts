import { defineCollection, z } from 'astro:content';

// Tech blog posts - markdown files in src/content/blog/
const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    locale: z.enum(['en', 'zh']).default('en'),
  }),
});

// Notes / what I'm focusing on - short markdown updates
const news = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    link: z.string().url().optional(),
    locale: z.enum(['en', 'zh']).default('en'),
  }),
});

export const collections = { blog, news };

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';

import { getRequestContext } from '@/lib/server-context';
import { buildMetadata, articleJsonLd, absoluteUrl } from '@/lib/seo';

async function getPost(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/blog/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error('Failed to fetch post:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  const { regionKey } = await getRequestContext();
  if (!post) return buildMetadata({ title: 'Not Found', description: '', path: `/blog/${params.slug}`, regionKey, noIndex: true });
  return buildMetadata({
    title: post.title,
    description: post.excerpt || post.title,
    path: `/blog/${params.slug}`,
    regionKey,
    ogImage: post.coverImage || undefined,
  });
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const jsonLd = articleJsonLd({
    title: post.title,
    description: post.excerpt,
    image: post.coverImage ? absoluteUrl(post.coverImage) : undefined,
    authorName: post.author?.name,
    publishedAt: post.publishedAt,
    url: absoluteUrl(`/blog/${post.slug}`),
  });

  return (
    <article className="bg-surface min-h-screen pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="bg-midnight text-white py-16 md:py-24 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[120%] bg-ember rounded-full blur-[120px] opacity-60 pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-[-30%] right-[10%] w-[60%] h-[80%] bg-deal rounded-full blur-[100px] opacity-30 pointer-events-none mix-blend-screen" />
        <div className="container-fluid relative z-10 max-w-4xl">
          <Link href="/blog" className="inline-flex items-center gap-2 text-white/70 hover:text-white font-bold text-sm mb-8 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            Back to Journal
          </Link>
          
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-ember mb-6">
            {post.category && <span className="bg-white/10 px-3 py-1 rounded-full text-white backdrop-blur-sm border border-white/20">{post.category.name}</span>}
            <span className="text-white/60">{post.readTimeMinutes} min read</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight text-white">{post.title}</h1>
          {post.excerpt && <p className="text-xl text-white/70 leading-relaxed mb-8">{post.excerpt}</p>}
          
          <div className="flex items-center gap-4">
            {post.author?.avatar ? (
              <Image src={post.author.avatar} alt="" width={48} height={48} className="rounded-full border-2 border-white/20" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-ember flex items-center justify-center text-lg font-bold text-white shadow-lg">
                {post.author?.name?.[0] || 'S'}
              </div>
            )}
            <div>
              <p className="font-bold text-white">{post.author?.name || 'Storegrill Team'}</p>
              <p className="text-sm text-white/60">{new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} &bull; {post.viewCount} views</p>
            </div>
          </div>
        </div>
      </header>

      {post.coverImage && (
        <div className="container-fluid max-w-5xl -mt-10 relative z-20 mb-12">
          <div className="aspect-[21/9] relative rounded-3xl overflow-hidden shadow-2xl border-4 border-surface bg-surface-sunken">
            <Image src={post.coverImage} alt={post.title} fill className="object-cover" priority />
          </div>
        </div>
      )}

      <div className="container-fluid max-w-3xl prose prose-lg prose-slate hover:prose-a:text-ember pt-8 md:pt-12">
        <div dangerouslySetInnerHTML={{ __html: post.body }} />
        
        {post.tags?.length > 0 && (
          <div className="mt-16 pt-8 border-t border-border">
            <h3 className="text-sm font-bold text-text-primary mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((t: any) => (
                <Link key={t.tag.slug} href={`/blog?tag=${t.tag.slug}`} className="px-3 py-1.5 rounded-full bg-surface-sunken border border-border text-xs font-bold text-text-secondary hover:text-ember hover:border-ember transition-colors">
                  #{t.tag.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { API_BASE } from "@/lib/api";
import { NewsletterSection } from "@/components/home/Newsletter";

import { getRequestContext } from "@/lib/server-context";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  return buildMetadata({
    title: "Storegrill Journal — E-commerce News & Insights",
    description: "Discover the latest e-commerce trends, seller success stories, tech updates, and community news from the Storegrill global marketplace.",
    path: "/blog",
    regionKey,
    keywords: ["e-commerce news", "storegrill blog", "seller tips", "online marketplace insights", "ecommerce trends"],
  });
}

async function getPosts(page = "1", category = "", search = "") {
  const url = new URL(`${API_BASE}/api/v1/blog`);
  if (page) url.searchParams.set("page", page);
  if (category) url.searchParams.set("category", category);
  if (search) url.searchParams.set("search", search);
  try {
    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!res.ok) return { posts: [], total: 0, pages: 1 };
    return res.json();
  } catch {
    return { posts: [], total: 0, pages: 1 };
  }
}

async function getCategories() {
  try {
    const res = await fetch(`${API_BASE}/api/v1/blog/categories`, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function PostPlaceholder({ title }: { title: string }) {
  const hue = Math.abs(title.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % 360;
  return (
    <div
      className="absolute inset-0 flex items-end p-6"
      style={{ background: `linear-gradient(135deg, hsl(${hue},60%,20%) 0%, hsl(${(hue + 40) % 360},70%,30%) 100%)` }}
    >
      <span className="text-white/80 text-lg font-bold leading-snug line-clamp-3">{title}</span>
    </div>
  );
}

function FeaturedCard({ post }: { post: any }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group relative flex flex-col md:flex-row rounded-3xl overflow-hidden border border-border bg-surface hover:shadow-2xl hover:border-ember/40 transition-all duration-500 md:h-[440px]">
      <div className="relative md:w-3/5 aspect-video md:aspect-auto overflow-hidden bg-surface-sunken shrink-0">
        {post.coverImage ? (
          <Image src={post.coverImage} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" priority />
        ) : (
          <PostPlaceholder title={post.title} />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-surface/20 hidden md:block" />
        {post.category && (
          <span className="absolute top-5 left-5 bg-white/90 backdrop-blur-sm px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest rounded-full text-midnight shadow-sm">
            {post.category.name}
          </span>
        )}
        <span className="absolute top-5 right-5 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full">Featured</span>
      </div>
      <div className="flex flex-col justify-center p-8 md:p-10 flex-1">
        <div className="flex items-center gap-2 text-xs text-text-tertiary font-semibold mb-4">
          <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Draft"}</span>
          <span>&bull;</span>
          <span>{post.readTimeMinutes} min read</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary group-hover:text-ember transition-colors leading-tight mb-4">{post.title}</h2>
        <p className="text-text-secondary leading-relaxed mb-8 line-clamp-3">{post.excerpt}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-ember/10 flex items-center justify-center text-sm font-bold text-ember border border-ember/20">
              {post.author?.name?.[0] || "S"}
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">{post.author?.name || "Storegrill Team"}</p>
              <p className="text-xs text-text-tertiary">{post.viewCount?.toLocaleString() || 0} views</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ember group-hover:gap-3 transition-all duration-300">
            Read article
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

function PostCard({ post }: { post: any }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group bg-surface rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:border-ember/40 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
      <div className="aspect-[16/10] relative bg-surface-sunken overflow-hidden">
        {post.coverImage ? (
          <Image src={post.coverImage} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <PostPlaceholder title={post.title} />
        )}
        {post.category && (
          <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest rounded-full text-midnight shadow-sm">
            {post.category.name}
          </span>
        )}
      </div>
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-2 text-xs text-text-tertiary font-semibold mb-3">
          <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Draft"}</span>
          <span>&bull;</span>
          <span>{post.readTimeMinutes} min read</span>
        </div>
        <h2 className="text-lg font-extrabold text-text-primary group-hover:text-ember transition-colors leading-tight mb-3 line-clamp-2">{post.title}</h2>
        <p className="text-sm text-text-secondary line-clamp-3 mb-6 flex-1">{post.excerpt}</p>
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-ember/10 flex items-center justify-center text-xs font-bold text-ember">
              {post.author?.name?.[0] || "S"}
            </div>
            <span className="text-xs font-bold text-text-primary">{post.author?.name || "Storegrill Team"}</span>
          </div>
          <span className="text-ember font-bold text-xs inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            Read <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: { page?: string; category?: string; search?: string };
}) {
  const [data, categories] = await Promise.all([
    getPosts(searchParams.page, searchParams.category, searchParams.search),
    getCategories(),
  ]);

  const currentPage = Number(searchParams.page) || 1;
  const [featured, ...rest] = data.posts;

  return (
    <div className="bg-surface-sunken min-h-screen">
      <div className="bg-midnight text-white pt-20 pb-28 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[120%] bg-ember rounded-full blur-[120px] opacity-60 pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-[-30%] right-[10%] w-[60%] h-[80%] bg-deal rounded-full blur-[100px] opacity-30 pointer-events-none mix-blend-screen" />
        <div className="container-fluid relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-xs font-bold text-white/80 mb-6 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-ember animate-pulse" />
            The Storegrill Journal
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-5 text-white">
            Ideas that move<br className="hidden md:block" /> commerce forward
          </h1>
          <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Deep dives, product updates, and community stories from the Storegrill team.
          </p>
          <form method="GET" action="/blog" className="max-w-xl mx-auto flex gap-2">
            <input
              name="search"
              defaultValue={searchParams.search}
              placeholder="Search articles..."
              className="flex-1 px-5 py-3.5 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm font-semibold focus:outline-none focus:border-ember focus:bg-white/15 backdrop-blur-sm transition-all"
            />
            <button type="submit" className="px-6 py-3.5 rounded-2xl bg-ember text-white font-bold text-sm hover:bg-ember/90 transition-colors shadow-lg shadow-ember/30 shrink-0">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="container-fluid -mt-10 relative z-10 pb-20">
        <div className="flex flex-wrap gap-2 mb-10 justify-center">
          <Link href="/blog" className={`px-5 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${!searchParams.category ? "bg-ember text-white shadow-ember/30" : "bg-surface border border-border text-text-secondary hover:text-ember hover:border-ember"}`}>
            All Posts
          </Link>
          {categories.map((c: any) => (
            <Link key={c.id} href={`/blog?category=${c.slug}`} className={`px-5 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${searchParams.category === c.slug ? "bg-ember text-white shadow-ember/30" : "bg-surface border border-border text-text-secondary hover:text-ember hover:border-ember"}`}>
              {c.name} <span className="opacity-50 text-xs ml-0.5">{c._count.posts}</span>
            </Link>
          ))}
        </div>

        {data.posts.length === 0 ? (
          <div className="text-center py-24 bg-surface rounded-3xl border border-border shadow-sm">
            <div className="w-20 h-20 rounded-full bg-surface-sunken border border-border flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h3 className="text-xl font-extrabold text-text-primary mb-2">No articles found</h3>
            <p className="text-text-secondary mb-6">{searchParams.search ? `No results for "${searchParams.search}"` : "Nothing published in this category yet."}</p>
            <Link href="/blog" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-ember text-white font-bold text-sm hover:bg-ember/90 transition-colors shadow-lg shadow-ember/30">
              Clear filter
            </Link>
          </div>
        ) : (
          <>
            {featured && !searchParams.category && !searchParams.search && currentPage === 1 && (
              <div className="mb-10">
                <FeaturedCard post={featured} />
              </div>
            )}
            {rest.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-extrabold text-text-primary">
                    {searchParams.search ? `Results for "${searchParams.search}"` : searchParams.category ? "Category Articles" : "Latest Articles"}
                    <span className="ml-2 text-sm font-semibold text-text-tertiary">({data.total} total)</span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  {(featured && !searchParams.category && !searchParams.search && currentPage === 1 ? rest : data.posts).map((post: any) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              </>
            )}
            {data.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mb-16">
                {currentPage > 1 && (
                  <Link href={`/blog?page=${currentPage - 1}${searchParams.category ? `&category=${searchParams.category}` : ""}`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface border border-border text-sm font-bold text-text-secondary hover:text-ember hover:border-ember transition-all">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                    Prev
                  </Link>
                )}
                {Array.from({ length: data.pages }, (_, i) => i + 1).map(p => (
                  <Link key={p} href={`/blog?page=${p}${searchParams.category ? `&category=${searchParams.category}` : ""}`} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${p === currentPage ? "bg-ember text-white shadow-lg shadow-ember/30" : "bg-surface border border-border text-text-secondary hover:text-ember hover:border-ember"}`}>
                    {p}
                  </Link>
                ))}
                {currentPage < data.pages && (
                  <Link href={`/blog?page=${currentPage + 1}${searchParams.category ? `&category=${searchParams.category}` : ""}`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface border border-border text-sm font-bold text-text-secondary hover:text-ember hover:border-ember transition-all">
                    Next
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                  </Link>
                )}
              </div>
            )}
          </>
        )}
        <div className="mt-8">
          <NewsletterSection />
        </div>
      </div>
    </div>
  );
}
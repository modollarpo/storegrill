import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog | Storegrill',
  description: 'Latest news, tech trends, and tips from Storegrill.',
};

export default function BlogPage() {
  return (
    <div className="container-fluid py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Our News</h1>
      <p>Blog listing page coming soon.</p>
    </div>
  );
}

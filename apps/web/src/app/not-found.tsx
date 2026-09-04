import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container-site min-h-[60vh] flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="relative mb-8">
        <h1 className="text-8xl md:text-9xl font-black text-text-primary tracking-tighter opacity-10 select-none">
          404
        </h1>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-action-primary px-4 py-1.5 rounded-full bg-action-primary/10">
            Page not found
          </p>
        </div>
      </div>
      
      <h2 className="text-3xl md:text-4xl font-extrabold text-text-primary mb-4 tracking-tight">
        We lost that page
      </h2>
      <p className="mx-auto max-w-md text-base text-text-secondary font-medium mb-10 leading-relaxed">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Link 
          href="/" 
          className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-action-primary text-white font-bold tracking-wide hover:bg-action-primary-hover active:scale-95 transition-all shadow-md hover:shadow-lg"
        >
          Return Home
        </Link>
        <Link 
          href="/products" 
          className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-surface-sunken text-text-primary font-bold tracking-wide border border-border hover:bg-surface-sunken active:scale-95 transition-all"
        >
          Browse Products
        </Link>
      </div>
    </main>
  );
}
'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  if (process.env.NODE_ENV === 'production') console.error(error);

  return (
    <main className="container-site min-h-[60vh] flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="w-16 h-16 mb-6 rounded-2xl bg-feedback-danger/10 flex items-center justify-center">
        <svg className="w-8 h-8 text-feedback-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <p className="text-sm font-black uppercase tracking-[0.2em] text-feedback-danger mb-4">
        Something went wrong
      </p>
      
      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
        We could not load this page
      </h1>
      
      <p className="mx-auto max-w-md text-base text-gray-500 font-medium mb-10 leading-relaxed">
        An unexpected error occurred. Please try again. Don&apos;t worry, your basket and account details are safe.
      </p>
      
      <button 
        type="button" 
        onClick={() => reset()} 
        className="inline-flex items-center justify-center h-12 px-10 rounded-full bg-gray-900 text-white font-bold tracking-wide hover:bg-gray-800 active:scale-95 transition-all shadow-md hover:shadow-lg"
      >
        Try again
      </button>
    </main>
  );
}
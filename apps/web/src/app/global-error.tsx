'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface-sunken text-text-primary font-sans antialiased">
        <main className="container-site min-h-screen flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 mb-8 rounded-full bg-gradient-to-br from-action-primary to-ember-deep flex items-center justify-center text-white font-black text-2xl shadow-lg">
            S
          </div>

          <p className="text-sm font-black uppercase tracking-[0.2em] text-ember-pale mb-4">
            System Error
          </p>
          
          <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight mb-4">
            We could not load StoreGrill
          </h1>
          
          <p className="mx-auto max-w-md text-base text-text-secondary font-medium mb-10 leading-relaxed">
            A critical error prevented the application from loading. Please refresh the page or try again in a few moments.
          </p>
          
          <button 
            type="button" 
            onClick={() => reset()} 
            className="inline-flex items-center justify-center h-12 px-10 rounded-full bg-gray-900 text-white font-bold tracking-wide hover:bg-gray-800 active:scale-95 transition-all shadow-md"
          >
            Refresh Application
          </button>
        </main>
      </body>
    </html>
  );
}
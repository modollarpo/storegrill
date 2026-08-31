import Image from 'next/image';
import { cn } from '@/lib/utils'; // Assuming standard cn utility is available

export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeMap = {
    sm: 24,
    md: 48,
    lg: 96,
  };
  
  const dim = sizeMap[size];

  return (
    <div className={cn("inline-flex items-center justify-center shrink-0", className)}>
      <Image 
        src="/icons/splash-spinner.svg" 
        alt="Loading..." 
        width={dim} 
        height={dim} 
        priority 
        className="animate-pulse opacity-90"
      />
    </div>
  );
}

export function FullScreenLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-midnight/90 backdrop-blur-md">
      <Spinner size="lg" className="mb-6" />
      {message && (
        <p className="text-white text-lg font-bold tracking-wide animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}

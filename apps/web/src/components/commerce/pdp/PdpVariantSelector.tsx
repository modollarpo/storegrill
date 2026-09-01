import { PdpVariant } from '../ProductDetailClient';
import { cn } from '@/lib/utils';

interface PdpVariantSelectorProps {
  variants?: PdpVariant[];
  selectedVariantId?: string;
  onSelectVariant: (id: string) => void;
  getAttr: (v: PdpVariant, name: string) => string | undefined;
}

export function PdpVariantSelector({ variants, selectedVariantId, onSelectVariant, getAttr }: PdpVariantSelectorProps) {
  if (!variants || variants.length === 0) return null;

  const colorOptions = Array.from(new Set(variants.map(v => getAttr(v, 'color') || getAttr(v, 'colour')).filter(Boolean)));
  const sizeOptions = Array.from(new Set(variants.map(v => getAttr(v, 'size')).filter(Boolean)));

  const selectByAttribute = (name: 'color' | 'colour' | 'size', value: string) => {
    const match = variants.find(
      v =>
        v.stock > 0 &&
        v.attributes?.some(a => a.name.toLowerCase().includes(name) && a.value.toLowerCase() === value.toLowerCase())
    );
    if (match) onSelectVariant(match.id);
  };

  return (
    <div className="space-y-6">
      {colorOptions.length > 0 && (
        <fieldset>
          <legend className="text-sm font-bold text-text-primary mb-3">Colour</legend>
          <div className="flex flex-wrap gap-2.5">
            {colorOptions.map(color => (
              <button
                key={color}
                type="button"
                aria-pressed={Boolean(selectedVariantId) && variants.find(v => v.id === selectedVariantId)?.attributes?.some(a => a.value === color)}
                onClick={() => selectByAttribute('color', color as string)}
                className="px-4 py-2 rounded-xs border border-border-strong text-sm font-bold hover:border-action-primary transition-colors aria-pressed:border-action-primary aria-pressed:bg-action-primary aria-pressed:text-white"
              >
                {color}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {sizeOptions.length > 0 && (
        <fieldset>
          <legend className="text-sm font-bold text-text-primary mb-3">Size</legend>
          <div className="flex flex-wrap gap-2.5">
            {sizeOptions.map(size => {
              const available = variants.some(
                v => v.attributes?.some(a => a.value.toLowerCase() === size!.toLowerCase()) && v.stock > 0
              );
              return (
                <button
                  key={size}
                  type="button"
                  disabled={!available}
                  aria-pressed={Boolean(selectedVariantId) && variants.find(v => v.id === selectedVariantId)?.attributes?.some(a => a.value === size)}
                  onClick={() => selectByAttribute('size', size as string)}
                  className={cn(
                    'min-w-[3rem] px-4 py-2 rounded-xs border text-sm font-bold transition-colors',
                    available
                      ? 'border-border-strong hover:border-action-primary aria-pressed:border-action-primary aria-pressed:bg-action-primary aria-pressed:text-white'
                      : 'border-border text-text-tertiary line-through cursor-not-allowed opacity-50'
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}

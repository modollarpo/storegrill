import { PdpVariant } from '../ProductDetailClient';
import { cn } from '@/lib/utils';

interface PdpVariantSelectorProps {
  variants?: PdpVariant[];
  selectedVariantId?: string;
  onSelectVariant: (id: string) => void;
  getAttr: (v: PdpVariant, name: string) => string | undefined;
}

type GroupKey = 'color' | 'size';

function groupValue(v: PdpVariant, key: GroupKey, getAttr: PdpVariantSelectorProps['getAttr']): string | undefined {
  if (key === 'color') return getAttr(v, 'color') || getAttr(v, 'colour');
  return getAttr(v, 'size');
}

function distinctValues(variants: PdpVariant[], key: GroupKey, getAttr: PdpVariantSelectorProps['getAttr']): string[] {
  return Array.from(new Set(variants.map(v => groupValue(v, key, getAttr)).filter(Boolean) as string[]));
}

export function PdpVariantSelector({ variants, selectedVariantId, onSelectVariant, getAttr }: PdpVariantSelectorProps) {
  if (!variants || variants.length === 0) return null;

  const colorOptions = distinctValues(variants, 'color', getAttr);
  const sizeOptions = distinctValues(variants, 'size', getAttr);

  const selected = variants.find(v => v.id === selectedVariantId);
  const currentColor = selected ? groupValue(selected, 'color', getAttr) : undefined;
  const currentSize = selected ? groupValue(selected, 'size', getAttr) : undefined;

  const selectValue = (key: GroupKey, value: string) => {
    const desiredColor = key === 'color' ? value : currentColor;
    const desiredSize = key === 'size' ? value : currentSize;

    const combined = variants.find(
      v =>
        v.stock > 0 &&
        (!desiredColor || groupValue(v, 'color', getAttr) === desiredColor) &&
        (!desiredSize || groupValue(v, 'size', getAttr) === desiredSize)
    );

    const fallback = variants.find(
      v => v.stock > 0 && groupValue(v, key, getAttr) === value
    );

    const pick = combined ?? fallback ?? variants.find(v => groupValue(v, key, getAttr) === value);
    if (pick) onSelectVariant(pick.id);
  };

  const renderGroup = (key: GroupKey, options: string[], selectedValue?: string) => {
    if (options.length === 0) return null;
    const label = key === 'color' ? 'Colour' : 'Size';
    return (
      <fieldset>
        <legend className="text-sm font-bold text-text-primary mb-3">{label}</legend>
        <div className="flex flex-wrap gap-2.5">
          {options.map(option => {
            const available = variants.some(
              v => groupValue(v, key, getAttr) === option && v.stock > 0
            );
            const pressed = selectedValue === option;
            return (
              <button
                key={option}
                type="button"
                disabled={!available}
                aria-pressed={pressed}
                onClick={() => selectValue(key, option)}
                className={cn(
                  'px-4 py-2 rounded-xs border text-sm font-bold transition-colors',
                  available
                    ? 'border-border-strong hover:border-action-primary aria-pressed:border-action-primary aria-pressed:bg-action-primary aria-pressed:text-white'
                    : 'border-border text-text-tertiary line-through cursor-not-allowed opacity-50'
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  };

  return (
    <div className="space-y-6">
      {renderGroup('color', colorOptions, currentColor)}
      {renderGroup('size', sizeOptions, currentSize)}
    </div>
  );
}

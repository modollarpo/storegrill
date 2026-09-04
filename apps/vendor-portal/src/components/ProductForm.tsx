'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { FormRow, FormSection, inputClass, textareaClass } from '@/components/ui/FormLayout';
import { toastSuccess, toastError } from '@/components/ui/Toast';

export interface ProductFormInitial {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  status: string;
  description?: string | null;
  shortDescription?: string | null;
  categoryId: string;
  currencyCode: string;
  basePriceMinorUnits: number;
  weightGrams?: number | null;
  images: string[];
  tags: string[];
  attributes: Array<{ name: string; value: string }>;
}

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: CategoryNode[];
}

interface VariantDraft {
  id: number;
  name: string;
  sku: string;
  price: string;
  stock: string;
}

interface ProductFormProps {
  mode: 'create' | 'edit';
  product?: ProductFormInitial | null;
}

const ZERO_DECIMAL = new Set(['JPY', 'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'KMF', 'KRW', 'KZT', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);

const CURRENCIES = [
  { code: 'GBP', label: 'GBP · £ (UK)' },
  { code: 'USD', label: 'USD · $ (US)' },
  { code: 'EUR', label: 'EUR · € (EU)' },
  { code: 'JPY', label: 'JPY · ¥ (JP)' },
];

function decimalsFor(currencyCode: string): number {
  return ZERO_DECIMAL.has(currencyCode) ? 0 : 2;
}

function toMinorUnits(price: string, currencyCode: string): number | null {
  const n = Number(price);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 10 ** decimalsFor(currencyCode));
}

function fromMinorUnits(minor: number, currencyCode: string): string {
  return (minor / 10 ** decimalsFor(currencyCode)).toFixed(decimalsFor(currencyCode));
}

function flattenCategories(nodes: CategoryNode[], depth = 0, out: Array<{ id: string; name: string; depth: number }> = []): Array<{ id: string; name: string; depth: number }> {
  for (const node of nodes) {
    out.push({ id: node.id, name: node.name, depth });
    if (node.children) flattenCategories(node.children, depth + 1, out);
  }
  return out;
}

function parseAttributes(text: string): Array<{ name: string; value: string }> {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const i = line.indexOf(':');
      return i > 0
        ? { name: line.slice(0, i).trim(), value: line.slice(i + 1).trim() }
        : { name: line, value: '' };
    });
}

function attributesToText(attributes: Array<{ name: string; value: string }>): string {
  return attributes.map(a => (a.value ? `${a.name}: ${a.value}` : a.name)).join('\n');
}

function parseImages(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

function isUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function ProductForm({ mode, product }: ProductFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Array<{ id: string; name: string; depth: number }>>([]);
  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [barcode, setBarcode] = useState(product?.barcode ?? '');
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [price, setPrice] = useState(product ? fromMinorUnits(product.basePriceMinorUnits, product.currencyCode) : '');
  const [currencyCode, setCurrencyCode] = useState(product?.currencyCode ?? 'GBP');
  const [weightGrams, setWeightGrams] = useState(product?.weightGrams ? String(product.weightGrams) : '');
  const [shortDescription, setShortDescription] = useState(product?.shortDescription ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [imagesText, setImagesText] = useState(product?.images.join('\n') ?? '');
  const [tagsText, setTagsText] = useState(product?.tags.join(', ') ?? '');
  const [attributesText, setAttributesText] = useState(product ? attributesToText(product.attributes) : '');
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const nextVariantId = useRef(1);

  useEffect(() => {
    api<{ categories: CategoryNode[] }>('/api/v1/categories?all=true')
      .then(d => setCategories(flattenCategories(d.categories ?? [])))
      .catch(() => setCategories([]));
  }, []);

  const categoryOptions = categories.map(c => (
    <option key={c.id} value={c.id}>
      {c.depth > 0 ? `${'\u00A0\u00A0'.repeat(c.depth)}└ ${c.name}` : c.name}
    </option>
  ));

  function addVariant() {
    setVariants(vs => [...vs, { id: nextVariantId.current++, name: '', sku: '', price: '', stock: '' }]);
  }

  function updateVariant(id: number, patch: Partial<VariantDraft>) {
    setVariants(vs => vs.map(v => (v.id === id ? { ...v, ...patch } : v)));
  }

  function removeVariant(id: number) {
    setVariants(vs => vs.filter(v => v.id !== id));
  }

  const validate = useCallback(() => {
    const fieldErrors: Record<string, string> = {};
    if (!name.trim()) fieldErrors.name = 'Product name is required';
    if (!sku.trim()) fieldErrors.sku = 'SKU is required';
    if (!categoryId) fieldErrors.categoryId = 'Choose a category';
    if (!description.trim()) fieldErrors.description = 'A description is required';
    if (!price.trim()) fieldErrors.price = 'Enter a price';
    else if (toMinorUnits(price, currencyCode) === null) fieldErrors.price = 'Price must be 0 or more';
    if (weightGrams.trim() && (!Number.isInteger(Number(weightGrams)) || Number(weightGrams) <= 0)) {
      fieldErrors.weightGrams = 'Weight must be a positive whole number in grams';
    }
    const badImage = parseImages(imagesText).find(img => !isUrl(img));
    if (badImage) fieldErrors.imagesText = `"${badImage}" is not a valid URL`;
    if (parseImages(imagesText).length > 20) fieldErrors.imagesText = 'At most 20 image URLs';
    if (tagsText.split(',').map(t => t.trim()).filter(Boolean).length > 20) {
      fieldErrors.tagsText = 'At most 20 tags';
    }
    const attrList = parseAttributes(attributesText);
    if (attrList.length > 20) fieldErrors.attributesText = 'At most 20 attributes';
    for (const v of variants) {
      if (!v.name.trim() && !v.sku.trim()) continue;
      if (!v.name.trim()) fieldErrors.variants = 'Every variant needs a name';
      if (!v.sku.trim()) fieldErrors.variants = 'Every variant needs a SKU';
      if (!v.price.trim() || toMinorUnits(v.price, currencyCode) === null) fieldErrors.variants = 'Enter a valid price for every variant';
      if (v.stock.trim() && (!Number.isInteger(Number(v.stock)) || Number(v.stock) < 0)) fieldErrors.variants = 'Stock must be a whole number of 0 or more';
    }
    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  }, [name, sku, categoryId, description, price, currencyCode, weightGrams, imagesText, tagsText, attributesText, variants]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    try {
      const images = parseImages(imagesText);
      const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean);
      const attributes = parseAttributes(attributesText);
      const basePriceMinorUnits = toMinorUnits(price, currencyCode)!;
      const payload = {
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode.trim() || undefined,
        categoryId,
        basePriceMinorUnits,
        currencyCode,
        weightGrams: weightGrams.trim() ? Number(weightGrams) : undefined,
        shortDescription: shortDescription.trim() || undefined,
        description: description.trim(),
        images,
        thumbnail: images[0],
        tags,
        attributes,
      };

      if (mode === 'edit' && product) {
        await api(`/api/v1/products/${product.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toastSuccess(`${name.trim()} updated — changes go to review`);
      } else {
        const variantPayload = variants
          .filter(v => v.name.trim() && v.sku.trim())
          .map(v => ({
            name: v.name.trim(),
            sku: v.sku.trim(),
            basePriceMinorUnits: toMinorUnits(v.price, currencyCode)!,
            stock: v.stock.trim() ? Number(v.stock) : 0,
          }));
        await api('/api/v1/products', {
          method: 'POST',
          body: JSON.stringify({ ...payload, variants: variantPayload }),
        });
        toastSuccess(`${name.trim()} created — submitted for review`);
      }
      router.push('/products');
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const submitLabel = mode === 'edit' ? 'Save changes' : 'Create product';
  const submittingLabel = mode === 'edit' ? 'Saving…' : 'Creating…';

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormSection
        title="Basics"
        description={mode === 'create' ? 'New products are submitted for review before going live.' : 'Changes are re-checked by review before going live.'}
        footer={
          <>
            <Link href="/products" className="h-9 px-4 rounded-md border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 inline-flex items-center transition-colors">
              Cancel
            </Link>
            <button type="submit" disabled={saving} aria-busy={saving} className="h-9 px-5 rounded-md bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {saving ? submittingLabel : submitLabel}
            </button>
          </>
        }
      >
        <FormRow label="Name" htmlFor="p-name" required error={errors.name}>
          <input id="p-name" value={name} onChange={e => setName(e.target.value)} aria-invalid={!!errors.name} className={inputClass} placeholder="e.g. Organic Sea-Salt Crisps (Box of 12)" autoFocus />
        </FormRow>

        <FormRow label="SKU" htmlFor="p-sku" required error={errors.sku} description="Your internal product code. Must be unique.">
          <input id="p-sku" value={sku} onChange={e => setSku(e.target.value)} aria-invalid={!!errors.sku} className={inputClass} placeholder="e.g. CRISP-ORG-12" />
        </FormRow>

        <FormRow label="Barcode" htmlFor="p-barcode" error={errors.barcode} description="Optional EAN/UPC for scanning.">
          <input id="p-barcode" value={barcode} onChange={e => setBarcode(e.target.value)} className={inputClass} placeholder="e.g. 5012345678900" />
        </FormRow>

        <FormRow label="Category" htmlFor="p-category" required error={errors.categoryId}>
          <select id="p-category" value={categoryId} onChange={e => setCategoryId(e.target.value)} aria-invalid={!!errors.categoryId} className={inputClass}>
            <option value="">Select a category…</option>
            {categoryOptions}
          </select>
        </FormRow>

        <FormRow label="Price" htmlFor="p-price" required error={errors.price} description="Stored as whole minor units; shown to shoppers in their local currency.">
          <span className="flex gap-3">
            <input id="p-price" type="text" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} aria-invalid={!!errors.price} className={`${inputClass} max-w-[160px]`} placeholder={currencyCode === 'JPY' ? '1500' : '12.99'} />
            <select value={currencyCode} onChange={e => setCurrencyCode(e.target.value)} aria-label="Base currency" className={`${inputClass} max-w-[180px]`}>
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </span>
        </FormRow>

        <FormRow label="Weight (g)" htmlFor="p-weight" error={errors.weightGrams} description="Used for shipping calculations. Optional.">
          <input id="p-weight" type="number" min={1} value={weightGrams} onChange={e => setWeightGrams(e.target.value)} className={`${inputClass} max-w-[160px]`} placeholder="e.g. 250" />
        </FormRow>
      </FormSection>

      <FormSection title="Description">
        <FormRow label="Short description" htmlFor="p-short" error={errors.shortDescription} description="One-liner shown in search and card views. Max 500 characters.">
          <input id="p-short" value={shortDescription} onChange={e => setShortDescription(e.target.value)} maxLength={500} className={inputClass} placeholder="e.g. Oven-baked, lightly salted — the crowd favourite." />
        </FormRow>

        <FormRow label="Full description" htmlFor="p-desc" required error={errors.description}>
          <textarea id="p-desc" value={description} onChange={e => setDescription(e.target.value)} rows={4} aria-invalid={!!errors.description} className={textareaClass} placeholder="What is it, what makes it great, what's in the box…" />
        </FormRow>
      </FormSection>

      <FormSection title="Media & attributes">
        <FormRow label="Images" htmlFor="p-images" error={errors.imagesText} description="One image URL per line. The first becomes the thumbnail. Max 20.">
          <textarea id="p-images" value={imagesText} onChange={e => setImagesText(e.target.value)} rows={3} className={textareaClass} placeholder="https://…/crisps.jpg&#10;https://…/box.jpg" />
        </FormRow>

        <FormRow label="Tags" htmlFor="p-tags" error={errors.tagsText} description="Comma-separated keywords for search and merchandising. Max 20.">
          <input id="p-tags" value={tagsText} onChange={e => setTagsText(e.target.value)} className={inputClass} placeholder="snacks, vegan, gift-basket" />
        </FormRow>

        <FormRow label="Attributes" htmlFor="p-attrs" error={errors.attributesText} description="One per line in the form name: value — e.g. Box contents: 12 packs. Max 20.">
          <textarea id="p-attrs" value={attributesText} onChange={e => setAttributesText(e.target.value)} rows={4} className={textareaClass} placeholder="Box contents: 12 packs&#10;Dietary: gluten-free" />
        </FormRow>
      </FormSection>

      {mode === 'create' && (
        <FormSection
          title="Variants"
          description="Optional. Create one row per variant (e.g. size or colour). Leave empty for a single product."
        >
          {variants.map(v => (
            <div key={v.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_120px_120px_36px] gap-2 items-end py-3 border-b border-slate-100 last:border-0">
              <label className="block">
                <span className="text-[10px] font-semibold text-slate-500">Variant name</span>
                <input value={v.name} onChange={e => updateVariant(v.id, { name: e.target.value })} className={`${inputClass} mt-1`} placeholder="e.g. 240 g bag" />
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold text-slate-500">SKU</span>
                <input value={v.sku} onChange={e => updateVariant(v.id, { sku: e.target.value })} className={`${inputClass} mt-1`} placeholder="e.g. CRISP-ORG-240" />
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold text-slate-500">Price {currencyCode}</span>
                <input value={v.price} onChange={e => updateVariant(v.id, { price: e.target.value })} className={`${inputClass} mt-1`} placeholder="0.00" />
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold text-slate-500">Stock</span>
                <input type="number" min={0} value={v.stock} onChange={e => updateVariant(v.id, { stock: e.target.value })} className={`${inputClass} mt-1`} placeholder="0" />
              </label>
              <button
                type="button"
                onClick={() => removeVariant(v.id)}
                aria-label={`Remove variant ${v.name || v.sku || v.id}`}
                className="h-9 w-9 rounded-md border border-slate-300 text-slate-500 grid place-items-center hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
          {errors.variants && <p role="alert" className="pt-2 text-xs text-rose-700 font-medium">{errors.variants}</p>}
          <button type="button" onClick={addVariant} className="mt-3 h-9 px-4 rounded-md border border-dashed border-slate-300 text-slate-600 text-xs font-bold hover:border-indigo-400 hover:text-indigo-600 transition-colors">
            + Add variant
          </button>
        </FormSection>
      )}

      {mode === 'edit' && product && (
        <FormSection title="Review status">
          <FormRow label="Status" htmlFor="p-status">
            <p id="p-status" className="text-xs font-semibold text-slate-700 pt-1">{product.status.replace(/_/g, ' ')}</p>
          </FormRow>
        </FormSection>
      )}
    </form>
  );
}
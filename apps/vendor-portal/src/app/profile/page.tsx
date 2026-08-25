'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, ApiError } from '@/lib/api';
import { VendorShell, PageHeader } from '@/components/VendorShell';
import { FormRow, FormSection, inputClass, textareaClass } from '@/components/ui/FormLayout';
import { toastSuccess, toastError } from '@/components/ui/Toast';

const ProfileSchema = z.object({
  storeName: z.string().min(2, 'Store name must be at least 2 characters').max(100),
  description: z.string().max(2000).optional().or(z.literal('')),
  returnPolicy: z.string().max(5000).optional().or(z.literal('')),
  shippingPolicy: z.string().max(5000).optional().or(z.literal('')),
  supportEmail: z.string().email('Enter a valid email').optional().or(z.literal('')),
  supportPhone: z.string().max(40).optional().or(z.literal('')),
});

type ProfileForm = z.infer<typeof ProfileSchema>;

interface VendorMe {
  id: string;
  slug: string;
  storeName?: string;
  description?: string;
  returnPolicy?: string;
  shippingPolicy?: string;
  supportEmail?: string;
  supportPhone?: string;
}

export default function VendorProfilePage() {
  const [slug, setSlug] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      storeName: '',
      description: '',
      returnPolicy: '',
      shippingPolicy: '',
      supportEmail: '',
      supportPhone: '',
    },
  });

  useEffect(() => {

    api<{ vendor: VendorMe }>('/api/v1/vendors/me')
      .then(d => {
        setSlug(d.vendor.slug);
        reset({
          storeName: d.vendor.storeName ?? '',
          description: d.vendor.description ?? '',
          returnPolicy: d.vendor.returnPolicy ?? '',
          shippingPolicy: d.vendor.shippingPolicy ?? '',
          supportEmail: d.vendor.supportEmail ?? '',
          supportPhone: d.vendor.supportPhone ?? '',
        });
      })
      .catch(() => undefined);
  }, [reset]);

  async function onSubmit(values: ProfileForm) {
    setSaving(true);
    try {
      await api('/api/v1/vendors/me', {
        method: 'PUT',
        body: JSON.stringify({
          storeName: values.storeName,
          description: values.description || undefined,
          returnPolicy: values.returnPolicy || undefined,
          shippingPolicy: values.shippingPolicy || undefined,
          supportEmail: values.supportEmail || undefined,
          supportPhone: values.supportPhone || undefined,
        }),
      });
      toastSuccess('Store profile saved');
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <VendorShell>
      <PageHeader title="Store Profile" subtitle="What customers see on your public storefront" />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormSection
          title="Identity"
          description="Your storefront lives at /vendors/{slug} — the slug is permanent."
          footer={
            <>
              {isDirty && <span className="text-[11px] text-amber-600 self-center mr-auto font-medium">Unsaved changes</span>}
              <button type="submit" disabled={saving} aria-busy={saving} className="h-9 px-5 rounded-md bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </>
          }
        >
          <FormRow label="Store name" htmlFor="storeName" required error={errors.storeName?.message}>
            <input id="storeName" {...register('storeName')} aria-invalid={!!errors.storeName} className={inputClass} />
          </FormRow>

          <FormRow label="Storefront URL" htmlFor="storeSlug" description="Permanent — used in product pages and marketing">
            <input id="storeSlug" value={slug ? `/vendors/${slug}` : '/vendors/…'} readOnly disabled className={`${inputClass} font-mono !text-slate-500`} />
          </FormRow>

          <FormRow label="Description" htmlFor="description" error={errors.description?.message} description="Shown on your storefront hero. Max 2000 characters.">
            <textarea id="description" {...register('description')} rows={4} className={textareaClass} placeholder="Tell customers what makes your store great…" />
          </FormRow>
        </FormSection>

        <FormSection title="Policies & contact">
          <FormRow label="Return policy" htmlFor="returnPolicy" error={errors.returnPolicy?.message}>
            <textarea id="returnPolicy" {...register('returnPolicy')} rows={3} className={textareaClass} placeholder="e.g. Free 30-day returns, customer pays return postage…" />
          </FormRow>

          <FormRow label="Shipping policy" htmlFor="shippingPolicy" error={errors.shippingPolicy?.message}>
            <textarea id="shippingPolicy" {...register('shippingPolicy')} rows={3} className={textareaClass} placeholder="e.g. Ships within 2 business days via regional carriers…" />
          </FormRow>

          <FormRow label="Support email" htmlFor="supportEmail" error={errors.supportEmail?.message}>
            <input id="supportEmail" type="email" {...register('supportEmail')} aria-invalid={!!errors.supportEmail} className={inputClass} placeholder="support@yourstore.com" />
          </FormRow>

          <FormRow label="Support phone" htmlFor="supportPhone" error={errors.supportPhone?.message}>
            <input id="supportPhone" {...register('supportPhone')} className={inputClass} placeholder="+1 …" />
          </FormRow>
        </FormSection>
      </form>
    </VendorShell>
  );
}

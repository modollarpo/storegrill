'use client';

import { AdminShell, PageHeader } from '@/components/AdminShell';
import { ContentForm } from '@/components/ContentForm';

export default function NewContentPage() {
  return (
    <AdminShell>
      <PageHeader title="New Content Page" subtitle="Create a CMS page" />
      <ContentForm mode="create" />
    </AdminShell>
  );
}
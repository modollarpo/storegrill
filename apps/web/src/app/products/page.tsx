import type { Metadata } from 'next';
import { ProductListing, buildListingMetadata } from '@/components/commerce/ProductListing';

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  return buildListingMetadata(searchParams);
}

export default function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ProductListing searchParams={searchParams} />;
}

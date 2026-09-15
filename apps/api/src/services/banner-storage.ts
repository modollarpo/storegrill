export interface StoredBanner {
  url: string;
}

const DEFAULT_CONTAINER = 'storefront-banners';

export async function persistBannerImage(sourceUrl: string, name: string): Promise<StoredBanner | null> {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) return null;

  const { BlobServiceClient } = await import('@azure/storage-blob');
  const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerName = process.env.AZURE_STORAGE_BANNER_CONTAINER || DEFAULT_CONTAINER;
  const containerClient = serviceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists({ access: 'blob' });

  const response = await fetch(sourceUrl);
  if (!response.ok) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) return null;

  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80);
  const blobName = `${safeName}-${Date.now()}.png`;
  const blockBlob = containerClient.getBlockBlobClient(blobName);
  await blockBlob.upload(bytes, bytes.length, {
    blobHTTPHeaders: { blobContentType: 'image/png' },
  });

  return {
    url: `https://${serviceClient.accountName}.blob.core.windows.net/${containerName}/${encodeURIComponent(blobName)}`,
  };
}
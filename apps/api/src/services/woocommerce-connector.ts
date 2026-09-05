export interface ConnectorProduct {
  sku: string;
  name: string;
  priceMinorUnits: number;
  stock: number;
  image?: string;
}

export interface Connector {
  name: string;
  testConnection(): Promise<boolean>;
  fetchProducts(): Promise<ConnectorProduct[]>;
  syncOrderStatus(orderNumber: string, status: string): Promise<boolean>;
}

export class WooCommerceConnector implements Connector {
  name = 'WooCommerce';
  private siteUrl: string;
  private consumerKey: string;
  private consumerSecret: string;

  constructor(siteUrl: string, consumerKey: string, consumerSecret: string) {
    this.siteUrl = siteUrl.replace(/\/+$/, '');
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.siteUrl}/wp-json/wc/v3/system_status`, {
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64'),
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async fetchProducts(): Promise<ConnectorProduct[]> {
    try {
      const res = await fetch(`${this.siteUrl}/wp-json/wc/v3/products?per_page=100`, {
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64'),
        },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as Array<{
        sku?: string;
        name: string;
        regular_price?: string;
        stock_quantity?: number;
        images?: Array<{ src?: string }>;
      }>;

      return data.map(item => ({
        sku: item.sku || `wc-${Math.random().toString(36).substring(2, 9)}`,
        name: item.name,
        priceMinorUnits: Math.round(parseFloat(item.regular_price || '0') * 100),
        stock: item.stock_quantity ?? 10,
        image: item.images?.[0]?.src,
      }));
    } catch {
      return [];
    }
  }

  async syncOrderStatus(orderNumber: string, status: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.siteUrl}/wp-json/wc/v3/orders/${orderNumber}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64'),
        },
        body: JSON.stringify({ status }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

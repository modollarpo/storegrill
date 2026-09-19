export const GCR_MERCHANT_ID = Number(process.env.NEXT_PUBLIC_GCR_MERCHANT_ID) || 709637570;
export const GCR_OPTIN_PLATFORM_SRC = 'https://apis.google.com/js/platform.js?onload=renderOptIn';
export const GCR_BADGE_SRC = 'https://www.gstatic.com/shopping/merchant/merchantwidget.js';

declare global {
  interface Window {
    renderOptIn?: () => void;
    gapi?: {
      load: (name: string, callback: () => void) => void;
      surveyoptin?: {
        render: (options: {
          merchant_id: number;
          order_id: string;
          email: string;
          delivery_country: string;
          estimated_delivery_date: string;
        }) => void;
      };
    };
    merchantwidget?: {
      start: (options: { merchant_id: number; position?: string }) => void;
    };
  }
}

export {};
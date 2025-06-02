export interface PaystackConfig {
  publicKey: string;
  email: string;
  amount: number; // in kobo (smallest currency unit)
  reference: string;
  currency?: string;
  metadata?: Record<string, any>;
  callback?: (response: PaystackResponse) => void;
  onClose?: () => void;
}

export interface PaystackResponse {
  reference: string;
  status: string;
  message: string;
  trans: string;
  transaction: string;
  trxref: string;
}

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: PaystackConfig) => {
        openIframe: () => void;
      };
    };
  }
}

export class PaystackService {
  private static instance: PaystackService;
  private isScriptLoaded = false;

  private constructor() {}

  public static getInstance(): PaystackService {
    if (!PaystackService.instance) {
      PaystackService.instance = new PaystackService();
    }
    return PaystackService.instance;
  }

  public async loadScript(): Promise<void> {
    if (this.isScriptLoaded) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = () => {
        this.isScriptLoaded = true;
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load Paystack script'));
      };
      document.head.appendChild(script);
    });
  }

  public async initializePayment(config: PaystackConfig): Promise<void> {
    await this.loadScript();

    if (!window.PaystackPop) {
      throw new Error('Paystack script not loaded properly');
    }

    const handler = window.PaystackPop.setup({
      key: config.publicKey,
      email: config.email,
      amount: config.amount,
      ref: config.reference,
      currency: config.currency || 'USD',
      metadata: config.metadata,
      callback: config.callback,
      onClose: config.onClose,
    });

    handler.openIframe();
  }

  public generateReference(): string {
    return `PSK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public validateAmount(amount: number): boolean {
    return amount > 0 && Number.isInteger(amount);
  }

  public convertToKobo(nairaAmount: number): number {
    return Math.round(nairaAmount * 100);
  }

  public convertToCents(dollarAmount: number): number {
    return Math.round(dollarAmount * 100);
  }
}

// Export convenience methods
export const paystack = PaystackService.getInstance();

export const initializePaystackPayment = (config: PaystackConfig) => {
  return paystack.initializePayment(config);
};

export const generatePaymentReference = () => {
  return paystack.generateReference();
};

// Payment status constants
export const PAYMENT_STATUS = {
  SUCCESS: 'success',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

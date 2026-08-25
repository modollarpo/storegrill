import { Money, createMoney, addMoney, multiplyMoney } from './money';

export interface TaxRule {
  id: string;
  name: string;
  rate: number;
  type: 'VAT' | 'GST' | 'SALES_TAX' | 'IMPORT_DUTY';
  categoryId?: string;
  minAmount?: bigint;
  enabled: boolean;
}

export interface TaxCalculationInput {
  subtotal: Money;
  items: Array<{
    productId: string;
    categoryId: string;
    priceMinorUnits: bigint;
    quantity: number;
  }>;
  regionKey: string;
  shippingCost: Money;
}

export interface TaxCalculationResult {
  totalTax: Money;
  taxLines: Array<{
    name: string;
    type: string;
    rate: number;
    amount: Money;
  }>;
}

export function calculateTax(
  input: TaxCalculationInput,
  rules: TaxRule[],
): TaxCalculationResult {
  const applicableRules = rules.filter(rule => {
    if (!rule.enabled) return false;
    if (rule.minAmount && input.subtotal.amountMinorUnits < rule.minAmount) return false;
    return true;
  });

  const taxLines: TaxCalculationResult['taxLines'] = [];
  let totalTax = createMoney(0n, input.subtotal.currencyCode);

  for (const rule of applicableRules) {
    let taxableAmount = input.subtotal.amountMinorUnits;

    if (rule.categoryId) {
      taxableAmount = input.items
        .filter(item => item.categoryId === rule.categoryId)
        .reduce((sum, item) => sum + item.priceMinorUnits * BigInt(item.quantity), 0n);
    }

    const taxAmount = BigInt(Math.round(Number(taxableAmount) * rule.rate));
    const taxMoney = createMoney(taxAmount, input.subtotal.currencyCode);

    taxLines.push({
      name: rule.name,
      type: rule.type,
      rate: rule.rate,
      amount: taxMoney,
    });

    totalTax = addMoney(totalTax, taxMoney);
  }

  return { totalTax, taxLines };
}

export function calculateItemTax(
  priceMinorUnits: bigint,
  quantity: number,
  rules: TaxRule[],
  categoryId?: string,
): bigint {
  const applicableRules = rules.filter(rule => {
    if (!rule.enabled) return false;
    if (rule.categoryId && rule.categoryId !== categoryId) return false;
    return true;
  });

  const itemTotal = priceMinorUnits * BigInt(quantity);

  return applicableRules.reduce((total, rule) => {
    const tax = BigInt(Math.round(Number(itemTotal) * rule.rate));
    return total + tax;
  }, 0n);
}

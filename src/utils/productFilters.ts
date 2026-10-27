export const UNKNOWN_PRODUCTS_CODE = 'Unknown Products';
export const UNASSIGNED_PRODUCTS_CODE = 'UNASSIGNED';

export const normalizeProductCode = (code: unknown) => String(code || '').toUpperCase().trim();
export const compactProductCode = (code: unknown) => normalizeProductCode(code).replace(/[\s_-]+/g, '');

export const isCountedProductCode = (code: unknown) => {
  const normalizedCode = normalizeProductCode(code);
  const compactCode = compactProductCode(code);
  return normalizedCode !== normalizeProductCode(UNKNOWN_PRODUCTS_CODE)
    && compactCode !== UNASSIGNED_PRODUCTS_CODE;
};

export const isCountedProduct = (product: { product_code?: string; code?: string } | null | undefined) => isCountedProductCode(product?.product_code || product?.code);

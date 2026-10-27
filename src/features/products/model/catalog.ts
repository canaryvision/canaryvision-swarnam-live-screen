import type { FirebaseRecord, ProductCatalog, CatalogItem } from '../../../types';
interface CatalogGroup { id: string; name: string; category: string; items: { name: string; code: string; createdAt: unknown; updatedAt: unknown }[] }
import { normalizeProductCode } from '../../../utils/productFilters.ts';

const getProductCatalogCode = (item: FirebaseRecord = {}) => (
  item.code || item.productCode || item.product_code || item.productId || item.product_id || ''
);

const getProductCatalogName = (item: FirebaseRecord = {}, fallbackCode = '') => (
  item.name || item.productName || item.product_name || item.title || fallbackCode
);

const addCatalogItem = (catalog: ProductCatalog, code: string, itemObj: CatalogItem) => {
  const upperCode = normalizeProductCode(code);
  if (!upperCode) return;

  catalog[upperCode] = itemObj;
  catalog[upperCode.replace(/\s+/g, '')] = itemObj;
  catalog[upperCode.replace(/[^A-Z0-9]/g, '')] = itemObj;
};


export const buildProductCatalog = (documents: { id: string; data: FirebaseRecord }[]) => {
  const catalog: ProductCatalog = {};
  const groups: CatalogGroup[] = [];

  documents.forEach((record) => {
    const data = record.data;
    const items = [];
    
    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((item: FirebaseRecord) => {
        const itemCode = getProductCatalogCode(item);
        const itemName = getProductCatalogName(item, itemCode);
        items.push({
          name: itemName,
          code: itemCode,
          createdAt: item.createdAt || item.createTime || item.created_at || '',
          updatedAt: item.updatedAt || item.updateTime || item.updated_at || ''
        });
        if (!itemCode) return;
        const itemObj = {
          name: itemName,
          category: data.name || "OTHER"
        };
        addCatalogItem(catalog, itemCode, itemObj);
      });
    } else if (data.name || data.productName || data.product_name || data.code || data.productCode || data.product_code) {
      const itemCode = getProductCatalogCode(data);
      const itemName = getProductCatalogName(data, itemCode);
      items.push({
        name: itemName,
        code: itemCode,
        createdAt: data.createdAt || data.createTime || data.created_at || '',
        updatedAt: data.updatedAt || data.updateTime || data.updated_at || ''
      });
      if (itemCode) {
        const itemObj = {
          name: itemName,
          category: data.category || "OTHER"
        };
        addCatalogItem(catalog, itemCode, itemObj);
      }
    }

    groups.push({
      id: record.id,
      name: data.name || record.id,
      category: data.category || data.parentCategory || data.parent_category || '',
      items: items
    });
  });

  return { catalog, groups };
};

import type { ProductionData } from '../types';
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLiveSnapshot, selectAvailableProductionDate } from './liveSnapshot.ts';
test('real record shapes select latest vehicle/product and next-calendar-day ERP', () => {
 const data = buildLiveSnapshot({ '2026-10-20': {}, '2026-10-21': {
  KL41X5372: { products: { '500X24NV': ['2026-10-21 06:20:00', '2026-10-21 06:21:00'], DS10: ['2026-10-21 06:19:00'] } },
  KL41A1234: { products: { DS10: ['2026-10-21 06:18:00'] } }
 } }, { '2026-10-20': { docData: null }, '2026-10-21': { docData: { 'KL 41 X 5372': { items: { '500X24NV': 6 } } } } }, '2026-10-20');
 assert.equal(data.vehicle!.plate, 'KL41X5372'); assert.equal(data.product!.product_code, '500X24NV');
 assert.equal(data.loaded, 2); assert.equal(data.target, 6); assert.equal(data.vehicle!.quantity, 3);
 assert.equal(data.allocation.hasAllocation, true);
});
test('empty and unavailable data do not invent counts', () => {
 const data = buildLiveSnapshot({}, {}, '2026-10-20');
 assert.equal(data.vehicle, null); assert.equal(data.product, null); assert.equal(data.loaded, 0);
 assert.equal(data.allocation.hasAllocation, false); assert.equal(data.allocation.isLoading, true);
});

test('empty new production day shows the latest previous counts and switches when new counts arrive', () => {
 const production: ProductionData = { '2026-10-21': { KL41X5372: { products: { DS10: ['2026-10-21 22:00:00'] } } } };
 assert.equal(selectAvailableProductionDate(production, '2026-10-22', ['2026-10-21', '2026-10-20']), '2026-10-21');
 assert.equal(selectAvailableProductionDate(production, '2026-10-22'), '2026-10-22');
 production['2026-10-22'] = { KL41X5372: { products: { DS10: ['2026-10-22 13:00:00'] } } };
 assert.equal(selectAvailableProductionDate(production, '2026-10-22', ['2026-10-21']), '2026-10-22');
});

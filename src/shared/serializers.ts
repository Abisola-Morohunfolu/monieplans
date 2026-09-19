import { fromCents } from './utils';

export interface TransactionRow {
  id: string;
  type: string;
  amountCents: number;
  currency: string;
  occurredOn: string;
  categoryId: string | null;
  payee: string | null;
  note: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  categoryName?: string | null;
  categoryCode?: string | null;
}

export function serializeTransaction(t: TransactionRow) {
  return {
    id: t.id,
    type: t.type,
    amount: fromCents(t.amountCents),
    currency: t.currency,
    occurredOn: t.occurredOn,
    categoryId: t.categoryId,
    categoryName: t.categoryName ?? null,
    categoryCode: t.categoryCode ?? null,
    payee: t.payee,
    note: t.note,
    source: t.source,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export function serializeCategory(c: {
  id: string;
  code: string;
  name: string;
  groupName: string | null;
  kind: string;
  isSystem: boolean;
}) {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    groupName: c.groupName,
    kind: c.kind,
    isSystem: c.isSystem,
  };
}

export function serializeBudget(b: {
  id: string;
  month: string;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: b.id,
    month: b.month,
    currency: b.currency,
    status: b.status,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export function serializeCategoryBudget(cb: {
  categoryId: string;
  assignedCents: number;
}) {
  return {
    categoryId: cb.categoryId,
    assigned: fromCents(cb.assignedCents),
  };
}

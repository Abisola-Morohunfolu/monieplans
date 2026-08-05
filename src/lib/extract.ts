import LlamaCloud from '@llamaindex/llama-cloud';

function getClient(): LlamaCloud {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY ?? '';
  return new LlamaCloud({ apiKey });
}

async function extractFromFile<T>(
  fileBuffer: ArrayBuffer,
  fileName: string,
  mimeType: string,
  schema: Record<string, unknown>,
  tier: 'agentic' | 'agentic_plus' = 'agentic',
): Promise<T> {
  const client = getClient();

  const upload = await client.files.create({
    file: new File([fileBuffer], fileName, { type: mimeType }),
    purpose: 'extract',
  });

  const result = await client.extract.run({
    file_input: upload.id,
    configuration: {
      data_schema: schema,
      tier,
    },
  } as Parameters<typeof client.extract.run>[0]);

  const raw = result.extract_result;
  if (!raw) {
    throw new Error('Extract returned empty result');
  }

  return raw as unknown as T;
}

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  direction: 'debit' | 'credit';
  channel: string | null;
  reference: string | null;
  transactionType:
    | 'transfer_out'
    | 'transfer_in'
    | 'card_payment'
    | 'bank_charge'
    | 'interest'
    | 'savings_movement'
    | 'other';
  merchantName: string | null;
  isInternalBookkeeping: boolean;
  parentReference: string | null;
}

export interface StatementSummary {
  openingBalance: number;
  closingBalance: number;
  totalCredits: number;
  totalDebits: number;
  periodStart: string;
  periodEnd: string;
  creditCount: number;
  debitCount: number;
}

export interface ParsedStatement {
  transactions: ParsedTransaction[];
  summary: StatementSummary;
}

const STATEMENT_SCHEMA = {
  type: 'object',
  properties: {
    transactions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Transaction date in YYYY-MM-DD format',
          },
          description: {
            type: 'string',
            description: 'Full transaction description text',
          },
          amount: {
            type: 'number',
            description: 'Absolute transaction amount as a positive number',
          },
          direction: {
            type: 'string',
            enum: ['debit', 'credit'],
            description: 'debit = money out, credit = money in',
          },
          channel: {
            type: ['string', 'null'],
            description: 'Transaction channel (Mobile, POS, ATM, Web) if found',
          },
          reference: {
            type: ['string', 'null'],
            description: 'Transaction reference number if found',
          },
          transactionType: {
            type: 'string',
            enum: [
              'transfer_out',
              'transfer_in',
              'card_payment',
              'bank_charge',
              'interest',
              'savings_movement',
              'other',
            ],
            description: 'Classification of transaction intent',
          },
          merchantName: {
            type: ['string', 'null'],
            description:
              'Merchant or recipient name extracted from description',
          },
          isInternalBookkeeping: {
            type: 'boolean',
            description:
              'True for internal bank movements (auto-save, wealth wrappers, fee charges that are secondary), NOT real external transactions',
          },
          parentReference: {
            type: ['string', 'null'],
            description:
              'If this is a wrapper row, put the reference of the real parent transaction',
          },
        },
        required: [
          'date',
          'description',
          'amount',
          'direction',
          'transactionType',
          'isInternalBookkeeping',
        ],
      },
    },
    summary: {
      type: 'object',
      properties: {
        openingBalance: { type: 'number' },
        closingBalance: { type: 'number' },
        totalCredits: { type: 'number' },
        totalDebits: { type: 'number' },
        periodStart: {
          type: 'string',
          description: 'Statement period start date YYYY-MM-DD',
        },
        periodEnd: {
          type: 'string',
          description: 'Statement period end date YYYY-MM-DD',
        },
        creditCount: { type: 'number' },
        debitCount: { type: 'number' },
      },
      required: [
        'openingBalance',
        'closingBalance',
        'totalCredits',
        'totalDebits',
      ],
    },
  },
  required: ['transactions', 'summary'],
};

export async function parseStatement(
  buffer: ArrayBuffer,
  fileName: string,
): Promise<ParsedStatement> {
  return extractFromFile<ParsedStatement>(
    buffer,
    fileName,
    'application/pdf',
    STATEMENT_SCHEMA,
    'agentic',
  );
}

export interface ParsedReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ParsedReceipt {
  merchantName: string | null;
  date: string | null;
  total: number | null;
  items: ParsedReceiptItem[];
}

const RECEIPT_SCHEMA = {
  type: 'object',
  properties: {
    merchantName: {
      type: ['string', 'null'],
      description: 'Store or merchant name',
    },
    date: {
      type: ['string', 'null'],
      description: 'Receipt date in YYYY-MM-DD format',
    },
    total: { type: ['number', 'null'], description: 'Total receipt amount' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Item name or description' },
          quantity: {
            type: 'number',
            description: 'Quantity purchased (default 1)',
          },
          unitPrice: {
            type: 'number',
            description: 'Price per unit (0 if not specified)',
          },
          totalPrice: {
            type: 'number',
            description: 'Total price for this line item',
          },
        },
        required: ['name', 'totalPrice'],
      },
    },
  },
  required: ['items'],
};

export async function parseReceipt(
  buffer: ArrayBuffer,
  fileName: string,
  mimeType: string,
): Promise<ParsedReceipt> {
  return extractFromFile<ParsedReceipt>(
    buffer,
    fileName,
    mimeType,
    RECEIPT_SCHEMA,
    'agentic',
  );
}

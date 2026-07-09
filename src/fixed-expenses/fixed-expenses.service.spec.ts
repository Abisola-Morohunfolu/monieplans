import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.provider';
import { FixedExpensesService } from './fixed-expenses.service';

describe('FixedExpensesService', () => {
  let service: FixedExpensesService;
  let db: any;

  let mockDb: any;
  let q: any;

  const createQueryMock = () => {
    const builder: any = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.from = jest.fn().mockReturnValue(builder);
    builder.where = jest.fn().mockReturnValue(builder);
    builder.orderBy = jest.fn().mockReturnValue(builder);
    builder.insert = jest.fn().mockReturnValue(builder);
    builder.values = jest.fn().mockReturnValue(builder);
    builder.returning = jest.fn().mockReturnValue(builder);
    builder.update = jest.fn().mockReturnValue(builder);
    builder.set = jest.fn().mockReturnValue(builder);
    builder.delete = jest.fn().mockReturnValue(builder);
    
    // Make it thenable
    builder.then = jest.fn().mockImplementation((resolve) => resolve([]));
    
    // Provide a helper to easily mock the resolved value for the next call
    builder.mockResolvedValueOnce = (val: any) => {
      builder.then.mockImplementationOnce((resolve: any) => resolve(val));
    };
    return builder;
  };

  beforeEach(async () => {
    q = createQueryMock();
    mockDb = {
      select: q.select,
      insert: q.insert,
      update: q.update,
      delete: q.delete,
      transaction: jest.fn().mockImplementation(async (cb) => cb(mockDb)),
      mockResolvedValueOnce: q.mockResolvedValueOnce,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FixedExpensesService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<FixedExpensesService>(FixedExpensesService);
    db = module.get(DRIZZLE);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTemplate', () => {
    it('should create and return a template without category', async () => {
      const dto = { name: 'Rent', amount: 1000 };
      const expectedTemplate = { id: '1', ...dto };
      mockDb.mockResolvedValueOnce([expectedTemplate]);

      const result = await service.createTemplate('user-1', dto as any);

      expect(result).toEqual(expectedTemplate);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should throw NotFoundException if category is provided but not found', async () => {
      const dto = { name: 'Rent', amount: 1000, categoryId: 'invalid-cat' };
      // mock the select -> from -> where for category check to return empty array
      mockDb.mockResolvedValueOnce([]);

      await expect(service.createTemplate('user-1', dto as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAllTemplates', () => {
    it('should return all templates for a user', async () => {
      const expectedTemplates = [{ id: '1', name: 'Rent' }];
      mockDb.mockResolvedValueOnce(expectedTemplates);

      const result = await service.findAllTemplates('user-1');

      expect(result).toEqual(expectedTemplates);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('findOneTemplate', () => {
    it('should return a template if found', async () => {
      const expectedTemplate = { id: '1', name: 'Rent' };
      mockDb.mockResolvedValueOnce([expectedTemplate]);

      const result = await service.findOneTemplate('user-1', '1');

      expect(result).toEqual(expectedTemplate);
    });

    it('should throw NotFoundException if template not found', async () => {
      mockDb.mockResolvedValueOnce([]);

      await expect(service.findOneTemplate('user-1', '1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTemplate', () => {
    it('should update and return the template', async () => {
      const dto = { name: 'New Rent' };
      const existingTemplate = { id: '1', name: 'Rent' };
      const updatedTemplate = { id: '1', ...dto };

      // first where is for findOneTemplate
      mockDb.mockResolvedValueOnce([existingTemplate]);
      // returning is for the update
      mockDb.mockResolvedValueOnce([updatedTemplate]);

      const result = await service.updateTemplate('user-1', '1', dto as any);

      expect(result).toEqual(updatedTemplate);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('deleteTemplate', () => {
    it('should delete the template if found', async () => {
      const existingTemplate = { id: '1', name: 'Rent' };
      mockDb.mockResolvedValueOnce([existingTemplate]);
      mockDb.mockResolvedValueOnce([]); // for delete

      await service.deleteTemplate('user-1', '1');

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('generateItemsForBudgetPeriod', () => {
    it('should throw NotFoundException if budget period not found', async () => {
      mockDb.mockResolvedValueOnce([]); // budget period check

      await expect(
        service.generateItemsForBudgetPeriod('user-1', 'budget-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return empty array if no active templates found', async () => {
      mockDb.mockResolvedValueOnce([{ id: 'budget-1' }]); // budget period found
      mockDb.mockResolvedValueOnce([]); // active templates check

      const result = await service.generateItemsForBudgetPeriod('user-1', 'budget-1');

      expect(result).toEqual([]);
    });

    it('should generate items if active templates exist', async () => {
      mockDb.mockResolvedValueOnce([{ id: 'budget-1', periodStartDate: '2026-07-01' }]); // budget period
      mockDb.mockResolvedValueOnce([
        { id: 'tpl-1', name: 'Rent', amount: '1000', defaultDueDay: 5, isActive: true },
      ]); // active templates

      const expectedItems = [{ id: 'item-1', name: 'Rent' }];
      mockDb.mockResolvedValueOnce(expectedItems); // for the returning() inside tx

      const result = await service.generateItemsForBudgetPeriod('user-1', 'budget-1');

      expect(result).toEqual(expectedItems);
      expect(mockDb.transaction).toHaveBeenCalled();
    });
  });
});

import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FixedExpensesRepository } from './fixed-expenses.repository';
import { FixedExpensesService } from './fixed-expenses.service';

describe('FixedExpensesService', () => {
  let service: FixedExpensesService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      findCategory: jest.fn(),
      createTemplate: jest.fn(),
      findAllTemplates: jest.fn(),
      findOneTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      findBudgetPeriod: jest.fn(),
      findActiveTemplates: jest.fn(),
      insertFixedExpenseItems: jest.fn(),
      transaction: jest.fn().mockImplementation(async (cb) => cb(mockRepo)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FixedExpensesService,
        {
          provide: FixedExpensesRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<FixedExpensesService>(FixedExpensesService);
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
      mockRepo.createTemplate.mockResolvedValueOnce(expectedTemplate);

      const result = await service.createTemplate('user-1', dto as any);

      expect(result).toEqual(expectedTemplate);
      expect(mockRepo.createTemplate).toHaveBeenCalled();
    });

    it('should throw NotFoundException if category is provided but not found', async () => {
      const dto = { name: 'Rent', amount: 1000, categoryId: 'invalid-cat' };
      mockRepo.findCategory.mockResolvedValueOnce(null);

      await expect(service.createTemplate('user-1', dto as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllTemplates', () => {
    it('should return all templates for a user', async () => {
      const expectedTemplates = [{ id: '1', name: 'Rent' }];
      mockRepo.findAllTemplates.mockResolvedValueOnce(expectedTemplates);

      const result = await service.findAllTemplates('user-1');

      expect(result).toEqual(expectedTemplates);
      expect(mockRepo.findAllTemplates).toHaveBeenCalled();
    });
  });

  describe('findOneTemplate', () => {
    it('should return a template if found', async () => {
      const expectedTemplate = { id: '1', name: 'Rent' };
      mockRepo.findOneTemplate.mockResolvedValueOnce(expectedTemplate);

      const result = await service.findOneTemplate('user-1', '1');

      expect(result).toEqual(expectedTemplate);
    });

    it('should throw NotFoundException if template not found', async () => {
      mockRepo.findOneTemplate.mockResolvedValueOnce(null);

      await expect(service.findOneTemplate('user-1', '1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTemplate', () => {
    it('should update and return the template', async () => {
      const dto = { name: 'New Rent' };
      const existingTemplate = { id: '1', name: 'Rent' };
      const updatedTemplate = { id: '1', ...dto };

      mockRepo.findOneTemplate.mockResolvedValueOnce(existingTemplate);
      mockRepo.updateTemplate.mockResolvedValueOnce(updatedTemplate);

      const result = await service.updateTemplate('user-1', '1', dto as any);

      expect(result).toEqual(updatedTemplate);
      expect(mockRepo.updateTemplate).toHaveBeenCalled();
    });
  });

  describe('deleteTemplate', () => {
    it('should delete the template if found', async () => {
      const existingTemplate = { id: '1', name: 'Rent' };
      mockRepo.findOneTemplate.mockResolvedValueOnce(existingTemplate);
      mockRepo.deleteTemplate.mockResolvedValueOnce();

      await service.deleteTemplate('user-1', '1');

      expect(mockRepo.deleteTemplate).toHaveBeenCalled();
    });
  });

  describe('generateItemsForBudgetPeriod', () => {
    it('should throw NotFoundException if budget period not found', async () => {
      mockRepo.findBudgetPeriod.mockResolvedValueOnce(null);

      await expect(
        service.generateItemsForBudgetPeriod('user-1', 'budget-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return empty array if no active templates found', async () => {
      mockRepo.findBudgetPeriod.mockResolvedValueOnce({ id: 'budget-1' });
      mockRepo.findActiveTemplates.mockResolvedValueOnce([]);

      const result = await service.generateItemsForBudgetPeriod('user-1', 'budget-1');

      expect(result).toEqual([]);
    });

    it('should generate items if active templates exist', async () => {
      mockRepo.findBudgetPeriod.mockResolvedValueOnce({ id: 'budget-1', periodStartDate: '2026-07-01' });
      mockRepo.findActiveTemplates.mockResolvedValueOnce([
        { id: 'tpl-1', name: 'Rent', amount: '1000', defaultDueDay: 5, isActive: true },
      ]);

      const expectedItems = [{ id: 'item-1', name: 'Rent' }];
      mockRepo.insertFixedExpenseItems.mockResolvedValueOnce(expectedItems);

      const result = await service.generateItemsForBudgetPeriod('user-1', 'budget-1');

      expect(result).toEqual(expectedItems);
      expect(mockRepo.transaction).toHaveBeenCalled();
    });
  });
});

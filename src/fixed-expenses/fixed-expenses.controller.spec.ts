import { Test, TestingModule } from '@nestjs/testing';
import { FixedExpensesController } from './fixed-expenses.controller';
import { FixedExpensesService } from './fixed-expenses.service';

jest.mock('../auth/auth.guard', () => ({
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn(() => true),
  })),
}));

describe('FixedExpensesController', () => {
  let controller: FixedExpensesController;
  let service: FixedExpensesService;

  const mockFixedExpensesService = {
    createTemplate: jest.fn(),
    findAllTemplates: jest.fn(),
    findOneTemplate: jest.fn(),
    updateTemplate: jest.fn(),
    deleteTemplate: jest.fn(),
    generateItemsForBudgetPeriod: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FixedExpensesController],
      providers: [
        {
          provide: FixedExpensesService,
          useValue: mockFixedExpensesService,
        },
      ],
    }).compile();

    controller = module.get<FixedExpensesController>(FixedExpensesController);
    service = module.get<FixedExpensesService>(FixedExpensesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createTemplate', () => {
    it('should call service createTemplate and return result', async () => {
      const dto = { name: 'Rent', amount: 1000 };
      mockFixedExpensesService.createTemplate.mockResolvedValue({ id: '1', ...dto });

      const result = await controller.createTemplate('user-1', dto as any);

      expect(service.createTemplate).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual({ id: '1', ...dto });
    });
  });

  describe('findAllTemplates', () => {
    it('should call service findAllTemplates and return result', async () => {
      mockFixedExpensesService.findAllTemplates.mockResolvedValue([{ id: '1', name: 'Rent' }]);

      const result = await controller.findAllTemplates('user-1');

      expect(service.findAllTemplates).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([{ id: '1', name: 'Rent' }]);
    });
  });

  describe('findOneTemplate', () => {
    it('should call service findOneTemplate and return result', async () => {
      mockFixedExpensesService.findOneTemplate.mockResolvedValue({ id: '1', name: 'Rent' });

      const result = await controller.findOneTemplate('user-1', '1');

      expect(service.findOneTemplate).toHaveBeenCalledWith('user-1', '1');
      expect(result).toEqual({ id: '1', name: 'Rent' });
    });
  });

  describe('updateTemplate', () => {
    it('should call service updateTemplate and return result', async () => {
      const dto = { name: 'New Rent' };
      mockFixedExpensesService.updateTemplate.mockResolvedValue({ id: '1', ...dto });

      const result = await controller.updateTemplate('user-1', '1', dto as any);

      expect(service.updateTemplate).toHaveBeenCalledWith('user-1', '1', dto);
      expect(result).toEqual({ id: '1', ...dto });
    });
  });

  describe('deleteTemplate', () => {
    it('should call service deleteTemplate and return result', async () => {
      mockFixedExpensesService.deleteTemplate.mockResolvedValue(undefined);

      await controller.deleteTemplate('user-1', '1');

      expect(service.deleteTemplate).toHaveBeenCalledWith('user-1', '1');
    });
  });

  describe('generateItemsForBudgetPeriod', () => {
    it('should call service generateItemsForBudgetPeriod and return result', async () => {
      mockFixedExpensesService.generateItemsForBudgetPeriod.mockResolvedValue([{ id: 'item-1' }]);

      const result = await controller.generateItemsForBudgetPeriod('user-1', 'budget-1');

      expect(service.generateItemsForBudgetPeriod).toHaveBeenCalledWith('user-1', 'budget-1');
      expect(result).toEqual([{ id: 'item-1' }]);
    });
  });
});

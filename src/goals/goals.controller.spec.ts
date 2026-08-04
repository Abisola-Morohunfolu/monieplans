import { Test, TestingModule } from '@nestjs/testing';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';

jest.mock('../auth/auth.guard', () => ({
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn(() => true),
  })),
}));

describe('GoalsController', () => {
  let controller: GoalsController;
  let mockService: any;

  const mockGoal = {
    id: 'goal-1',
    name: 'Emergency Fund',
    targetAmount: '100000',
    status: 'active',
  };

  beforeEach(async () => {
    mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      archive: jest.fn(),
      reserveInBudget: jest.fn(),
      getReservationsForPeriod: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoalsController],
      providers: [
        {
          provide: GoalsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<GoalsController>(GoalsController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with userId and dto', async () => {
      const dto = { name: 'Emergency Fund', targetAmount: 100000 };
      mockService.create.mockResolvedValueOnce(mockGoal);

      const result = await controller.create('user-1', dto as any);

      expect(result).toEqual(mockGoal);
      expect(mockService.create).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with userId', async () => {
      mockService.findAll.mockResolvedValueOnce([mockGoal]);

      const result = await controller.findAll('user-1');

      expect(result).toEqual([mockGoal]);
      expect(mockService.findAll).toHaveBeenCalledWith('user-1');
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with userId and id', async () => {
      mockService.findOne.mockResolvedValueOnce(mockGoal);

      const result = await controller.findOne('user-1', 'goal-1');

      expect(result).toEqual(mockGoal);
      expect(mockService.findOne).toHaveBeenCalledWith('user-1', 'goal-1');
    });
  });

  describe('update', () => {
    it('should call service.update with userId, id, and dto', async () => {
      const dto = { name: 'Updated Goal' };
      const updated = { ...mockGoal, ...dto };
      mockService.update.mockResolvedValueOnce(updated);

      const result = await controller.update('user-1', 'goal-1', dto as any);

      expect(result).toEqual(updated);
      expect(mockService.update).toHaveBeenCalledWith('user-1', 'goal-1', dto);
    });
  });

  describe('archive', () => {
    it('should call service.archive with userId and id', async () => {
      const archived = { ...mockGoal, status: 'archived' };
      mockService.archive.mockResolvedValueOnce(archived);

      const result = await controller.archive('user-1', 'goal-1');

      expect(result).toEqual(archived);
      expect(mockService.archive).toHaveBeenCalledWith('user-1', 'goal-1');
    });
  });

  describe('reserveInBudget', () => {
    it('should call service.reserveInBudget with userId and budgetPeriodId', async () => {
      const reservations = [{ id: 'res-1' }];
      mockService.reserveInBudget.mockResolvedValueOnce(reservations);

      const result = await controller.reserveInBudget('user-1', 'budget-1');

      expect(result).toEqual(reservations);
      expect(mockService.reserveInBudget).toHaveBeenCalledWith('user-1', 'budget-1');
    });
  });

  describe('getReservations', () => {
    it('should call service.getReservationsForPeriod with userId and budgetPeriodId', async () => {
      const reservations = [{ id: 'res-1' }];
      mockService.getReservationsForPeriod.mockResolvedValueOnce(reservations);

      const result = await controller.getReservations('user-1', 'budget-1');

      expect(result).toEqual(reservations);
      expect(mockService.getReservationsForPeriod).toHaveBeenCalledWith('user-1', 'budget-1');
    });
  });
});

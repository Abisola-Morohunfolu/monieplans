import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GoalsRepository } from './goals.repository';
import { GoalsService } from './goals.service';

describe('GoalsService', () => {
  let service: GoalsService;
  let mockRepo: any;

  const mockGoal = {
    id: 'goal-1',
    userId: 'user-1',
    name: 'Emergency Fund',
    targetAmount: '100000',
    currentSavedAmount: '20000',
    targetDate: null,
    priorityRank: 0,
    status: 'active',
    reserveInBudget: false,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockRepo = {
      createGoal: jest.fn(),
      findAllGoals: jest.fn(),
      findOneGoal: jest.fn(),
      updateGoal: jest.fn(),
      findBudgetPeriod: jest.fn(),
      findActiveGoalsForReservation: jest.fn(),
      upsertReservation: jest.fn(),
      findReservationsByPeriod: jest.fn(),
      getTotalReservedAmount: jest.fn(),
      transaction: jest.fn().mockImplementation(async (cb) => cb(mockRepo)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        {
          provide: GoalsRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<GoalsService>(GoalsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create and return a goal', async () => {
      const dto = { name: 'Emergency Fund', targetAmount: 100000 };
      mockRepo.createGoal.mockResolvedValueOnce(mockGoal);

      const result = await service.create('user-1', dto as any);

      expect(result).toEqual(mockGoal);
      expect(mockRepo.createGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          name: 'Emergency Fund',
          targetAmount: '100000',
          priorityRank: 0,
          reserveInBudget: false,
        }),
      );
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all goals for a user', async () => {
      mockRepo.findAllGoals.mockResolvedValueOnce([mockGoal]);

      const result = await service.findAll('user-1');

      expect(result).toEqual([mockGoal]);
      expect(mockRepo.findAllGoals).toHaveBeenCalledWith('user-1');
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a goal when found', async () => {
      mockRepo.findOneGoal.mockResolvedValueOnce(mockGoal);

      const result = await service.findOne('user-1', 'goal-1');

      expect(result).toEqual(mockGoal);
    });

    it('should throw NotFoundException when goal not found', async () => {
      mockRepo.findOneGoal.mockResolvedValueOnce(null);

      await expect(service.findOne('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update and return the goal', async () => {
      const updated = { ...mockGoal, name: 'Rainy Day Fund' };
      mockRepo.findOneGoal.mockResolvedValueOnce(mockGoal);
      mockRepo.updateGoal.mockResolvedValueOnce(updated);

      const result = await service.update('user-1', 'goal-1', { name: 'Rainy Day Fund' } as any);

      expect(result).toEqual(updated);
      expect(mockRepo.updateGoal).toHaveBeenCalled();
    });

    it('should throw NotFoundException if goal not found', async () => {
      mockRepo.findOneGoal.mockResolvedValueOnce(null);

      await expect(service.update('user-1', 'goal-1', {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── archive ──────────────────────────────────────────────────────────────

  describe('archive', () => {
    it('should set status to archived', async () => {
      const archived = { ...mockGoal, status: 'archived' };
      mockRepo.findOneGoal.mockResolvedValueOnce(mockGoal);
      mockRepo.updateGoal.mockResolvedValueOnce(archived);

      const result = await service.archive('user-1', 'goal-1');

      expect(result.status).toBe('archived');
      expect(mockRepo.updateGoal).toHaveBeenCalledWith(
        'user-1',
        'goal-1',
        expect.objectContaining({ status: 'archived' }),
      );
    });

    it('should throw NotFoundException if goal not found', async () => {
      mockRepo.findOneGoal.mockResolvedValueOnce(null);

      await expect(service.archive('user-1', 'goal-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── reserveInBudget ──────────────────────────────────────────────────────

  describe('reserveInBudget', () => {
    it('should throw NotFoundException if budget period not found', async () => {
      mockRepo.findBudgetPeriod.mockResolvedValueOnce(null);

      await expect(service.reserveInBudget('user-1', 'budget-1')).rejects.toThrow(NotFoundException);
    });

    it('should return empty array if no reservable goals exist', async () => {
      mockRepo.findBudgetPeriod.mockResolvedValueOnce({ id: 'budget-1' });
      mockRepo.findActiveGoalsForReservation.mockResolvedValueOnce([]);

      const result = await service.reserveInBudget('user-1', 'budget-1');

      expect(result).toEqual([]);
      expect(mockRepo.upsertReservation).not.toHaveBeenCalled();
    });

    it('should upsert reservations for each reservable goal without a target date', async () => {
      const goal = { ...mockGoal, reserveInBudget: true, targetDate: null };
      const reservation = { id: 'res-1', goalId: 'goal-1', reservedAmount: '80000' };

      mockRepo.findBudgetPeriod.mockResolvedValueOnce({ id: 'budget-1' });
      mockRepo.findActiveGoalsForReservation.mockResolvedValueOnce([goal]);
      mockRepo.upsertReservation.mockResolvedValueOnce(reservation);

      const result = await service.reserveInBudget('user-1', 'budget-1');

      expect(result).toEqual([reservation]);
      // remaining = 100000 - 20000 = 80000, no targetDate so full remaining is reserved
      expect(mockRepo.upsertReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          budgetPeriodId: 'budget-1',
          goalId: 'goal-1',
          reservedAmount: '80000.00',
          feasibilityStatus: 'on_track',
        }),
        mockRepo,
      );
    });

    it('should mark feasibility as at_risk when contribution > 25% but ≤ 50% of available budget', async () => {
      const goal = {
        ...mockGoal,
        reserveInBudget: true,
        targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 31).toISOString().split('T')[0],
        targetAmount: '50000',
        currentSavedAmount: '0',
      };

      mockRepo.findBudgetPeriod.mockResolvedValueOnce({ id: 'budget-1' });
      mockRepo.findActiveGoalsForReservation.mockResolvedValueOnce([goal]);
      mockRepo.upsertReservation.mockResolvedValueOnce({ id: 'res-1' });

      // recommendedAmount ≈ 50000 (1 month away), availableBudget = 100000
      // 50000 > 100000 * 0.5 is false (equal, not greater), so → at_risk
      // 50000 > 100000 * 0.25 is true → at_risk
      await service.reserveInBudget('user-1', 'budget-1', 100000);

      expect(mockRepo.upsertReservation).toHaveBeenCalledWith(
        expect.objectContaining({ feasibilityStatus: 'at_risk' }),
        mockRepo,
      );
    });

    it('should mark feasibility as unrealistic when contribution > 50% of available budget', async () => {
      const goal = {
        ...mockGoal,
        reserveInBudget: true,
        targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 31).toISOString().split('T')[0],
        targetAmount: '60000',
        currentSavedAmount: '0',
      };

      mockRepo.findBudgetPeriod.mockResolvedValueOnce({ id: 'budget-1' });
      mockRepo.findActiveGoalsForReservation.mockResolvedValueOnce([goal]);
      mockRepo.upsertReservation.mockResolvedValueOnce({ id: 'res-1' });

      // recommendedAmount ≈ 60000 (1 month away), availableBudget = 100000
      // 60000 > 100000 * 0.5 → true → unrealistic
      await service.reserveInBudget('user-1', 'budget-1', 100000);

      expect(mockRepo.upsertReservation).toHaveBeenCalledWith(
        expect.objectContaining({ feasibilityStatus: 'unrealistic' }),
        mockRepo,
      );
    });

    it('should use external tx when provided and not open its own transaction', async () => {
      const externalTx = {};
      const goal = { ...mockGoal, reserveInBudget: true, targetDate: null };

      mockRepo.findBudgetPeriod.mockResolvedValueOnce({ id: 'budget-1' });
      mockRepo.findActiveGoalsForReservation.mockResolvedValueOnce([goal]);
      mockRepo.upsertReservation.mockResolvedValueOnce({ id: 'res-1' });

      await service.reserveInBudget('user-1', 'budget-1', undefined, externalTx);

      expect(mockRepo.transaction).not.toHaveBeenCalled();
      expect(mockRepo.upsertReservation).toHaveBeenCalledWith(
        expect.any(Object),
        externalTx,
      );
    });
  });

  // ─── getReservationsForPeriod ─────────────────────────────────────────────

  describe('getReservationsForPeriod', () => {
    it('should return reservations for a budget period', async () => {
      const reservations = [{ id: 'res-1' }];
      mockRepo.findBudgetPeriod.mockResolvedValueOnce({ id: 'budget-1' });
      mockRepo.findReservationsByPeriod.mockResolvedValueOnce(reservations);

      const result = await service.getReservationsForPeriod('user-1', 'budget-1');

      expect(result).toEqual(reservations);
    });

    it('should throw NotFoundException if budget period not found', async () => {
      mockRepo.findBudgetPeriod.mockResolvedValueOnce(null);

      await expect(service.getReservationsForPeriod('user-1', 'budget-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getTotalReservedAmount ───────────────────────────────────────────────

  describe('getTotalReservedAmount', () => {
    it('should delegate to repository', async () => {
      mockRepo.getTotalReservedAmount.mockResolvedValueOnce(50000);

      const result = await service.getTotalReservedAmount('budget-1');

      expect(result).toBe(50000);
      expect(mockRepo.getTotalReservedAmount).toHaveBeenCalledWith('budget-1', undefined);
    });
  });
});

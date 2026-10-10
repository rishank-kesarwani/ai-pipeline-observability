import { AuthService } from './auth.service';
import { MemoryStoreService } from '../database/memory-store.service';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let authService: AuthService;
  let memoryStore: MemoryStoreService;
  let mockJwtService: any;
  let mockConfigService: any;

  beforeEach(() => {
    memoryStore = new MemoryStoreService();

    const mockUserModel: any = {
      findOne: jest.fn().mockImplementation(() => {
        throw new Error('Mongo offline');
      }),
      create: jest.fn().mockImplementation(() => {
        throw new Error('Mongo offline');
      }),
      updateOne: jest.fn().mockImplementation(() => {
        throw new Error('Mongo offline');
      }),
    };

    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token-xyz'),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('mock-jwt-secret-key-32-chars-long'),
    };

    authService = new AuthService(
      mockUserModel,
      memoryStore,
      mockJwtService,
      mockConfigService,
    );
  });

  it('should register a new pipeline operator and hash their password', async () => {
    const result = await authService.register({
      email: 'operator@pipeline.local',
      password: 'StrongPassword123!',
      name: 'Alex Rivera',
    });

    expect(result.user.email).toBe('operator@pipeline.local');
    expect(result.user.name).toBe('Alex Rivera');
    expect(result.accessToken).toBe('mock-jwt-token-xyz');
    expect(result.refreshToken).toBe('mock-jwt-token-xyz');

    // Verify stored user in memory store has hashed password
    const stored = memoryStore.findOne<any>('users', (u) => u.email === 'operator@pipeline.local');
    expect(stored).toBeDefined();
    expect(stored.passwordHash).not.toBe('StrongPassword123!');
    const isMatch = await bcrypt.compare('StrongPassword123!', stored.passwordHash);
    expect(isMatch).toBe(true);
  });

  it('should reject login with invalid password', async () => {
    await authService.register({
      email: 'operator2@pipeline.local',
      password: 'CorrectPassword123!',
      name: 'Taylor Operator',
    });

    await expect(
      authService.login({
        email: 'operator2@pipeline.local',
        password: 'WrongPassword!',
      }),
    ).rejects.toThrow('Invalid email or password');
  });

  it('should log in successfully with valid credentials', async () => {
    await authService.register({
      email: 'operator3@pipeline.local',
      password: 'ValidPassword123!',
      name: 'Jordan Operator',
    });

    const loginRes = await authService.login({
      email: 'operator3@pipeline.local',
      password: 'ValidPassword123!',
    });

    expect(loginRes.user.email).toBe('operator3@pipeline.local');
    expect(loginRes.accessToken).toBe('mock-jwt-token-xyz');
  });
});

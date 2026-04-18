/**
 * RegistrationSystem.test.ts
 * 注册系统单元测试
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import {
  RegistrationSystem,
  UserRegistry,
  RegistrationFlow,
  OnboardingManager,
  RegistrationValidator,
  AntiSpamFilter,
} from '../src/modules/registration';
import {
  User,
  UserStatus,
  RegistrationChannelType,
  EmailRegistrationRequest,
} from '../src/modules/registration/types';

describe('RegistrationSystem', () => {
  let registrationSystem: RegistrationSystem;
  let userRegistry: UserRegistry;
  let registrationFlow: RegistrationFlow;
  let onboardingManager: OnboardingManager;

  beforeEach(() => {
    // 创建新实例以避免状态污染
    registrationSystem = RegistrationSystem.getInstance();
    userRegistry = new UserRegistry();
    registrationFlow = new RegistrationFlow(userRegistry);
    onboardingManager = new OnboardingManager();
  });

  describe('UserRegistry', () => {
    test('should create a new user', async () => {
      const user: User = {
        id: 'test_user_1',
        tenantId: 'tenant_1',
        username: 'testuser',
        email: 'test@example.com',
        registeredVia: RegistrationChannelType.EMAIL,
        type: 'regular' as any,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createdUser = await userRegistry.createUser(user);
      
      expect(createdUser.id).toBe('test_user_1');
      expect(createdUser.username).toBe('testuser');
      expect(createdUser.email).toBe('test@example.com');
    });

    test('should get user by id', async () => {
      const user: User = {
        id: 'test_user_2',
        tenantId: 'tenant_1',
        username: 'testuser2',
        registeredVia: RegistrationChannelType.EMAIL,
        type: 'regular' as any,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await userRegistry.createUser(user);
      const retrievedUser = await userRegistry.getUser('test_user_2');

      expect(retrievedUser).not.toBeNull();
      expect(retrievedUser?.username).toBe('testuser2');
    });

    test('should get user by email', async () => {
      const user: User = {
        id: 'test_user_3',
        tenantId: 'tenant_1',
        username: 'testuser3',
        email: 'test3@example.com',
        registeredVia: RegistrationChannelType.EMAIL,
        type: 'regular' as any,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await userRegistry.createUser(user);
      const retrievedUser = await userRegistry.getUserByEmail('test3@example.com');

      expect(retrievedUser).not.toBeNull();
      expect(retrievedUser?.id).toBe('test_user_3');
    });

    test('should throw error for duplicate email', async () => {
      const user1: User = {
        id: 'test_user_4',
        tenantId: 'tenant_1',
        username: 'testuser4',
        email: 'duplicate@example.com',
        registeredVia: RegistrationChannelType.EMAIL,
        type: 'regular' as any,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const user2: User = {
        id: 'test_user_5',
        tenantId: 'tenant_1',
        username: 'testuser5',
        email: 'duplicate@example.com',
        registeredVia: RegistrationChannelType.EMAIL,
        type: 'regular' as any,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await userRegistry.createUser(user1);
      
      await expect(userRegistry.createUser(user2)).rejects.toThrow('already exists');
    });

    test('should update user', async () => {
      const user: User = {
        id: 'test_user_6',
        tenantId: 'tenant_1',
        username: 'testuser6',
        email: 'test6@example.com',
        registeredVia: RegistrationChannelType.EMAIL,
        type: 'regular' as any,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await userRegistry.createUser(user);
      
      user.displayName = 'Test User 6';
      user.avatarUrl = 'https://example.com/avatar.jpg';
      
      const updatedUser = await userRegistry.updateUser(user);

      expect(updatedUser.displayName).toBe('Test User 6');
      expect(updatedUser.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    test('should delete user', async () => {
      const user: User = {
        id: 'test_user_7',
        tenantId: 'tenant_1',
        username: 'testuser7',
        registeredVia: RegistrationChannelType.EMAIL,
        type: 'regular' as any,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await userRegistry.createUser(user);
      await userRegistry.deleteUser('test_user_7', 'tenant_1');
      
      const retrievedUser = await userRegistry.getUserByIdAndTenant('test_user_7', 'tenant_1');
      expect(retrievedUser).toBeNull();
    });

    test('should list users with pagination', async () => {
      // 创建多个用户
      for (let i = 0; i < 15; i++) {
        const user: User = {
          id: `test_user_list_${i}`,
          tenantId: 'tenant_list',
          username: `testuser_list_${i}`,
          registeredVia: RegistrationChannelType.EMAIL,
          type: 'regular' as any,
          status: UserStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await userRegistry.createUser(user);
      }

      const page1 = await userRegistry.listUsers('tenant_list', { limit: 10, offset: 0 });
      const page2 = await userRegistry.listUsers('tenant_list', { limit: 10, offset: 10 });

      expect(page1.length).toBe(10);
      expect(page2.length).toBe(5);
    });

    test('should get registration stats', async () => {
      // 创建不同渠道的用户
      const users: User[] = [
        {
          id: 'stat_user_1',
          tenantId: 'tenant_stat',
          username: 'stat1',
          registeredVia: RegistrationChannelType.EMAIL,
          type: 'regular' as any,
          status: UserStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'stat_user_2',
          tenantId: 'tenant_stat',
          username: 'stat2',
          registeredVia: RegistrationChannelType.PHONE,
          type: 'regular' as any,
          status: UserStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      for (const user of users) {
        await userRegistry.createUser(user);
      }

      const stats = await userRegistry.getStats('tenant_stat');

      expect(stats.totalRegistrations).toBe(2);
      expect(stats.channelStats[RegistrationChannelType.EMAIL]).toBe(1);
      expect(stats.channelStats[RegistrationChannelType.PHONE]).toBe(1);
    });
  });

  describe('RegistrationFlow', () => {
    test('should create session for user', async () => {
      const user: User = {
        id: 'session_user_1',
        tenantId: 'tenant_session',
        username: 'sessionuser1',
        registeredVia: RegistrationChannelType.EMAIL,
        type: 'regular' as any,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await userRegistry.createUser(user);
      const session = await registrationFlow.createSession(user);

      expect(session).toBeDefined();
      expect(session.userId).toBe('session_user_1');
      expect(session.accessToken).toBeDefined();
      expect(session.refreshToken).toBeDefined();
    });

    test('should create and verify activation token', async () => {
      const userId = 'activation_user_1';
      const token = await registrationFlow.createActivationToken(userId);

      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);

      const result = await registrationFlow.verifyActivationToken(userId, token);
      expect(result.valid).toBe(true);
    });

    test('should invalidate session', async () => {
      const user: User = {
        id: 'session_user_2',
        tenantId: 'tenant_session',
        username: 'sessionuser2',
        registeredVia: RegistrationChannelType.EMAIL,
        type: 'regular' as any,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await userRegistry.createUser(user);
      const session = await registrationFlow.createSession(user);
      
      await registrationFlow.invalidateSession(session.sessionId);
      
      const retrievedSession = await registrationFlow.getSession(session.sessionId);
      expect(retrievedSession).toBeNull();
    });
  });

  describe('RegistrationValidator', () => {
    let validator: RegistrationValidator;

    beforeEach(() => {
      validator = new RegistrationValidator();
    });

    test('should validate correct email', () => {
      const result = validator.validateEmail('test@example.com');
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('should reject invalid email', () => {
      const result = validator.validateEmail('invalid-email');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should validate strong password', () => {
      const result = validator.validatePassword('StrongPass123!');
      expect(result.valid).toBe(true);
    });

    test('should reject weak password', () => {
      const result = validator.validatePassword('weak');
      expect(result.valid).toBe(false);
    });

    test('should validate username', () => {
      const result = validator.validateUsername('valid_user');
      expect(result.valid).toBe(true);
    });

    test('should reject reserved username', () => {
      const result = validator.validateUsername('admin');
      expect(result.valid).toBe(false);
    });

    test('should validate phone number', () => {
      const result = validator.validatePhone('+8613812345678');
      expect(result.valid).toBe(true);
    });

    test('should check password strength', () => {
      const result = validator.checkPasswordStrength('WeakPass');
      expect(result.level).toBe('weak');

      const strongResult = validator.checkPasswordStrength('VeryStrong!@#$%^&*1234567890');
      expect(['strong', 'very_strong']).toContain(strongResult.level);
    });
  });

  describe('AntiSpamFilter', () => {
    let antiSpamFilter: AntiSpamFilter;

    beforeEach(() => {
      antiSpamFilter = new AntiSpamFilter({
        enabled: true,
        ipLimit: {
          enabled: true,
          maxRequests: 5,
          windowSeconds: 60,
        },
        deviceLimit: {
          enabled: true,
          maxDevices: 3,
        },
        emailLimit: {
          enabled: true,
          maxRegistrations: 3,
          windowDays: 1,
        },
      });
    });

    test('should allow valid client info', async () => {
      const result = await antiSpamFilter.check({
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
      });

      expect(result.allowed).toBe(true);
    });

    test('should reject missing user agent', async () => {
      const result = await antiSpamFilter.check({
        ip: '192.168.1.1',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('User-Agent');
    });

    test('should update records after registration', async () => {
      await antiSpamFilter.check({
        ip: '10.0.0.1',
        userAgent: 'Mozilla/5.0 Chrome/91.0',
      });

      await antiSpamFilter.afterRegistration({
        ip: '10.0.0.1',
        userAgent: 'Mozilla/5.0 Chrome/91.0',
      }, { email: 'spamtest@example.com' });

      const record = antiSpamFilter.getEmailRecord('spamtest@example.com');
      expect(record).toBeDefined();
      expect(record?.registrationCount).toBe(1);
    });

    test('should add and check blacklist', () => {
      antiSpamFilter.addToBlacklist('1.2.3.4');
      expect(antiSpamFilter.isBlacklisted('1.2.3.4')).toBe(true);
      expect(antiSpamFilter.isBlacklisted('5.6.7.8')).toBe(false);
    });

    test('should get stats', () => {
      const stats = antiSpamFilter.getStats();
      expect(stats).toHaveProperty('totalIpRecords');
      expect(stats).toHaveProperty('blacklistSize');
    });
  });

  describe('OnboardingManager', () => {
    test('should start onboarding', async () => {
      const progress = await onboardingManager.startOnboarding('onboard_user_1');
      
      expect(progress).toBeDefined();
      expect(progress.userId).toBe('onboard_user_1');
      expect(progress.startedAt).toBeDefined();
    });

    test('should complete onboarding step', async () => {
      await onboardingManager.startOnboarding('onboard_user_2');
      
      const result = await onboardingManager.completeStep('onboard_user_2', 'profile', {
        displayName: 'Test User',
      });

      expect(result.success).toBe(true);
    });

    test('should skip non-required step', async () => {
      await onboardingManager.startOnboarding('onboard_user_3');
      
      const result = await onboardingManager.skipStep('onboard_user_3', 'preference');

      expect(result.success).toBe(true);
    });

    test('should get onboarding progress', async () => {
      await onboardingManager.startOnboarding('onboard_user_4');
      await onboardingManager.completeStep('onboard_user_4', 'profile', { displayName: 'Test' });
      
      const progress = await onboardingManager.getProgress('onboard_user_4');
      
      expect(progress).toBeDefined();
      expect(progress?.completedSteps).toContain('profile');
    });

    test('should check if onboarding completed', async () => {
      await onboardingManager.startOnboarding('onboard_user_5');
      
      const isCompleted = await onboardingManager.isCompleted('onboard_user_5');
      expect(isCompleted).toBe(false);
    });
  });
});

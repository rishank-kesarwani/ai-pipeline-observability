import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, UserDocument } from '../database/schemas/user.schema';
import { MemoryStoreService } from '../database/memory-store.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly memoryStore: MemoryStoreService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async findUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.userModel.findOne({ email: email.toLowerCase() });
      if (user) return user;
    } catch {
      // Fallback to memory store if Mongo is not connected
    }
    return this.memoryStore.findOne<User>('users', (u) => u.email === email.toLowerCase());
  }

  private async findUserById(userId: string): Promise<User | null> {
    try {
      const user = await this.userModel.findOne({ userId });
      if (user) return user;
    } catch {
      // Fallback to memory store
    }
    return this.memoryStore.findOne<User>('users', (u) => u.userId === userId);
  }

  private async saveUser(user: Partial<User>): Promise<User> {
    try {
      return await this.userModel.create(user);
    } catch {
      return this.memoryStore.insert<User>('users', user as User);
    }
  }

  private async updateUser(userId: string, update: Partial<User>): Promise<void> {
    try {
      await this.userModel.updateOne({ userId }, { $set: update });
    } catch {
      this.memoryStore.updateOne('users', (u) => u.userId === userId, update);
    }
  }

  async register(dto: RegisterDto) {
    const existing = await this.findUserByEmail(dto.email);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);
    const userId = `usr-${uuidv4().substring(0, 8)}`;

    const user = await this.saveUser({
      userId,
      email: dto.email.toLowerCase(),
      passwordHash,
      name: dto.name,
      roles: ['operator'],
      tenantId: dto.tenantId || 'default',
    });

    const tokens = await this.generateTokens(user);
    await this.updateUser(userId, { refreshToken: tokens.refreshToken });

    return {
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        roles: user.roles,
        tenantId: user.tenantId,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.findUserByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user);
    await this.updateUser(user.userId, { refreshToken: tokens.refreshToken });

    return {
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        roles: user.roles,
        tenantId: user.tenantId,
      },
      ...tokens,
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.findUserById(userId);
    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokens = await this.generateTokens(user);
    await this.updateUser(user.userId, { refreshToken: tokens.refreshToken });
    return tokens;
  }

  async getProfile(userId: string) {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      userId: user.userId,
      email: user.email,
      name: user.name,
      roles: user.roles,
      tenantId: user.tenantId,
    };
  }

  private async generateTokens(user: User) {
    const payload = {
      sub: user.userId,
      userId: user.userId,
      email: user.email,
      name: user.name,
      roles: user.roles,
      tenantId: user.tenantId,
    };

    const accessSecret = this.configService.get<string>(
      'app.jwt.accessSecret',
      'dev-access-secret-replace-in-prod-min-32-characters-secure',
    );
    const refreshSecret = this.configService.get<string>(
      'app.jwt.refreshSecret',
      'dev-refresh-secret-replace-in-prod-min-32-characters-secure',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}

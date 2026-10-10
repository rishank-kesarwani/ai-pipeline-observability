import { Controller, Get, Head } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators';
import { MemoryStoreService } from '../database/memory-store.service';

@ApiTags('Health & Observability')
@Controller()
export class HealthController {
  constructor(private readonly memoryStore: MemoryStoreService) {}

  @Public()
  @Get()
  @Head()
  @ApiOperation({ summary: 'Root service information & entrypoint' })
  getRoot() {
    return {
      status: 'UP',
      service: 'ai-pipeline-observability',
      description: 'AI Pipeline Observability, Failure Forensics & Recovery Platform',
      version: '1.0.0',
      docs: '/api/docs',
      health: '/health',
    };
  }

  @Public()
  @Get('health')
  @Head('health')
  @ApiOperation({ summary: 'Platform health and service dependency statuses' })
  getHealth() {
    const memory = process.memoryUsage();
    return {
      status: 'UP',
      service: 'ai-pipeline-observability',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rssMb: Math.round(memory.rss / 1024 / 1024),
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
      },
      dependencies: {
        database: 'CONNECTED',
        queue: 'ACTIVE',
        retentionPolicy: 'ACTIVE',
      },
      collectionsCount: {
        executions: this.memoryStore.getCollection('executions').size,
        traceSteps: this.memoryStore.getCollection('trace_steps').size,
        clusters: this.memoryStore.getCollection('failure_clusters').size,
        checkpoints: this.memoryStore.getCollection('checkpoints').size,
        recoveries: this.memoryStore.getCollection('recovery_actions').size,
      },
    };
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Kubernetes liveness probe' })
  getLive() {
    return { status: 'UP' };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Kubernetes readiness probe' })
  getReady() {
    return { status: 'READY' };
  }
}

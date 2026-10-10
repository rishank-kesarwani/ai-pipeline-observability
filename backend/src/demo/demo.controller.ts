import { Controller, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DemoService } from './demo.service';
import { Public } from '../common/decorators';

@ApiTags('Demo & Simulation Sandbox')
@Controller('demo')
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Public()
  @Post('seed')
  @ApiOperation({
    summary: 'Re-seed rich demo workflows, failure clusters, and checkpoints',
  })
  @ApiResponse({ status: 200, description: 'Demo data seeded' })
  async seedDemo() {
    return this.demoService.seedDemoData();
  }

  @Public()
  @Post('simulate-run')
  @ApiOperation({
    summary: 'Simulate a new live AI workflow execution run for real-time telemetry inspection',
  })
  async simulateRun(
    @Query('workflowId') workflowId?: string,
    @Query('failStep') failStep?: boolean,
  ) {
    return this.demoService.simulateRun(workflowId, String(failStep) === 'true');
  }
}

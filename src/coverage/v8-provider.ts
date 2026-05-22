import { Session } from 'node:inspector/promises';

export interface V8CoverageRange {
  startOffset: number;
  endOffset: number;
  count: number;
}

export interface V8FunctionCoverage {
  functionName: string;
  ranges: V8CoverageRange[];
  isBlockCoverage: boolean;
}

export interface V8CoverageResult {
  scriptId: string;
  url: string;
  functions: V8FunctionCoverage[];
}

export class V8CoverageProvider {
  private session: Session | null = null;

  async startCoverage(): Promise<void> {
    this.session = new Session();
    this.session.connect();
    await this.session.post('Profiler.enable');
    await this.session.post('Profiler.startPreciseCoverage', {
      callCount: true,
      detailed: true,
    });
  }

  async takeCoverage(): Promise<V8CoverageResult[]> {
    if (!this.session) {
      throw new Error('Coverage session not started');
    }
    const result = await this.session.post('Profiler.takePreciseCoverage');
    return (result as { result: V8CoverageResult[] }).result;
  }

  async stopCoverage(): Promise<void> {
    if (!this.session) {
      throw new Error('Coverage session not started');
    }
    await this.session.post('Profiler.stopPreciseCoverage');
    await this.session.post('Profiler.disable');
    this.session.disconnect();
    this.session = null;
  }
}

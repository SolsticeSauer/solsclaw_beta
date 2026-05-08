import { EventEmitter } from 'node:events';

export type StepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

export interface StepEvent {
  type: 'step';
  step: string;
  status: StepStatus;
  message?: string;
  timestamp: number;
}

export interface LogEvent {
  type: 'log';
  step: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
}

export interface DoneEvent {
  type: 'done';
  ok: boolean;
  summary: Record<string, unknown>;
}

export type PipelineEvent = StepEvent | LogEvent | DoneEvent;

export class PipelineBus extends EventEmitter {
  emitStep(step: string, status: StepStatus, message?: string): void {
    const e: StepEvent = { type: 'step', step, status, message, timestamp: Date.now() };
    this.emit('event', e);
  }
  log(step: string, level: LogEvent['level'], message: string): void {
    const e: LogEvent = { type: 'log', step, level, message, timestamp: Date.now() };
    this.emit('event', e);
  }
  done(ok: boolean, summary: Record<string, unknown>): void {
    const e: DoneEvent = { type: 'done', ok, summary };
    this.emit('event', e);
  }
}

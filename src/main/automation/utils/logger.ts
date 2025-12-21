import type { EventEmitter } from 'events';
import type { AutomationProfile } from '../types';

class Logger {
  private emitter: EventEmitter | null;
  private profile: AutomationProfile | null;

  constructor(emitter: EventEmitter | null, profile: AutomationProfile | null = null) {
    this.emitter = emitter;
    this.profile = profile;
  }

  setProfile(profile: AutomationProfile): void {
    this.profile = profile;
  }

  log(message: string): void {
    const prefix = this.profile ? `[${this.profile.name}] ` : '';
    const fullMessage = `${prefix}${message}`;
    
    if (this.emitter) {
      this.emitter.emit('log', fullMessage);
    }
    
    console.log(fullMessage);
  }

  error(message: string, error?: Error): void {
    const errorMessage = error ? `${message}: ${error.message}` : message;
    this.log(`❌ ERRO: ${errorMessage}`);
  }

  info(message: string): void {
    this.log(`ℹ️  ${message}`);
  }

  success(message: string): void {
    this.log(`✅ ${message}`);
  }

  warn(message: string): void {
    this.log(`⚠️  ${message}`);
  }
}

export default Logger;

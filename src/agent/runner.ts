import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Session } from '../types';
import { logger } from '../utils/logger';

export class AgentRunner {
  private sessionPath: string;

  constructor() {
    this.sessionPath = process.env.SESSION_PATH || 'state/session.json';
  }

  async startSession(prompt: string): Promise<string> {
    const sessionId = crypto.randomUUID();
    const session: Session = {
      active: true,
      sessionId,
      startedAt: new Date().toISOString(),
    };

    if (!fs.existsSync(path.dirname(this.sessionPath))) {
      fs.mkdirSync(path.dirname(this.sessionPath), { recursive: true });
    }
    fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));

    return this.runCodex(`exec "${prompt}" --full-auto`);
  }

  async resumeSession(prompt: string): Promise<string> {
    return this.runCodex(`exec resume --last "${prompt}" --full-auto`);
  }

  private runCodex(args: string): Promise<string> {
    return new Promise((resolve, reject) => {
      logger.agent(`Running: codex ${args}`);
      const process = spawn('codex', args.split(' '), { shell: true });
      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(error || `Codex exited with code ${code}`));
        }
      });
    });
  }

  getActiveSession(): Session | null {
    if (fs.existsSync(this.sessionPath)) {
      try {
        const session = JSON.parse(fs.readFileSync(this.sessionPath, 'utf8'));
        return session.active ? session : null;
      } catch {
        return null;
      }
    }
    return null;
  }

  stopSession() {
    if (fs.existsSync(this.sessionPath)) {
      const session = JSON.parse(fs.readFileSync(this.sessionPath, 'utf8'));
      session.active = false;
      fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));
    }
  }
}

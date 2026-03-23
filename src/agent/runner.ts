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

  async startSession(workdir: string): Promise<void> {
    const sessionId = crypto.randomUUID();
    const session: Session = {
      active: true,
      sessionId,
      workdir,
      startedAt: new Date().toISOString(),
    };

    const stateDir = path.dirname(this.sessionPath);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));

    let systemPrompt = 'Hãy sẵn sàng để hỗ trợ tôi. Bắt đầu ngay.';
    if (fs.existsSync('SYSTEM_PROMPT.md')) {
      systemPrompt = fs.readFileSync('SYSTEM_PROMPT.md', 'utf8');
    }
    
    logger.agent(`Fire-and-forget starting at ${workdir}...`);
    spawn('codex', ['exec', `"${systemPrompt}"`, '--full-auto', '--skip-git-repo-check'], {
      cwd: workdir,
      shell: true,
      windowsHide: true,
      stdio: 'ignore'
    }).unref();
  }

  async resumeSession(prompt: string): Promise<string> {
    const session = this.getActiveSession();
    if (!session) throw new Error('No active session.');

    return this.runCodex(['exec', 'resume', '--last', `"${prompt}"`, '--full-auto', '--skip-git-repo-check'], session.workdir);
  }

  private runCodex(args: string[], cwd?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      logger.agent(`Running: codex ${args.join(' ')} (at ${cwd || './'})`);
      const process = spawn('codex', args, { 
        shell: true, 
        windowsHide: true,
        cwd: cwd
      });
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
          resolve(output.trim());
        } else {
          reject(new Error(error || `Codex exited with code ${code}`));
        }
      });
    });
  }

  getActiveSession(): Session | null {
    if (fs.existsSync(this.sessionPath)) {
      try {
        const content = fs.readFileSync(this.sessionPath, 'utf8');
        if (!content.trim()) return null;
        const session = JSON.parse(content);
        return session.active ? session : null;
      } catch (err) {
        logger.error(`Error reading session: ${err}`);
        return null;
      }
    }
    return null;
  }

  stopSession() {
    if (fs.existsSync(this.sessionPath)) {
      try {
        const content = fs.readFileSync(this.sessionPath, 'utf8');
        if (!content.trim()) return;
        const session = JSON.parse(content);
        session.active = false;
        fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));
      } catch (err) {
        logger.error(`Error stopping session: ${err}`);
      }
    }
  }
}

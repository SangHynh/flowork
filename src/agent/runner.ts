import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

interface Session {
  workdir: string;
}

export class AgentRunner {
  private sessionPath: string;

  constructor() {
    this.sessionPath = process.env.SESSION_PATH || 'state/session.json';
  }

  async startSession(workdir: string): Promise<void> {
    const session: Session = { workdir };

    const stateDir = path.dirname(this.sessionPath);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));

    const systemPrompt = 'Hãy sẵn sàng để hỗ trợ tôi. Bắt đầu ngay.';
    const execArgs = [
      'exec',
      systemPrompt,
      '--full-auto',
      '--skip-git-repo-check',
    ];

    logger.agent(`Fire-and-forget starting at ${workdir}...`);
    return new Promise((resolve, reject) => {
      const child = spawn('codex', execArgs, {
        cwd: workdir,
        shell: false,
        windowsHide: true,
        stdio: 'ignore',
      });

      child.on('error', (err) => {
        logger.error(`Unable to start codex exec: ${err.message}`);
        reject(err);
      });

      child.on('spawn', () => {
        resolve();
      });

      child.unref();
    });
  }

  async resumeSession(prompt: string): Promise<string> {
    const session = this.getActiveSession();
    if (!session) throw new Error('No active session.');

    return this.runCodex(
      [
        'exec',
        'resume',
        '--last',
        prompt,
        '--full-auto',
        '--skip-git-repo-check',
      ],
      session.workdir,
    );
  }

  private runCodex(args: string[], cwd?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      logger.agent(`Running: codex ${args.join(' ')} (at ${cwd || './'})`);
      const process = spawn('codex', args, {
        windowsHide: true,
        cwd: cwd,
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

  static checkCodexAvailability(): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('codex', ['--version'], {
        windowsHide: true,
      });
      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('error', (err) => {
        reject(new Error(`Unable to start codex: ${err.message}`));
      });

      process.on('close', (code) => {
        if (code === 0) {
          logger.system(`Codex CLI detected: ${output.trim() || 'ok'}`);
          resolve();
          return;
        }

        reject(
          new Error(
            error.trim() ||
              output.trim() ||
              `codex --version exited with code ${code}`,
          ),
        );
      });
    });
  }

  getActiveSession(): Session | null {
    if (fs.existsSync(this.sessionPath)) {
      try {
        const content = fs.readFileSync(this.sessionPath, 'utf8');
        if (!content.trim()) return null;
        const session = JSON.parse(content) as Session;
        return session.workdir ? session : null;
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
        fs.unlinkSync(this.sessionPath);
      } catch (err) {
        logger.error(`Error stopping session: ${err}`);
      }
    }
  }
}

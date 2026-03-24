import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

interface Session {
  workdir: string;
}

export class AgentRunner {
  private sessionPath: string;
  private loginProcess: ChildProcess | null = null;

  constructor() {
    this.sessionPath = 'state/session.json';
  }

  async startSession(workdir: string): Promise<void> {
    const session: Session = { workdir };

    const stateDir = path.dirname(this.sessionPath);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));

    let systemPrompt = 'Hãy sẵn sàng để hỗ trợ tôi. Bắt đầu ngay.';

    logger.agent(`Fire-and-forget starting at ${workdir}...`);
    return new Promise((resolve, reject) => {
      const child = spawn(
        'codex',
        ['exec', `"${systemPrompt}"`, '--full-auto', '--skip-git-repo-check'],
        {
          cwd: workdir,
          shell: true,
          windowsHide: true,
          stdio: 'ignore',
        },
      );

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
        `"${prompt}"`,
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
        shell: true,
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
        shell: true,
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

  async codexLogout(): Promise<string> {
    return new Promise((resolve, reject) => {
      logger.agent('Running: codex logout');
      const proc = spawn('codex', ['logout'], {
        shell: true,
        windowsHide: true,
      });
      let output = '';
      let error = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        error += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim() || 'Đã đăng xuất thành công.');
        } else {
          reject(
            new Error(
              error.trim() ||
                output.trim() ||
                `codex logout exited with code ${code}`,
            ),
          );
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Không thể chạy codex logout: ${err.message}`));
      });
    });
  }

  async codexAuthStatus(): Promise<{ loggedIn: boolean; message: string }> {
    return new Promise((resolve) => {
      logger.agent('Running: codex login status');
      const proc = spawn('codex', ['login', 'status'], {
        shell: true,
        windowsHide: true,
      });
      let output = '';
      let error = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        error += data.toString();
      });

      proc.on('close', (code) => {
        const message = output.trim() || error.trim();
        resolve({
          loggedIn: code === 0,
          message:
            message || (code === 0 ? 'Đã đăng nhập' : 'Chưa đăng nhập'),
        });
      });

      proc.on('error', (err) => {
        resolve({ loggedIn: false, message: `Lỗi kiểm tra: ${err.message}` });
      });
    });
  }

  async codexLoginDeviceAuth(
    onDeviceCode: (url: string, code: string) => void,
  ): Promise<{ success: boolean; message: string }> {
    this.cancelLogin();

    return new Promise((resolve) => {
      logger.agent('Running: codex login --device-auth');
      const proc = spawn('codex', ['login', '--device-auth'], {
        shell: true,
        windowsHide: true,
      });
      this.loginProcess = proc;

      let output = '';
      let deviceCodeSent = false;
      const TIMEOUT_MS = 16 * 60 * 1000; // 16 phút (mã hết hạn sau 15)

      const timeout = setTimeout(() => {
        proc.kill();
        this.loginProcess = null;
        resolve({
          success: false,
          message: 'Hết thời gian xác thực (15 phút). Hãy thử /login lại.',
        });
      }, TIMEOUT_MS);

      const tryParseDeviceCode = (chunk: string) => {
        output += chunk;
        if (!deviceCodeSent) {
          const clean = stripAnsi(output);
          const urlMatch = clean.match(
            /(https:\/\/auth\.openai\.com\/\S+)/,
          );
          const codeMatch = clean.match(
            /\b([A-Z0-9]{3,8}-[A-Z0-9]{3,8})\b/,
          );
          if (urlMatch && codeMatch) {
            deviceCodeSent = true;
            onDeviceCode(urlMatch[1], codeMatch[1]);
          }
        }
      };

      proc.stdout.on('data', (data) =>
        tryParseDeviceCode(data.toString()),
      );
      proc.stderr.on('data', (data) =>
        tryParseDeviceCode(data.toString()),
      );

      proc.on('close', (code) => {
        clearTimeout(timeout);
        this.loginProcess = null;
        if (code === 0) {
          resolve({ success: true, message: 'Đăng nhập thành công!' });
        } else {
          resolve({
            success: false,
            message: deviceCodeSent
              ? 'Xác thực thất bại hoặc đã hết hạn.'
              : stripAnsi(output).trim() ||
                `Lỗi đăng nhập (exit code ${code})`,
          });
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        this.loginProcess = null;
        resolve({ success: false, message: `Lỗi: ${err.message}` });
      });
    });
  }

  cancelLogin(): void {
    if (this.loginProcess) {
      this.loginProcess.kill();
      this.loginProcess = null;
      logger.agent('Cancelled existing login process.');
    }
  }
}

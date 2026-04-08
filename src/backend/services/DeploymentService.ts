import { Client } from 'ssh2';
import { Project } from '../models/Project';
import { Deployment } from '../models/Deployment';
import { Server as ServerModel } from '../models/Server';
import { Server as SocketServer } from 'socket.io';

export class DeploymentService {
  private io: SocketServer;

  constructor(io: SocketServer) {
    this.io = io;
  }

  async deploy(projectId: string) {
    const project = await Project.findById(projectId).populate('serverId');
    if (!project) throw new Error('Project not found');

    const server = project.serverId as any;
    if (!server) throw new Error('No server assigned to this project');

    const deployment = new Deployment({
      projectId: project._id,
      status: 'building',
    });
    await deployment.save();

    project.status = 'building';
    project.lastDeployment = deployment._id;
    await project.save();

    const log = (message: string) => {
      deployment.logs += `${message}\n`;
      this.io.to(`logs-${projectId}`).emit('log', message);
    };

    const conn = new Client();
    
    const connectOptions: any = {
      host: server.ip,
      port: 22,
      username: server.username,
      readyTimeout: 60000,
      keepaliveInterval: 10000,
      keepaliveCountMax: 3,
    };
    if (server.password) connectOptions.password = server.password;
    if (server.sshKey) connectOptions.privateKey = server.sshKey;

    conn.on('ready', async () => {
      log(`Connected to VPS: ${server.ip}`);
      try {
        const projectPath = `/opt/${project.name}`;
        const isRoot = server.username === 'root';
        const sudo = isRoot ? '' : 'sudo ';
        const gitEnv = 'export GIT_TERMINAL_PROMPT=0 && ';
        
        // 0. Check dependencies
        log('Checking dependencies (git, pm2, nginx)...');
        try {
          await this.remoteExec(conn, 'command -v git && command -v pm2 && command -v nginx');
        } catch (err) {
          throw new Error('Missing required dependencies on VPS (git, pm2, or nginx). Please install them first.');
        }

        // 1. Clone or Pull
        log(`Checking for project directory: ${projectPath}...`);
        const dirExists = await this.remoteExec(conn, `[ -d "${projectPath}" ] && echo "exists" || echo "not exists"`);
        
        if (dirExists.trim().includes('not exists')) {
          log(`Cloning repository: ${project.repoUrl}...`);
          await this.remoteExec(conn, `${gitEnv}${sudo}git clone ${project.repoUrl} ${projectPath}`, log);
        } else {
          log(`Pulling latest changes for branch: ${project.branch}...`);
          await this.remoteExec(conn, `${gitEnv}${sudo}git -C ${projectPath} pull origin ${project.branch}`, log);
        }

        // 2. Install & Build
        log(`Running build command: ${project.buildCommand}...`);
        await this.remoteExec(conn, `cd ${projectPath} && ${sudo}${project.buildCommand}`, log);

        // 3. PM2 Start/Restart
        const isStatic = ['react', 'vite', 'static'].includes(project.framework || '');
        log(`Starting application with PM2 (${isStatic ? 'Static' : 'Node.js'})...`);
        
        let pm2Cmd = '';
        if (isStatic) {
          const fullOutputDir = `${projectPath}/${project.outputDir || 'dist'}`;
          pm2Cmd = `cd ${projectPath} && (${sudo}pm2 restart ${project.name} --update-env 2>/dev/null || ${sudo}pm2 serve ${fullOutputDir} ${project.internalPort} --name ${project.name} --spa)`;
        } else {
          pm2Cmd = `cd ${projectPath} && (${sudo}pm2 restart ${project.name} --update-env 2>/dev/null || ${sudo}pm2 start npm --name ${project.name} -- start -- --port ${project.internalPort})`;
        }
        await this.remoteExec(conn, pm2Cmd, log);

        // 4. Update Nginx Config
        log(`Updating Nginx configuration...`);
        let domain = project.customDomain || server.ip;
        // Strip http:// or https:// from domain
        domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        
        // Strip port from domain for server_name but keep it for logic if needed
        const domainParts = domain.split(':');
        const serverName = domainParts[0];
        const listenPort = project.port || (domainParts[1] ? domainParts[1] : '80');
        
        const nginxConfig = `server {
    listen ${listenPort};
    server_name ${serverName};

    location / {
        proxy_pass http://localhost:${project.internalPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;
        
        const configPath = `/etc/nginx/sites-available/${project.name}`;
        const enabledPath = `/etc/nginx/sites-enabled/${project.name}`;
        
        // Use base64 to safely transfer the config without shell quoting/whitespace issues
        const base64Config = Buffer.from(nginxConfig.trim()).toString('base64');
        const nginxCmd = `echo '${base64Config}' | base64 -d | ${sudo}tee ${configPath} > /dev/null && ${sudo}ln -sf ${configPath} ${enabledPath} && ${sudo}nginx -t && ${sudo}systemctl reload nginx`;
        await this.remoteExec(conn, nginxCmd, log);

        deployment.status = 'success';
        deployment.finishedAt = new Date();
        await deployment.save();

        project.status = 'success';
        await project.save();

        log('Deployment successful!');
        conn.end();
      } catch (err: any) {
        log(`Deployment failed: ${err.message}`);
        deployment.status = 'failed';
        deployment.finishedAt = new Date();
        await deployment.save();

        project.status = 'failed';
        await project.save();
        conn.end();
      }
    }).on('error', (err) => {
      log(`SSH Connection Error: ${err.message}`);
      deployment.status = 'failed';
      deployment.save();
      project.status = 'failed';
      project.save();
    }).connect(connectOptions);
  }

  async cleanup(projectId: string) {
    const project = await Project.findById(projectId).populate('serverId');
    if (!project) return;

    const server = project.serverId as any;
    if (!server) return;

    const conn = new Client();
    
    const connectOptions: any = {
      host: server.ip,
      port: 22,
      username: server.username,
      readyTimeout: 60000,
      keepaliveInterval: 10000,
      keepaliveCountMax: 3,
    };
    if (server.password) connectOptions.password = server.password;
    if (server.sshKey) connectOptions.privateKey = server.sshKey;

    return new Promise((resolve, reject) => {
      conn.on('ready', async () => {
        try {
          const projectPath = `/opt/${project.name}`;
          const nginxConfigPath = `/etc/nginx/sites-available/${project.name}`;
          const nginxEnabledPath = `/etc/nginx/sites-enabled/${project.name}`;
          const isRoot = server.username === 'root';
          const sudo = isRoot ? '' : 'sudo ';

          // 1. Stop and delete PM2 process
          await this.remoteExec(conn, `${sudo}pm2 delete ${project.name}`).catch(() => {});

          // 2. Remove Nginx config
          await this.remoteExec(conn, `${sudo}rm -f ${nginxConfigPath} ${nginxEnabledPath}`).catch(() => {});
          await this.remoteExec(conn, `${sudo}nginx -t && ${sudo}systemctl reload nginx`).catch(() => {});

          // 3. Remove project files
          await this.remoteExec(conn, `${sudo}rm -rf ${projectPath}`).catch(() => {});

          conn.end();
          resolve(true);
        } catch (err) {
          conn.end();
          reject(err);
        }
      }).on('error', reject).connect(connectOptions);
    });
  }

  private remoteExec(conn: Client, command: string, log?: (msg: string) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      // Use bash if available, otherwise fallback to sh
      const wrappedCommand = `if command -v bash >/dev/null 2>&1; then bash -c ${JSON.stringify(command)}; else sh -c ${JSON.stringify(command)}; fi`;
      
      if (log) log(`$ ${command}`);

      conn.exec(wrappedCommand, (err, stream) => {
        if (err) return reject(err);
        let output = '';
        let stderr = '';
        let exitCode: number | null = null;
        let exitSignal: string | null = null;

        stream.on('data', (data: any) => {
          const msg = data.toString();
          output += msg;
          if (log) log(msg);
        }).stderr.on('data', (data: any) => {
          const msg = data.toString();
          stderr += msg;
          // Don't treat "Cloning into" or other progress as ERROR in the logs
          const isProgress = msg.toLowerCase().includes('cloning into') || 
                            msg.toLowerCase().includes('remote: counting objects') ||
                            msg.toLowerCase().includes('receiving objects');
          
          if (log) log(isProgress ? msg : `ERROR: ${msg}`);
        }).on('exit', (code: number, signal: string) => {
          exitCode = code;
          exitSignal = signal;
        }).on('close', () => {
          if (exitCode === 0) {
            resolve(output);
          } else if (exitCode === null || exitCode === undefined) {
            // Be more lenient if we have output or progress info and it doesn't look like a fatal error
            // Git clone often closes the session after successful clone but before exit code is sent on some systems
            const isGitProgress = stderr.toLowerCase().includes('cloning into') || stderr.toLowerCase().includes('receiving objects');
            const isPM2Progress = stderr.toLowerCase().includes('[pm2]') && !stderr.toLowerCase().includes('error');
            const isNginxOk = stderr.toLowerCase().includes('syntax is ok') || stderr.toLowerCase().includes('test is successful');
            const isWarning = stderr.toLowerCase().includes('[warn]') && !stderr.toLowerCase().includes('error') && !stderr.toLowerCase().includes('fatal');
            
            if ((output.trim() || isGitProgress || isPM2Progress || isNginxOk || isWarning) && !stderr.toLowerCase().includes('fatal') && !stderr.toLowerCase().includes('error')) {
              resolve(output);
            } else if (output.trim() && stderr.toLowerCase().includes('[pm2][error] process or namespace') && stderr.toLowerCase().includes('online')) {
              // Special case for PM2 restart || start where restart fails but start succeeds
              resolve(output);
            } else if (!stderr.trim()) {
              // If stderr is empty and no exit code, it's likely a success (even if output is empty)
              resolve(output);
            } else {
              reject(new Error(`Command failed: session closed without exit code${exitSignal ? ` (signal: ${exitSignal})` : ''}. ${stderr}`));
            }
          } else {
            reject(new Error(`Command failed with code ${exitCode}. ${stderr}`));
          }
        });
      });
    });
  }
}

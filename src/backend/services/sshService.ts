import { Client } from 'ssh2';

let activeSSHConfig: any = null;
let cachedConn: Client | null = null;
let connTimeout: NodeJS.Timeout | null = null;

export const setSSHConfig = (config: any) => {
  if (cachedConn) {
    cachedConn.end();
    cachedConn = null;
  }
  activeSSHConfig = config;
};

export const getSSHConfig = () => {
  return activeSSHConfig;
};

const getConn = (): Promise<Client> => {
  return new Promise((resolve, reject) => {
    if (cachedConn) {
      if (connTimeout) clearTimeout(connTimeout);
      // Set a 5-minute idle timeout
      connTimeout = setTimeout(() => {
        if (cachedConn) {
          cachedConn.end();
          cachedConn = null;
        }
      }, 300000);
      return resolve(cachedConn);
    }

    if (!activeSSHConfig) {
      return reject(new Error('No active SSH connection configured'));
    }

    const conn = new Client();
    conn.on('ready', () => {
      cachedConn = conn;
      // Set a 5-minute idle timeout
      connTimeout = setTimeout(() => {
        if (cachedConn) {
          cachedConn.end();
          cachedConn = null;
        }
      }, 300000);
      resolve(conn);
    }).on('error', (err) => {
      cachedConn = null;
      reject(err);
    }).on('close', () => {
      cachedConn = null;
    }).connect({
      ...activeSSHConfig,
      readyTimeout: 10000,
      connTimeout: 10000
    });
  });
};

export const runRemoteCommand = async (command: string): Promise<string> => {
  const conn = await getConn();
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) {
        reject(err);
        return;
      }
      let output = '';
      let errorOutput = '';
      stream.on('data', (data: any) => {
        output += data.toString();
      }).stderr.on('data', (data: any) => {
        errorOutput += data.toString();
      }).on('close', () => {
        if (errorOutput && !output) {
          reject(new Error(errorOutput));
        } else {
          resolve(output);
        }
      });
    });
  });
};

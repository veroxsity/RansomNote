#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import blessed from 'blessed';
import os from 'node:os';

function parseArgs(argv) {
  const args = { fport: 3000, bport: 3001, local: 'yes' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--fport' && argv[i + 1]) args.fport = Number(argv[++i]);
    else if (a === '--bport' && argv[i + 1]) args.bport = Number(argv[++i]);
    else if (a === '--local' && argv[i + 1]) args.local = String(argv[++i]).toLowerCase();
    else if (a === '-h' || a === '--help') args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`Usage: app [--fport <port>] [--bport <port>] [--local yes|no]\n\n` +
`Options:\n` +
`  --fport <port>   Frontend port (Next.js dev) [default: 3000]\n` +
`  --bport <port>   Backend port (NestJS dev)   [default: 3001]\n` +
`  --local yes|no   yes = bind to localhost only; no = bind on 0.0.0.0 [default: yes]\n`);
}

function getNetworkIPs() {
  const ifaces = os.networkInterfaces();
  const ips = [];
  for (const name in ifaces) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

function run() {
  const args = parseArgs(process.argv);
  if (args.help) return printHelp();

  // __dirname is not available in ESM; derive from import.meta.url
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, '..');
  const backendDir = path.join(repoRoot, 'backend');
  const frontendDir = path.join(repoRoot, 'frontend');

  const isLocal = args.local !== 'no';
  const host = isLocal ? 'localhost' : '0.0.0.0';

  // Backend CORS origin
  const frontendOrigin = isLocal ? `http://localhost:${args.fport}` : '*';

  // Frontend socket URL
  const nextEnv = isLocal
    ? { NEXT_PUBLIC_SOCKET_URL: `http://localhost:${args.bport}` }
    : { NEXT_PUBLIC_SOCKET_URL: 'auto', NEXT_PUBLIC_BACKEND_PORT: String(args.bport) };

  // Create blessed screen
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Ransom Notes - Dev Dashboard',
  });

  // Info box at top
  const infoBox = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: 6,
    content: '',
    tags: true,
    border: { type: 'line' },
    style: {
      border: { fg: 'cyan' },
      fg: 'white',
    },
  });

  const networkIPs = getNetworkIPs();
  let infoContent = `{bold}Ransom Notes - Dev Dashboard{/bold}\n\n`;
  infoContent += `Frontend: http://${host}:${args.fport}\n`;
  infoContent += `Backend:  http://${host}:${args.bport}\n`;
  if (!isLocal && networkIPs.length > 0) {
    infoContent += `Network:  `;
    networkIPs.forEach((ip, i) => {
      infoContent += `http://${ip.address}:${args.fport}`;
      if (i < networkIPs.length - 1) infoContent += ', ';
    });
  }
  infoBox.setContent(infoContent);

  // Backend output
  const backendLog = blessed.log({
    top: 6,
    left: 0,
    width: '50%',
    height: '100%-6',
    border: { type: 'line' },
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
    scrollback: 1000,
    scrollbar: {
      ch: ' ',
      track: { bg: 'black' },
      style: { inverse: true },
    },
    label: ' Backend (NestJS) ',
    style: {
      border: { fg: 'blue' },
      fg: 'white',
    },
  });

  // Frontend output
  const frontendLog = blessed.log({
    top: 6,
    left: '50%',
    width: '50%',
    height: '100%-6',
    border: { type: 'line' },
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
    scrollback: 1000,
    scrollbar: {
      ch: ' ',
      track: { bg: 'black' },
      style: { inverse: true },
    },
    label: ' Frontend (Next.js) ',
    style: {
      border: { fg: 'green' },
      fg: 'white',
    },
  });

  screen.append(infoBox);
  screen.append(backendLog);
  screen.append(frontendLog);

  // Quit on Escape, q, or Control-C
  screen.key(['escape', 'q', 'C-c'], () => {
    return process.exit(0);
  });

  // Start backend
  const be = spawn('npm', ['run', 'dev'], {
    cwd: backendDir,
    env: {
      ...process.env,
      PORT: String(args.bport),
      HOST: host,
      FRONTEND_ORIGIN: frontendOrigin,
    },
  });

  be.stdout.on('data', (data) => {
    backendLog.log(data.toString().trim());
    screen.render();
  });

  be.stderr.on('data', (data) => {
    backendLog.log(`{red-fg}${data.toString().trim()}{/red-fg}`);
    screen.render();
  });

  be.on('close', (code) => {
    backendLog.log(`{yellow-fg}Backend exited with code ${code}{/yellow-fg}`);
    screen.render();
  });

  // Start frontend after slight delay
  setTimeout(() => {
    const feEnvArr = Object.entries(nextEnv).map(([k, v]) => [k, v]);
    const fe = spawn('npx', ['next', 'dev', '-p', String(args.fport), '--hostname', host], {
      cwd: frontendDir,
      env: {
        ...process.env,
        ...Object.fromEntries(feEnvArr),
      },
    });

    fe.stdout.on('data', (data) => {
      frontendLog.log(data.toString().trim());
      screen.render();
    });

    fe.stderr.on('data', (data) => {
      frontendLog.log(`{red-fg}${data.toString().trim()}{/red-fg}`);
      screen.render();
    });

    fe.on('close', (code) => {
      frontendLog.log(`{yellow-fg}Frontend exited with code ${code}{/yellow-fg}`);
      screen.render();
    });

    // Kill processes on exit
    const cleanup = () => {
      try { be.kill(); } catch {}
      try { fe.kill(); } catch {}
    };
    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }, 500);

  screen.render();
}

run();

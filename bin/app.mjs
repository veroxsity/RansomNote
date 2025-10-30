#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

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

function run() {
  const args = parseArgs(process.argv);
  if (args.help) return printHelp();

  const repoRoot = path.resolve(__dirname, '..');
  const backendDir = path.join(repoRoot, 'backend');
  const frontendDir = path.join(repoRoot, 'frontend');

  const isLocal = args.local !== 'no';
  const host = isLocal ? 'localhost' : '0.0.0.0';

  // Backend CORS origin
  const frontendOrigin = isLocal ? `http://localhost:${args.fport}` : '*';

  // Frontend socket URL
  // In non-local mode, use dynamic client-side resolution: NEXT_PUBLIC_SOCKET_URL=auto,
  // with NEXT_PUBLIC_BACKEND_PORT to build URL from window.location.hostname
  const nextEnv = isLocal
    ? { NEXT_PUBLIC_SOCKET_URL: `http://localhost:${args.bport}` }
    : { NEXT_PUBLIC_SOCKET_URL: 'auto', NEXT_PUBLIC_BACKEND_PORT: String(args.bport) };

  console.log(`Starting backend on ${host}:${args.bport}`);
  const be = spawn('npm', ['run', 'dev'], {
    cwd: backendDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(args.bport),
      HOST: host,
      FRONTEND_ORIGIN: frontendOrigin,
    },
  });

  // Defer frontend start slightly to reduce log interleaving
  setTimeout(() => {
    console.log(`Starting frontend on ${host}:${args.fport}`);
    const fe = spawn('npx', ['next', 'dev', '-p', String(args.fport), '--hostname', host], {
      cwd: frontendDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        ...nextEnv,
      },
    });

    const shutdown = () => {
      try { be.kill(); } catch {}
      try { fe.kill(); } catch {}
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }, 500);
}

run();

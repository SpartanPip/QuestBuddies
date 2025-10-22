#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Development script with automatic deployment
 * Watches for changes and automatically deploys with new versions
 */

let buildCount = 0;
let isDeploying = false;
let deployTimeout = null;

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '🔧',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    step: '🔄',
    deploy: '🚀'
  }[type] || '🔧';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function generateVersion() {
  const now = new Date();
  const timestamp = now.getTime().toString().slice(-6);
  return `0.0.${timestamp}`;
}

function updateVersion(version) {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    packageJson.version = version;
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
    
    const devvitJson = JSON.parse(fs.readFileSync('devvit.json', 'utf8'));
    devvitJson.version = version;
    fs.writeFileSync('devvit.json', JSON.stringify(devvitJson, null, 2) + '\n');
    
    log(`Version updated to: ${version}`, 'success');
  } catch (error) {
    log(`Error updating version: ${error.message}`, 'error');
  }
}

function deployWithRetry() {
  if (isDeploying) {
    log('Deployment already in progress, skipping...', 'warning');
    return;
  }
  
  isDeploying = true;
  const version = generateVersion();
  
  log(`Starting deployment with version ${version}`, 'deploy');
  updateVersion(version);
  
  try {
    execSync('devvit upload', { stdio: 'inherit' });
    log(`Successfully deployed version ${version}`, 'success');
  } catch (error) {
    log(`Deployment failed: ${error.message}`, 'error');
    log('Will retry on next build...', 'info');
  }
  
  isDeploying = false;
}

function onBuildComplete() {
  buildCount++;
  log(`Build ${buildCount} completed`, 'success');
  
  // Clear any existing timeout
  if (deployTimeout) {
    clearTimeout(deployTimeout);
  }
  
  // Deploy after a short delay to avoid rapid deployments
  deployTimeout = setTimeout(() => {
    deployWithRetry();
  }, 3000); // 3 second delay
}

function startDevProcesses() {
  log('🚀 Starting Quest Buddies Development Environment', 'info');
  log('================================================', 'info');
  
  // Start client build watcher
  const clientProcess = spawn('npm', ['run', 'dev:client'], {
    stdio: 'pipe',
    shell: true
  });
  
  // Start server build watcher
  const serverProcess = spawn('npm', ['run', 'dev:server'], {
    stdio: 'pipe',
    shell: true
  });
  
  // Start devvit playtest
  const devvitProcess = spawn('npm', ['run', 'dev:devvit'], {
    stdio: 'pipe',
    shell: true
  });
  
  // Handle client build output
  clientProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('built in')) {
      onBuildComplete();
    }
    process.stdout.write(`[CLIENT] ${output}`);
  });
  
  clientProcess.stderr.on('data', (data) => {
    process.stderr.write(`[CLIENT ERROR] ${data}`);
  });
  
  // Handle server build output
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('built in')) {
      onBuildComplete();
    }
    process.stdout.write(`[SERVER] ${output}`);
  });
  
  serverProcess.stderr.on('data', (data) => {
    process.stderr.write(`[SERVER ERROR] ${data}`);
  });
  
  // Handle devvit output
  devvitProcess.stdout.on('data', (data) => {
    process.stdout.write(`[DEVVIT] ${data}`);
  });
  
  devvitProcess.stderr.on('data', (data) => {
    process.stderr.write(`[DEVVIT ERROR] ${data}`);
  });
  
  // Handle process exits
  clientProcess.on('exit', (code) => {
    log(`Client process exited with code ${code}`, code === 0 ? 'success' : 'error');
  });
  
  serverProcess.on('exit', (code) => {
    log(`Server process exited with code ${code}`, code === 0 ? 'success' : 'error');
  });
  
  devvitProcess.on('exit', (code) => {
    log(`Devvit process exited with code ${code}`, code === 0 ? 'success' : 'error');
  });
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    log('Shutting down development environment...', 'info');
    clientProcess.kill();
    serverProcess.kill();
    devvitProcess.kill();
    process.exit(0);
  });
  
  log('Development environment started!', 'success');
  log('Watching for changes and auto-deploying...', 'info');
  log('Press Ctrl+C to stop', 'info');
}

// Check if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  startDevProcesses();
}

export { startDevProcesses, deployWithRetry };

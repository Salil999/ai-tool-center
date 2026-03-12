#!/usr/bin/env bun

const { program } = require('commander');
const path = require('path');
const { createApp } = require('./index');

program
  .name('ai-tools-manager')
  .description('Manage MCP server configurations and sync to AI tools')
  .option('-p, --port <number>', 'Port to run the server on', '3847')
  .option('-c, --config <path>', 'Path to config file', process.env.MCP_MANAGER_CONFIG)
  .action((opts) => {
    const port = parseInt(opts.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error('Invalid port. Use a number between 1 and 65535.');
      process.exit(1);
    }

    const configPath = opts.config ? path.resolve(opts.config) : undefined;
    const baseUrl = `http://localhost:${port}`;
    const app = createApp({ configPath, baseUrl, port });

    app.listen(port, () => {
      console.log(`AI Tools Manager running at http://localhost:${port}`);
    });
  });

program.parse();

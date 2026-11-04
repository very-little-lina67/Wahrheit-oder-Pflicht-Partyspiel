module.exports = {
  apps: [
    {
      name: 'wop-server',
      script: './server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '450M',
      node_args: '--max-old-space-size=512',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    }
  ]
};


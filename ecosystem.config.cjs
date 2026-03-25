module.exports = {
  apps: [
    {
      name: 'nexus-writing-studio',
      script: './server-dist/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};

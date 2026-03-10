module.exports = {
  apps: [
    {
      name: 'elite-backend',
      cwd: '/home/vilmart/EliteTobaccoProject/tobacco-app 3',
      script: 'server/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      min_uptime: '10s',
      restart_delay: 3000,
      out_file: '/var/log/elite-backend/out.log',
      error_file: '/var/log/elite-backend/error.log',
      merge_logs: true,
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};

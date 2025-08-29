/**
 * Closes the Nest application when the process is terminated.
 * On windows, when the app restarts on change in watch mode or is terminated via Ctrl+C, sometimes the port is not released.
 * This helper function forces to release the port.
 * @param app The Nest application to close.
 */

import { INestApplication } from '@nestjs/common';

export const closeAppOnShutDown = (app: INestApplication) => {
  // for killing the process with the script (avoid "port already in use" on restart)
  app.enableShutdownHooks(['SIGINT', 'SIGTERM']);
  const shutdown = async (signal: string) => {
    console.log(`\n[shutdown] received ${signal}, closing Nest app...`);
    try {
      await app.close(); // closes HTTP server and providers (Mongoose connection, etc.)
    } finally {
      process.exit(0);
    }
  };
  // common signals
  ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((sig) =>
    process.on(sig as NodeJS.Signals, () => shutdown(sig)),
  );
};

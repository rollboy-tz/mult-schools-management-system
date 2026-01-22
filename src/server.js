// server.js - STABLE ENTRY POINT
import app from './app.js';
import mainRouter from './routes/index.js'; // SINGLE ENTRY POINT
import { validate404 } from './middleware/validate404.js';
const v404 = validate404();


// Attach ALL routes through single entry
v404.track('/')
app.use('/', mainRouter);
app.use(v404.handler)


// Start server
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL 
const url = process.env.NODE_ENV === 'production' ? API_URL : `http://localhost:${PORT} `;

const server = app.listen(PORT, () => {
  console.log(`
🚀 Server Started Successfully!
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV}
📅 ${new Date().toISOString()}
✅ Health Check: ${url}/health
🌐 information ${url}/info
`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
  
  setTimeout(() => {
    console.error('❌ Force shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
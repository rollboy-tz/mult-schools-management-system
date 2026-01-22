// middleware/validate404.js
export const validate404 = () => {
  const routes = [];
  return {
    // Track route when registered
    track: (path) => routes.push(path),
    // Enhanced 404 handler
    handler: (req, res) => {
      const path = req.originalUrl;
      // Check if similar route exists
      const similar = routes.filter(r =>
        path.includes(r.split('/')[2]) || // Match resource (schools, auth, etc)
        r.includes(path.split('/')[2])
      );
      res.status(404).json({
        success: false,
        status: 'error',
        message: 'Not Found',
        path,
        method: req.method,
        similar: similar.slice(0, 3),
        available: ['/health', '/api/v1', '/api/v1/schools', '/api/v1/auth'],
        hint: path.includes('school') ? 'Try /api/v1/schools/...' :
          path.includes('auth') ? 'Try /api/v1/auth/...' : 'Check route prefix'
      });
    },
  };
};

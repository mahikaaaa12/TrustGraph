const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swaggerSpec');

/**
 * Mounts interactive Swagger UI documentation at /api/docs
 */
function setupSwagger(app) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log('📖 Swagger Documentation available at http://localhost:5000/api/docs');
}

module.exports = setupSwagger;

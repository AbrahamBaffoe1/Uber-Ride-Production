import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Okada Transportation API',
      version: '1.0.0',
      description: 'API documentation for Okada Transportation solution',
      contact: {
        name: 'API Support',
        email: 'support@okada-transportation.com'
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server'
      },
      {
        url: 'https://api.okada-transportation.com/api/v1',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: [
    './src/mongodb/routes/*.js',
    './src/mongodb/routes/**/*.js',
    './src/mongodb/models/*.js',
    './src/mongodb/controllers/*.js'
  ]
};

const specs = swaggerJsdoc(options);

export { 
  swaggerUi, 
  specs 
};

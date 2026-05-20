import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ERP Platform API',
      version: '1.0.0',
      description: 'Multi-tenant ERP SaaS — Cyberify hiring assessment',
    },
    servers: [
      { url: 'http://localhost:5000/api/v1', description: 'Local (Docker)' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }],
  },
  apis: [
    './src/modules/**/*.routes.ts',
    './dist/modules/**/*.routes.js',
  ],
}

export const swaggerSpec = swaggerJsdoc(options)

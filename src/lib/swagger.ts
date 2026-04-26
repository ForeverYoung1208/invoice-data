import { createSwaggerSpec } from 'next-swagger-doc';

export function getApiSpec() {
  return createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Invoice Generator API',
        version: '1.0.0',
      },
    },
  });
}

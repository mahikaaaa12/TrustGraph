/**
 * OpenAPI 3.0 Specification Document for TrustGraph AI Platform
 */
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'TrustGraph AI Engine API Documentation',
    version: '1.0.0',
    description:
      'Production-Ready OpenAPI 3.0 specifications for TrustGraph AI Backend featuring Auth, File Management, Document Parsing, Image Forensics & ELA, Website Security, Text Authenticity, and Multi-Modal Trust Scoring.',
    contact: {
      name: 'Antigravity Engineering Team',
      email: 'engineering@trustgraph.ai',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server',
    },
    {
      url: 'https://api.trustgraph.ai',
      description: 'Production Cloud Cluster',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide signed JWT Token issued by /api/v1/auth/login or /api/v1/auth/signup.',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'integer', example: 401 },
              message: { type: 'string', example: 'Authentication required. Access denied.' },
            },
          },
        },
      },
      UserResponse: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '66b0e81ac8e2a149f8a31d99' },
          name: { type: 'string', example: 'Sarah Connor' },
          email: { type: 'string', example: 'sarah@cyberdyne.org' },
          role: { type: 'string', example: 'analyst' },
          trustLevelScore: { type: 'number', example: 50.0 },
          isVerified: { type: 'boolean', example: false },
          createdAt: { type: 'string', example: '2026-08-04T19:43:00.000Z' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Server Liveness & Telemetry Health Check',
        tags: ['Health'],
        responses: {
          200: {
            description: 'System healthy and database connected.',
            content: {
              'application/json': {
                example: {
                  server: 'running',
                  database: 'connected',
                  uptime: 142.5,
                  timestamp: '2026-08-05T08:00:00.000Z',
                },
              },
            },
          },
          503: {
            description: 'Database disconnected.',
            content: {
              'application/json': {
                example: { server: 'running', database: 'disconnected' },
              },
            },
          },
        },
      },
    },

    '/api/v1/auth/signup': {
      post: {
        summary: 'Register new User account',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Sarah Connor' },
                  email: { type: 'string', example: 'sarah@cyberdyne.org' },
                  password: { type: 'string', example: 'Password123!' },
                  role: { type: 'string', enum: ['user', 'analyst', 'admin'], example: 'analyst' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully. Returns user object and signed JWT.',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'User registered successfully.',
                  data: {
                    user: { _id: '66b0e81a...', name: 'Sarah Connor', email: 'sarah@cyberdyne.org', role: 'analyst' },
                    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  },
                },
              },
            },
          },
          409: { description: 'Email address already exists.' },
        },
      },
    },

    '/api/v1/auth/login': {
      post: {
        summary: 'Authenticate User credentials',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'sarah@cyberdyne.org' },
                  password: { type: 'string', example: 'Password123!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful. Returns JWT Token.' },
          401: { description: 'Invalid credentials.' },
        },
      },
    },

    '/api/v1/auth/me': {
      get: {
        summary: 'Get active session User payload',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Returns authenticated user.' },
          401: { description: 'Unauthorized or expired JWT.' },
        },
      },
    },

    '/api/v1/files/upload': {
      post: {
        summary: 'Upload Single File (PDF, DOCX, Image)',
        tags: ['Files'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'File uploaded and parsed successfully.' },
          400: { description: 'Invalid file extension or size exceeds 10MB.' },
        },
      },
    },

    '/api/v1/documents/analyze': {
      post: {
        summary: 'Analyze PDF/DOCX Document for PII Leaks & Metadata',
        tags: ['Document Analyzer'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fileId'],
                properties: { fileId: { type: 'string', example: '66b0ef21c8e2a149f8a31e12' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Document analysis completed cleanly.' },
        },
      },
    },

    '/api/v1/images/analyze': {
      post: {
        summary: 'Analyze Image Forensics & Generate Error Level Analysis (ELA) Heatmap',
        tags: ['Image Analyzer'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fileId'],
                properties: { fileId: { type: 'string', example: '66b0f124c8e2a149f8a31e55' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Image EXIF extraction and ELA heatmap completed.' },
        },
      },
    },

    '/api/v1/websites/analyze': {
      post: {
        summary: 'Analyze Website SSL Certificate, WHOIS Domain Telemetry & Phishing Risk',
        tags: ['Website Analyzer'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url'],
                properties: { url: { type: 'string', example: 'https://google.com' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Website analysis completed.' },
        },
      },
    },

    '/api/v1/text/analyze': {
      post: {
        summary: 'Analyze Text Authenticity, AI Probability, Sentiment & Sensationalism',
        tags: ['Text Analyzer'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['text'],
                properties: {
                  text: { type: 'string', example: 'In conclusion, this article evaluates AI text.' },
                  benchmarkText: { type: 'string', example: 'Optional reference text for cosine similarity.' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Text NLP evaluation completed.' },
        },
      },
    },

    '/api/v1/trust-score/evaluate': {
      post: {
        summary: 'Evaluate Multi-Modal Composite Trust Score Index',
        tags: ['Trust Score Engine'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  imageScore: { type: 'number', example: 82.0 },
                  documentScore: { type: 'number', example: 75.0 },
                  websiteScore: { type: 'number', example: 92.0 },
                  textScore: { type: 'number', example: 88.0 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Multi-modal Trust Index evaluated.' },
        },
      },
    },
  },
};

module.exports = swaggerSpec;

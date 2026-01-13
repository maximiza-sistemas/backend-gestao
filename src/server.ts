import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import { generalLimiter } from './middleware/rateLimit';
import { httpLogger, errorLogger } from './middleware/logger';
import routes from './routes';

// Carregar variáveis de ambiente
dotenv.config();

// Criar aplicação Express
const app = express();
const PORT = process.env.PORT || 3000;

// ====================================
// MIDDLEWARES GLOBAIS
// ====================================

// Segurança
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
const isProduction = process.env.NODE_ENV === 'production';
const defaultDevOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
];

const allowedOrigins = isProduction
  ? (process.env.FRONTEND_URLS?.split(',').map((url) => url.trim()).filter(Boolean) ??
    ['https://seu-frontend.com'])
  : defaultDevOrigins;

const isOriginAllowed = (origin: string) => {
  if (!isProduction) {
    // Em desenvolvimento, aceitar qualquer origem local para facilitar os testes
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  }
  if (allowedOrigins.includes(origin)) return true;
  return false;
};

app.use(
  cors({
    origin: isProduction
      ? (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }
        if (isOriginAllowed(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Disposition'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Compressão
app.use(compression());

// Rate limiting
app.use(generalLimiter);

// Log de requisições HTTP
app.use(httpLogger);

// Parse JSON e URL encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy (importante para rate limiting e logs de IP)
app.set('trust proxy', 1);

// ====================================
// ROTAS
// ====================================

// Rota raiz
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API da Distribuidora de Gás',
    version: '1.0.0',
    documentation: '/api/health',
    timestamp: new Date().toISOString()
  });
});

// Todas as rotas da API
app.use('/api', routes);

// ====================================
// MIDDLEWARE DE TRATAMENTO DE ERROS
// ====================================

// Log de erros
app.use(errorLogger);

// Middleware de tratamento de erros
app.use((err: any, req: Request, res: Response, next: NextFunction): void => {
  console.error('Erro não tratado:', err);

  // Erro de validação do Joi
  if (err.isJoi) {
    res.status(400).json({
      success: false,
      error: 'Dados inválidos',
      details: err.details
    });
    return;
  }

  // Erro de sintaxe JSON
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      error: 'JSON inválido'
    });
    return;
  }

  // Erro genérico
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Middleware para rotas não encontradas
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    path: req.originalUrl,
    method: req.method
  });
});

// ====================================
// INICIALIZAÇÃO DO SERVIDOR
// ====================================

const startServer = async (): Promise<void> => {
  try {
    console.log('🚀 Iniciando servidor...');

    // Testar conexão com o banco de dados
    console.log('📊 Testando conexão com o banco de dados...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('❌ Falha na conexão com o banco de dados');
      process.exit(1);
    }

    // Iniciar servidor
    const server = app.listen(PORT, () => {
      console.log(`✅ Servidor rodando na porta ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`📋 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🔒 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\n🛑 Recebido sinal ${signal}. Iniciando graceful shutdown...`);

      server.close((err) => {
        if (err) {
          console.error('❌ Erro ao fechar servidor:', err);
          process.exit(1);
        }

        console.log('✅ Servidor fechado com sucesso');
        process.exit(0);
      });
    };

    // Escutar sinais de término
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Tratar erros não capturados
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });

  } catch (error) {
    console.error('💥 Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

// Iniciar o servidor
// Iniciar o servidor apenas se este arquivo for executado diretamente
if (require.main === module) {
  startServer();
}

export default app;

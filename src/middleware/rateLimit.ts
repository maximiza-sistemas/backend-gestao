import rateLimit from 'express-rate-limit';

// Rate limiting geral
export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || (process.env.NODE_ENV === 'development' ? '1000' : '100')), // 1000 em dev, 100 em prod
  message: {
    success: false,
    error: 'Muitas requisições deste IP, tente novamente em alguns minutos'
  },
  standardHeaders: true, // Retorna rate limit info nos headers `RateLimit-*`
  legacyHeaders: false, // Desabilita headers `X-RateLimit-*`
});

// Rate limiting mais restritivo para login
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas de login por IP
  message: {
    success: false,
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Reseta o contador após sucesso
  skipSuccessfulRequests: true
});

// Rate limiting para criação de registros
export const createLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 50, // máximo 50 criações por IP
  message: {
    success: false,
    error: 'Muitas criações de registros. Tente novamente em alguns minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting para atualizações
export const updateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 100, // máximo 100 atualizações por IP
  message: {
    success: false,
    error: 'Muitas atualizações. Tente novamente em alguns minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting para relatórios (mais permissivo)
export const reportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // máximo 20 relatórios por IP
  message: {
    success: false,
    error: 'Muitas consultas de relatórios. Tente novamente em alguns minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

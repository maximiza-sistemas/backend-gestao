import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../types';

// Middleware genérico de validação
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const validationErrors: ValidationError[] = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        validation_errors: validationErrors
      });
      return;
    }

    next();
  };
};

// Schemas de validação para usuários
export const userSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 100 caracteres',
      'any.required': 'Nome é obrigatório'
    }),
    email: Joi.string().email().max(150).required().messages({
      'string.email': 'Email deve ter um formato válido',
      'string.max': 'Email deve ter no máximo 150 caracteres',
      'any.required': 'Email é obrigatório'
    }),
    password: Joi.string().min(6).max(50).required().messages({
      'string.min': 'Senha deve ter pelo menos 6 caracteres',
      'string.max': 'Senha deve ter no máximo 50 caracteres',
      'any.required': 'Senha é obrigatória'
    }),
    role: Joi.string().valid('Administrador', 'Gerente', 'Vendedor').required().messages({
      'any.only': 'Role deve ser: Administrador, Gerente ou Vendedor',
      'any.required': 'Role é obrigatório'
    }),
    status: Joi.string().valid('Ativo', 'Inativo').default('Ativo')
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).messages({
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 100 caracteres'
    }),
    email: Joi.string().email().max(150).messages({
      'string.email': 'Email deve ter um formato válido',
      'string.max': 'Email deve ter no máximo 150 caracteres'
    }),
    password: Joi.string().min(6).max(50).messages({
      'string.min': 'Senha deve ter pelo menos 6 caracteres',
      'string.max': 'Senha deve ter no máximo 50 caracteres'
    }),
    role: Joi.string().valid('Administrador', 'Gerente', 'Vendedor').messages({
      'any.only': 'Role deve ser: Administrador, Gerente ou Vendedor'
    }),
    status: Joi.string().valid('Ativo', 'Inativo')
  }).min(1).messages({
    'object.min': 'Pelo menos um campo deve ser fornecido para atualização'
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email deve ter um formato válido',
      'any.required': 'Email é obrigatório'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Senha é obrigatória'
    })
  })
};

// Schemas de validação para clientes
export const clientSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(150).required().messages({
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 150 caracteres',
      'any.required': 'Nome é obrigatório'
    }),
    type: Joi.string().valid('Residencial', 'Comercial', 'Industrial').required().messages({
      'any.only': 'Tipo deve ser: Residencial, Comercial ou Industrial',
      'any.required': 'Tipo é obrigatório'
    }),
    contact: Joi.string().max(20).allow(''),
    email: Joi.string().email().max(150).allow(''),
    address: Joi.string().max(500).allow(''),
    city: Joi.string().max(100).allow(''),
    state: Joi.string().length(2).allow(''),
    zip_code: Joi.string().max(10).allow(''),
    cpf_cnpj: Joi.string().max(20).allow(''),
    status: Joi.string().valid('Ativo', 'Inativo').default('Ativo'),
    credit_limit: Joi.number().min(0).default(0)
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(150),
    type: Joi.string().valid('Residencial', 'Comercial', 'Industrial'),
    contact: Joi.string().max(20).allow(''),
    email: Joi.string().email().max(150).allow(''),
    address: Joi.string().max(500).allow(''),
    city: Joi.string().max(100).allow(''),
    state: Joi.string().length(2).allow(''),
    zip_code: Joi.string().max(10).allow(''),
    cpf_cnpj: Joi.string().max(20).allow(''),
    status: Joi.string().valid('Ativo', 'Inativo'),
    credit_limit: Joi.number().min(0)
  }).min(1)
};

// Schemas de validação para produtos
export const productSchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(50).required().messages({
      'string.min': 'Nome deve ter pelo menos 1 caractere',
      'string.max': 'Nome deve ter no máximo 50 caracteres',
      'any.required': 'Nome é obrigatório'
    }),
    description: Joi.string().max(500).allow(''),
    weight_kg: Joi.number().min(0),
    price_sell: Joi.number().min(0).required().messages({
      'number.min': 'Preço de venda deve ser maior ou igual a zero',
      'any.required': 'Preço de venda é obrigatório'
    }),
    price_buy: Joi.number().min(0),
    status: Joi.string().valid('Ativo', 'Inativo').default('Ativo')
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(50),
    description: Joi.string().max(500).allow(''),
    weight_kg: Joi.number().min(0),
    price_sell: Joi.number().min(0),
    price_buy: Joi.number().min(0),
    status: Joi.string().valid('Ativo', 'Inativo')
  }).min(1)
};

// Schemas de validação para pedidos
export const orderSchemas = {
  create: Joi.object({
    client_id: Joi.number().integer().min(1).required().messages({
      'number.integer': 'ID do cliente deve ser um número inteiro',
      'number.min': 'ID do cliente deve ser maior que zero',
      'any.required': 'Cliente é obrigatório'
    }),
    user_id: Joi.number().integer().min(1),
    location_id: Joi.number().integer().min(1),
    vehicle_id: Joi.number().integer().min(1),
    order_date: Joi.date(),
    delivery_date: Joi.date(),
    delivery_address: Joi.string().max(500).allow(''),
    discount: Joi.number().min(0).default(0),
    payment_method: Joi.string().valid('Dinheiro', 'Pix', 'Prazo', 'Misto').messages({
      'any.only': 'Método de pagamento deve ser: Dinheiro, Pix, Prazo ou Misto'
    }),
    payment_status: Joi.string().valid('Pendente', 'Pago', 'Parcial', 'Vencido').default('Pendente'),
    payment_cash_amount: Joi.number().min(0).default(0).when('payment_method', {
      is: Joi.alternatives().try('Dinheiro', 'Pix', 'Misto'),
      then: Joi.number().min(0).required().messages({
        'any.required': 'Valor à vista é obrigatório para pagamentos em Dinheiro, Pix ou Misto'
      })
    }),
    payment_term_amount: Joi.number().min(0).default(0).when('payment_method', {
      is: Joi.alternatives().try('Prazo', 'Misto'),
      then: Joi.number().min(0).required().messages({
        'any.required': 'Valor a prazo é obrigatório para pagamentos a Prazo ou Misto'
      })
    }),
    payment_installments: Joi.number().integer().min(1).default(1),
    payment_due_date: Joi.date().allow(null),
    notes: Joi.string().max(1000).allow(''),
    items: Joi.array().items(
      Joi.object({
        product_id: Joi.number().integer().min(1).required(),
        quantity: Joi.number().integer().min(1).required(),
        unit_price: Joi.number().min(0).required()
      })
    ).min(1).required().messages({
      'array.min': 'Pelo menos um item deve ser incluído no pedido',
      'any.required': 'Itens do pedido são obrigatórios'
    }),
    status: Joi.string().valid('Pendente', 'Em Rota', 'Entregue', 'Cancelado').default('Pendente'),
    // Campos adicionais do formulário simplificado
    expenses: Joi.number().min(0).default(0),
    gross_value: Joi.number().min(0),
    net_value: Joi.number(),
    payment_details: Joi.string().max(2000).allow(''),
    receipt_file: Joi.any() // Arquivo de comprovante (tratado pelo multer)
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid('Pendente', 'Em Rota', 'Entregue', 'Cancelado').required().messages({
      'any.only': 'Status deve ser: Pendente, Em Rota, Entregue ou Cancelado',
      'any.required': 'Status é obrigatório'
    })
  })
};

// Schemas de validação para estoque
export const stockSchemas = {
  update: Joi.object({
    full_quantity: Joi.number().integer().min(0),
    empty_quantity: Joi.number().integer().min(0),
    maintenance_quantity: Joi.number().integer().min(0),
    min_stock_level: Joi.number().integer().min(0),
    max_stock_level: Joi.number().integer().min(0)
  }).min(1),

  movement: Joi.object({
    product_id: Joi.number().integer().min(1).required(),
    location_id: Joi.number().integer().min(1).required(),
    order_id: Joi.number().integer().min(1),
    movement_type: Joi.string().valid('Entrada', 'Saída', 'Transferência', 'Ajuste', 'Manutenção').required(),
    bottle_type: Joi.string().valid('Cheio', 'Vazio', 'Manutenção').required(),
    quantity: Joi.number().integer().min(1).required(),
    reason: Joi.string().max(500).allow(''),
    user_id: Joi.number().integer().min(1)
  })
};

// Schemas de validação para fornecedores
export const supplierSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(150).required(),
    category: Joi.string().max(50).allow(''),
    contact: Joi.string().max(20).allow(''),
    email: Joi.string().email().max(150).allow(''),
    address: Joi.string().max(500).allow(''),
    city: Joi.string().max(100).allow(''),
    state: Joi.string().length(2).allow(''),
    zip_code: Joi.string().max(10).allow(''),
    cnpj: Joi.string().max(20).allow(''),
    status: Joi.string().valid('Ativo', 'Inativo').default('Ativo')
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(150),
    category: Joi.string().max(50).allow(''),
    contact: Joi.string().max(20).allow(''),
    email: Joi.string().email().max(150).allow(''),
    address: Joi.string().max(500).allow(''),
    city: Joi.string().max(100).allow(''),
    state: Joi.string().length(2).allow(''),
    zip_code: Joi.string().max(10).allow(''),
    cnpj: Joi.string().max(20).allow(''),
    status: Joi.string().valid('Ativo', 'Inativo')
  }).min(1)
};

// Schemas de validação para contas a receber/pagar
export const financialSchemas = {
  receivable: Joi.object({
    client_id: Joi.number().integer().min(1).required(),
    order_id: Joi.number().integer().min(1),
    invoice_id: Joi.string().max(20).allow(''),
    issue_date: Joi.date(),
    due_date: Joi.date().required(),
    amount: Joi.number().min(0).required(),
    notes: Joi.string().max(1000).allow('')
  }),

  payable: Joi.object({
    supplier_id: Joi.number().integer().min(1).required(),
    description: Joi.string().min(1).max(500).required(),
    category: Joi.string().max(50).allow(''),
    issue_date: Joi.date(),
    due_date: Joi.date().required(),
    amount: Joi.number().min(0).required(),
    notes: Joi.string().max(1000).allow('')
  }),

  payment: Joi.object({
    amount: Joi.number().min(0).required(),
    payment_method: Joi.string().max(20).allow(''),
    notes: Joi.string().max(1000).allow('')
  })
};

// Middleware de validação de parâmetros de paginação
export const validatePagination = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(500).default(50),
    sort: Joi.string().max(50),
    order: Joi.string().valid('ASC', 'DESC').default('ASC'),
    search: Joi.string().max(100).allow('')
  }).unknown(true);

  const { error, value } = schema.validate(req.query);

  if (error) {
    res.status(400).json({
      success: false,
      error: 'Parâmetros de consulta inválidos',
      details: error.details[0].message
    });
    return;
  }

  // Substitui os parâmetros validados
  req.query = value;
  next();
};

// Middleware de validação de ID de parâmetro
export const validateId = (req: Request, res: Response, next: NextFunction): void => {
  const id = parseInt(req.params.id);

  if (isNaN(id) || id < 1) {
    res.status(400).json({
      success: false,
      error: 'ID inválido'
    });
    return;
  }

  next();
};

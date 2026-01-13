"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateId = exports.validatePagination = exports.financialSchemas = exports.supplierSchemas = exports.stockSchemas = exports.orderSchemas = exports.productSchemas = exports.clientSchemas = exports.userSchemas = exports.validate = void 0;
const joi_1 = __importDefault(require("joi"));
const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            const validationErrors = error.details.map(detail => ({
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
exports.validate = validate;
exports.userSchemas = {
    create: joi_1.default.object({
        name: joi_1.default.string().min(2).max(100).required().messages({
            'string.min': 'Nome deve ter pelo menos 2 caracteres',
            'string.max': 'Nome deve ter no máximo 100 caracteres',
            'any.required': 'Nome é obrigatório'
        }),
        email: joi_1.default.string().email().max(150).required().messages({
            'string.email': 'Email deve ter um formato válido',
            'string.max': 'Email deve ter no máximo 150 caracteres',
            'any.required': 'Email é obrigatório'
        }),
        password: joi_1.default.string().min(6).max(50).required().messages({
            'string.min': 'Senha deve ter pelo menos 6 caracteres',
            'string.max': 'Senha deve ter no máximo 50 caracteres',
            'any.required': 'Senha é obrigatória'
        }),
        role: joi_1.default.string().valid('Administrador', 'Gerente', 'Vendedor').required().messages({
            'any.only': 'Role deve ser: Administrador, Gerente ou Vendedor',
            'any.required': 'Role é obrigatório'
        }),
        status: joi_1.default.string().valid('Ativo', 'Inativo').default('Ativo')
    }),
    update: joi_1.default.object({
        name: joi_1.default.string().min(2).max(100).messages({
            'string.min': 'Nome deve ter pelo menos 2 caracteres',
            'string.max': 'Nome deve ter no máximo 100 caracteres'
        }),
        email: joi_1.default.string().email().max(150).messages({
            'string.email': 'Email deve ter um formato válido',
            'string.max': 'Email deve ter no máximo 150 caracteres'
        }),
        password: joi_1.default.string().min(6).max(50).messages({
            'string.min': 'Senha deve ter pelo menos 6 caracteres',
            'string.max': 'Senha deve ter no máximo 50 caracteres'
        }),
        role: joi_1.default.string().valid('Administrador', 'Gerente', 'Vendedor').messages({
            'any.only': 'Role deve ser: Administrador, Gerente ou Vendedor'
        }),
        status: joi_1.default.string().valid('Ativo', 'Inativo')
    }).min(1).messages({
        'object.min': 'Pelo menos um campo deve ser fornecido para atualização'
    }),
    login: joi_1.default.object({
        email: joi_1.default.string().email().required().messages({
            'string.email': 'Email deve ter um formato válido',
            'any.required': 'Email é obrigatório'
        }),
        password: joi_1.default.string().required().messages({
            'any.required': 'Senha é obrigatória'
        })
    })
};
exports.clientSchemas = {
    create: joi_1.default.object({
        name: joi_1.default.string().min(2).max(150).required().messages({
            'string.min': 'Nome deve ter pelo menos 2 caracteres',
            'string.max': 'Nome deve ter no máximo 150 caracteres',
            'any.required': 'Nome é obrigatório'
        }),
        type: joi_1.default.string().valid('Residencial', 'Comercial', 'Industrial').required().messages({
            'any.only': 'Tipo deve ser: Residencial, Comercial ou Industrial',
            'any.required': 'Tipo é obrigatório'
        }),
        contact: joi_1.default.string().max(20).allow(''),
        email: joi_1.default.string().email().max(150).allow(''),
        address: joi_1.default.string().max(500).allow(''),
        city: joi_1.default.string().max(100).allow(''),
        state: joi_1.default.string().length(2).allow(''),
        zip_code: joi_1.default.string().max(10).allow(''),
        cpf_cnpj: joi_1.default.string().max(20).allow(''),
        status: joi_1.default.string().valid('Ativo', 'Inativo').default('Ativo'),
        credit_limit: joi_1.default.number().min(0).default(0)
    }),
    update: joi_1.default.object({
        name: joi_1.default.string().min(2).max(150),
        type: joi_1.default.string().valid('Residencial', 'Comercial', 'Industrial'),
        contact: joi_1.default.string().max(20).allow(''),
        email: joi_1.default.string().email().max(150).allow(''),
        address: joi_1.default.string().max(500).allow(''),
        city: joi_1.default.string().max(100).allow(''),
        state: joi_1.default.string().length(2).allow(''),
        zip_code: joi_1.default.string().max(10).allow(''),
        cpf_cnpj: joi_1.default.string().max(20).allow(''),
        status: joi_1.default.string().valid('Ativo', 'Inativo'),
        credit_limit: joi_1.default.number().min(0)
    }).min(1)
};
exports.productSchemas = {
    create: joi_1.default.object({
        name: joi_1.default.string().min(1).max(50).required().messages({
            'string.min': 'Nome deve ter pelo menos 1 caractere',
            'string.max': 'Nome deve ter no máximo 50 caracteres',
            'any.required': 'Nome é obrigatório'
        }),
        description: joi_1.default.string().max(500).allow(''),
        weight_kg: joi_1.default.number().min(0),
        price_sell: joi_1.default.number().min(0).required().messages({
            'number.min': 'Preço de venda deve ser maior ou igual a zero',
            'any.required': 'Preço de venda é obrigatório'
        }),
        price_buy: joi_1.default.number().min(0),
        status: joi_1.default.string().valid('Ativo', 'Inativo').default('Ativo')
    }),
    update: joi_1.default.object({
        name: joi_1.default.string().min(1).max(50),
        description: joi_1.default.string().max(500).allow(''),
        weight_kg: joi_1.default.number().min(0),
        price_sell: joi_1.default.number().min(0),
        price_buy: joi_1.default.number().min(0),
        status: joi_1.default.string().valid('Ativo', 'Inativo')
    }).min(1)
};
exports.orderSchemas = {
    create: joi_1.default.object({
        client_id: joi_1.default.number().integer().min(1).required().messages({
            'number.integer': 'ID do cliente deve ser um número inteiro',
            'number.min': 'ID do cliente deve ser maior que zero',
            'any.required': 'Cliente é obrigatório'
        }),
        user_id: joi_1.default.number().integer().min(1),
        location_id: joi_1.default.number().integer().min(1),
        vehicle_id: joi_1.default.number().integer().min(1),
        order_date: joi_1.default.date(),
        delivery_date: joi_1.default.date(),
        delivery_address: joi_1.default.string().max(500).allow(''),
        discount: joi_1.default.number().min(0).default(0),
        payment_method: joi_1.default.string().valid('Dinheiro', 'Pix', 'Prazo', 'Misto').messages({
            'any.only': 'Método de pagamento deve ser: Dinheiro, Pix, Prazo ou Misto'
        }),
        payment_status: joi_1.default.string().valid('Pendente', 'Pago', 'Parcial', 'Vencido').default('Pendente'),
        payment_cash_amount: joi_1.default.number().min(0).default(0).when('payment_method', {
            is: joi_1.default.alternatives().try('Dinheiro', 'Pix', 'Misto'),
            then: joi_1.default.number().min(0).required().messages({
                'any.required': 'Valor à vista é obrigatório para pagamentos em Dinheiro, Pix ou Misto'
            })
        }),
        payment_term_amount: joi_1.default.number().min(0).default(0).when('payment_method', {
            is: joi_1.default.alternatives().try('Prazo', 'Misto'),
            then: joi_1.default.number().min(0).required().messages({
                'any.required': 'Valor a prazo é obrigatório para pagamentos a Prazo ou Misto'
            })
        }),
        payment_installments: joi_1.default.number().integer().min(1).default(1).when('payment_method', {
            is: joi_1.default.alternatives().try('Prazo', 'Misto'),
            then: joi_1.default.number().integer().min(1).required().messages({
                'any.required': 'Número de parcelas é obrigatório para pagamentos a Prazo ou Misto'
            })
        }),
        payment_due_date: joi_1.default.date().when('payment_method', {
            is: joi_1.default.alternatives().try('Prazo', 'Misto'),
            then: joi_1.default.date().required().messages({
                'any.required': 'Data de vencimento é obrigatória para pagamentos a Prazo ou Misto'
            })
        }),
        notes: joi_1.default.string().max(1000).allow(''),
        items: joi_1.default.array().items(joi_1.default.object({
            product_id: joi_1.default.number().integer().min(1).required(),
            quantity: joi_1.default.number().integer().min(1).required(),
            unit_price: joi_1.default.number().min(0).required()
        })).min(1).required().messages({
            'array.min': 'Pelo menos um item deve ser incluído no pedido',
            'any.required': 'Itens do pedido são obrigatórios'
        }),
        status: joi_1.default.string().valid('Pendente', 'Em Rota', 'Entregue', 'Cancelado').default('Pendente')
    }),
    updateStatus: joi_1.default.object({
        status: joi_1.default.string().valid('Pendente', 'Em Rota', 'Entregue', 'Cancelado').required().messages({
            'any.only': 'Status deve ser: Pendente, Em Rota, Entregue ou Cancelado',
            'any.required': 'Status é obrigatório'
        })
    })
};
exports.stockSchemas = {
    update: joi_1.default.object({
        full_quantity: joi_1.default.number().integer().min(0),
        empty_quantity: joi_1.default.number().integer().min(0),
        maintenance_quantity: joi_1.default.number().integer().min(0),
        min_stock_level: joi_1.default.number().integer().min(0),
        max_stock_level: joi_1.default.number().integer().min(0)
    }).min(1),
    movement: joi_1.default.object({
        product_id: joi_1.default.number().integer().min(1).required(),
        location_id: joi_1.default.number().integer().min(1).required(),
        order_id: joi_1.default.number().integer().min(1),
        movement_type: joi_1.default.string().valid('Entrada', 'Saída', 'Transferência', 'Ajuste', 'Manutenção').required(),
        bottle_type: joi_1.default.string().valid('Cheio', 'Vazio', 'Manutenção').required(),
        quantity: joi_1.default.number().integer().min(1).required(),
        reason: joi_1.default.string().max(500).allow(''),
        user_id: joi_1.default.number().integer().min(1)
    })
};
exports.supplierSchemas = {
    create: joi_1.default.object({
        name: joi_1.default.string().min(2).max(150).required(),
        category: joi_1.default.string().max(50).allow(''),
        contact: joi_1.default.string().max(20).allow(''),
        email: joi_1.default.string().email().max(150).allow(''),
        address: joi_1.default.string().max(500).allow(''),
        city: joi_1.default.string().max(100).allow(''),
        state: joi_1.default.string().length(2).allow(''),
        zip_code: joi_1.default.string().max(10).allow(''),
        cnpj: joi_1.default.string().max(20).allow(''),
        status: joi_1.default.string().valid('Ativo', 'Inativo').default('Ativo')
    }),
    update: joi_1.default.object({
        name: joi_1.default.string().min(2).max(150),
        category: joi_1.default.string().max(50).allow(''),
        contact: joi_1.default.string().max(20).allow(''),
        email: joi_1.default.string().email().max(150).allow(''),
        address: joi_1.default.string().max(500).allow(''),
        city: joi_1.default.string().max(100).allow(''),
        state: joi_1.default.string().length(2).allow(''),
        zip_code: joi_1.default.string().max(10).allow(''),
        cnpj: joi_1.default.string().max(20).allow(''),
        status: joi_1.default.string().valid('Ativo', 'Inativo')
    }).min(1)
};
exports.financialSchemas = {
    receivable: joi_1.default.object({
        client_id: joi_1.default.number().integer().min(1).required(),
        order_id: joi_1.default.number().integer().min(1),
        invoice_id: joi_1.default.string().max(20).allow(''),
        issue_date: joi_1.default.date(),
        due_date: joi_1.default.date().required(),
        amount: joi_1.default.number().min(0).required(),
        notes: joi_1.default.string().max(1000).allow('')
    }),
    payable: joi_1.default.object({
        supplier_id: joi_1.default.number().integer().min(1).required(),
        description: joi_1.default.string().min(1).max(500).required(),
        category: joi_1.default.string().max(50).allow(''),
        issue_date: joi_1.default.date(),
        due_date: joi_1.default.date().required(),
        amount: joi_1.default.number().min(0).required(),
        notes: joi_1.default.string().max(1000).allow('')
    }),
    payment: joi_1.default.object({
        amount: joi_1.default.number().min(0).required(),
        payment_method: joi_1.default.string().max(20).allow(''),
        notes: joi_1.default.string().max(1000).allow('')
    })
};
const validatePagination = (req, res, next) => {
    const schema = joi_1.default.object({
        page: joi_1.default.number().integer().min(1).default(1),
        limit: joi_1.default.number().integer().min(1).max(100).default(50),
        sort: joi_1.default.string().max(50),
        order: joi_1.default.string().valid('ASC', 'DESC').default('ASC'),
        search: joi_1.default.string().max(100).allow('')
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
    req.query = value;
    next();
};
exports.validatePagination = validatePagination;
const validateId = (req, res, next) => {
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
exports.validateId = validateId;
//# sourceMappingURL=validation.js.map
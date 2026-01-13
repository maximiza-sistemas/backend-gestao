import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
export declare const validate: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => void;
export declare const userSchemas: {
    create: Joi.ObjectSchema<any>;
    update: Joi.ObjectSchema<any>;
    login: Joi.ObjectSchema<any>;
};
export declare const clientSchemas: {
    create: Joi.ObjectSchema<any>;
    update: Joi.ObjectSchema<any>;
};
export declare const productSchemas: {
    create: Joi.ObjectSchema<any>;
    update: Joi.ObjectSchema<any>;
};
export declare const orderSchemas: {
    create: Joi.ObjectSchema<any>;
    updateStatus: Joi.ObjectSchema<any>;
};
export declare const stockSchemas: {
    update: Joi.ObjectSchema<any>;
    movement: Joi.ObjectSchema<any>;
};
export declare const supplierSchemas: {
    create: Joi.ObjectSchema<any>;
    update: Joi.ObjectSchema<any>;
};
export declare const financialSchemas: {
    receivable: Joi.ObjectSchema<any>;
    payable: Joi.ObjectSchema<any>;
    payment: Joi.ObjectSchema<any>;
};
export declare const validatePagination: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateId: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.d.ts.map
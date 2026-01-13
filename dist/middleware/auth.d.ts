import { Request, Response, NextFunction } from 'express';
import { JWTPayload } from '../types';
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                email: string;
                role: string;
            };
        }
    }
}
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authorizeRole: (roles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAdminOrManager: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const generateToken: (payload: {
    user_id: number;
    email: string;
    role: string;
}) => string;
export declare const verifyTokenOnly: (token: string) => JWTPayload | null;
//# sourceMappingURL=auth.d.ts.map
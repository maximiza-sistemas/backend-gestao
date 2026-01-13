import { Request, Response, NextFunction } from 'express';
import { ActivityLog } from '../types';
export declare const httpLogger: (req: import("http").IncomingMessage, res: import("http").ServerResponse<import("http").IncomingMessage>, callback: (err?: Error) => void) => void;
export declare const activityLogger: (action: string, tableName?: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const errorLogger: (err: any, req: Request, res: Response, next: NextFunction) => void;
export declare const getActivityLogs: (options: {
    userId?: number;
    page?: number;
    limit?: number;
    dateFrom?: Date;
    dateTo?: Date;
}) => Promise<{
    success: boolean;
    data?: ActivityLog[];
    pagination?: any;
    error?: string;
}>;
export declare const cleanOldLogs: (daysToKeep?: number) => Promise<void>;
//# sourceMappingURL=logger.d.ts.map
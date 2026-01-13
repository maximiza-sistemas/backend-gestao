import { BaseModel } from './BaseModel';
import { User, CreateUserRequest, ApiResponse } from '../types';
export declare class UserModel extends BaseModel {
    constructor();
    findByEmail(email: string): Promise<ApiResponse<User>>;
    create(userData: CreateUserRequest): Promise<ApiResponse<User>>;
    update(id: number, userData: Partial<CreateUserRequest>): Promise<ApiResponse<User>>;
    verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
    findActive(): Promise<ApiResponse<User[]>>;
    findByRole(role: string): Promise<ApiResponse<User[]>>;
    findAll(options?: any): Promise<ApiResponse>;
    findById(id: number): Promise<ApiResponse>;
}
//# sourceMappingURL=UserModel.d.ts.map
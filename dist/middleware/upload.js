"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContractPath = exports.deleteContractFile = exports.uploadContract = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uploadsDir = path_1.default.join(__dirname, '../../uploads/contracts');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `contract_${uniqueSuffix}${ext}`);
    }
});
const fileFilter = (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    }
    else {
        cb(new Error('Apenas arquivos PDF são permitidos'));
    }
};
exports.uploadContract = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024
    }
}).single('contract');
const deleteContractFile = (filename) => {
    try {
        const filePath = path_1.default.join(uploadsDir, filename);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
            return true;
        }
        return false;
    }
    catch (error) {
        console.error('Erro ao deletar arquivo de contrato:', error);
        return false;
    }
};
exports.deleteContractFile = deleteContractFile;
const getContractPath = (filename) => {
    return path_1.default.join(uploadsDir, filename);
};
exports.getContractPath = getContractPath;
exports.default = exports.uploadContract;
//# sourceMappingURL=upload.js.map
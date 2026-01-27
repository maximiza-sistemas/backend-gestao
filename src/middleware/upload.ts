import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Base directory for uploads - use environment variable for production persistence
// Em produção (EasyPanel), usar /data/uploads que é um volume persistente
const UPLOAD_BASE_PATH = process.env.UPLOAD_BASE_PATH || path.join(__dirname, '../../uploads');

// Diretório de uploads para contratos
const contractsDir = path.join(UPLOAD_BASE_PATH, 'contracts');

// Diretório de uploads para comprovantes
const receiptsDir = path.join(UPLOAD_BASE_PATH, 'receipts');

// Log dos caminhos para debug
console.log('📁 Upload paths configurados:');
console.log(`   UPLOAD_BASE_PATH: ${UPLOAD_BASE_PATH}`);
console.log(`   contractsDir: ${contractsDir}`);
console.log(`   receiptsDir: ${receiptsDir}`);

// Criar diretórios se não existirem
try {
    if (!fs.existsSync(contractsDir)) {
        fs.mkdirSync(contractsDir, { recursive: true });
        console.log('✅ Diretório de contratos criado:', contractsDir);
    }
    if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
        console.log('✅ Diretório de comprovantes criado:', receiptsDir);
    }
} catch (error) {
    console.error('❌ Erro ao criar diretórios de upload:', error);
}

// Configuração de armazenamento para contratos
const contractStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, contractsDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `contract_${uniqueSuffix}${ext}`);
    }
});

// Configuração de armazenamento para comprovantes
const receiptStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, receiptsDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `receipt_${uniqueSuffix}${ext}`);
    }
});

// Filtro para aceitar apenas PDFs (contratos)
const pdfFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Apenas arquivos PDF são permitidos'));
    }
};

// Filtro para aceitar imagens e PDFs (comprovantes)
const receiptFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Apenas imagens (JPEG, PNG) e PDFs são permitidos'));
    }
};

// Configuração do multer para contratos
export const uploadContract = multer({
    storage: contractStorage,
    fileFilter: pdfFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // Limite de 10MB
    }
}).single('contract');

// Configuração do multer para comprovantes
export const uploadReceipt = multer({
    storage: receiptStorage,
    fileFilter: receiptFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Limite de 5MB
    }
}).single('receipt');

// Função para deletar arquivo de contrato
export const deleteContractFile = (filename: string): boolean => {
    try {
        const filePath = path.join(contractsDir, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Erro ao deletar arquivo de contrato:', error);
        return false;
    }
};

// Função para obter o caminho do contrato
export const getContractPath = (filename: string): string => {
    return path.join(contractsDir, filename);
};

// Função para deletar arquivo de comprovante
export const deleteReceiptFile = (filename: string): boolean => {
    try {
        const filePath = path.join(receiptsDir, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Erro ao deletar arquivo de comprovante:', error);
        return false;
    }
};

// Função para obter o caminho do comprovante
export const getReceiptPath = (filename: string): string => {
    return path.join(receiptsDir, filename);
};

export default uploadContract;


import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Diretório de uploads
const uploadsDir = path.join(__dirname, '../../uploads/contracts');

// Criar diretório se não existir
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuração de armazenamento
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
        // Gerar nome único: timestamp_originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `contract_${uniqueSuffix}${ext}`);
    }
});

// Filtro para aceitar apenas PDFs
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Apenas arquivos PDF são permitidos'));
    }
};

// Configuração do multer
export const uploadContract = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // Limite de 10MB
    }
}).single('contract');

// Função para deletar arquivo de contrato
export const deleteContractFile = (filename: string): boolean => {
    try {
        const filePath = path.join(uploadsDir, filename);
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

// Função para obter o caminho do arquivo
export const getContractPath = (filename: string): string => {
    return path.join(uploadsDir, filename);
};

export default uploadContract;

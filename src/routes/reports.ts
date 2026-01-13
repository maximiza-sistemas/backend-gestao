import { Router } from 'express';
import { reportLimiter } from '../middleware/rateLimit';
import { ReportModel } from '../models/ReportModel';

const router = Router();
const reportModel = new ReportModel();

router.get('/detailed', reportLimiter, async (req, res) => {
  try {
    const { date_from, date_to, location_id } = req.query;

    if (!date_from || !date_to) {
      return res.status(400).json({
        success: false,
        error: 'Os parâmetros date_from e date_to são obrigatórios',
      });
    }

    const filters = {
      dateFrom: String(date_from),
      dateTo: String(date_to),
      locationId: location_id ? Number(location_id) : undefined,
    };

    const data = await reportModel.getDetailedReport(filters);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao gerar relatório detalhado:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao gerar relatório detalhado. Tente novamente mais tarde.',
    });
  }
});

export default router;

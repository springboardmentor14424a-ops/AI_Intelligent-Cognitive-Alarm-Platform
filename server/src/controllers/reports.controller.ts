import { Request, Response, NextFunction } from 'express';
import { generateReport, exportReportToCsv, exportReportToHtmlDoc, ReportType, ExportFormat } from '../services/reports.service.js';
import { AppError } from '../middleware/error.middleware.js';

export const getReportView = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const reportType = (req.query.type as ReportType) || 'full_comprehensive';
    const reportData = await generateReport(userId, reportType);

    res.status(200).json({
      success: true,
      message: 'Report generated successfully',
      data: reportData,
    });
  } catch (error) {
    next(error);
  }
};

export const exportReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const reportType = (req.query.type as ReportType) || 'full_comprehensive';
    const format = ((req.query.format as string) || 'json').toLowerCase() as ExportFormat;

    const reportData = await generateReport(userId, reportType);

    if (format === 'csv') {
      const csvContent = exportReportToCsv(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}_${Date.now()}.csv"`);
      res.status(200).send(csvContent);
      return;
    }

    if (format === 'html' || format === 'pdf') {
      const htmlContent = exportReportToHtmlDoc(reportData);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `inline; filename="${reportType}_${Date.now()}.html"`);
      res.status(200).send(htmlContent);
      return;
    }

    res.status(200).json({
      success: true,
      data: reportData,
    });
  } catch (error) {
    next(error);
  }
};

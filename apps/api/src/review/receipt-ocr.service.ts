import { Injectable, Logger } from '@nestjs/common';
import { createWorker } from 'tesseract.js';

export type ReceiptMatchReport = {
  dishName: string;
  restaurantName: string;
  dishMatched: boolean;
  matchScore: number;
  matchedTokens: string[];
  missingTokens: string[];
  restaurantMentioned: boolean;
  ocrConfidence: number | null;
  summary: string;
  /** First ~400 chars of OCR for quick admin skim */
  ocrPreview: string;
};

export type ReceiptOcrResult = {
  ocrStatus: 'DONE' | 'FAILED';
  ocrText: string | null;
  ocrConfidence: number | null;
  dishMatched: boolean | null;
  matchScore: number | null;
  matchReport: ReceiptMatchReport | null;
};

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'of',
  'with',
  'in',
  'on',
  'at',
  'to',
  'for',
  'by',
  'from',
  'rs',
  'pkr',
  'rupees',
]);

@Injectable()
export class ReceiptOcrService {
  private readonly logger = new Logger(ReceiptOcrService.name);

  async analyzeReceipt(params: {
    imagePath: string;
    dishName: string;
    restaurantName: string;
  }): Promise<ReceiptOcrResult> {
    try {
      const { text, confidence } = await this.runOcr(params.imagePath);
      const report = this.buildMatchReport({
        ocrText: text,
        ocrConfidence: confidence,
        dishName: params.dishName,
        restaurantName: params.restaurantName,
      });
      return {
        ocrStatus: 'DONE',
        ocrText: text,
        ocrConfidence: confidence,
        dishMatched: report.dishMatched,
        matchScore: report.matchScore,
        matchReport: report,
      };
    } catch (err) {
      this.logger.warn(
        `OCR failed for ${params.imagePath}: ${err instanceof Error ? err.message : err}`,
      );
      return {
        ocrStatus: 'FAILED',
        ocrText: null,
        ocrConfidence: null,
        dishMatched: null,
        matchScore: null,
        matchReport: {
          dishName: params.dishName,
          restaurantName: params.restaurantName,
          dishMatched: false,
          matchScore: 0,
          matchedTokens: [],
          missingTokens: this.significantTokens(params.dishName),
          restaurantMentioned: false,
          ocrConfidence: null,
          summary: 'OCR failed — admin should inspect the receipt image manually.',
          ocrPreview: '',
        },
      };
    }
  }

  private async runOcr(imagePath: string): Promise<{ text: string; confidence: number | null }> {
    const worker = await createWorker('eng');
    try {
      const {
        data: { text, confidence },
      } = await worker.recognize(imagePath);
      return {
        text: (text || '').trim(),
        confidence:
          typeof confidence === 'number' && Number.isFinite(confidence)
            ? Math.max(0, Math.min(1, confidence / 100))
            : null,
      };
    } finally {
      await worker.terminate();
    }
  }

  buildMatchReport(params: {
    ocrText: string;
    ocrConfidence: number | null;
    dishName: string;
    restaurantName: string;
  }): ReceiptMatchReport {
    const normalizedOcr = this.normalize(params.ocrText);
    const dishTokens = this.significantTokens(params.dishName);
    const matchedTokens = dishTokens.filter((t) => normalizedOcr.includes(t));
    const missingTokens = dishTokens.filter((t) => !normalizedOcr.includes(t));

    const fullDish = this.normalize(params.dishName);
    const fullMatch = fullDish.length >= 3 && normalizedOcr.includes(fullDish);

    const tokenScore =
      dishTokens.length === 0 ? 0 : matchedTokens.length / dishTokens.length;
    // Full name hit outweighs partial token hits.
    const matchScore = fullMatch ? Math.max(tokenScore, 0.92) : tokenScore;
    const dishMatched = fullMatch || (dishTokens.length > 0 && tokenScore >= 0.6);

    const restaurantTokens = this.significantTokens(params.restaurantName);
    const restaurantMentioned =
      restaurantTokens.length > 0 &&
      restaurantTokens.filter((t) => normalizedOcr.includes(t)).length /
        restaurantTokens.length >=
        0.5;

    let summary: string;
    if (!params.ocrText.trim()) {
      summary = 'No text could be read from the receipt image.';
    } else if (dishMatched && restaurantMentioned) {
      summary = `Dish “${params.dishName}” and restaurant appear on the receipt.`;
    } else if (dishMatched) {
      summary = `Dish “${params.dishName}” appears on the receipt; restaurant name is unclear.`;
    } else if (matchScore > 0) {
      summary = `Partial dish match (${Math.round(matchScore * 100)}%) — check OCR text carefully.`;
    } else {
      summary = `Dish “${params.dishName}” was not found in the extracted receipt text.`;
    }

    return {
      dishName: params.dishName,
      restaurantName: params.restaurantName,
      dishMatched,
      matchScore: Math.round(matchScore * 1000) / 1000,
      matchedTokens,
      missingTokens,
      restaurantMentioned,
      ocrConfidence: params.ocrConfidence,
      summary,
      ocrPreview: params.ocrText.slice(0, 400),
    };
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private significantTokens(value: string): string[] {
    return this.normalize(value)
      .split(' ')
      .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
  }
}

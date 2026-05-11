/**
 * API Configuration - ربط Frontend مع Backend
 * Backend Running on: http://0.0.0.0:8000
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const api = {
  // الخدمات الأساسية
  async analyzeLyrics(text: string, dialect: string = 'fusha') {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, dialect }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error analyzing lyrics:', error);
      throw error;
    }
  },

  // تحليل الإيقاع
  async analyzeBeat(beatData: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/beat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(beatData),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error analyzing beat:', error);
      throw error;
    }
  },

  // التحليل الدلالي
  async analyzeSemantics(text: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/semantics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error analyzing semantics:', error);
      throw error;
    }
  },

  // الحصول على الحالة
  async getStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting status:', error);
      throw error;
    }
  },
};

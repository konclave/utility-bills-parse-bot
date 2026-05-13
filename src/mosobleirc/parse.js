import { getStringsFromPdf } from '../shared/parse-pdf.js';
import { getCurrentPeriodFilename } from '../shared/period.js';

const SERVICE_NAMES = {
  WATER: [
    'ВОДООТВЕДЕНИЕ',
    'ГОРЯЧЕЕ В/С (НОСИТЕЛЬ)',
    'ГОРЯЧЕЕ В/С (ЭНЕРГИЯ)',
    'ХОЛОДНОЕ В/С',
  ],
  ELECTRICITY: [
    'ЭЛЕКТРИЧЕСТВО ДЕНЬ ДВУХТАРИФНЫЙ ПУ (Д1)',
    'ЭЛЕКТРИЧЕСТВО НОЧЬ ДВУХТАРИФНЫЙ ПУ (Д1)',
  ],
  DOMOFON: ['ЗАПИРАЮЩЕЕ УСТРОЙСТВО', 'ОБСЛУЖИВАНИЕ СИСТЕМЫ ВИДЕОНАБЛЮДЕНИЯ'],
  MAINTENANCE: ['СОДЕРЖАНИЕ ЖИЛОГО ПОМЕЩЕНИЯ'],
  HEATING: ['ОТОПЛЕНИЕ КПУ'],
};

function safeNumber(value) {
  if (value == null) return 0;
  const num = Number(String(value).replace(',', '.'));
  return Number.isFinite(num) ? num : 0;
}

// Validation functions for error handling
function validatePdfBuffer(pdfBuffer) {
  if (!pdfBuffer) {
    return { isValid: false, error: 'PDF buffer is null or undefined' };
  }

  if (pdfBuffer.length === 0) {
    return { isValid: false, error: 'PDF buffer is empty' };
  }

  // Check for minimum PDF file size (PDF header is at least 8 bytes)
  if (pdfBuffer.length < 8) {
    return { isValid: false, error: 'PDF buffer too small to be a valid PDF' };
  }

  // Basic PDF header validation
  const header = pdfBuffer.slice(0, 4).toString();
  if (!header.startsWith('%PDF')) {
    return { isValid: false, error: 'Invalid PDF header - not a PDF file' };
  }

  return { isValid: true };
}

function validateExtractedData(chargeDetails) {
  if (!Array.isArray(chargeDetails)) {
    return { isValid: false, error: 'Charge details is not an array' };
  }

  // Check if we have at least some data
  if (chargeDetails.length === 0) {
    return { isValid: false, error: 'No charge details extracted from PDF' };
  }

  // Validate each charge detail
  const validatedDetails = [];
  const errors = [];

  for (const detail of chargeDetails) {
    if (!detail.nm_service || typeof detail.nm_service !== 'string') {
      errors.push(`Invalid service name: ${detail.nm_service}`);
      continue;
    }

    validatedDetails.push({
      nm_service: detail.nm_service,
      sm_total: detail.sm_total,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    validatedDetails,
  };
}

export async function parsePdfToChargeData(pdfBuffer) {
  const bufferValidation = validatePdfBuffer(pdfBuffer);
  if (!bufferValidation.isValid) {
    throw new Error(bufferValidation.error);
  }

  const strings = await getStringsFromPdf(pdfBuffer);

  if (!Array.isArray(strings) || strings.length === 0) {
    throw new Error('No text content found in PDF');
  }

  const chargeDetails = extractChargeDetails(strings);
  const dataValidation = validateExtractedData(chargeDetails);

  if (!dataValidation.isValid) {
    throw new Error(dataValidation.errors);
  }

  return {
    chargeDetails: dataValidation.validatedDetails,
  };
}

export function extractChargeDetails(strings) {
  const chargeDetails = [];

  SERVICE_NAMES.WATER.forEach((serviceName) => {
    const amount = extractServiceAmount(strings, serviceName);
    if (amount !== null) {
      chargeDetails.push({
        nm_service: serviceName,
        sm_total: amount,
      });
    }
  });

  // Extract electricity services
  SERVICE_NAMES.ELECTRICITY.forEach((serviceName) => {
    const amount = extractServiceAmount(strings, serviceName);
    if (amount !== null) {
      chargeDetails.push({
        nm_service: serviceName,
        sm_total: amount,
      });
    }
  });

  // Extract domofon services
  SERVICE_NAMES.DOMOFON.forEach((serviceName) => {
    const amount = extractServiceAmount(strings, serviceName);
    if (amount !== null) {
      chargeDetails.push({
        nm_service: serviceName,
        sm_total: amount,
      });
    }
  });

  // Extract maintenance services
  SERVICE_NAMES.MAINTENANCE.forEach((serviceName) => {
    const amount = extractServiceAmount(strings, serviceName);
    if (amount !== null) {
      chargeDetails.push({
        nm_service: serviceName,
        sm_total: amount,
      });
    }
  });

  // Extract heating services
  SERVICE_NAMES.HEATING.forEach((serviceName) => {
    const amount = extractServiceAmount(strings, serviceName);
    if (amount !== null) {
      chargeDetails.push({
        nm_service: serviceName,
        sm_total: amount,
      });
    }
  });

  return chargeDetails;
}

function extractServiceAmount(strings, serviceName) {
  try {
    // Validate input parameters
    if (!Array.isArray(strings) || strings.length === 0) {
      console.warn(
        `Cannot extract amount for ${serviceName}: invalid strings array`,
      );
      return null;
    }

    if (!serviceName || typeof serviceName !== 'string') {
      console.warn('Cannot extract amount: invalid service name');
      return null;
    }

    // Find the service name in the strings with improved pattern matching
    let serviceIndex = -1;

    if (serviceName === 'ЭЛЕКТРИЧЕСТВО ДЕНЬ ДВУХТАРИФНЫЙ ПУ (Д1)') {
      // Look for the main service entry, not the meter reading entry
      serviceIndex = strings.findIndex(
        (str, idx) =>
          str &&
          str.includes('ЭЛЕКТРИЧЕСТВО ДЕНЬ') &&
          idx < strings.length - 1 &&
          strings[idx + 1] === 'ДВУХТАРИФНЫЙ ПУ (Д1)',
      );
    } else if (serviceName === 'ЭЛЕКТРИЧЕСТВО НОЧЬ ДВУХТАРИФНЫЙ ПУ (Д1)') {
      // Look for the main service entry, not the meter reading entry
      serviceIndex = strings.findIndex(
        (str, idx) =>
          str &&
          str.includes('ЭЛЕКТРИЧЕСТВО НОЧЬ') &&
          idx < strings.length - 1 &&
          strings[idx + 1] === 'ДВУХТАРИФНЫЙ ПУ (Д1)',
      );
    } else if (serviceName === 'ОБСЛУЖИВАНИЕ СИСТЕМЫ ВИДЕОНАБЛЮДЕНИЯ') {
      // Find the service by looking for the split text
      const videoIndex = strings.findIndex(
        (str) => str && str.includes('ВИДЕОНАБЛЮДЕНИЯ'),
      );
      if (
        videoIndex > 0 &&
        strings[videoIndex - 1] === 'ОБСЛУЖИВАНИЕ СИСТЕМЫ'
      ) {
        serviceIndex = videoIndex - 1;
      }
    } else if (serviceName === 'ГОРЯЧЕЕ В/С (НОСИТЕЛЬ)') {
      // Find the main service entry (not ОДН) - should be around index 117
      serviceIndex = strings.findIndex(
        (str, idx) => str === serviceName && idx > 100 && idx < 200,
      );
    } else if (serviceName === 'ГОРЯЧЕЕ В/С (ЭНЕРГИЯ)') {
      // Should be around index 126
      serviceIndex = strings.findIndex((str) => str === serviceName);
    } else if (serviceName === 'ВОДООТВЕДЕНИЕ') {
      // Find the main service entry (not ОДН) - should be around index 108
      serviceIndex = strings.findIndex(
        (str, idx) => str === serviceName && idx > 100 && idx < 200,
      );
    } else if (serviceName === 'ХОЛОДНОЕ В/С') {
      // Find the main service entry (not ОДН) - should be around index 153
      serviceIndex = strings.findIndex(
        (str, idx) => str === serviceName && idx > 100 && idx < 200,
      );
    } else if (serviceName === 'ЗАПИРАЮЩЕЕ УСТРОЙСТВО') {
      serviceIndex = strings.findIndex((str) => str === serviceName);
    } else if (serviceName === 'СОДЕРЖАНИЕ ЖИЛОГО ПОМЕЩЕНИЯ') {
      serviceIndex = strings.findIndex((str) => str === serviceName);
    } else if (serviceName === 'ОТОПЛЕНИЕ КПУ') {
      serviceIndex = strings.findIndex((str) => str === serviceName);
    } else {
      serviceIndex = strings.findIndex(
        (str) => str && str.includes(serviceName),
      );
    }

    if (serviceIndex === -1) {
      console.debug(`Service not found in PDF: ${serviceName}`);
      return null;
    }

    // Extract the rightmost amount which appears to be the final charge
    // Based on PDF analysis, this is at position +8 from service name for most services
    let amountIndex = serviceIndex + 4;

    // Special handling for electricity services - the amount is at position +9
    if (serviceName.includes('ЭЛЕКТРИЧЕСТВО')) {
      amountIndex = serviceIndex + 5;
    }
    // Special handling for video surveillance (split across two lines)
    else if (serviceName === 'ОБСЛУЖИВАНИЕ СИСТЕМЫ ВИДЕОНАБЛЮДЕНИЯ') {
      amountIndex = serviceIndex + 5; // The amount is at position +9 from "ОБСЛУЖИВАНИЕ СИСТЕМЫ"
    }
    // Special handling for heating - the amount is at position +4
    else if (serviceName === 'ОТОПЛЕНИЕ КПУ') {
      amountIndex = serviceIndex + 4;
    }

    // Validate amount index bounds
    if (amountIndex >= strings.length) {
      console.warn(
        `Amount index out of bounds for ${serviceName}: ${amountIndex} >= ${strings.length}`,
      );
      return null;
    }

    const amountStr = strings[amountIndex];

    // Validate amount string
    if (!amountStr || typeof amountStr !== 'string') {
      console.warn(`Invalid amount string for ${serviceName}: ${amountStr}`);
      return null;
    }

    // Handle amounts with thousands separator and comma decimal
    const cleanAmount = amountStr.replace(/\s/g, '').replace(',', '.');
    const amountMatch = cleanAmount.match(/(\d+\.?\d*)/);

    if (amountMatch) {
      const amount = parseFloat(amountMatch[1]);
      return amount;
    } else {
      console.warn(
        `No valid amount pattern found for ${serviceName} in string: "${amountStr}"`,
      );
      return null;
    }
  } catch (error) {
    console.error(`Error extracting amount for ${serviceName}:`, error);
    return null;
  }
}

export async function parseCharges(input) {
  try {
    const items = input.chargeDetails;

    if (items.length === 0) {
      console.warn('No charge items found');
      return { text: 'Одинцово: Данные о начислениях не найдены 🙁', value: 0 };
    }

    const sumByNamesWithDetails = (names) => {
      try {
        const filteredItems = items.filter(
          (i) => i && names.includes(i.nm_service),
        );
        const values = filteredItems.map((i) => safeNumber(i.sm_total));
        const total =
          values.reduce((a, b) => {
            return a + b * 100;
          }, 0) / 100;
        console.log(values, total);
        const intermediate =
          values.length > 1 ? values.map((v) => v.toFixed(2)).join(' + ') : '';
        return { total, intermediate };
      } catch (error) {
        console.error('Error calculating sum for names:', names, error);
        return { total: 0, intermediate: '' };
      }
    };

    const water = sumByNamesWithDetails(SERVICE_NAMES.WATER);
    const electricity = sumByNamesWithDetails(SERVICE_NAMES.ELECTRICITY);
    const domofon = sumByNamesWithDetails(SERVICE_NAMES.DOMOFON);
    const maintenance = sumByNamesWithDetails(SERVICE_NAMES.MAINTENANCE);
    const heating = sumByNamesWithDetails(SERVICE_NAMES.HEATING);

    // Validate that we got reasonable values
    const totalAmount =
      water.total +
      electricity.total +
      domofon.total +
      maintenance.total +
      heating.total;
    if (totalAmount === 0) {
      console.warn('All calculated amounts are zero - possible parsing issue');
    }

    const formatMessage = (emoji, data) => {
      const baseText = `${emoji}: ${data.total} ₽`;
      return data.intermediate
        ? `${baseText}\n(${data.intermediate})`
        : baseText;
    };

    return [
      { text: formatMessage('💧', water), value: water.total },
      { text: formatMessage('⚡️', electricity), value: electricity.total },
      { text: formatMessage('📞️', domofon), value: domofon.total },
      { text: formatMessage('🏚️️', maintenance), value: maintenance.total },
      { text: `🔥: ${heating.total.toFixed(2)} ₽`, value: heating.total },
    ];
  } catch (error) {
    console.error('Error in parseCharges:', error);
    return { text: 'Одинцово: Ошибка обработки данных 😞', value: 0 };
  }
}

export function appendPdfMessage({ messages: parsed, pdfBuffer, period }) {
  const fileTitle = getCurrentPeriodFilename('odintsovo-bill-');
  return [...parsed, { fileTitle, fileBuffer: pdfBuffer }];
}

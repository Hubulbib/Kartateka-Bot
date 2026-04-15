/**
 * Проверяет, что загруженные файлы представлены массивом.
 */
export const hasValidUploadedFiles = (files: unknown): boolean => {
  return Array.isArray(files);
};

/**
 * Нормализует даты акции:
 * - если dateStart не передан, используется текущая дата;
 * - dateEnd всегда приводится к объекту Date.
 */
export const normalizePromotionDates = (
  dateEnd: Date | string,
  dateStart?: Date | string
): { dateStart: Date; dateEnd: Date } => {
  return {
    dateStart: dateStart ? new Date(dateStart) : new Date(),
    dateEnd: new Date(dateEnd),
  };
};

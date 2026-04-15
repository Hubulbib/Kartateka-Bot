/**
 * Проверяет, можно ли создать новую бизнес-заявку
 * с учетом антиспам-ограничения по времени.
 */
export const canCreateBusinessRequestByCooldown = (
  latestRequestCreatedAt: Date | null,
  now: Date,
  cooldownHours: number = 24
): boolean => {
  if (!latestRequestCreatedAt) {
    return true;
  }

  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  return now.getTime() - latestRequestCreatedAt.getTime() >= cooldownMs;
};

type BusinessRequestLike = {
  cafeName: string;
  createdAt: Date;
};

/**
 * Возвращает только последние заявки по каждому заведению.
 */
export const pickLatestBusinessRequestsByCafe = <T extends BusinessRequestLike>(
  requests: T[]
): T[] => {
  const latestByCafe = new Map<string, T>();

  for (const request of requests) {
    const current = latestByCafe.get(request.cafeName);
    if (!current || current.createdAt < request.createdAt) {
      latestByCafe.set(request.cafeName, request);
    }
  }

  return [...latestByCafe.values()];
};

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("ru-RU", {
    style: "decimal",
    minimumFractionDigits: 2,
  }).format(price);
};

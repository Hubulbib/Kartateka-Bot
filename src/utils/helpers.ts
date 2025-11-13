export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("ru-RU", {
    style: "decimal",
    minimumFractionDigits: 2,
  }).format(price);
};

export const checkToxic = async (text: string): Promise<number> => {
  const res = await fetch(
    `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${process.env.TOXIC_API_KEY}`,
    {
      method: "POST",
      body: JSON.stringify({
        comment: {
          text,
        },
        languages: ["ru"],
        requestedAttributes: { TOXICITY: {} },
      }),
      headers: { "Content-Type": "application/json" },
    }
  );
  const data = await res.json();
  console.log(
    data["attributeScores"]["TOXICITY"]["spanScores"][0]["score"]["value"]
  );
  return data["attributeScores"]["TOXICITY"]["spanScores"][0]["score"][
    "value"
  ] as number;
};

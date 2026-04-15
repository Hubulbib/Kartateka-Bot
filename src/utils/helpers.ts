import { google } from "googleapis";

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("ru-RU", {
    style: "decimal",
    minimumFractionDigits: 2,
  }).format(price);
};

export const checkToxic = async (text: string): Promise<number> => {
  try {
    let res: number = 0;

    const DISCOVERY_URL =
      "https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1";
    google.discoverAPI(DISCOVERY_URL).then((client) => {
      const analyzeRequest = {
        comment: {
          text,
        },
        requestedAttributes: {
          TOXICITY: {},
        },
      };

      client.comments["analyze"](
        {
          key: process.env.TOXIC_API_KEY,
          resource: analyzeRequest,
        },
        (err, response) => {
          if (err) {
            console.log(err);
            return 0;
          }
          res = response.data["attributeScores"]["TOXICITY"]["spanScores"][0][
            "score"
          ]["value"] as number;
        }
      );

      return res;
    });
  } catch (err) {
    return 0;
  }
};

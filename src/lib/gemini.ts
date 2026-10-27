import { GoogleGenAI, Type } from "@google/genai";

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

export interface PlantIdentificationResult {
  species: string;
  scientificName: string;
  suggestedNickname: string;
  wateringIntervalDays: number;
  lightRequirement: string;
  humidityRequirement: string;
  careNotes: string;
  confidence: number;
  isDemoMode?: boolean;
  fallbackReason?: string;
}

export interface DiagnosisIssue {
  name: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  symptoms: string;
  cause: string;
}

export interface DiagnosisTreatmentStep {
  step: number;
  title: string;
  description: string;
  timeframe: string;
}

export interface PlantDiagnosisResult {
  plantDetected: string;
  status: "HEALTHY" | "WARNING" | "CRITICAL";
  confidence: number;
  summary: string;
  issues: DiagnosisIssue[];
  treatments: DiagnosisTreatmentStep[];
  preventionTips: string[];
  isDemoMode?: boolean;
  fallbackReason?: string;
}

async function resolveImageData(imageBase64OrUrl: string): Promise<{
  mimeType: string;
  data: string;
} | null> {
  const match = imageBase64OrUrl.match(
    /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/
  );
  if (match) {
    return {
      mimeType: match[1],
      data: match[2],
    };
  }

  if (
    imageBase64OrUrl.startsWith("http://") ||
    imageBase64OrUrl.startsWith("https://")
  ) {
    try {
      const res = await fetch(imageBase64OrUrl);
      if (!res.ok) return null;
      const contentType = res.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      return {
        mimeType: contentType,
        data: base64,
      };
    } catch {
      return null;
    }
  }

  return null;
}

function getDemoIdentification(
  hintName?: string,
  fallbackReason?: string
): PlantIdentificationResult {
  const lowerHint = (hintName || "").toLowerCase();
  if (lowerHint.includes("ficus")) {
    return {
      species: "Ficus Lyrata (Figuier Lyre)",
      scientificName: "Ficus lyrata",
      suggestedNickname: "Mon Grand Ficus",
      wateringIntervalDays: 8,
      lightRequirement: "Lumière vive indirecte, sans soleil brûlant direct",
      humidityRequirement: "Élevée (50-70%), brumiser régulièrement",
      careNotes:
        "Laisser sécher le substrat sur 3 à 4 cm entre deux arrosages. Éviter les courants d'air froid et ne pas déplacer fréquemment la plante.",
      confidence: 92,
      isDemoMode: true,
      fallbackReason,
    };
  }
  if (lowerHint.includes("pothos") || lowerHint.includes("epipremnum")) {
    return {
      species: "Pothos Doré",
      scientificName: "Epipremnum aureum",
      suggestedNickname: "Pothos Cascade",
      wateringIntervalDays: 7,
      lightRequirement: "Lumière moyenne à vive indirecte (tolère la mi-ombre)",
      humidityRequirement: "Moyenne (40-60%)",
      careNotes:
        "Plante grimpante très robuste. Arroser quand la terre est sèche en surface. Nettoyer les feuilles à l'eau tiède tous les mois.",
      confidence: 95,
      isDemoMode: true,
      fallbackReason,
    };
  }
  if (lowerHint.includes("calathea") || lowerHint.includes("maranta")) {
    return {
      species: "Calathea Orbifolia",
      scientificName: "Goeppertia orbifolia",
      suggestedNickname: "Calathea Paon",
      wateringIntervalDays: 5,
      lightRequirement: "Mi-ombre à lumière tamisée (jamais de soleil direct)",
      humidityRequirement: "Élevée (60-80%), eau non calcaire recommandée",
      careNotes:
        "Garder le terreau légèrement humide sans jamais détremper les racines. Utiliser de l'eau filtrée ou de pluie à température ambiante.",
      confidence: 90,
      isDemoMode: true,
      fallbackReason,
    };
  }
  return {
    species: "Monstera Deliciosa (Faux Philodendron)",
    scientificName: "Monstera deliciosa",
    suggestedNickname: "Monstera du Salon",
    wateringIntervalDays: 7,
    lightRequirement: "Lumière vive indirecte",
    humidityRequirement: "Moyenne à élevée (50-65%)",
    careNotes:
      "Arroser lorsque les 3 premiers centimètres du terreau sont secs. Essuyer la poussière sur les feuilles fenestrées et prévoir un tuteur coco.",
    confidence: 94,
    isDemoMode: true,
    fallbackReason,
  };
}

function getDemoDiagnosis(
  userSymptoms?: string,
  plantSpecies?: string,
  fallbackReason?: string
): PlantDiagnosisResult {
  const symp = (userSymptoms || "").toLowerCase();
  const detectedName = plantSpecies || "Plante tropicale d'intérieur";

  if (
    symp.includes("blanc") ||
    symp.includes("cochenille") ||
    symp.includes("insecte") ||
    symp.includes("parasite") ||
    symp.includes("toile")
  ) {
    return {
      plantDetected: detectedName,
      status: "CRITICAL",
      confidence: 91,
      summary:
        "Attaque parasitaire détectée (suspicion de cochenilles farineuses ou tétranyques). Une isolation immédiate et un traitement foliaire sont nécessaires pour éviter la propagation aux autres plantes.",
      issues: [
        {
          name: "Infestation de cochenilles / acariens phytophages",
          severity: "HIGH",
          symptoms:
            "Amas cotonneux blanchâtres aux aisselles des feuilles, décoloration ponctuelle du limbe et affaiblissement des jeunes pousses.",
          cause:
            "Air intérieur trop sec combiné à un confinement ou l'introduction récente d'une plante porteuse.",
        },
      ],
      treatments: [
        {
          step: 1,
          title: "Isoler immédiatement la plante",
          description:
            "Éloignez la plante d'au moins 2 mètres de vos autres plantes d'intérieur pour stopper la contagion.",
          timeframe: "Immédiat (Jour 1)",
        },
        {
          step: 2,
          title: "Retrait mécanique des foyers visibles",
          description:
            "À l'aide d'un coton-tige imbibé d'alcool à 70° dilué ou d'eau savonneuse, retirez délicatement chaque amas blanc sur les tiges et le revers des feuilles.",
          timeframe: "Jour 1",
        },
        {
          step: 3,
          title: "Pulvérisation au savon noir et huile de Neem",
          description:
            "Mélangez 1 cuillère à café de savon noir liquide + 1 cuillère à café d'huile de Neem dans 1L d'eau tiède. Pulvérisez sur et sous les feuilles le soir.",
          timeframe: "Tous les 5 jours pendant 3 semaines",
        },
      ],
      preventionTips: [
        "Inspectez le revers des feuilles une fois par semaine lors de l'arrosage.",
        "Augmentez l'humidité ambiante autour de la plante (45-60%).",
        "Évitez les excès d'engrais azotés qui favorisent la sève tendre prisée des parasites.",
      ],
      isDemoMode: true,
      fallbackReason,
    };
  }

  if (
    symp.includes("sain") ||
    symp.includes("bien") ||
    symp.includes("routine")
  ) {
    return {
      plantDetected: detectedName,
      status: "HEALTHY",
      confidence: 95,
      summary:
        "Votre plante présente un feuillage turgescent, une coloration chlorophyllienne homogène et aucun signe visible de pathogène ou de stress hydrique.",
      issues: [],
      treatments: [
        {
          step: 1,
          title: "Maintenir le rythme d'arrosage actuel",
          description:
            "Continuez à vérifier l'humidité du substrat sur 2-3 cm avant chaque arrosage.",
          timeframe: "Continu",
        },
        {
          step: 2,
          title: "Dépoussiérage foliaire mensuel",
          description:
            "Passez un chiffon doux légèrement humide sur les feuilles pour optimiser la photosynthèse.",
          timeframe: "1 fois par mois",
        },
      ],
      preventionTips: [
        "Tournez le pot d'un quart de tour toutes les 2 semaines pour une croissance symétrique.",
        "Apportez un engrais liquide plantes vertes dilué de moitié au printemps et en été.",
      ],
      isDemoMode: true,
      fallbackReason,
    };
  }

  return {
    plantDetected: detectedName,
    status: "WARNING",
    confidence: 89,
    summary:
      "Signes de stress hydrique modéré (jaunissement basal / chlorose et nécroses marginales aux pointes). Souvent lié à un substrat restant humide trop longtemps au fond du pot combiné à un air ambiant sec.",
    issues: [
      {
        name: "Excès d'humidité racinaire (Asphyxie légère)",
        severity: "MEDIUM",
        symptoms:
          "Feuilles inférieures qui jaunissent progressivement en restant souples.",
        cause:
          "Arrosages trop rapprochés ou eau stagnante dans la soucoupe empêchant l'oxygénation des racines.",
      },
      {
        name: "Pointes foliaires brunes et sèches",
        severity: "LOW",
        symptoms: "Extrémités des feuilles brunies et craquantes au toucher.",
        cause:
          "Hygrométrie de la pièce insuffisante (< 40%) ou eau d'arrosage trop calcaire.",
      },
    ],
    treatments: [
      {
        step: 1,
        title: "Vider la soucoupe et laisser ressuyer le terreau",
        description:
          "Vérifiez qu'aucune eau ne stagne au fond du cache-pot. Suspendez l'arrosage jusqu'à ce que le terreau soit sec sur 4 cm de profondeur.",
        timeframe: "Immédiat (5 à 8 jours)",
      },
      {
        step: 2,
        title: "Taille sanitaire des feuilles entièrement jaunes",
        description:
          "Coupez à la base les feuilles jaunies à plus de 70% avec des ciseaux désinfectés pour que la plante concentre son énergie sur les jeunes pousses.",
        timeframe: "Aujourd'hui",
      },
      {
        step: 3,
        title: "Ajuster le cycle d'arrosage et le drainage",
        description:
          "Espacez l'arrosage de 2 à 3 jours supplémentaires et utilisez une eau reposée à température ambiante.",
        timeframe: "Prochains arrosages",
      },
    ],
    preventionTips: [
      "Toujours enfoncer le doigt dans le terreau avant d'arroser plutôt que de suivre uniquement une date fixe.",
      "Assurez-vous que le pot possède des trous de drainage dégagés avec une couche de billes d'argile.",
      "Éloignez la plante des radiateurs et sources de chaleur sèche.",
    ],
    isDemoMode: true,
    fallbackReason,
  };
}

function formatGeminiErrorReason(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("402") || msg.includes("prepayment credits are depleted")) {
    return "Crédits Google AI Studio épuisés (erreur 402) — bascule automatique sur le moteur botanique embarqué.";
  }
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
    return "Quota API Gemini atteint (erreur 429) — bascule automatique sur le moteur botanique embarqué.";
  }
  return "API Gemini indisponible — bascule automatique sur le moteur botanique embarqué.";
}

export async function identifyPlantFromImage(
  imageBase64: string,
  hintName?: string
): Promise<PlantIdentificationResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const parsed = await resolveImageData(imageBase64);

  if (!apiKey || !parsed) {
    return getDemoIdentification(hintName);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: parsed.mimeType,
                data: parsed.data,
              },
            },
            {
              text: `Tu es un expert botaniste. Identifie cette plante d'intérieur à partir de la photo${
                hintName ? ` (indice utilisateur: "${hintName}")` : ""
              } et retourne en français ses paramètres de soin idéaux au format JSON.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            species: {
              type: Type.STRING,
              description: "Nom commun français de la plante",
            },
            scientificName: {
              type: Type.STRING,
              description: "Nom scientifique latin",
            },
            suggestedNickname: {
              type: Type.STRING,
              description: "Idée de surnom sympathique en français",
            },
            wateringIntervalDays: {
              type: Type.INTEGER,
              description: "Intervalle moyen d'arrosage en jours (ex: 7)",
            },
            lightRequirement: {
              type: Type.STRING,
              description: "Besoins en lumière en français",
            },
            humidityRequirement: {
              type: Type.STRING,
              description: "Besoins en humidité en français",
            },
            careNotes: {
              type: Type.STRING,
              description:
                "Conseils pratiques d'entretien en français (2-3 phrases)",
            },
            confidence: {
              type: Type.INTEGER,
              description: "Score de confiance entre 0 et 100",
            },
          },
          required: [
            "species",
            "scientificName",
            "suggestedNickname",
            "wateringIntervalDays",
            "lightRequirement",
            "humidityRequirement",
            "careNotes",
            "confidence",
          ],
        },
      },
    });

    const text = response.text || "{}";
    const result = JSON.parse(text) as PlantIdentificationResult;
    return {
      ...result,
      wateringIntervalDays: Math.max(
        1,
        Math.min(60, result.wateringIntervalDays || 7)
      ),
      isDemoMode: false,
    };
  } catch (err) {
    console.warn("Gemini identify fallback:", err);
    return getDemoIdentification(hintName, formatGeminiErrorReason(err));
  }
}

export async function diagnosePlantHealth(
  imageBase64: string,
  userSymptoms?: string,
  plantSpecies?: string
): Promise<PlantDiagnosisResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const parsed = await resolveImageData(imageBase64);

  if (!apiKey || !parsed) {
    return getDemoDiagnosis(userSymptoms, plantSpecies);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: parsed.mimeType,
                data: parsed.data,
              },
            },
            {
              text: `Tu es un phytopathologiste et expert en plantes d'intérieur. Analyse cette photo de plante${
                plantSpecies ? ` (Espèce connue : ${plantSpecies})` : ""
              }${
                userSymptoms
                  ? ` (Observations de l'utilisateur : "${userSymptoms}")`
                  : ""
              }.
Diagnostique l'état de santé de la plante, détecte toute maladie, carence, parasite ou erreur d'arrosage/exposition, et propose un plan de soin concret étape par étape en français.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plantDetected: {
              type: Type.STRING,
              description: "Nom de la plante détectée sur la photo",
            },
            status: {
              type: Type.STRING,
              description: "HEALTHY, WARNING ou CRITICAL",
            },
            confidence: {
              type: Type.INTEGER,
              description: "Score de confiance du diagnostic (0-100)",
            },
            summary: {
              type: Type.STRING,
              description:
                "Résumé clair du diagnostic en 2-3 phrases en français",
            },
            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  severity: {
                    type: Type.STRING,
                    description: "LOW, MEDIUM ou HIGH",
                  },
                  symptoms: { type: Type.STRING },
                  cause: { type: Type.STRING },
                },
                required: ["name", "severity", "symptoms", "cause"],
              },
            },
            treatments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  step: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  timeframe: { type: Type.STRING },
                },
                required: ["step", "title", "description", "timeframe"],
              },
            },
            preventionTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            "plantDetected",
            "status",
            "confidence",
            "summary",
            "issues",
            "treatments",
            "preventionTips",
          ],
        },
      },
    });

    const text = response.text || "{}";
    const parsedResult = JSON.parse(text) as PlantDiagnosisResult;
    const normalizedStatus = ["HEALTHY", "WARNING", "CRITICAL"].includes(
      parsedResult.status
    )
      ? parsedResult.status
      : "WARNING";

    return {
      ...parsedResult,
      status: normalizedStatus,
      isDemoMode: false,
    };
  } catch (err) {
    console.warn("Gemini diagnose fallback:", err);
    return getDemoDiagnosis(
      userSymptoms,
      plantSpecies,
      formatGeminiErrorReason(err)
    );
  }
}

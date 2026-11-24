const commerceDictionary: Record<string, string> = {
  // -----------------------------------------
  // Accountancy - Core Terms
  // -----------------------------------------

  "लेखांकन प्रक्रिया": "accounting process",
  "लेखा प्रक्रिया": "accounting process",
  "वित्तीय विवरण": "financial statements",
  "वित्तीय लेनदेन": "financial transactions",
  "लेखांकन के लाभ": "accounting advantages",
  "लेखांकन का महत्व": "accounting importance",
  "लेखांकन के उद्देश्य": "accounting objectives",
  "लेखांकन की विशेषताएं": "accounting features",
  "लेखांकन की विशेषताएँ": "accounting features",
  "लेखांकन के कार्य": "accounting functions",
  "लेखांकन की भूमिका": "accounting role",

  "accounting ke fayde": "accounting advantages",
  "accounting ke labh": "accounting advantages",
  "accounting ka mahatva": "accounting importance",
  "accounting ke uddeshya": "accounting objectives",
  "accounting ka uddeshya": "accounting objectives",
  "accounting ki visheshtayein": "accounting features",
  "accounting ki visheshtaen": "accounting features",
  "accounting ki visheshta": "accounting features",
  "accounting ke karya": "accounting functions",
  "accounting ka karya": "accounting functions",
  "accounting ke functions": "accounting functions",

  लेखांकन: "accounting",
  लेखा: "accounting",
  लेखाशास्त्र: "accounting",
  बहीखाता: "bookkeeping",
  संपत्ति: "assets",
  दायित्व: "liabilities",
  पूंजी: "capital",
  राजस्व: "revenue",
  व्यय: "expenses",
  लाभ: "profit",
  हानि: "loss",

  // -----------------------------------------
  // Question Intent Terms
  // -----------------------------------------

  विशेषताएं: "features",
  विशेषताएँ: "features",
  विशेषता: "feature",
  लक्षण: "characteristics",
  कार्य: "functions",
  भूमिका: "role",
  महत्व: "importance",
  फायदे: "advantages",
  फायदा: "advantage",
  उद्देश्य: "objectives",
  लक्ष्य: "goals",
  प्रकार: "types",
  वर्गीकरण: "classification",
  परिभाषा: "definition",
  अर्थ: "meaning",
  उपयोगिता: "usefulness",

  mahatva: "importance",
  fayde: "advantages",
  fayda: "advantage",
  laabh: "profit",
  labh: "profit",
  uddeshya: "objectives",
  uddesya: "objectives",
  lakshya: "goals",
  visheshtayein: "features",
  visheshtaen: "features",
  visheshta: "feature",
  visheshata: "feature",
  visheshatayen: "features",
  lakshan: "characteristics",
  karya: "functions",
  kaarya: "functions",
  bhoomika: "role",
  prakar: "types",
  vargikaran: "classification",
  paribhasha: "definition",
  arth: "meaning",
  upyogita: "usefulness",

  // -----------------------------------------
  // Economics
  // -----------------------------------------

  "राष्ट्रीय आय": "national income",
  मुद्रास्फीति: "inflation",
  "राष्ट्रीय उत्पादन": "national production",

  अर्थशास्त्र: "economics",
  मांग: "demand",
  आपूर्ति: "supply",
  उपभोक्ता: "consumer",
  उत्पादन: "production",
  बाजार: "market",
  बेरोजगारी: "unemployment",

  arthashastra: "economics",
  maang: "demand",
  aapurti: "supply",
  upbhokta: "consumer",
  utpadan: "production",
  bazaar: "market",
  berojgari: "unemployment",

  // -----------------------------------------
  // Business Studies
  // -----------------------------------------

  व्यवसाय: "business",
  व्यापार: "trade",
  प्रबंधन: "management",
  उद्यमिता: "entrepreneurship",
  विपणन: "marketing",
  संगठन: "organization",
  नियोजन: "planning",
  नियंत्रण: "controlling",

  vyavsay: "business",
  vyapar: "trade",
  prabandhan: "management",
  udyamita: "entrepreneurship",
  vipanan: "marketing",
  sangathan: "organization",
  niyojan: "planning",
  niyantran: "controlling",

  // -----------------------------------------
  // Statistics
  // -----------------------------------------

  सांख्यिकी: "statistics",
  औसत: "average",
  माध्य: "mean",
  माध्यिका: "median",
  बहुलक: "mode",
  प्रायिकता: "probability",
  आंकड़े: "data",
  आँकड़े: "data",

  sankhyiki: "statistics",
  ausat: "average",
  madhya: "mean",
  madhyika: "median",
  bahulak: "mode",
  prayikta: "probability",
  aankde: "data",
};

// Escape special characters before using a term in RegExp.
const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const translateCommerceTerms = (text: string): string => {
  let translatedText = text.toLowerCase();

  const terms = Object.keys(commerceDictionary).sort(
    (a, b) => b.length - a.length,
  );

  for (const term of terms) {
    const translation = commerceDictionary[term];

    // Hindi terms: use literal replacement instead of RegExp.
    const isHindiTerm = /[\u0900-\u097F]/.test(term);

    if (isHindiTerm) {
      translatedText = translatedText.split(term).join(translation);

      continue;
    }

    // English and Hinglish terms: match complete words.
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const regex = new RegExp(
      `(^|[^a-z0-9])${escapedTerm}(?=$|[^a-z0-9])`,
      "gi",
    );

    translatedText = translatedText.replace(
      regex,
      (_match, prefix) => `${prefix}${translation}`,
    );
  }

  return translatedText.replace(/\s+/g, " ").trim();
};

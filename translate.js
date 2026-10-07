const fs = require('fs');

const updateTranslations = (path, translations) => {
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  Object.assign(data.manager.stockLabels, translations);
  fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
};

const hi = {
  "beforeDecantation": "डिकेंटेशन से पहले",
  "challan": "चालान",
  "beforeDifference": "पहले का अंतर",
  "afterDecantation": "डिकेंटेशन के बाद",
  "afterChallan": "चालान के बाद",
  "afterDifference": "बाद का अंतर",
  "beforeHydrometer": "हाइड्रोमीटर (पहले)",
  "beforeTemperatureC": "तापमान (पहले)",
  "beforeDensity15": "घनत्व @15°C (पहले)",
  "challanDensity15": "चालान घनत्व @15°C",
  "beforeDensityDifference": "घनत्व अंतर (पहले)",
  "afterHydrometer": "हाइड्रोमीटर (बाद में)",
  "afterTemperatureC": "तापमान (बाद में)",
  "afterDensity15": "घनत्व @15°C (बाद में)",
  "afterChallanDensity15": "चालान घनत्व @15°C (बाद में)",
  "afterDensityDifference": "घनत्व अंतर (बाद में)",
  "receiptDetail": "रसीद विवरण",
  "close": "बंद करें",
  "basicDetails": "मूल विवरण",
  "noReceipts": "इस तारीख के लिए कोई रसीद नहीं मिली।"
};

const mr = {
  "beforeDecantation": "डिकेंटेशनपूर्वी",
  "challan": "चलान",
  "beforeDifference": "पूर्वीचा फरक",
  "afterDecantation": "डिकेंटेशननंतर",
  "afterChallan": "चलाननंतर",
  "afterDifference": "नंतरचा फरक",
  "beforeHydrometer": "हायड्रोमीटर (पूर्वी)",
  "beforeTemperatureC": "तापमान (पूर्वी)",
  "beforeDensity15": "घनता @15°C (पूर्वी)",
  "challanDensity15": "चलान घनता @15°C",
  "beforeDensityDifference": "घनता फरक (पूर्वी)",
  "afterHydrometer": "हायड्रोमीटर (नंतर)",
  "afterTemperatureC": "तापमान (नंतर)",
  "afterDensity15": "घनता @15°C (नंतर)",
  "afterChallanDensity15": "चलान घनता @15°C (नंतर)",
  "afterDensityDifference": "घनता फरक (नंतर)",
  "receiptDetail": "पावती तपशील",
  "close": "बंद करा",
  "basicDetails": "मूलभूत तपशील",
  "noReceipts": "या तारखेसाठी कोणतीही पावती आढळली नाही."
};

updateTranslations('frontend/src/locales/hi.json', hi);
updateTranslations('frontend/src/locales/mr.json', mr);

console.log('Done');

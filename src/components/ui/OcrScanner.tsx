// 📁 src/components/OcrScanner.tsx
import React, { useState } from "react";
import Tesseract from "tesseract.js";

interface Props {
  onExtract: (extracted: {
    amount?: number;
    date?: string;
    type?: string;
    description?: string;
    rawText?: string;
  }) => void;
}

const OcrScanner: React.FC<Props> = ({ onExtract }) => {
  const [image, setImage] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    handleScan(file);
  };

  const handleScan = async (file: File) => {
    setProcessing(true);
    const result = await Tesseract.recognize(file, "eng", {
      logger: m => console.log(m)
    });
    const text = result.data.text;
    console.log("OCR Result:", text);

    const extracted = extractFieldsFromText(text);
    onExtract({ ...extracted, rawText: text });
    setProcessing(false);
  };

  const extractFieldsFromText = (text: string) => {
    const amountMatch = text.match(/Total\\s*[:\\-]?\\s*(Rs\\.?\\s*)?(\\d+[.,]?\\d*)/i);
    const amount = amountMatch ? parseFloat(amountMatch[2]) : undefined;

    const dateMatch = text.match(/Date[: ]+(\d{2}\/\d{2}\/\d{4})/i);
    const date = dateMatch ? dateMatch[1] : undefined;

    const fuelMatch = text.match(/Fuel|PETROL|Diesel|Restaurant|Hotel|Food/i);
    const type = fuelMatch ? fuelMatch[0] : "Misc";

    const vendorMatch = text.match(/^([A-Z ]+Restaurant|HPCL|IOCL|NAR|BILLER:.*?)$/im);
    const description = vendorMatch ? vendorMatch[1].trim() : undefined;

    return { amount, date, type, description };
  };

  return (
    <div className="space-y-4">
      <Label htmlFor="billUpload">📄 Upload Invoice Image</Label>
      <Input type="file" accept="image/*" onChange={handleFileChange} />
      {preview && <img src={preview} alt="Preview" className="w-full max-h-64 object-contain border" />}
      {processing && <p className="text-blue-600 text-sm">🔍 Scanning image... please wait</p>}
    </div>
  );
};

export default OcrScanner;

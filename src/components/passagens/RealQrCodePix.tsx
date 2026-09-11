import { useState, useEffect } from "react";
import QRCode from "qrcode";

interface RealQrCodePixProps {
  textoChave?: string;
  tamanho?: number;
  tipo?: "pix" | "bilhete";
  logoCentral?: boolean;
}

export function RealQrCodePix({
  textoChave = "00020126580014br.gov.bcb.pix0136partiu-mobilidade-brasil",
  tamanho = 150,
  tipo = "pix",
  logoCentral = true,
}: RealQrCodePixProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    QRCode.toDataURL(textoChave, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: tamanho * 2, // 2x para nitidez em telas Retina / High DPI
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (ativo) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error("Falha ao renderizar QR Code real:", err);
      });

    return () => {
      ativo = false;
    };
  }, [textoChave, tamanho]);

  return (
    <div
      className="relative bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center inline-block"
      style={{ width: tamanho + 20, height: tamanho + 20 }}
    >
      {qrDataUrl ? (
        <img
          src={qrDataUrl}
          alt="QR Code Oficial"
          width={tamanho}
          height={tamanho}
          className="rounded-lg object-contain"
        />
      ) : (
        <div
          className="animate-pulse bg-slate-100 rounded-lg flex items-center justify-center"
          style={{ width: tamanho, height: tamanho }}
        >
          <span className="text-[10px] text-slate-400 font-bold uppercase">Gerando QR...</span>
        </div>
      )}

      {/* Ícone Central Oficial do PIX ou do PARTIU */}
      {logoCentral && qrDataUrl && (
        <div className="absolute inset-0 m-auto h-7 w-7 rounded-lg bg-white p-1 shadow-md border border-slate-200 flex items-center justify-center pointer-events-none">
          {tipo === "pix" ? (
            <svg viewBox="0 0 512 512" className="h-5 w-5 fill-[#32bcad]">
              <path d="M400.9 220.7L305.8 125.6c-27.4-27.4-72.2-27.4-99.6 0L111.1 220.7c-27.4 27.4-27.4 72.2 0 99.6l95.1 95.1c27.4 27.4 72.2 27.4 99.6 0l95.1-95.1c27.4-27.4 27.4-72.2 0-99.6zm-144.9 161.4c-4.4 0-8.8-1.7-12.2-5.1l-95.1-95.1c-6.7-6.7-6.7-17.7 0-24.4l95.1-95.1c6.7-6.7 17.7-6.7 24.4 0l95.1 95.1c6.7 6.7 6.7 17.7 0 24.4l-95.1 95.1c-3.4 3.4-7.8 5.1-12.2 5.1z" />
            </svg>
          ) : (
            <div className="h-4 w-4 rounded bg-[#0088FF] flex items-center justify-center font-black text-slate-950 text-[9px]">
              P
            </div>
          )}
        </div>
      )}
    </div>
  );
}

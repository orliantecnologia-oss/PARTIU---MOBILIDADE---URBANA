/**
 * ==============================================================================
 * 🎫 SERVER-SIDE TICKET ISSUANCE & CRYPTOGRAPHIC SIGNING — ENTERPRISE V6.0
 * ATENÇÃO: ESTE ARQUIVO EXECUTA EXCLUSIVAMENTE NO SERVIDOR (NITRO SSR / EDGE).
 * ==============================================================================
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import { getActiveSigningKey, ACTIVE_KEY_ID } from "./signing-key-provider.server";
import { construirCanonicalV3 } from "./offline-ticket-crypto";

const esquemaEmissaoBilhete = z.object({
  codigoBilhete: z.string().min(4),
  viagemId: z.string().min(1),
  passageiroId: z.string().min(1),
  passageiroNome: z.string().min(2),
  origemDestino: z.string().min(2),
  pontoEmbarque: z.string().min(2),
  valorTotal: z.number().nonnegative(),
  assentos: z.array(z.number()).default([]),
});

export type InputEmissaoBilhete = z.infer<typeof esquemaEmissaoBilhete>;

export interface BilheteAssinadoServerResponse {
  sucesso: boolean;
  codigoBilhete: string;
  qrPayload: string;
  keyId: string;
  signature: string;
  issuedAt: string;
}

/**
 * Função interna de assinatura criptográfica server-side com Ed25519 (RFC 8032)
 */
export function assinarBilheteServerSide(dados: InputEmissaoBilhete): {
  qrPayload: string;
  keyId: string;
  signature: string;
  issuedAt: string;
} {
  const { keyId, privateKeyPem } = getActiveSigningKey();
  const issuedAt = new Date().toISOString();

  // Payload canônico determinístico compartilhado com o validador offline
  const canonicalString = construirCanonicalV3({
    kid: keyId,
    cod: dados.codigoBilhete,
    viagem: dados.viagemId,
    paxId: dados.passageiroId,
    pax: dados.passageiroNome,
    rota: dados.origemDestino,
    ponto: dados.pontoEmbarque,
    centavos: Math.round(dados.valorTotal * 100),
    assentos: dados.assentos,
    ts: issuedAt,
  });

  const data = Buffer.from(canonicalString, "utf8");
  const rawSignature = crypto.sign(null, data, privateKeyPem);
  const signatureHex = rawSignature.toString("hex");
  const formattedSignature = `ED25519_${signatureHex}`;

  // Objeto estruturado serializado para o QR Code
  const qrObject = {
    v: 3,
    kid: keyId,
    cod: dados.codigoBilhete,
    viagem: dados.viagemId,
    paxId: dados.passageiroId,
    pax: dados.passageiroNome,
    rota: dados.origemDestino,
    ponto: dados.pontoEmbarque,
    assentos: dados.assentos,
    centavos: Math.round(dados.valorTotal * 100),
    ts: issuedAt,
    sig: formattedSignature,
  };

  return {
    qrPayload: JSON.stringify(qrObject),
    keyId,
    signature: formattedSignature,
    issuedAt,
  };
}

/**
 * Server Function oficial do TanStack Start para emissão de bilhetes assinados
 */
export const emitirBilheteAssinadoServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => esquemaEmissaoBilhete.parse(d))
  .handler(async ({ data }): Promise<BilheteAssinadoServerResponse> => {
    try {
      const resultadoAssinatura = assinarBilheteServerSide(data);

      return {
        sucesso: true,
        codigoBilhete: data.codigoBilhete,
        qrPayload: resultadoAssinatura.qrPayload,
        keyId: resultadoAssinatura.keyId,
        signature: resultadoAssinatura.signature,
        issuedAt: resultadoAssinatura.issuedAt,
      };
    } catch (err: any) {
      console.error("[TicketSigningService] Erro ao assinar bilhete no servidor:", err);
      throw new Error(`Falha na assinatura criptográfica do bilhete: ${err?.message || "Erro desconhecido"}`);
    }
  });

/**
 * ==============================================================================
 * 🔐 PARTIU DELIVERY OS — DOUBLE PIN SECURITY & STATE MACHINE (v2.0)
 * ==============================================================================
 * Gerenciamento de estado blindado para entregas last-mile com Duplo PIN:
 * - PIN 1: Validado na Coleta (Remetente -> Motorista)
 * - PIN 2: Validado na Entrega (Destinatário -> Motorista)
 *
 * REGRA CRÍTICA DE NEGÓCIO:
 * Operação restrita EXCLUSIVAMENTE a duas categorias: "MOTO" e "CARRO".
 * ==============================================================================
 */

import { appSettingsService } from "@/lib/ecosystem/app-settings-service";

export type DeliveryVehicleCategory = "MOTO" | "CARRO";

export type DeliveryActionTab = "enviar" | "receber";

export type DeliveryFlowStatus =
  | "SETUP"
  | "AWAITING_PICKUP"   // Estado 1 (Coleta): PIN 1 gerado, aguardando motorista
  | "IN_TRANSIT"         // Estado 2 (Trânsito): PIN 1 validado pelo motorista
  | "ARRIVED_DESTINATION" // Estado 3 (Destino): Motorista no local, PIN 2 revelado para repasse
  | "DELIVERED"         // Estado 4 (Conclusão): PIN 2 validado com sucesso
  | "CANCELLED";

export interface DeliveryAddressInfo {
  endereco: string;
  complemento: string;
  contatoNome: string;
  contatoTelefone: string;
  latitude?: number;
  longitude?: number;
}

export interface DeliveryDriverProfile {
  id: string;
  nome: string;
  telefone: string;
  avaliacao: number;
  fotoUrl: string;
  veiculoCategoria: DeliveryVehicleCategory;
  veiculoModelo: string;
  veiculoPlaca: string;
  veiculoCor: string;
}

export interface DualPinPayload {
  pin1Coleta: string;
  pin1Verificado: boolean;
  pin1VerificadoEm?: number;
  pin2Entrega: string;
  pin2Verificado: boolean;
  pin2VerificadoEm?: number;
  falhasPin1: number;
  falhasPin2: number;
}

export interface DeliveryQuote {
  distanciaKm: number;
  duracaoMin: number;
  precoBrl: number;
  taxaSeguroBrl: number;
}

export interface DeliveryOrderRecord {
  id: string;
  codigoRastreio: string;
  trackingToken: string;
  criadoEm: number;
  categoriaVeiculo: DeliveryVehicleCategory;
  abaAcao: DeliveryActionTab;
  origem: DeliveryAddressInfo;
  destino: DeliveryAddressInfo;
  descricaoPacote: string;
  quote: DeliveryQuote;
  status: DeliveryFlowStatus;
  pins: DualPinPayload;
  motorista: DeliveryDriverProfile;
}

/**
 * Gera um OTP numérico imprevisível de 4 dígitos (1000 a 9999)
 */
export function gerarPinOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Calcula cotação dinâmica de frete baseada estritamente em MOTO ou CARRO
 */
export function calcularCotacaoEntrega(
  categoria: DeliveryVehicleCategory,
  distanciaKm = 5.2,
  duracaoMin = 16
): DeliveryQuote {
  const precoCalculado = appSettingsService.calculateDeliveryFare(
    distanciaKm,
    duracaoMin,
    categoria
  );
  const taxaSeguro = categoria === "MOTO" ? 1.0 : 1.5;

  return {
    distanciaKm,
    duracaoMin,
    precoBrl: precoCalculado,
    taxaSeguroBrl: taxaSeguro,
  };
}

/**
 * Retorna dados fictícios de motoristas parceiros por categoria (MOTO ou CARRO)
 */
export function selecionarMotoristaEntrega(
  categoria: DeliveryVehicleCategory
): DeliveryDriverProfile {
  if (categoria === "MOTO") {
    return {
      id: "drv-moto-flash-1",
      nome: "Lucas Mendes",
      telefone: "(22) 99881-2244",
      avaliacao: 4.96,
      fotoUrl:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      veiculoCategoria: "MOTO",
      veiculoModelo: "Honda CG 160 Fan",
      veiculoPlaca: "MOT-7799",
      veiculoCor: "Vermelha",
    };
  }

  return {
    id: "drv-carro-bau-1",
    nome: "Carlos Eduardo Silveira",
    telefone: "(22) 99772-8811",
    avaliacao: 4.92,
    fotoUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    veiculoCategoria: "CARRO",
    veiculoModelo: "Chevrolet Onix Plus",
    veiculoPlaca: "MOB-8K99",
    veiculoCor: "Prata",
  };
}

/**
 * Validação rigorosa do PIN 1 (Coleta)
 */
export function validarPin1Coleta(
  order: DeliveryOrderRecord,
  pinInput: string
): { sucesso: boolean; mensagem: string; proximaOrdem?: DeliveryOrderRecord } {
  if (order.status !== "AWAITING_PICKUP") {
    return {
      sucesso: false,
      mensagem: "A ordem não está aguardando coleta de pacote.",
    };
  }

  const cleanInput = (pinInput || "").trim();
  if (cleanInput !== order.pins.pin1Coleta) {
    const novasFalhas = order.pins.falhasPin1 + 1;
    return {
      sucesso: false,
      mensagem: `PIN 1 incorreto! (${novasFalhas} tentativa(s) falha(s))`,
      proximaOrdem: {
        ...order,
        pins: {
          ...order.pins,
          falhasPin1: novasFalhas,
        },
      },
    };
  }

  // Sucesso na validação do PIN 1 -> Transição imediata para IN_TRANSIT
  const atualizada: DeliveryOrderRecord = {
    ...order,
    status: "IN_TRANSIT",
    pins: {
      ...order.pins,
      pin1Verificado: true,
      pin1VerificadoEm: Date.now(),
    },
  };

  return {
    sucesso: true,
    mensagem: "PIN 1 de Coleta validado com sucesso! Pacote recolhido e em trânsito.",
    proximaOrdem: atualizada,
  };
}

/**
 * Validação rigorosa do PIN 2 (Destino / Entrega)
 */
export function validarPin2Entrega(
  order: DeliveryOrderRecord,
  pinInput: string
): { sucesso: boolean; mensagem: string; proximaOrdem?: DeliveryOrderRecord } {
  if (order.status !== "IN_TRANSIT" && order.status !== "ARRIVED_DESTINATION") {
    return {
      sucesso: false,
      mensagem: "A ordem não está pronta para entrega no destino.",
    };
  }

  const cleanInput = (pinInput || "").trim();
  if (cleanInput !== order.pins.pin2Entrega) {
    const novasFalhas = order.pins.falhasPin2 + 1;
    return {
      sucesso: false,
      mensagem: `PIN 2 incorreto! (${novasFalhas} tentativa(s) falha(s))`,
      proximaOrdem: {
        ...order,
        pins: {
          ...order.pins,
          falhasPin2: novasFalhas,
        },
      },
    };
  }

  // Sucesso na validação do PIN 2 -> Transição para DELIVERED
  const atualizada: DeliveryOrderRecord = {
    ...order,
    status: "DELIVERED",
    pins: {
      ...order.pins,
      pin2Verificado: true,
      pin2VerificadoEm: Date.now(),
    },
  };

  return {
    sucesso: true,
    mensagem: "PIN 2 de Entrega confirmado! Encomenda entregue com segurança.",
    proximaOrdem: atualizada,
  };
}

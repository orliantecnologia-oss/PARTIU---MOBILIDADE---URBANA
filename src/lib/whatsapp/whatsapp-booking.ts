/**
 * PARTIU WHATSAPP BOOKING & NLP ENGINE
 * 
 * Processamento de Linguagem Natural (NLP) e Geocoding Heurístico para solicitações no WhatsApp.
 * Extrai intenções, endereços de origem e destino, calcula cotações instantâneas por modalidade.
 */

export interface WhatsAppNlpResult {
  intent: 'PEDIR_CORRIDA' | 'CONFIRMAR_COTACAO' | 'CANCELAR' | 'STATUS_CORRIDA' | 'AJUDA_HUMANO' | 'SAUDACAO' | 'DESCONHECIDO';
  detectedOrigin?: string | undefined;
  detectedDestination?: string | undefined;
  detectedModalidade?: 'POP' | 'MOTO' | 'PLUS' | undefined;
  confidence: number;
}

export interface WhatsAppFareQuote {
  originAddress: string;
  destinationAddress: string;
  distanceKm: number;
  estimatedDurationMin: number;
  options: {
    pop: { fareBrl: number; etaMin: number; label: string };
    moto: { fareBrl: number; etaMin: number; label: string };
    plus: { fareBrl: number; etaMin: number; label: string };
  };
}

export class WhatsAppBookingEngine {
  private knownCityPois: Record<string, { lat: number; lng: number; aliases: string[] }> = {
    'centro': { lat: -21.2056, lng: -41.8872, aliases: ['centro', 'calcadao', 'praca', 'prefeitura', 'banco'] },
    'aeroporto': { lat: -21.1980, lng: -41.8750, aliases: ['aeroporto', 'rodoviaria', 'terminal', 'embarque'] },
    'unig': { lat: -21.2180, lng: -41.8990, aliases: ['unig', 'faculdade', 'universidade', 'campus'] },
    'hospital': { lat: -21.2090, lng: -41.8830, aliases: ['hospital', 'sao jose', 'upa', 'pronto socorro'] },
    'vinhosa': { lat: -21.2189, lng: -41.9012, aliases: ['vinhosa', 'posto vinhosa', 'avenida vinhosa'] },
    'ceasa': { lat: -21.2250, lng: -41.8700, aliases: ['ceasa', 'mercado produtor', 'distrito industrial'] }
  };

  /**
   * Interpreta texto recebido e identifica intenção e parâmetros de corrida
   */
  public parseMessage(messageText: string): WhatsAppNlpResult {
    const text = messageText.toLowerCase().trim();

    // 1. Saudação
    if (/^(oi|ola|olá|bom dia|boa tarde|boa noite|opa|salve|e ai|e aí)$/i.test(text)) {
      return { intent: 'SAUDACAO', confidence: 0.98 };
    }

    // 2. Ajuda / Suporte Humano
    if (/ajuda|humano|atendente|falar com alguem|falar com atendente|suporte/i.test(text)) {
      return { intent: 'AJUDA_HUMANO', confidence: 0.95 };
    }

    // 3. Cancelamento
    if (/cancelar|cancela|desistir|nao quero mais|não quero mais|para/i.test(text)) {
      return { intent: 'CANCELAR', confidence: 0.94 };
    }

    // 4. Status de Corrida
    if (/onde esta|onde tá|status|cade o motorista|cadê o motorista|demora/i.test(text)) {
      return { intent: 'STATUS_CORRIDA', confidence: 0.90 };
    }

    // 5. Confirmação de Cotação (ex: "1", "pop", "quero pop", "confirmo", "sim", "vai de moto")
    if (/^(1|pop|quero pop|opcao 1|opção 1|sim|confirmo|confirmar)$/i.test(text)) {
      return { intent: 'CONFIRMAR_COTACAO', detectedModalidade: 'POP', confidence: 0.96 };
    }
    if (/^(2|moto|quero moto|opcao 2|opção 2|vai de moto)$/i.test(text)) {
      return { intent: 'CONFIRMAR_COTACAO', detectedModalidade: 'MOTO', confidence: 0.96 };
    }
    if (/^(3|plus|quero plus|opcao 3|opção 3|conforto)$/i.test(text)) {
      return { intent: 'CONFIRMAR_COTACAO', detectedModalidade: 'PLUS', confidence: 0.96 };
    }

    // 6. Solicitação de Corrida com Origem e Destino
    let origin: string | undefined = undefined;
    let destination: string | undefined = undefined;

    // Padrão: "de X para Y" ou "do X pro Y" ou "estou em X e vou para Y"
    const matchDePara = text.match(/(?:de|do|da|em|estou no|estou na)\s+([^,]+?)\s+(?:para|pro|pra|vou pro|vou pra|ate|até)\s+([^,]+)/i);
    if (matchDePara && matchDePara[1] && matchDePara[2]) {
      origin = matchDePara[1].trim();
      destination = matchDePara[2].trim();
    } else {
      // Padrão simples: "ir para Y" ou "quero ir pro Y"
      const matchPara = text.match(/(?:para|pro|pra|ir pro|ir pra)\s+(.+)/i);
      if (matchPara && matchPara[1]) {
        destination = matchPara[1].trim();
      }
    }

    let detectedModalidade: 'POP' | 'MOTO' | 'PLUS' = 'POP';
    if (/moto/i.test(text)) detectedModalidade = 'MOTO';
    else if (/plus|confort/i.test(text)) detectedModalidade = 'PLUS';

    if (destination) {
      return {
        intent: 'PEDIR_CORRIDA',
        detectedOrigin: origin || 'Sua localização atual',
        detectedDestination: destination,
        detectedModalidade,
        confidence: 0.88
      };
    }

    return { intent: 'DESCONHECIDO', confidence: 0.20 };
  }

  /**
   * Geocoding heurístico para mapeamento de coordenadas municipais
   */
  public resolveCoordinates(addressText: string): { latitude: number; longitude: number; normalizedName: string } {
    const clean = addressText.toLowerCase();
    
    for (const [key, poi] of Object.entries(this.knownCityPois)) {
      if (poi.aliases.some(alias => clean.includes(alias))) {
        return {
          latitude: poi.lat,
          longitude: poi.lng,
          normalizedName: key.toUpperCase()
        };
      }
    }

    // Coordenada padrão (Centro da cidade)
    return {
      latitude: -21.2056 + (Math.random() * 0.01 - 0.005),
      longitude: -41.8872 + (Math.random() * 0.01 - 0.005),
      normalizedName: addressText
    };
  }

  /**
   * Calcula distância e valores das modalidades
   */
  public quoteRide(originText: string, destinationText: string): WhatsAppFareQuote {
    const orig = this.resolveCoordinates(originText);
    const dest = this.resolveCoordinates(destinationText);

    // Distância euclidiana aproximada com fator de malha urbana de 1.35
    const latDiff = Math.abs(orig.latitude - dest.latitude) * 111.0;
    const lngDiff = Math.abs(orig.longitude - dest.longitude) * 102.0;
    const rawDist = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
    const distanceKm = Number(Math.max(1.8, rawDist * 1.35).toFixed(1));

    const estimatedDurationMin = Math.max(4, Math.round((distanceKm / 28) * 60));

    // Tarifas PARTIU
    const popFare = Number((6.0 + (distanceKm * 2.10) + (estimatedDurationMin * 0.28)).toFixed(2));
    const motoFare = Number(Math.max(5.50, 4.0 + (distanceKm * 1.30) + (estimatedDurationMin * 0.18)).toFixed(2));
    const plusFare = Number(Math.max(14.0, 8.5 + (distanceKm * 2.70) + (estimatedDurationMin * 0.38)).toFixed(2));

    return {
      originAddress: orig.normalizedName,
      destinationAddress: dest.normalizedName,
      distanceKm,
      estimatedDurationMin,
      options: {
        pop: { fareBrl: Math.max(8.50, popFare), etaMin: 3, label: 'Carro Popular (4 lugares)' },
        moto: { fareBrl: motoFare, etaMin: 2, label: 'Moto Táxi (Rápido e Econômico)' },
        plus: { fareBrl: plusFare, etaMin: 5, label: 'Partiu Plus (Sedan Conforto com Ar)' }
      }
    };
  }
}

export const whatsAppBookingEngine = new WhatsAppBookingEngine();

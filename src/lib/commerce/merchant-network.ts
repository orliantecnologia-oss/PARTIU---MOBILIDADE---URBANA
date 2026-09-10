/**
 * MERCHANT NETWORK & LOCAL RETAIL COOPERATIVE
 * 
 * Gestão da rede credenciada de estabelecimentos comerciais locais:
 * - Restaurantes, lanchonetes e padarias
 * - Farmácias e drogarias
 * - Supermercados e mercados de bairro
 * - Oficinas mecânicas, postos de combustíveis e autopeças
 * - Lojas de vestuário e serviços
 */

export type MerchantCategory =
  | 'GASTRONOMIA'
  | 'FARMACIA_SAUDE'
  | 'SUPERMERCADO_ALIMENTOS'
  | 'AUTOMOTIVO_POSTOS'
  | 'VAREJO_MODA'
  | 'SERVICOS_GERAIS';

export interface LocalMerchant {
  merchantId: string;
  tradingName: string; // Nome fantasia
  companyName: string; // Razão social
  cnpjMasked: string;
  cityId: string;
  category: MerchantCategory;
  address: string;
  latitude: number;
  longitude: number;
  contactWhatsapp: string;
  cashbackOfferedPct: number; // Ex: 5% de cashback para clientes PARTIU
  discountCouponsActiveCount: number;
  partiuPayWalletId: string;
  pixKey: string;
  partnershipTier: 'OURO' | 'PRATA' | 'BRONZE';
  rating: number;
  monthlyGmvBrl: number;
  active: boolean;
}

export class MerchantNetworkEngine {
  private merchants: Map<string, LocalMerchant> = new Map();

  constructor() {
    this.seedDefaultMerchants();
  }

  private seedDefaultMerchants(): void {
    const defaultMerchants: LocalMerchant[] = [
      {
        merchantId: 'MKT-ITAP-01',
        tradingName: 'Restaurante Fogão de Lenha',
        companyName: 'Fogão de Lenha Gastronomia Tradicional Ltda',
        cnpjMasked: '**.455.123/0001-**',
        cityId: 'itaperuna-rj',
        category: 'GASTRONOMIA',
        address: 'Rua Dez de Maio, 442 - Centro',
        latitude: -21.2056,
        longitude: -41.8874,
        contactWhatsapp: '(22) 99876-1100',
        cashbackOfferedPct: 8.0,
        discountCouponsActiveCount: 2,
        partiuPayWalletId: 'WAL-MERCH-01',
        pixKey: 'financeiro@fogaodelenha.com.br',
        partnershipTier: 'OURO',
        rating: 4.88,
        monthlyGmvBrl: 84000.0,
        active: true
      },
      {
        merchantId: 'MKT-ITAP-02',
        tradingName: 'Farmácia São Lucas',
        companyName: 'Drogaria & Manipulação São Lucas Eireli',
        cnpjMasked: '**.981.334/0001-**',
        cityId: 'itaperuna-rj',
        category: 'FARMACIA_SAUDE',
        address: 'Av. Cardoso Moreira, 810 - Centro',
        latitude: -21.2080,
        longitude: -41.8890,
        contactWhatsapp: '(22) 99754-2211',
        cashbackOfferedPct: 5.0,
        discountCouponsActiveCount: 3,
        partiuPayWalletId: 'WAL-MERCH-02',
        pixKey: 'pix@farmaciasaolucas.com.br',
        partnershipTier: 'OURO',
        rating: 4.92,
        monthlyGmvBrl: 125000.0,
        active: true
      },
      {
        merchantId: 'MKT-ITAP-03',
        tradingName: 'Oficina & Pneus Auto Central',
        companyName: 'Auto Center Noroeste Ltda',
        cnpjMasked: '**.112.556/0001-**',
        cityId: 'itaperuna-rj',
        category: 'AUTOMOTIVO_POSTOS',
        address: 'BR-356, Km 01 - Cehab',
        latitude: -21.1920,
        longitude: -41.8980,
        contactWhatsapp: '(22) 99233-8899',
        cashbackOfferedPct: 6.0,
        discountCouponsActiveCount: 1,
        partiuPayWalletId: 'WAL-MERCH-03',
        pixKey: 'contato@autocentralnoroeste.com.br',
        partnershipTier: 'PRATA',
        rating: 4.79,
        monthlyGmvBrl: 95000.0,
        active: true
      }
    ];

    defaultMerchants.forEach(m => this.merchants.set(m.merchantId, m));
  }

  public getMerchantsByCity(cityId: string): LocalMerchant[] {
    return Array.from(this.merchants.values()).filter(m => m.cityId === cityId && m.active);
  }

  public getMerchant(merchantId: string): LocalMerchant | undefined {
    return this.merchants.get(merchantId);
  }
}

export const merchantNetworkEngine = new MerchantNetworkEngine();

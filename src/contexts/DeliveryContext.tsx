import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  type DeliveryVehicleCategory,
  type DeliveryActionTab,
  type DeliveryFlowStatus,
  type DeliveryAddressInfo,
  type DeliveryOrderRecord,
  type DeliveryQuote,
  gerarPinOtp,
  calcularCotacaoEntrega,
  selecionarMotoristaEntrega,
  validarPin1Coleta,
  validarPin2Entrega,
} from "@/lib/delivery/delivery-dual-pin-machine";
import {
  criarNovaCorrida,
  cancelarCorrida,
  finalizarViagem,
  getCorridaAtiva,
} from "@/lib/partiu-engine";
import { geocodingService } from "@/lib/passenger/geocoding-service";
import { UserService } from "@/services/UserService";
import { silentCatchWarn } from "@/lib/structured-logger";


export interface EnderecoRecenteItem {
  id: string;
  endereco: string;
  complemento?: string;
  nome: string;
  telefone: string;
}

interface DeliveryContextValue {
  // Configuração
  veiculo: DeliveryVehicleCategory;
  abaAcao: DeliveryActionTab;
  origem: DeliveryAddressInfo;
  destino: DeliveryAddressInfo;
  descricaoPacote: string;
  cotacao: DeliveryQuote;
  status: DeliveryFlowStatus;
  ordemAtiva: DeliveryOrderRecord | null;

  // Modais de Endereço
  isAddressModalOpen: boolean;
  addressModalTarget: "origem" | "destino";
  enderecosRecentes: EnderecoRecenteItem[];

  // Ações de Setup
  setVeiculo: (v: DeliveryVehicleCategory) => void;
  setAbaAcao: (aba: DeliveryActionTab) => void;
  setOrigem: (info: DeliveryAddressInfo) => void;
  setDestino: (info: DeliveryAddressInfo) => void;
  setDescricaoPacote: (desc: string) => void;
  abrirModalEndereco: (alvo: "origem" | "destino") => void;
  fecharModalEndereco: () => void;
  salvarEnderecoModal: (info: DeliveryAddressInfo) => void;

  // Ações do Ciclo de Entrega (Duplo PIN)
  iniciarEntrega: () => DeliveryOrderRecord | null;
  validarPin1: (pinInput: string) => { sucesso: boolean; mensagem: string };
  simularMotoristaValidarPin1: () => { sucesso: boolean; mensagem: string };
  avancarParaDestino: () => void;
  validarPin2: (pinInput: string) => { sucesso: boolean; mensagem: string };
  simularMotoristaValidarPin2: () => { sucesso: boolean; mensagem: string };
  cancelarEntregaAtiva: () => void;
  reiniciarParaNovaEntrega: () => void;
}

const STORAGE_KEY_ORDER = "partiu_active_dual_pin_delivery";
const STORAGE_KEY_RECENTS = "partiu_recent_delivery_addresses";

const ENDERECOS_RECENTES_INICIAIS: EnderecoRecenteItem[] = [
  {
    id: "rec-1",
    endereco: "Rua José da Silva Almeida , 45",
    complemento: "Casa",
    nome: "Rodrigo",
    telefone: "22996051620",
  },
  {
    id: "rec-2",
    endereco: "Rua Dez de Maio, 188 - Em cima da Loja Camila Amorim colords",
    complemento: "2º andar",
    nome: "Miriam Barbosa",
    telefone: "22988615039",
  },
  {
    id: "rec-3",
    endereco: "Rua Amadeu Tinoco Lacerda, 492 - Em frente a igreja Mar vermelho da Pastora...",
    complemento: "Portão branco",
    nome: "Rosilda",
    telefone: "22998071960",
  },
  {
    id: "rec-4",
    endereco: "Rua Jose Raimundo De Oliveira, 287 - Em frente açaí...",
    complemento: "Ao lado da praça",
    nome: "Érica Carvalho",
    telefone: "22997451234",
  },
];

const ENDERECO_PADRAO_USUARIO: DeliveryAddressInfo = {
  endereco: "Rua José da Silva Almeida , 45",
  complemento: "",
  contatoNome: "Rodrigo",
  contatoTelefone: "22996051620",
};

const ENDERECO_EM_BRANCO: DeliveryAddressInfo = {
  endereco: "",
  complemento: "",
  contatoNome: "",
  contatoTelefone: "",
};

const DeliveryContext = createContext<DeliveryContextValue | null>(null);

export function DeliveryProvider({ children }: { children: ReactNode }) {
  const [veiculo, setVeiculoState] = useState<DeliveryVehicleCategory>("MOTO");
  const [abaAcao, setAbaAcaoState] = useState<DeliveryActionTab>("enviar");

  // Localização do próprio usuário (detectada via GPS e perfil)
  const [localizacaoUsuario, setLocalizacaoUsuario] = useState<DeliveryAddressInfo>(() => {
    if (typeof window === "undefined") return ENDERECO_PADRAO_USUARIO;
    const nome = localStorage.getItem("partiu_user_nome") || "Rodrigo";
    const tel = localStorage.getItem("partiu_user_telefone") || "22996051620";
    return {
      ...ENDERECO_PADRAO_USUARIO,
      contatoNome: nome,
      contatoTelefone: tel,
    };
  });

  // Endereços recentes
  const [enderecosRecentes, setEnderecosRecentes] = useState<EnderecoRecenteItem[]>(() => {
    if (typeof window === "undefined") return ENDERECOS_RECENTES_INICIAIS;
    try {
      const salvo = localStorage.getItem(STORAGE_KEY_RECENTS);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) { silentCatchWarn("DeliveryContext", err); }
    return ENDERECOS_RECENTES_INICIAIS;
  });

  // Origem e Destino com preenchimento inteligente
  const [origem, setOrigem] = useState<DeliveryAddressInfo>(localizacaoUsuario);
  const [destino, setDestino] = useState<DeliveryAddressInfo>(ENDERECO_EM_BRANCO);
  const [descricaoPacote, setDescricaoPacote] = useState("Encomenda Partiu Expresso");
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressModalTarget, setAddressModalTarget] = useState<"origem" | "destino">("destino");

  // 1. Geolocalização automática do usuário no carregamento
  useEffect(() => {
    let ativo = true;

    async function detectarLocalizacao() {
      try {
        const perfil = await UserService.getInstance().getCurrentUserProfile();
        const nomePax = perfil?.name?.split(" ")[0] || localStorage.getItem("partiu_user_nome") || "Rodrigo";
        const telPax = perfil?.phone?.replace(/\D/g, "") || localStorage.getItem("partiu_user_telefone") || "22996051620";

        if (typeof navigator !== "undefined" && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              if (!ativo) return;
              const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
              try {
                const enderecoGps = await geocodingService.geocodificarReverso(coords);
                if (enderecoGps && ativo) {
                  const pontoAtualizado: DeliveryAddressInfo = {
                    endereco: enderecoGps,
                    complemento: "",
                    contatoNome: nomePax,
                    contatoTelefone: telPax,
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                  };
                  setLocalizacaoUsuario(pontoAtualizado);
                  setOrigem((prev) => {
                    // Se estiver em "enviar" e a origem for o default, atualiza para o GPS
                    if (abaAcao === "enviar" && (!prev.endereco || prev.endereco === ENDERECO_PADRAO_USUARIO.endereco)) {
                      return pontoAtualizado;
                    }
                    return prev;
                  });
                  setDestino((prev) => {
                    // Se estiver em "receber" e o destino for o default, atualiza para o GPS
                    if (abaAcao === "receber" && (!prev.endereco || prev.endereco === ENDERECO_PADRAO_USUARIO.endereco)) {
                      return pontoAtualizado;
                    }
                    return prev;
                  });
                }
              } catch (err) { silentCatchWarn("DeliveryContext", err); }
            },
            () => {},
            { enableHighAccuracy: true, timeout: 7000 }
          );
        }
      } catch (err) { silentCatchWarn("DeliveryContext", err); }
    }

    detectarLocalizacao();

    return () => {
      ativo = false;
    };
  }, [abaAcao]);

  // 2. Alternar entre Abas "Enviar" e "Receber" com Preenchimento Inteligente
  const setAbaAcao = useCallback(
    (novaAba: DeliveryActionTab) => {
      setAbaAcaoState(novaAba);
      if (novaAba === "enviar") {
        // Enviar: Origem = usuário atual; Destino = em branco para preencher
        setOrigem(localizacaoUsuario);
        setDestino(ENDERECO_EM_BRANCO);
      } else {
        // Receber: Origem = em branco para coletar; Destino = usuário atual
        setOrigem(ENDERECO_EM_BRANCO);
        setDestino(localizacaoUsuario);
      }
    },
    [localizacaoUsuario]
  );

  // Ordem ativa e ciclo de vida
  const [ordemAtiva, setOrdemAtiva] = useState<DeliveryOrderRecord | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const salvo = localStorage.getItem(STORAGE_KEY_ORDER);
      return salvo ? JSON.parse(salvo) : null;
    } catch {
      return null;
    }
  });

  // Salvar no localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (ordemAtiva) {
      localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(ordemAtiva));
    } else {
      localStorage.removeItem(STORAGE_KEY_ORDER);
    }
  }, [ordemAtiva]);

  // Cotação calculada dinamicamente para Moto ou Carro
  const cotacao = useMemo(() => {
    return calcularCotacaoEntrega(veiculo, 5.2, 16);
  }, [veiculo]);

  const status: DeliveryFlowStatus = ordemAtiva?.status || "SETUP";

  // Seletor de veículo estritamente MOTO ou CARRO
  const setVeiculo = useCallback((v: DeliveryVehicleCategory) => {
    if (v !== "MOTO" && v !== "CARRO") return;
    setVeiculoState(v);
  }, []);

  const abrirModalEndereco = useCallback((alvo: "origem" | "destino") => {
    setAddressModalTarget(alvo);
    setIsAddressModalOpen(true);
  }, []);

  const fecharModalEndereco = useCallback(() => {
    setIsAddressModalOpen(false);
  }, []);

  const salvarEnderecoModal = useCallback(
    (info: DeliveryAddressInfo) => {
      if (addressModalTarget === "origem") {
        setOrigem(info);
      } else {
        setDestino(info);
      }

      // Adiciona o endereço aos recentes persistidos
      if (info.endereco && info.contatoNome) {
        setEnderecosRecentes((prev) => {
          const filtrados = prev.filter(
            (r) => r.endereco.trim().toLowerCase() !== info.endereco.trim().toLowerCase()
          );
          const novoRecente: EnderecoRecenteItem = {
            id: `rec-${Date.now()}`,
            endereco: info.endereco.trim(),
            complemento: info.complemento?.trim() || "",
            nome: info.contatoNome.trim(),
            telefone: info.contatoTelefone.trim(),
          };
          const listaAtualizada = [novoRecente, ...filtrados].slice(0, 10);
          try {
            localStorage.setItem(STORAGE_KEY_RECENTS, JSON.stringify(listaAtualizada));
          } catch (err) { silentCatchWarn("DeliveryContext", err); }
          return listaAtualizada;
        });
      }

      setIsAddressModalOpen(false);
    },
    [addressModalTarget]
  );

  // Iniciar Nova Ordem de Entrega (Transição SETUP -> AWAITING_PICKUP com PIN 1 & PIN 2)
  const iniciarEntrega = useCallback(() => {
    if (!destino.endereco || !destino.contatoNome) {
      abrirModalEndereco("destino");
      return null;
    }
    if (!origem.endereco || !origem.contatoNome) {
      abrirModalEndereco("origem");
      return null;
    }

    const pin1 = gerarPinOtp();
    const pin2 = gerarPinOtp();
    const motorista = selecionarMotoristaEntrega(veiculo);
    const orderId = `del-${Date.now()}`;
    const trackingCode = `PT-${orderId.slice(-4)}-EXP`;
    const trackingToken = `trk_${Math.random().toString(36).slice(2, 10)}`;

    const novaOrdem: DeliveryOrderRecord = {
      id: orderId,
      codigoRastreio: trackingCode,
      trackingToken,
      criadoEm: Date.now(),
      categoriaVeiculo: veiculo,
      abaAcao,
      origem,
      destino,
      descricaoPacote,
      quote: cotacao,
      status: "AWAITING_PICKUP",
      pins: {
        pin1Coleta: pin1,
        pin1Verificado: false,
        pin2Entrega: pin2,
        pin2Verificado: false,
        falhasPin1: 0,
        falhasPin2: 0,
      },
      motorista,
    };

    // Sincroniza com o motor geral de corridas
    criarNovaCorrida({
      modalidade: veiculo === "MOTO" ? "ENTREGA_MOTO" : "ENTREGA_CARRO",
      origem: origem.endereco,
      destino: destino.endereco,
      passageiroNome: origem.contatoNome || "Remetente",
      passageiroTelefone: origem.contatoTelefone || "22996051620",
      valor: cotacao.precoBrl,
      distanciaKm: cotacao.distanciaKm,
      duracaoMin: cotacao.duracaoMin,
      formaPagamento: "pix",
      isEntrega: true,
      destinatarioNome: destino.contatoNome,
      destinatarioTelefone: destino.contatoTelefone,
      descricaoPacote,
    });

    setOrdemAtiva(novaOrdem);
    return novaOrdem;
  }, [destino, origem, abrirModalEndereco, veiculo, abaAcao, descricaoPacote, cotacao]);

  // Validar PIN 1 de Coleta (Remetente -> Motorista)
  const validarPin1 = useCallback(
    (pinInput: string) => {
      if (!ordemAtiva) {
        return { sucesso: false, mensagem: "Nenhuma ordem de entrega ativa." };
      }
      const resultado = validarPin1Coleta(ordemAtiva, pinInput);
      if (resultado.sucesso && resultado.proximaOrdem) {
        setOrdemAtiva(resultado.proximaOrdem);
      }
      return { sucesso: resultado.sucesso, mensagem: resultado.mensagem };
    },
    [ordemAtiva]
  );

  // Simular Motorista Validando o PIN 1 na Coleta
  const simularMotoristaValidarPin1 = useCallback(() => {
    if (!ordemAtiva) {
      return { sucesso: false, mensagem: "Nenhuma ordem de entrega ativa." };
    }
    return validarPin1(ordemAtiva.pins.pin1Coleta);
  }, [ordemAtiva, validarPin1]);

  // Avançar para Destino (Transição IN_TRANSIT -> ARRIVED_DESTINATION)
  const avancarParaDestino = useCallback(() => {
    if (!ordemAtiva || ordemAtiva.status !== "IN_TRANSIT") return;
    setOrdemAtiva((prev) => (prev ? { ...prev, status: "ARRIVED_DESTINATION" } : null));
  }, [ordemAtiva]);

  // Validar PIN 2 de Entrega (Destinatário -> Motorista)
  const validarPin2 = useCallback(
    (pinInput: string) => {
      if (!ordemAtiva) {
        return { sucesso: false, mensagem: "Nenhuma ordem de entrega ativa." };
      }
      const resultado = validarPin2Entrega(ordemAtiva, pinInput);
      if (resultado.sucesso && resultado.proximaOrdem) {
        setOrdemAtiva(resultado.proximaOrdem);
        finalizarViagem();
      }
      return { sucesso: resultado.sucesso, mensagem: resultado.mensagem };
    },
    [ordemAtiva]
  );

  // Simular Motorista Validando o PIN 2 na Entrega
  const simularMotoristaValidarPin2 = useCallback(() => {
    if (!ordemAtiva) {
      return { sucesso: false, mensagem: "Nenhuma ordem de entrega ativa." };
    }
    return validarPin2(ordemAtiva.pins.pin2Entrega);
  }, [ordemAtiva, validarPin2]);

  // Cancelar Entrega Ativa
  const cancelarEntregaAtiva = useCallback(() => {
    cancelarCorrida();
    setOrdemAtiva(null);
  }, []);

  // Reiniciar para Nova Entrega
  const reiniciarParaNovaEntrega = useCallback(() => {
    setOrdemAtiva(null);
    if (abaAcao === "enviar") {
      setOrigem(localizacaoUsuario);
      setDestino(ENDERECO_EM_BRANCO);
    } else {
      setOrigem(ENDERECO_EM_BRANCO);
      setDestino(localizacaoUsuario);
    }
  }, [abaAcao, localizacaoUsuario]);

  const value = useMemo(
    () => ({
      veiculo,
      abaAcao,
      origem,
      destino,
      descricaoPacote,
      cotacao,
      status,
      ordemAtiva,
      isAddressModalOpen,
      addressModalTarget,
      enderecosRecentes,
      setVeiculo,
      setAbaAcao,
      setOrigem,
      setDestino,
      setDescricaoPacote,
      abrirModalEndereco,
      fecharModalEndereco,
      salvarEnderecoModal,
      iniciarEntrega,
      validarPin1,
      simularMotoristaValidarPin1,
      avancarParaDestino,
      validarPin2,
      simularMotoristaValidarPin2,
      cancelarEntregaAtiva,
      reiniciarParaNovaEntrega,
    }),
    [
      veiculo,
      abaAcao,
      origem,
      destino,
      descricaoPacote,
      cotacao,
      status,
      ordemAtiva,
      isAddressModalOpen,
      addressModalTarget,
      enderecosRecentes,
      setVeiculo,
      setAbaAcao,
      salvarEnderecoModal,
      iniciarEntrega,
      validarPin1,
      simularMotoristaValidarPin1,
      avancarParaDestino,
      validarPin2,
      simularMotoristaValidarPin2,
      cancelarEntregaAtiva,
      reiniciarParaNovaEntrega,
    ]
  );

  return <DeliveryContext.Provider value={value}>{children}</DeliveryContext.Provider>;
}

export function useDelivery(): DeliveryContextValue {
  const ctx = useContext(DeliveryContext);
  if (!ctx) {
    throw new Error("useDelivery deve ser utilizado dentro de um DeliveryProvider.");
  }
  return ctx;
}

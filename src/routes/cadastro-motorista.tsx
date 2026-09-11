import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Car,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  Zap,
} from "lucide-react";
import { TopNav } from "@/components/navigation/TopNav";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { driverFleetService } from "@/lib/ecosystem/driver-fleet-service";
import { silentCatchWarn } from "@/lib/structured-logger";


export const Route = createFileRoute("/cadastro-motorista")({
  head: () => ({
    meta: [
      { title: "Cadastro de Motorista & Entregador Parceiro | PARTIU" },
      {
        name: "description",
        content:
          "Cadastre seu carro ou moto para faturar com corridas urbanas e entregas expressas com planos a partir de 0% de taxa (até 100% de repasse líquido) e repasse imediato via PIX D+0.",
      },
    ],
  }),
  component: CadastroMotoristaPage,
});

export function CadastroMotoristaPage() {
  const [etapa, setEtapa] = useState<1 | 2 | 3 | 4>(1);
  const [sucesso, setSucesso] = useState(false);

  // Etapa 1: Dados Pessoais
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");

  // Etapa 2: Modalidade & Veículo
  const [tipoVeiculo, setTipoVeiculo] = useState<"carro" | "moto">("carro");
  const [veiculoModelo, setVeiculoModelo] = useState("Chevrolet Onix Plus 1.0");
  const [veiculoAno, setVeiculoAno] = useState("2023");
  const [veiculoPlaca, setVeiculoPlaca] = useState("");
  const [veiculoCor, setVeiculoCor] = useState("Prata");
  const [temArCondicionado, setTemArCondicionado] = useState(true);

  // Etapa 3: CNH & EAR
  const [cnh, setCnh] = useState("");
  const [categoriaCNH, setCategoriaCNH] = useState<"B" | "A" | "AB">("B");
  const [possuiEAR, setPossuiEAR] = useState(true);

  // Etapa 4: Chave PIX (D+0)
  const [chavePix, setChavePix] = useState("");
  const [tipoChave, setTipoChave] = useState<"cpf" | "celular" | "email" | "aleatoria">("celular");

  function handleFinalizarCadastro(e: FormEvent) {
    e.preventDefault();

    const motoristaNovo = {
      id: "mot_" + Date.now(),
      nome,
      cpf,
      whatsapp,
      email,
      tipoVeiculo,
      modelo: veiculoModelo,
      ano: veiculoAno,
      placa: veiculoPlaca.toUpperCase(),
      cor: veiculoCor,
      temArCondicionado,
      cnh,
      categoriaCNH,
      possuiEAR,
      chavePix,
      tipoChave,
      status: "pendente",
      cadastradoEm: new Date().toISOString(),
    };

    try {
      const armazenados = JSON.parse(localStorage.getItem("partiu_motoristas_store") || "[]");
      armazenados.unshift(motoristaNovo);
      localStorage.setItem("partiu_motoristas_store", JSON.stringify(armazenados));
      localStorage.setItem("partiu_motorista_ativo", JSON.stringify(motoristaNovo));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("partiu:driver_registered", { detail: motoristaNovo }));
      }
    } catch (err) { silentCatchWarn("cadastro-motorista", err); }

    // Sincroniza via driverFleetService (com validação estrita MOTO/CARRO e dual-table)
    void driverFleetService.registerDriver({
      name: nome,
      phone: whatsapp,
      email: email || undefined,
      vehicle_type: tipoVeiculo === "moto" ? "MOTO" : "CARRO",
      vehicle_plate: veiculoPlaca.toUpperCase() || "SEM-PLACA",
      vehicle_model: veiculoModelo,
      cnh_number: cnh || "00000000000",
      pix_key: chavePix || undefined,
    });

    if (isSupabaseConfigured()) {
      void (supabase as any).from("partiu_motoristas").insert({
        nome,
        cpf: cpf.replace(/\D/g, "") || cpf || "00000000000",
        telefone: whatsapp,
        email: email || null,
        cnh_numero: cnh || "00000000000",
        cnh_categoria: categoriaCNH,
        cnh_validade: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        possui_ear: possuiEAR,
        veiculo_marca_modelo: veiculoModelo,
        veiculo_placa: veiculoPlaca.toUpperCase() || "SEM-PLACA",
        veiculo_ano: parseInt(veiculoAno, 10) || 2023,
        veiculo_cor: veiculoCor,
        categoria_veiculo: tipoVeiculo === "moto" ? "MOTO" : "CARRO",
        chave_pix: chavePix || null,
        tipo_chave_pix: tipoChave || null,
        status_aprovacao: "pendente",
        is_online: false,
      }).then(({ error }: any) => {
        if (error) console.warn("[CadastroMotorista] Falha ao sincronizar com Supabase:", error.message);
      });
    }

    setSucesso(true);
  }

  return (
    <div className="min-h-screen bg-[#0b0f17] text-white flex flex-col justify-between">
      <TopNav />

      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {!sucesso ? (
          <div className="rounded-3xl bg-slate-900/90 p-5 sm:p-8 border border-slate-800 shadow-2xl backdrop-blur-xl">
            {/* Header de Etapas */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-2">
                <span className="text-[#0088FF] uppercase tracking-wider font-black">
                  Etapa {etapa} de 4
                </span>
                <span>
                  {etapa === 1 && "Dados Pessoais"}
                  {etapa === 2 && "Veículo"}
                  {etapa === 3 && "Habilitação (CNH)"}
                  {etapa === 4 && "Repasse PIX D+0"}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0088FF] transition-all duration-300 rounded-full"
                  style={{ width: `${(etapa / 4) * 100}%` }}
                />
              </div>
            </div>

            {/* ETAPA 1: DADOS PESSOAIS */}
            {etapa === 1 && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-xl font-black text-white">Informações Pessoais</h2>
                  <p className="text-xs text-slate-400">
                    Comece informando seus dados básicos para contato e validação
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-black uppercase text-slate-300">
                    Nome Completo
                  </label>
                  <input
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome como na CNH"
                    className="w-full h-12 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white outline-none border border-slate-800 focus:border-[#0088FF] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black uppercase text-slate-300">
                      CPF
                    </label>
                    <input
                      required
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full h-12 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white outline-none border border-slate-800 focus:border-[#0088FF] transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black uppercase text-slate-300">
                      WhatsApp
                    </label>
                    <input
                      required
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="(82) 99999-9999"
                      className="w-full h-12 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white outline-none border border-slate-800 focus:border-[#0088FF] transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-black uppercase text-slate-300">
                    E-mail
                  </label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full h-12 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white outline-none border border-slate-800 focus:border-[#0088FF] transition-colors"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!nome || !whatsapp) {
                      alert("Por favor, preencha pelo menos Nome e WhatsApp.");
                      return;
                    }
                    setEtapa(2);
                  }}
                  className="w-full h-12 rounded-xl bg-[#0088FF] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-[#0088FF]/20 hover:bg-[#00A3FF] transition-all cursor-pointer mt-4"
                >
                  <span>Continuar para Veículo</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* ETAPA 2: VEÍCULO */}
            {etapa === 2 && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-xl font-black text-white">Dados do Veículo</h2>
                  <p className="text-xs text-slate-400">
                    Selecione a categoria que você vai dirigir no Partiu
                  </p>
                </div>

                {/* Seletor Carro vs Moto */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTipoVeiculo("carro");
                      setCategoriaCNH("B");
                    }}
                    className={`flex items-center justify-center gap-2 h-14 rounded-2xl border font-black text-sm transition-all cursor-pointer ${
                      tipoVeiculo === "carro"
                        ? "bg-[#0088FF] text-slate-950 border-[#0088FF] shadow-md shadow-[#0088FF]/20"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    <Car className="h-5 w-5" />
                    <span>Carro (Partiu Pop)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTipoVeiculo("moto");
                      setCategoriaCNH("A");
                    }}
                    className={`flex items-center justify-center gap-2 h-14 rounded-2xl border font-black text-sm transition-all cursor-pointer ${
                      tipoVeiculo === "moto"
                        ? "bg-[#0088FF] text-slate-950 border-[#0088FF] shadow-md shadow-[#0088FF]/20"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    <Bike className="h-5 w-5" />
                    <span>Moto & Flash</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-black uppercase text-slate-300">
                    Modelo e Marca
                  </label>
                  <input
                    required
                    value={veiculoModelo}
                    onChange={(e) => setVeiculoModelo(e.target.value)}
                    placeholder={tipoVeiculo === "carro" ? "Ex: Chevrolet Onix 1.0" : "Ex: Honda CG 160 Fan"}
                    className="w-full h-12 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white outline-none border border-slate-800 focus:border-[#0088FF] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-slate-300">
                      Ano
                    </label>
                    <input
                      required
                      value={veiculoAno}
                      onChange={(e) => setVeiculoAno(e.target.value)}
                      placeholder="2022"
                      className="w-full h-12 rounded-xl bg-slate-950 px-3 text-sm font-medium text-white outline-none border border-slate-800 focus:border-[#0088FF] transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-slate-300">
                      Placa
                    </label>
                    <input
                      required
                      value={veiculoPlaca}
                      onChange={(e) => setVeiculoPlaca(e.target.value)}
                      placeholder="ABC1D23"
                      className="w-full h-12 rounded-xl bg-slate-950 px-3 text-sm font-black uppercase text-white outline-none border border-slate-800 focus:border-[#0088FF] transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-slate-300">
                      Cor
                    </label>
                    <input
                      value={veiculoCor}
                      onChange={(e) => setVeiculoCor(e.target.value)}
                      placeholder="Branco"
                      className="w-full h-12 rounded-xl bg-slate-950 px-3 text-sm font-medium text-white outline-none border border-slate-800 focus:border-[#0088FF] transition-colors"
                    />
                  </div>
                </div>

                {tipoVeiculo === "carro" && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <input
                      type="checkbox"
                      id="arCond"
                      checked={temArCondicionado}
                      onChange={(e) => setTemArCondicionado(e.target.checked)}
                      className="h-4.5 w-4.5 rounded accent-[#0088FF] cursor-pointer"
                    />
                    <label htmlFor="arCond" className="text-xs text-slate-300 font-bold cursor-pointer">
                      Possui Ar-Condicionado Funcionando
                    </label>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setEtapa(1)}
                    className="w-1/3 h-12 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!veiculoPlaca) {
                        alert("Por favor, preencha a placa do veículo.");
                        return;
                      }
                      setEtapa(3);
                    }}
                    className="w-2/3 h-12 rounded-xl bg-[#0088FF] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-[#0088FF]/20 hover:bg-[#00A3FF] transition-all cursor-pointer"
                  >
                    <span>Avançar para CNH</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA 3: CNH & EAR */}
            {etapa === 3 && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-xl font-black text-white">Habilitação Profissional</h2>
                  <p className="text-xs text-slate-400">
                    Sua CNH deve ter a observação EAR (Exerce Atividade Remunerada)
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-black uppercase text-slate-300">
                    Número do Registro da CNH
                  </label>
                  <input
                    required
                    value={cnh}
                    onChange={(e) => setCnh(e.target.value)}
                    placeholder="Ex: 01234567890"
                    className="w-full h-12 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white outline-none border border-slate-800 focus:border-[#0088FF] transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-black uppercase text-slate-300">
                    Categoria da CNH
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["B", "A", "AB"] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoriaCNH(cat)}
                        className={`h-11 rounded-xl border font-black text-xs transition-all cursor-pointer ${
                          categoriaCNH === cat
                            ? "bg-[#0088FF] text-slate-950 border-[#0088FF]"
                            : "bg-slate-950 text-slate-400 border-slate-800"
                        }`}
                      >
                        Categoria {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                    <strong className="text-xs font-black text-white">
                      Exerce Atividade Remunerada (EAR)
                    </strong>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Exigência legal do Código de Trânsito Brasileiro (CTB) para dirigir por aplicativo.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="temEar"
                      checked={possuiEAR}
                      onChange={(e) => setPossuiEAR(e.target.checked)}
                      className="h-4.5 w-4.5 rounded accent-[#0088FF] cursor-pointer"
                    />
                    <label htmlFor="temEar" className="text-xs text-white font-bold cursor-pointer">
                      Sim, minha CNH possui a sigla EAR
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setEtapa(2)}
                    className="w-1/3 h-12 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!cnh) {
                        alert("Por favor, preencha o número da CNH.");
                        return;
                      }
                      setEtapa(4);
                    }}
                    className="w-2/3 h-12 rounded-xl bg-[#0088FF] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-[#0088FF]/20 hover:bg-[#00A3FF] transition-all cursor-pointer"
                  >
                    <span>Avançar para PIX</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA 4: REPASSE PIX D+0 */}
            {etapa === 4 && (
              <form onSubmit={handleFinalizarCadastro} className="space-y-4 animate-in fade-in-50 duration-200">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-xl font-black text-white">Chave PIX para Recebimentos</h2>
                  <p className="text-xs text-slate-400">
                    No PARTIU você recebe de 95% a até 100% do valor de cada corrida imediatamente via PIX (D+0) conforme o seu plano de assinatura
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-black uppercase text-slate-300">
                    Tipo de Chave PIX
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["celular", "cpf", "email", "aleatoria"] as const).map((tipo) => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setTipoChave(tipo)}
                        className={`h-10 rounded-xl border text-[11px] font-black uppercase transition-all cursor-pointer ${
                          tipoChave === tipo
                            ? "bg-[#0088FF] text-slate-950 border-[#0088FF]"
                            : "bg-slate-950 text-slate-400 border-slate-800"
                        }`}
                      >
                        {tipo}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-black uppercase text-slate-300">
                    Sua Chave PIX
                  </label>
                  <input
                    required
                    value={chavePix}
                    onChange={(e) => setChavePix(e.target.value)}
                    placeholder={
                      tipoChave === "celular"
                        ? "(82) 99999-9999"
                        : tipoChave === "cpf"
                          ? "000.000.000-00"
                          : tipoChave === "email"
                            ? "chave@email.com"
                            : "Chave aleatória UUID"
                    }
                    className="w-full h-12 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white outline-none border border-slate-800 focus:border-[#0088FF] transition-colors"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-primary-600/10 border border-primary-600/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-primary-600">Modelo Híbrido PARTIU</span>
                    <span className="text-xs font-black text-emerald-400">Até 100% Líquido</span>
                  </div>
                  <div className="text-slate-300 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">• Plano Free (Gratuito)</span>
                      <span className="font-bold">5% taxa por corrida</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-500">• Plano Bronze</span>
                      <span className="font-bold">3% taxa por corrida</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-200">• Plano Prata</span>
                      <span className="font-bold">1% taxa por corrida</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-600">• Plano Ouro</span>
                      <span className="font-black text-emerald-400">0% de taxa (100% seu!)</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 pt-1">
                    ⚡ Sem surpresas ou taxas escondidas. Você começa no Free e pode evoluir quando quiser!
                  </p>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setEtapa(3)}
                    className="w-1/3 h-12 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 h-12 rounded-xl bg-[#0088FF] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-[#0088FF]/20 hover:bg-[#00A3FF] transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Concluir Cadastro</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="rounded-3xl bg-slate-900 p-8 text-center shadow-2xl border border-slate-800 space-y-4 animate-in zoom-in-95">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0088FF] text-slate-950 shadow-lg shadow-[#0088FF]/20">
              <CheckCircle2 className="h-9 w-9 stroke-[2.5]" />
            </div>

            <h2 className="text-2xl font-black text-white">Cadastro Realizado com Sucesso!</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Parabéns, <strong className="text-white">{nome}</strong>! Seu veículo{" "}
              <strong className="text-[#0088FF]">{veiculoModelo} ({veiculoPlaca.toUpperCase()})</strong>{" "}
              foi cadastrado na rede PARTIU com repasse PIX configurado.
            </p>

            <div className="pt-4 space-y-2.5">
              <Link
                to="/app/motorista"
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[#0088FF] text-xs font-black text-slate-950 shadow-md shadow-[#0088FF]/20 hover:bg-[#00A3FF] transition-all cursor-pointer"
              >
                Abrir Cockpit do Motorista e Ficar Online
              </Link>
              <Link
                to="/app"
                className="flex h-11 w-full items-center justify-center rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
              >
                Voltar ao App Principal
              </Link>
            </div>
          </div>
        )}
      </main>

      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-800/80">
        PARTIU Mobilidade Urbana & Entregas Flash • Parceiro Oficial
      </footer>
    </div>
  );
}

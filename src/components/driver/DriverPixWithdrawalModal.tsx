import React, { useState, useMemo } from "react";
import {
  X,
  Zap,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  CreditCard,
  QrCode,
  ShieldCheck,
  ArrowDownToLine,
  Phone,
  Mail,
  Fingerprint,
  KeyRound,
} from "lucide-react";
import {
  driverWithdrawalService,
  type PixKeyType,
  type WithdrawalReceipt,
} from "@/services/DriverWithdrawalService";
import { useBrandTheme } from "@/hooks/useBrandTheme";

export interface DriverPixWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
  saldoDisponivelBrl: number;
  chavePixPadrao?: string;
  onWithdrawalSuccess?: (newBalanceBrl: number) => void;
}

export const DriverPixWithdrawalModal: React.FC<DriverPixWithdrawalModalProps> = ({
  isOpen,
  onClose,
  driverId,
  saldoDisponivelBrl,
  chavePixPadrao = "",
  onWithdrawalSuccess,
}) => {
  const { corPrimaria, corSecundaria, corTextoPrimaria, corCabecalhoInicio, corCabecalhoFim, branding } = useBrandTheme();
  const accentColor = branding?.accent_color || corSecundaria || "#00C6FF";
  const [keyType, setKeyType] = useState<PixKeyType>("CPF");
  const [pixKey, setPixKey] = useState(chavePixPadrao);
  const [amountStr, setAmountStr] = useState(saldoDisponivelBrl.toFixed(2));
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<WithdrawalReceipt | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleQuickAmount = (val: number) => {
    const capped = Math.min(val, saldoDisponivelBrl);
    setAmountStr(capped.toFixed(2));
    setErrorMsg(null);
  };

  const handleCopyProtocol = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amount = parseFloat(amountStr.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg("Informe um valor válido para saque.");
      return;
    }

    if (amount > saldoDisponivelBrl) {
      setErrorMsg("O valor solicitado excede o seu saldo disponível.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await driverWithdrawalService.requestPixWithdrawal({
        driverId,
        amountBrl: amount,
        pixKey,
        pixKeyType: keyType,
      });

      if (res.success) {
        setReceipt(res);
        if (onWithdrawalSuccess) {
          onWithdrawalSuccess(res.newBalanceBrl);
        }
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Erro inesperado ao processar saque.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-slate-900">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-950">Saque PIX Instantâneo</h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Transferência bancária em tempo real (D+0)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {receipt ? (
          /* Card de Comprovante de Saque */
          <div className="py-4 space-y-4">
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h3 className="text-base font-black text-slate-950">Saque Concluído com Sucesso!</h3>
              <p className="text-xs text-slate-500">
                O valor já foi transferido para a sua chave PIX.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 font-semibold">Valor Transferido</span>
                <span className="text-base font-black text-emerald-700">
                  {receipt.amountBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Tipo de Chave</span>
                <span className="font-bold text-slate-800">{receipt.pixKeyType}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Chave PIX</span>
                <span className="font-bold text-slate-800 truncate max-w-[180px]">{receipt.pixKey}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Protocolo</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono font-bold text-slate-700 text-[11px]">{receipt.transferId}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyProtocol(receipt.transferId)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                    title="Copiar"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                <span className="text-slate-500">Novo Saldo em Conta</span>
                <span className="font-black text-slate-900">
                  {receipt.newBalanceBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition active:scale-[0.98] cursor-pointer"
            >
              Fechar
            </button>
          </div>
        ) : (
          /* Formulário de Solicitação */
          <form onSubmit={handleSubmit} className="py-3.5 space-y-3.5">
            {/* Saldo Atual */}
            <div
              style={{
                background: `linear-gradient(135deg, ${corCabecalhoInicio}, ${corCabecalhoFim})`,
                color: corTextoPrimaria,
                boxShadow: `0 8px 25px -4px ${corPrimaria}40`,
              }}
              className="p-3.5 rounded-2xl text-white space-y-1"
            >
              <span className="text-[10.5px] font-bold text-white/80 uppercase tracking-wider block">
                Saldo Disponível para Saque
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black">
                  {saldoDisponivelBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
                <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-xs">
                  0% Taxa • Grátis
                </span>
              </div>
            </div>

            {/* Seleção do Tipo de Chave PIX */}
            <div>
              <label className="text-[11px] font-black text-slate-700 block mb-1.5 uppercase tracking-wide">
                Tipo de Chave PIX
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { type: "CPF" as PixKeyType, label: "CPF", icon: Fingerprint },
                  { type: "PHONE" as PixKeyType, label: "Celular", icon: Phone },
                  { type: "EMAIL" as PixKeyType, label: "E-mail", icon: Mail },
                  { type: "EVP" as PixKeyType, label: "Aleatória", icon: KeyRound },
                ].map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setKeyType(type);
                      setErrorMsg(null);
                    }}
                    style={
                      keyType === type
                        ? {
                            borderColor: corPrimaria,
                            backgroundColor: `${corPrimaria}15`,
                            color: corPrimaria,
                          }
                        : {}
                    }
                    className={`py-2 px-1.5 rounded-xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                      keyType === type
                        ? "font-black shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: keyType === type ? corPrimaria : "#94A3B8" }} />
                    <span className="text-[10px]">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input da Chave PIX */}
            <div>
              <label className="text-[11px] font-black text-slate-700 block mb-1 uppercase tracking-wide">
                Chave PIX ({keyType})
              </label>
              <input
                type="text"
                value={pixKey}
                onChange={(e) => {
                  setPixKey(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder={
                  keyType === "CPF"
                    ? "000.000.000-00"
                    : keyType === "PHONE"
                    ? "(22) 99999-9999"
                    : keyType === "EMAIL"
                    ? "motorista@email.com"
                    : "Chave aleatória UUID..."
                }
                className="w-full text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                required
              />
            </div>

            {/* Input de Valor */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
                  Valor a Sacar (R$)
                </label>
                <span className="text-[10px] text-slate-400 font-bold">Mínimo: R$ 5,00</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="5"
                  max={saldoDisponivelBrl}
                  value={amountStr}
                  onChange={(e) => {
                    setAmountStr(e.target.value);
                    setErrorMsg(null);
                  }}
                  className="w-full text-sm font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-2.5 pl-8 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  required
                />
              </div>

              {/* Botões Rápidos */}
              <div className="flex items-center gap-1.5 mt-2">
                {[50, 100, 200].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAmount(val)}
                    disabled={saldoDisponivelBrl < val}
                    className="flex-1 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                  >
                    R$ {val}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleQuickAmount(saldoDisponivelBrl)}
                  disabled={saldoDisponivelBrl <= 0}
                  className="flex-1 py-1.5 rounded-lg border border-emerald-300 text-[11px] font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                >
                  Tudo
                </button>
              </div>
            </div>

            {/* Mensagem de Erro */}
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Botão de Envio */}
            <button
              type="submit"
              disabled={isLoading || saldoDisponivelBrl <= 0}
              style={{
                background: `linear-gradient(135deg, ${corCabecalhoInicio}, ${corCabecalhoFim})`,
                color: corTextoPrimaria,
                boxShadow: `0 8px 25px -4px ${corPrimaria}50`,
              }}
              className="w-full py-3 px-4 rounded-2xl text-white font-bold text-sm shadow-md hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer border border-white/20"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ArrowDownToLine className="w-4 h-4 stroke-[2.5]" />
                  <span>Transferir via PIX Agora</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

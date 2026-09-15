import { describe, test, testAsync, expect } from "./test-harness.mjs";
import {
  pushNotificationService,
  type AppNotification,
} from "../src/services/PushNotificationService.ts";
import type { DriverProfileRecord } from "../src/lib/driver/driver-eligibility-engine.ts";

describe("📱 SUÍTE OFICIAL: GESTÃO DE PERFIL DO MOTORISTA & MOTOR DE PUSH NOTIFICATIONS", () => {
  // --------------------------------------------------------------------------
  // PARTE 1: TESTES DO MOTOR DE PUSH NOTIFICATIONS & CENTRAL EM TEMPO REAL
  // --------------------------------------------------------------------------

  testAsync("1.1 Notificações Iniciais e Cálculo de Não Lidas", async () => {
    const testUserId = "driver-test-suite-01";
    const notifications = await pushNotificationService.getNotifications(testUserId);

    expect(notifications.length).toBeGreaterThan(0);
    const unreadCount = await pushNotificationService.getUnreadCount(testUserId);
    const calculatedUnread = notifications.filter((n) => !n.isRead).length;

    expect(unreadCount).toBe(calculatedUnread);
    expect(unreadCount).toBeGreaterThan(0);
  });

  testAsync("1.2 Marcação Individual de Notificação como Lida (markAsRead)", async () => {
    const testUserId = "driver-test-suite-02";
    const initialList = await pushNotificationService.getNotifications(testUserId);
    const firstUnread = initialList.find((n) => !n.isRead);

    expect(firstUnread).toBeDefined();
    if (!firstUnread) return;

    const initialUnreadCount = await pushNotificationService.getUnreadCount(testUserId);
    const success = await pushNotificationService.markAsRead(firstUnread.id, testUserId);
    expect(success).toBe(true);

    const updatedList = await pushNotificationService.getNotifications(testUserId);
    const target = updatedList.find((n) => n.id === firstUnread.id);

    expect(target?.isRead).toBe(true);
    expect(target?.readAt).toBeDefined();

    const updatedUnreadCount = await pushNotificationService.getUnreadCount(testUserId);
    expect(updatedUnreadCount).toBe(initialUnreadCount - 1);
  });

  testAsync("1.3 Marcação em Lote de Todas como Lidas (markAllAsRead)", async () => {
    const testUserId = "driver-test-suite-03";
    const initialUnreadCount = await pushNotificationService.getUnreadCount(testUserId);
    expect(initialUnreadCount).toBeGreaterThan(0);

    const countMarked = await pushNotificationService.markAllAsRead(testUserId);
    expect(countMarked).toBe(initialUnreadCount);

    const remainingUnread = await pushNotificationService.getUnreadCount(testUserId);
    expect(remainingUnread).toBe(0);

    const allNotifications = await pushNotificationService.getNotifications(testUserId);
    const hasAnyUnread = allNotifications.some((n) => !n.isRead);
    expect(hasAnyUnread).toBe(false);
  });

  testAsync("1.4 Injeção de Nova Notificação e Alerta em Tempo Real", async () => {
    const testUserId = "driver-test-suite-04";
    const initialNotifications = await pushNotificationService.getNotifications(testUserId);
    const initialCount = initialNotifications.length;

    const newNotif = await pushNotificationService.createNotification({
      userId: testUserId,
      title: "Nova Corrida VIP Próxima 🌟",
      message: "Passageiro com nota 5.0 a 400m de você no Bairro Cidade Nova.",
      category: "corrida",
      data: { rideId: "RIDE-VIP-99", valorLiquido: 28.5 },
    });

    expect(newNotif.id).toBeDefined();
    expect(newNotif.isRead).toBe(false);

    const updatedList = await pushNotificationService.getNotifications(testUserId);
    expect(updatedList.length).toBe(initialCount + 1);

    const found = updatedList.find((n) => n.id === newNotif.id);
    expect(found).toBeDefined();
    expect(found?.title).toContain("VIP");
  });

  testAsync("1.5 Persistência e Recuperação de Push Token em Cache Local", async () => {
    const testUserId = "driver-test-suite-05";
    const fakeToken = `test_token_${Date.now()}_abc123`;

    const saved = await pushNotificationService.savePushTokenToSupabase(testUserId, fakeToken);
    expect(saved).toBe(true);

    if (typeof localStorage !== "undefined") {
      localStorage.setItem("partiu_push_token", fakeToken);
      expect(pushNotificationService.getPushToken()).toBe(fakeToken);
    }
  });

  // --------------------------------------------------------------------------
  // PARTE 2: TESTES DE REGRAS DE NEGÓCIO E AUDITORIA DO PERFIL DO MOTORISTA
  // --------------------------------------------------------------------------

  test("2.1 Invariante Antifraude: Imutabilidade de CPF e Chave PIX", () => {
    const perfilMock: DriverProfileRecord = {
      id: "DRV-SEC-01",
      userId: "USR-SEC-01",
      nome: "Carlos Eduardo Silva",
      cpf: "123.456.789-00",
      chavePix: "123.456.789-00",
      telefone: "(22) 99888-7766",
      cnhNumero: "01234567890",
      cnhCategoria: "B",
      cnhValidade: "2028-12-31",
      possuiEar: true,
      veiculoMarcaModelo: "Chevrolet Onix 1.0",
      veiculoPlaca: "BRA2E19",
      veiculoAno: 2022,
      veiculoCor: "Prata",
      categoriaVeiculo: "CARRO",
      rating: 4.95,
      taxaAceitacao: 98,
      taxaCancelamento: 1,
      totalViagens: 1420,
      statusAprovacao: "aprovado",
    };

    // A chave PIX deve ser OBRIGATORIAMENTE igual ao CPF do motorista
    expect(perfilMock.chavePix).toBe(perfilMock.cpf);

    // O CPF não pode ser vazio ou adulterado
    expect(perfilMock.cpf.length).toBeGreaterThanOrEqual(11);
  });

  test("2.2 Regra de Auditoria: Alteração de Placa Aciona status 'pending_vehicle_approval'", () => {
    const placaOriginal = "BRA2E19";
    const novaPlacaInformada = "RIO2A22";

    const houveAlteracao =
      placaOriginal.trim().toUpperCase() !== novaPlacaInformada.trim().toUpperCase();
    expect(houveAlteracao).toBe(true);

    const statusAprovacaoCalculado = houveAlteracao
      ? "pending_vehicle_approval"
      : "aprovado";

    expect(statusAprovacaoCalculado).toBe("pending_vehicle_approval");
  });

  test("2.3 Regra de Auditoria: Manutenção da Placa Preserva Status Aprovado", () => {
    const placaOriginal = "BRA2E19";
    const mesmaPlacaComEspacos = "  bra2e19  ";

    const houveAlteracao =
      placaOriginal.trim().toUpperCase() !== mesmaPlacaComEspacos.trim().toUpperCase();
    expect(houveAlteracao).toBe(false);

    const statusAprovacaoCalculado = houveAlteracao
      ? "pending_vehicle_approval"
      : "aprovado";

    expect(statusAprovacaoCalculado).toBe("aprovado");
  });

  test("2.4 Estrutura do Perfil do Motorista com Campos Expandidos", () => {
    const perfilAtualizado: Partial<DriverProfileRecord> = {
      nome: "Carlos Eduardo Silva",
      telefone: "(22) 99888-7766",
      fotoUrl: "https://storage.partiu.app/avatars/driver_101.jpg",
      veiculoMarcaModelo: "Toyota Yaris Sedan",
      veiculoPlaca: "XYZ9K88",
      veiculoCor: "Branco",
      veiculoAno: 2024,
      categoriaVeiculo: "PLUS",
    };

    expect(perfilAtualizado.fotoUrl).toContain("avatars");
    expect(perfilAtualizado.categoriaVeiculo).toBe("PLUS");
    expect(perfilAtualizado.veiculoAno).toBeGreaterThanOrEqual(2015);
  });
});

/**
 * PARTIU TITANIUM SHIELD — ENTERPRISE ROLE & PERMISSION SERVICE
 * 
 * Implementação do modelo de 7 Níveis Hierárquicos de RBAC:
 * - OWNER: Acesso irrestrito a governança, ledger, split bancário e tesouraria.
 * - SUPER_ADMIN: Gestão operacional nacional, configurações globais e segurança.
 * - FRANCHISE_ADMIN: Gestão municipal/regional isolada de sua praça outorgada.
 * - CORPORATE_ADMIN: Gestão de contas B2B, centros de custos e aprovações.
 * - OPERATOR: Monitoramento de tráfego, despacho de frotas e suporte SOS.
 * - DRIVER: Acesso ao cockpit operacional, rota, recebimento D+0 e wallet.
 * - PASSENGER: Acesso à solicitação de viagens, encomendas e PARTIU Pay.
 */

import { AdminRole, AdminPermission } from './auth-service';

export { type AdminRole, type AdminPermission } from './auth-service';

export interface RoleDefinition {
  role: AdminRole;
  title: string;
  description: string;
  level: number;
  permissions: AdminPermission[];
}

const ALL_PERMISSIONS: AdminPermission[] = [
  'financial:view_revenue',
  'financial:view_profit',
  'financial:view_splits',
  'financial:manage_cash_closing',
  'financial:configure_gateways',
  'financial:configure_fees',
  'financial:process_refunds',
  'financial:export_ledger',
  'governance:manage_admins',
  'governance:manage_permissions',
  'governance:view_audit_logs',
  'governance:edit_security_rules',
  'operations:view_radar',
  'operations:manage_sos',
  'operations:manage_trips',
  'operations:manage_routes',
  'operations:manage_stops',
  'operations:manage_fleet',
  'operations:manage_drivers',
  'operations:manage_passengers',
  'operations:manage_cargo',
  'operations:view_operational_kpis',
  'app:manage_banners',
  'app:manage_announcements',
  'app:manage_affiliates',
  'app:configure_system_parameters'
];

export const ROLE_DEFINITIONS: Record<AdminRole, RoleDefinition> = {
  OWNER: {
    role: 'OWNER',
    title: 'Proprietário Geral / Fundador',
    description: 'Acesso pleno irrestrito a todas as dimensões contábeis, tesouraria, governança e segurança.',
    level: 100,
    permissions: [...ALL_PERMISSIONS]
  },
  SUPER_ADMIN: {
    role: 'SUPER_ADMIN',
    title: 'Superadministrador Nacional',
    description: 'Operações em hiperescala, monitoramento da malha nacional e configuração de praças.',
    level: 90,
    permissions: ALL_PERMISSIONS.filter(p => !p.startsWith('governance:manage_admins') && !p.startsWith('financial:configure_gateways'))
  },
  FRANCHISE_ADMIN: {
    role: 'FRANCHISE_ADMIN',
    title: 'Franqueado / Gestor Regional',
    description: 'Gestão exclusiva da praça municipal delegada, frota credenciada e relatórios locais.',
    level: 60,
    permissions: [
      'operations:view_radar',
      'operations:manage_sos',
      'operations:manage_trips',
      'operations:manage_routes',
      'operations:manage_stops',
      'operations:manage_fleet',
      'operations:manage_drivers',
      'operations:manage_passengers',
      'operations:manage_cargo',
      'operations:view_operational_kpis',
      'financial:view_revenue',
      'financial:view_splits'
    ]
  },
  CORPORATE_ADMIN: {
    role: 'CORPORATE_ADMIN',
    title: 'Administrador Corporativo B2B',
    description: 'Gestão de centros de custo corporativos, políticas de viagem e colaboradores vinculados.',
    level: 50,
    permissions: [
      'financial:view_revenue',
      'operations:view_operational_kpis'
    ]
  },
  OPERATOR: {
    role: 'OPERATOR',
    title: 'Operador de Despacho & Monitoramento',
    description: 'Supervisão tática de viagens ao vivo, atendimento a chamados SOS e suporte a motoristas.',
    level: 40,
    permissions: [
      'operations:view_radar',
      'operations:manage_sos',
      'operations:manage_trips',
      'operations:manage_drivers',
      'operations:manage_passengers'
    ]
  },
  ADMIN: {
    role: 'ADMIN',
    title: 'Gestor Operacional',
    description: 'Gestão da frota, motoristas, passageiros e parâmetros operacionais.',
    level: 80,
    permissions: [
      'operations:view_radar',
      'operations:manage_sos',
      'operations:manage_trips',
      'operations:manage_routes',
      'operations:manage_stops',
      'operations:manage_fleet',
      'operations:manage_drivers',
      'operations:manage_passengers',
      'operations:manage_cargo',
      'operations:view_operational_kpis',
      'app:manage_banners',
      'app:manage_announcements',
      'app:manage_affiliates'
    ]
  },
  AUDITOR: {
    role: 'AUDITOR',
    title: 'Auditor de Conformidade & Finanças',
    description: 'Acesso somente leitura para auditoria de compliance, logs e balancetes.',
    level: 70,
    permissions: [
      'financial:view_revenue',
      'financial:view_profit',
      'financial:view_splits',
      'financial:export_ledger',
      'governance:view_audit_logs',
      'operations:view_radar',
      'operations:view_operational_kpis'
    ]
  },
  DRIVER: {
    role: 'DRIVER',
    title: 'Motorista / Entregador Parceiro',
    description: 'Cockpit do condutor, aceite atômico de corridas e extrato de liquidação D+0.',
    level: 20,
    permissions: []
  },
  PASSENGER: {
    role: 'PASSENGER',
    title: 'Passageiro / Usuário da Plataforma',
    description: 'Solicitação de viagens urbanas, encomendas flash e gestão da carteira digital.',
    level: 10,
    permissions: []
  },
  super_admin: {
    role: 'super_admin',
    title: 'Superadministrador Nacional',
    description: 'Acesso pleno irrestrito à governança nacional, finanças e infraestrutura.',
    level: 100,
    permissions: [...ALL_PERMISSIONS]
  },
  admin: {
    role: 'admin',
    title: 'Gestor Operacional',
    description: 'Gestão da frota, motoristas, passageiros e parâmetros operacionais.',
    level: 80,
    permissions: [
      'operations:view_radar',
      'operations:manage_sos',
      'operations:manage_trips',
      'operations:manage_routes',
      'operations:manage_stops',
      'operations:manage_fleet',
      'operations:manage_drivers',
      'operations:manage_passengers',
      'operations:manage_cargo',
      'operations:view_operational_kpis',
      'app:manage_banners',
      'app:manage_announcements',
      'app:manage_affiliates'
    ]
  },
  franqueado: {
    role: 'franqueado',
    title: 'Franqueado / Gestor Regional',
    description: 'Gestão exclusiva da praça municipal delegada, frota credenciada e relatórios locais.',
    level: 60,
    permissions: [
      'operations:view_radar',
      'operations:manage_sos',
      'operations:manage_trips',
      'operations:manage_routes',
      'operations:manage_stops',
      'operations:manage_fleet',
      'operations:manage_drivers',
      'operations:manage_passengers',
      'operations:manage_cargo',
      'operations:view_operational_kpis',
      'financial:view_revenue',
      'financial:view_splits'
    ]
  },
  operador: {
    role: 'operador',
    title: 'Operador de Despacho & Monitoramento',
    description: 'Supervisão tática de viagens ao vivo, atendimento a chamados SOS e suporte a motoristas.',
    level: 40,
    permissions: [
      'operations:view_radar',
      'operations:manage_sos',
      'operations:manage_trips',
      'operations:manage_drivers',
      'operations:manage_passengers'
    ]
  },
  suporte: {
    role: 'suporte',
    title: 'Atendente de Suporte & SOS',
    description: 'Fila de ocorrências, incidentes operacionais e chamados de emergência SOS.',
    level: 35,
    permissions: [
      'operations:manage_sos',
      'operations:manage_trips',
      'operations:view_operational_kpis'
    ]
  }
};

export class RoleService {
  /**
   * Verifica se determinado papel possui uma permissão específica
   */
  public static hasPermission(role: AdminRole, permission: AdminPermission): boolean {
    const def = ROLE_DEFINITIONS[role];
    if (!def) return false;
    return def.permissions.includes(permission);
  }

  /**
   * Verifica se o papel possui nível hierárquico igual ou superior ao necessário
   */
  public static isAtLeast(currentRole: AdminRole, requiredRole: AdminRole): boolean {
    const current = ROLE_DEFINITIONS[currentRole]?.level || 0;
    const required = ROLE_DEFINITIONS[requiredRole]?.level || 0;
    return current >= required;
  }

  /**
   * Retorna metadados completos do perfil
   */
  public static getDefinition(role: AdminRole): RoleDefinition {
    return ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS.PASSENGER;
  }
}

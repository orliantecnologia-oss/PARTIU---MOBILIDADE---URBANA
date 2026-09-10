/**
 * UNIVERSITY MOBILITY NETWORK — ORCHESTRATOR ENGINE
 * 
 * Orquestrador central da mobilidade universitária:
 * - Gestão de frotas e vans acadêmicas dedicadas
 * - Integração com carteirinha estudantil digital
 * - Linhas expressas para polos universitários
 * - Cálculo do Student Mobility Index (0–100)
 */

import { studentPassEngine, StudentProfile, StudentPassValidationResult } from './student-pass';
import { campusRoutingEngine, AcademicRoute } from './campus-routing';
import { educationAnalyticsEngine, AcademicMobilityReport } from './education-analytics';

export interface StudentMobilityIndex {
  cityId: string;
  cityName: string;
  score: number; // 0 a 100
  tier: 'EXCELENCIA_ACADEMICA' | 'ALTA_ADESAO' | 'OPERACAO_MODERADA' | 'EM_EXPANSAO';
  breakdown: {
    pontualidadeScore: number; // 0 a 30 (taxa de chegada pontual para aulas)
    ocupacaoScore: number;     // 0 a 25 (eficiência de lotação das vans)
    acessibilidadeScore: number; // 0 a 25 (descontos e cobertura de gratuidades)
    coberturaCampusScore: number; // 0 a 20 (linhas cobrindo todos os campi)
  };
  metrics: {
    totalStudentsActive: number;
    monthlyRides: number;
    onTimeRatePct: number;
    occupancyPct: number;
    avgSavingsPerStudentBrl: number;
  };
  assessedAt: number;
}

export class UniversityEngine {
  public getPassEngine() {
    return studentPassEngine;
  }

  public getRoutingEngine() {
    return campusRoutingEngine;
  }

  public getAnalyticsEngine() {
    return educationAnalyticsEngine;
  }

  /**
   * Calcula o Student Mobility Index (0 a 100) para um polo universitário municipal
   */
  public calculateStudentMobilityIndex(cityId: string, cityName: string): StudentMobilityIndex {
    const report = educationAnalyticsEngine.generateEducationReport(cityId, cityName);
    const routes = campusRoutingEngine.getAcademicRoutes(cityId);

    // 1. Pontualidade (0 a 30) - meta 95%
    const pontualidadeScore = Math.min(30, Number(((report.onTimeArrivalRatePct / 100) * 30).toFixed(1)));

    // 2. Ocupação (0 a 25) - meta 85% a 90%
    const ocupacaoScore = Math.min(25, Number(((report.averageOccupancyRatePct / 100) * 25).toFixed(1)));

    // 3. Acessibilidade Econômica (0 a 25) - proporcional à economia média (base: R$ 200/mês)
    const savingsRatio = Math.min(1.0, report.studentAverageMonthlySavingsBrl / 200.0);
    const acessibilidadeScore = Math.min(25, Number((savingsRatio * 25).toFixed(1)));

    // 4. Cobertura dos Campi (0 a 20)
    const coberturaCampusScore = Math.min(20, routes.length >= 2 ? 20 : 12);

    const totalScore = Number((pontualidadeScore + ocupacaoScore + acessibilidadeScore + coberturaCampusScore).toFixed(1));

    let tier: StudentMobilityIndex['tier'] = 'EM_EXPANSAO';
    if (totalScore >= 90) tier = 'EXCELENCIA_ACADEMICA';
    else if (totalScore >= 75) tier = 'ALTA_ADESAO';
    else if (totalScore >= 60) tier = 'OPERACAO_MODERADA';

    return {
      cityId,
      cityName,
      score: totalScore,
      tier,
      breakdown: {
        pontualidadeScore,
        ocupacaoScore,
        acessibilidadeScore,
        coberturaCampusScore
      },
      metrics: {
        totalStudentsActive: report.totalActiveStudents,
        monthlyRides: report.totalStudentRidesMonth,
        onTimeRatePct: report.onTimeArrivalRatePct,
        occupancyPct: report.averageOccupancyRatePct,
        avgSavingsPerStudentBrl: report.studentAverageMonthlySavingsBrl
      },
      assessedAt: Date.now()
    };
  }

  /**
   * Reserva assento em van acadêmica universitária aplicando benefício estudantil
   */
  public bookAcademicVanRide(params: {
    routeId: string;
    studentId: string;
    scheduleTime: string;
  }): {
    success: boolean;
    bookingId?: string | undefined;
    finalPriceBrl: number;
    subsidizedBrl: number;
    departureTime: string;
    rejectionReason?: string | undefined;
  } {
    const route = campusRoutingEngine.getRoute(params.routeId);
    if (!route) {
      return {
        success: false,
        finalPriceBrl: 0,
        subsidizedBrl: 0,
        departureTime: '',
        rejectionReason: 'Linha acadêmica não localizada.'
      };
    }

    const validation = studentPassEngine.validateStudentPass(params.studentId, route.ticketPriceBrl);
    if (!validation.isValid) {
      return {
        success: false,
        finalPriceBrl: route.ticketPriceBrl,
        subsidizedBrl: 0,
        departureTime: params.scheduleTime,
        rejectionReason: validation.rejectionReason
      };
    }

    const bookingId = `BOOK-ACAD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    return {
      success: true,
      bookingId,
      finalPriceBrl: validation.finalFareBrl,
      subsidizedBrl: validation.subsidizedBrl,
      departureTime: params.scheduleTime
    };
  }
}

export const universityEngine = new UniversityEngine();

/**
 * STUDENT PASS & DIGITAL STUDENT IDENTITY
 * 
 * Gestão de carteirinhas estudantis digitais, validação acadêmica
 * e controle de meia-tarifa / passe livre estudantil universitário.
 */

export interface StudentProfile {
  studentId: string;
  studentName: string;
  cpfMasked: string;
  universityId: string;
  universityName: string;
  campusName: string;
  courseName: string;
  registrationNumber: string; // Matrícula
  academicShift: 'MATUTINO' | 'VESPERTINO' | 'NOTURNO' | 'INTEGRAL';
  status: 'ATIVO' | 'TRANCADO' | 'FORMADO' | 'SUSPENSO';
  cardValidity: string;
  subsidyCategory: 'PASSE_LIVRE_TOTAL' | 'MEIA_TARIFA' | 'CONVENIO_UNIVERSITARIO';
  discountPct: number; // 50% ou 100%
  dailyRideLimit: number;
  ridesUsedToday: number;
  monthlyBalanceCredits: number;
}

export interface StudentPassValidationResult {
  isValid: boolean;
  studentId?: string;
  universityName?: string;
  appliedDiscountPct: number;
  finalFareBrl: number;
  subsidizedBrl: number;
  rejectionReason?: string;
}

export class StudentPassEngine {
  private students: Map<string, StudentProfile> = new Map();

  constructor() {
    this.seedDefaultStudents();
  }

  private seedDefaultStudents(): void {
    const defaultStudents: StudentProfile[] = [
      {
        studentId: 'STU-001',
        studentName: 'Lucas Medeiros Nogueira',
        cpfMasked: '***.554.882-**',
        universityId: 'UNIG-ITAP',
        universityName: 'Universidade Iguaçu (UNIG - Campus V)',
        campusName: 'Campus Itaperuna',
        courseName: 'Medicina',
        registrationNumber: 'MED-2024-0891',
        academicShift: 'INTEGRAL',
        status: 'ATIVO',
        cardValidity: '2026-12-31',
        subsidyCategory: 'CONVENIO_UNIVERSITARIO',
        discountPct: 50.0,
        dailyRideLimit: 4,
        ridesUsedToday: 0,
        monthlyBalanceCredits: 60
      },
      {
        studentId: 'STU-002',
        studentName: 'Beatriz Rezende Rocha',
        cpfMasked: '***.331.442-**',
        universityId: 'REDENTOR-ITAP',
        universityName: 'Centro Universitário Redentor (UniRedentor)',
        campusName: 'Campus Central Itaperuna',
        courseName: 'Engenharia Civil',
        registrationNumber: 'ENG-2023-1102',
        academicShift: 'NOTURNO',
        status: 'ATIVO',
        cardValidity: '2026-12-31',
        subsidyCategory: 'PASSE_LIVRE_TOTAL',
        discountPct: 100.0,
        dailyRideLimit: 2,
        ridesUsedToday: 0,
        monthlyBalanceCredits: 44
      }
    ];

    defaultStudents.forEach(s => this.students.set(s.studentId, s));
  }

  public registerStudent(profile: StudentProfile): void {
    this.students.set(profile.studentId, profile);
  }

  public getStudent(studentId: string): StudentProfile | undefined {
    return this.students.get(studentId);
  }

  public validateStudentPass(studentId: string, baseFareBrl: number): StudentPassValidationResult {
    const student = this.students.get(studentId);
    if (!student) {
      return {
        isValid: false,
        appliedDiscountPct: 0,
        finalFareBrl: baseFareBrl,
        subsidizedBrl: 0,
        rejectionReason: 'Matrícula estudantil não encontrada na base universitária.'
      };
    }

    if (student.status !== 'ATIVO') {
      return {
        isValid: false,
        appliedDiscountPct: 0,
        finalFareBrl: baseFareBrl,
        subsidizedBrl: 0,
        rejectionReason: `Vínculo acadêmico está ${student.status}.`
      };
    }

    if (student.ridesUsedToday >= student.dailyRideLimit) {
      return {
        isValid: false,
        appliedDiscountPct: 0,
        finalFareBrl: baseFareBrl,
        subsidizedBrl: 0,
        rejectionReason: `Limite de viagens diárias excedido (${student.dailyRideLimit}/dia).`
      };
    }

    const discountAmount = Number(((baseFareBrl * student.discountPct) / 100).toFixed(2));
    const finalFare = Number((baseFareBrl - discountAmount).toFixed(2));

    student.ridesUsedToday += 1;
    student.monthlyBalanceCredits = Math.max(0, student.monthlyBalanceCredits - 1);

    return {
      isValid: true,
      studentId: student.studentId,
      universityName: student.universityName,
      appliedDiscountPct: student.discountPct,
      finalFareBrl: finalFare,
      subsidizedBrl: discountAmount
    };
  }
}

export const studentPassEngine = new StudentPassEngine();

/**
 * MEDICAL RIDES & PATIENT MOBILITY
 * 
 * Gestão de viagens médicas especializadas:
 * - Hemodiálise e nefrologia
 * - Tratamento oncológico (quimioterapia / radioterapia)
 * - Alta hospitalar e transferência assistida
 * - Consultas recorrentes e reabilitação fisioterápica
 * - Clínicas parceiras e postos de atendimento
 */

export type MedicalProcedureType =
  | 'HEMODIALISE'
  | 'QUIMIOTERAPIA_RADIOTERAPIA'
  | 'ALTA_HOSPITALAR'
  | 'CONSULTA_ESPECIALIZADA'
  | 'FISIOTERAPIA_REABILITACAO'
  | 'EXAME_COMPLEXO';

export type MedicalRidePriority = 'EMERGENCIA_ASSISTIDA' | 'PRIORITARIA_AGENDADA' | 'ELETIVA_PADRAO';

export interface MedicalRideBooking {
  bookingId: string;
  patientId: string;
  patientName: string;
  procedureType: MedicalProcedureType;
  priority: MedicalRidePriority;
  originAddress: string;
  hospitalOrClinicName: string;
  destinationAddress: string;
  scheduledPickupTime: string;
  estimatedReturnTime?: string;
  companionCount: number;
  requiresWheelchairRamp: boolean;
  requiresStretcher: boolean; // Maca
  requiresOxygenSupport: boolean;
  notesMedicalTeam?: string;
  status: 'AGENDADA' | 'MOTORISTA_A_CAMINHO' | 'EM_DESLOCAMENTO' | 'EM_TRATAMENTO' | 'CONCLUIDA' | 'CANCELADA';
  subsidizedPublicContractId?: string;
  costBrl: number;
}

export class MedicalRidesEngine {
  private bookings: Map<string, MedicalRideBooking> = new Map();

  constructor() {
    this.seedDefaultBookings();
  }

  private seedDefaultBookings(): void {
    const bookings: MedicalRideBooking[] = [
      {
        bookingId: 'MED-ITAP-101',
        patientId: 'PAT-881',
        patientName: 'Geraldo Mendes de Souza',
        procedureType: 'HEMODIALISE',
        priority: 'PRIORITARIA_AGENDADA',
        originAddress: 'Rua General Osório, 142 - Bairro Aeroporto',
        hospitalOrClinicName: 'Clínica Renal do Norte Fluminense / Hospital São José',
        destinationAddress: 'Rua Cel. José Bastos, 550 - Centro',
        scheduledPickupTime: '06:15',
        estimatedReturnTime: '11:45',
        companionCount: 1,
        requiresWheelchairRamp: true,
        requiresStretcher: false,
        requiresOxygenSupport: false,
        status: 'AGENDADA',
        subsidizedPublicContractId: 'CIV-ITAP-002',
        costBrl: 35.0
      },
      {
        bookingId: 'MED-ITAP-102',
        patientId: 'PAT-882',
        patientName: 'Tereza Cristina Ramos',
        procedureType: 'ALTA_HOSPITALAR',
        priority: 'PRIORITARIA_AGENDADA',
        originAddress: 'Hospital São José do Avaí - Portaria Central',
        hospitalOrClinicName: 'Hospital São José do Avaí',
        destinationAddress: 'Rua Rotary, 220 - Cehab',
        scheduledPickupTime: '14:30',
        companionCount: 2,
        requiresWheelchairRamp: true,
        requiresStretcher: false,
        requiresOxygenSupport: false,
        notesMedicalTeam: 'Paciente pós-operatório ortopédico com mobilidade reduzida.',
        status: 'AGENDADA',
        subsidizedPublicContractId: 'CIV-ITAP-002',
        costBrl: 40.0
      }
    ];

    bookings.forEach(b => this.bookings.set(b.bookingId, b));
  }

  public registerBooking(booking: MedicalRideBooking): void {
    this.bookings.set(booking.bookingId, booking);
  }

  public getBooking(bookingId: string): MedicalRideBooking | undefined {
    return this.bookings.get(bookingId);
  }

  public getPatientBookings(patientId: string): MedicalRideBooking[] {
    return Array.from(this.bookings.values()).filter(b => b.patientId === patientId);
  }
}

export const medicalRidesEngine = new MedicalRidesEngine();

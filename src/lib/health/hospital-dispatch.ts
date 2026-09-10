/**
 * HOSPITAL DISPATCH & CLINICAL CONCIERGE
 * 
 * Integração direta com portarias de hospitais, recepções de clínicas
 * e centrais de regulação de transporte de saúde (SUS / convênios privados).
 */

export interface HospitalStation {
  hospitalId: string;
  name: string;
  cityId: string;
  dedicatedPickupGate: string;
  hasStretcherAccess: boolean;
  contactDeskPhone: string;
  activeDispatchesCount: number;
}

export interface HospitalDispatchRequest {
  hospitalId: string;
  patientName: string;
  destinationAddress: string;
  needWheelchair: boolean;
  departmentOrigin: 'PRONTO_SOCORRO' | 'ONCOLOGIA' | 'HEMODIALISE' | 'INTERNACAO_ALTA';
  urgencyLevel: 'IMEDIATO' | 'NORMAL_15_MIN';
}

export interface HospitalDispatchResult {
  dispatchId: string;
  hospitalName: string;
  pickupGate: string;
  assignedDriverId: string;
  driverName: string;
  vehiclePlate: string;
  etaMinutes: number;
  slaTargetMinutes: number;
  isCompliantWithSla: boolean;
}

export class HospitalDispatchEngine {
  private hospitals: Map<string, HospitalStation> = new Map();

  constructor() {
    this.seedDefaultHospitals();
  }

  private seedDefaultHospitals(): void {
    const defaultHospitals: HospitalStation[] = [
      {
        hospitalId: 'HOSP-ITAP-01',
        name: 'Hospital São José do Avaí',
        cityId: 'itaperuna-rj',
        dedicatedPickupGate: 'Portaria 2 - Emergência e Ambulatório Acessível',
        hasStretcherAccess: true,
        contactDeskPhone: '(22) 3824-9200',
        activeDispatchesCount: 4
      },
      {
        hospitalId: 'HOSP-ITAP-02',
        name: 'UPA 24 Horas Itaperuna',
        cityId: 'itaperuna-rj',
        dedicatedPickupGate: 'Baia de Embarque de Pacientes em Alta',
        hasStretcherAccess: true,
        contactDeskPhone: '(22) 3822-1010',
        activeDispatchesCount: 2
      }
    ];

    defaultHospitals.forEach(h => this.hospitals.set(h.hospitalId, h));
  }

  public getHospitalsByCity(cityId: string): HospitalStation[] {
    return Array.from(this.hospitals.values()).filter(h => h.cityId === cityId);
  }

  public requestHospitalDispatch(request: HospitalDispatchRequest): HospitalDispatchResult {
    const hospital = this.hospitals.get(request.hospitalId);
    const hospitalName = hospital ? hospital.name : 'Hospital Municipal';
    const pickupGate = hospital ? hospital.dedicatedPickupGate : 'Portaria Principal';

    const eta = request.urgencyLevel === 'IMEDIATO' ? 4 : 8;
    const slaTarget = request.urgencyLevel === 'IMEDIATO' ? 8 : 15;

    return {
      dispatchId: `DISP-HOSP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      hospitalName,
      pickupGate,
      assignedDriverId: 'DRV-SAUDE-VIP-01',
      driverName: 'Marcos Vinícius Silveira (Capacitado Transporte Saúde)',
      vehiclePlate: 'SAU-9922',
      etaMinutes: eta,
      slaTargetMinutes: slaTarget,
      isCompliantWithSla: eta <= slaTarget
    };
  }
}

export const hospitalDispatchEngine = new HospitalDispatchEngine();

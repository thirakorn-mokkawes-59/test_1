/**
 * dexpi-model.ts
 * 
 * TypeScript implementation of the DEXPI (Data Exchange in the Process Industry) data model
 * for P&ID (Piping and Instrumentation Diagram) elements.
 * 
 * Based on DEXPI Proteus XML schema and RDF/OWL information model.
 * References: ISO 15926, ISO 10628
 */

// ---------- Base Types ----------

/**
 * Unique identifier for all DEXPI elements
 */
export type DexpiId = string;

/**
 * Common properties for all DEXPI elements
 */
export interface DexpiElement {
  id: DexpiId;
  name?: string;
  description?: string;
  tag?: string;
  revision?: string;
  createdBy?: string;
  createdDate?: Date;
  modifiedBy?: string;
  modifiedDate?: Date;
  properties?: DexpiProperty[];
}

/**
 * Generic property for DEXPI elements
 */
export interface DexpiProperty {
  name: string;
  value: string | number | boolean;
  unit?: string;
  source?: string;
}

/**
 * 2D point coordinates
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * Graphical representation properties
 */
export interface GraphicalProperties {
  position?: Point2D;
  rotation?: number;
  scale?: number;
  visible?: boolean;
  zIndex?: number;
  style?: {
    strokeColor?: string;
    strokeWidth?: number;
    fillColor?: string;
    opacity?: number;
  };
}

// ---------- P&ID Document ----------

/**
 * Top-level P&ID document
 */
export interface DexpiDocument extends DexpiElement {
  plantName?: string;
  projectName?: string;
  documentNumber?: string;
  revisionNumber?: string;
  equipment: Equipment[];
  pipingNetworks: PipingNetwork[];
  instruments: Instrument[];
  processConnections: ProcessConnection[];
}

// ---------- Equipment ----------

/**
 * Base equipment interface
 */
export interface Equipment extends DexpiElement, GraphicalProperties {
  type: EquipmentType;
  serviceDescription?: string;
  equipmentClass?: string;
  nozzles: Nozzle[];
  designParameters?: DesignParameter[];
}

/**
 * Equipment types according to DEXPI standard
 */
export enum EquipmentType {
  VESSEL = 'VESSEL',
  COLUMN = 'COLUMN',
  TANK = 'TANK',
  PUMP = 'PUMP',
  COMPRESSOR = 'COMPRESSOR',
  HEAT_EXCHANGER = 'HEAT_EXCHANGER',
  MIXER = 'MIXER',
  REACTOR = 'REACTOR',
  FILTER = 'FILTER',
  FURNACE = 'FURNACE',
  PACKAGE_UNIT = 'PACKAGE_UNIT',
  OTHER = 'OTHER',
}

/**
 * Equipment design parameters
 */
export interface DesignParameter {
  name: string;
  value: string | number;
  unit?: string;
  category?: DesignParameterCategory;
}

/**
 * Categories for design parameters
 */
export enum DesignParameterCategory {
  PROCESS = 'PROCESS',
  MECHANICAL = 'MECHANICAL',
  ELECTRICAL = 'ELECTRICAL',
  CONTROL = 'CONTROL',
  SAFETY = 'SAFETY',
  OTHER = 'OTHER',
}

/**
 * Equipment nozzle (connection point)
 */
export interface Nozzle extends DexpiElement, GraphicalProperties {
  equipmentId: DexpiId;
  nozzleType: NozzleType;
  nominalDiameter?: string;
  nominalPressure?: string;
  orientation?: number; // Angle in degrees
  position: Point2D;
}

/**
 * Nozzle types
 */
export enum NozzleType {
  INLET = 'INLET',
  OUTLET = 'OUTLET',
  VENT = 'VENT',
  DRAIN = 'DRAIN',
  UTILITY = 'UTILITY',
  INSTRUMENT = 'INSTRUMENT',
  MANWAY = 'MANWAY',
  OTHER = 'OTHER',
}

// ---------- Piping Network ----------

/**
 * Piping network (collection of connected pipes)
 */
export interface PipingNetwork extends DexpiElement {
  lines: PipingLine[];
  fittings: PipingFitting[];
  lineSegments: LineSegment[];
}

/**
 * Piping line (logical pipe)
 */
export interface PipingLine extends DexpiElement {
  lineNumber?: string;
  service?: string;
  fluidCode?: string;
  nominalDiameter?: string;
  nominalPressure?: string;
  material?: string;
  insulation?: string;
  segments: DexpiId[]; // References to LineSegment ids
}

/**
 * Physical pipe segment
 */
export interface LineSegment extends DexpiElement, GraphicalProperties {
  startPoint: Point2D;
  endPoint: Point2D;
  lineId: DexpiId;
  startConnectedTo?: DexpiId; // Reference to Nozzle or PipingFitting
  endConnectedTo?: DexpiId; // Reference to Nozzle or PipingFitting
}

/**
 * Piping fitting (valve, elbow, etc.)
 */
export interface PipingFitting extends DexpiElement, GraphicalProperties {
  fittingType: FittingType;
  nominalDiameter?: string;
  nominalPressure?: string;
  material?: string;
  connectionPoints: ConnectionPoint[];
}

/**
 * Connection point for piping fittings
 */
export interface ConnectionPoint extends DexpiElement {
  fittingId: DexpiId;
  position: Point2D;
  orientation?: number; // Angle in degrees
  connectedTo?: DexpiId; // Reference to LineSegment
}

/**
 * Fitting types
 */
export enum FittingType {
  VALVE = 'VALVE',
  CHECK_VALVE = 'CHECK_VALVE',
  CONTROL_VALVE = 'CONTROL_VALVE',
  RELIEF_VALVE = 'RELIEF_VALVE',
  ELBOW = 'ELBOW',
  TEE = 'TEE',
  REDUCER = 'REDUCER',
  FLANGE = 'FLANGE',
  BLIND_FLANGE = 'BLIND_FLANGE',
  SPECTACLE_BLIND = 'SPECTACLE_BLIND',
  STRAINER = 'STRAINER',
  ORIFICE_PLATE = 'ORIFICE_PLATE',
  OTHER = 'OTHER',
}

// ---------- Instrumentation ----------

/**
 * Instrument in the P&ID
 */
export interface Instrument extends DexpiElement, GraphicalProperties {
  instrumentType: InstrumentType;
  tagNumber?: string;
  function?: string;
  loopNumber?: string;
  failureAction?: string;
  connectionPoints: InstrumentConnectionPoint[];
  signalLines: SignalLine[];
}

/**
 * Instrument connection point
 */
export interface InstrumentConnectionPoint extends DexpiElement {
  instrumentId: DexpiId;
  position: Point2D;
  connectionType: InstrumentConnectionType;
  connectedTo?: DexpiId; // Reference to LineSegment or Equipment
}

/**
 * Instrument connection types
 */
export enum InstrumentConnectionType {
  PROCESS = 'PROCESS',
  SIGNAL_INPUT = 'SIGNAL_INPUT',
  SIGNAL_OUTPUT = 'SIGNAL_OUTPUT',
  POWER = 'POWER',
  OTHER = 'OTHER',
}

/**
 * Signal line between instruments
 */
export interface SignalLine extends DexpiElement, GraphicalProperties {
  startPoint: Point2D;
  endPoint: Point2D;
  signalType: SignalType;
  startConnectedTo: DexpiId; // Reference to InstrumentConnectionPoint
  endConnectedTo: DexpiId; // Reference to InstrumentConnectionPoint
}

/**
 * Signal types
 */
export enum SignalType {
  ELECTRICAL = 'ELECTRICAL',
  PNEUMATIC = 'PNEUMATIC',
  HYDRAULIC = 'HYDRAULIC',
  CAPILLARY = 'CAPILLARY',
  ELECTROMAGNETIC = 'ELECTROMAGNETIC',
  DIGITAL_DATA = 'DIGITAL_DATA',
  OTHER = 'OTHER',
}

/**
 * Instrument types
 */
export enum InstrumentType {
  INDICATOR = 'INDICATOR',
  TRANSMITTER = 'TRANSMITTER',
  CONTROLLER = 'CONTROLLER',
  SWITCH = 'SWITCH',
  GAUGE = 'GAUGE',
  ANALYZER = 'ANALYZER',
  SENSOR = 'SENSOR',
  CONTROL_VALVE = 'CONTROL_VALVE',
  SOLENOID_VALVE = 'SOLENOID_VALVE',
  LOGIC_ELEMENT = 'LOGIC_ELEMENT',
  OTHER = 'OTHER',
}

// ---------- Process Connections ----------

/**
 * Process connection between equipment
 */
export interface ProcessConnection extends DexpiElement {
  sourceId: DexpiId; // Reference to Equipment or PipingFitting
  targetId: DexpiId; // Reference to Equipment or PipingFitting
  connectionType: ProcessConnectionType;
  properties?: DexpiProperty[];
}

/**
 * Process connection types
 */
export enum ProcessConnectionType {
  MATERIAL_FLOW = 'MATERIAL_FLOW',
  ENERGY_FLOW = 'ENERGY_FLOW',
  INFORMATION_FLOW = 'INFORMATION_FLOW',
  OTHER = 'OTHER',
}

// ---------- Utility Functions ----------

/**
 * Creates a new unique DEXPI ID
 */
export function createDexpiId(): DexpiId {
  return `dexpi-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Creates a new empty DEXPI document
 */
export function createEmptyDocument(name: string): DexpiDocument {
  return {
    id: createDexpiId(),
    name,
    equipment: [],
    pipingNetworks: [],
    instruments: [],
    processConnections: [],
    createdDate: new Date(),
  };
}

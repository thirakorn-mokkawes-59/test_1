/**
 * xml-serializer.ts
 * 
 * Utility for serializing/deserializing between the DEXPI data model and XML format
 * that complies with the DEXPI Proteus XML schema.
 */

import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { 
  DexpiDocument, 
  DexpiElement,
  Equipment, 
  PipingNetwork,
  Instrument,
  ProcessConnection,
  Point2D,
  DexpiProperty,
  Nozzle,
  PipingLine,
  LineSegment,
  PipingFitting,
  SignalLine,
  createDexpiId
} from './dexpi-model';

// DEXPI XML namespaces
const NAMESPACES = {
  dexpi: 'http://www.dexpi.org/proteus/1.0',
  xsi: 'http://www.w3.org/2001/XMLSchema-instance',
  gml: 'http://www.opengis.net/gml/3.2',
};

/**
 * Serializes a DEXPI document to XML string
 * @param document The DEXPI document to serialize
 * @returns XML string representation of the document
 */
export function serializeToDexpiXml(document: DexpiDocument): string {
  try {
    // Create XML document
    const xmlDoc = new DOMParser().parseFromString('<?xml version="1.0" encoding="UTF-8"?><dexpi:PlantModel xmlns:dexpi="http://www.dexpi.org/proteus/1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:gml="http://www.opengis.net/gml/3.2" xsi:schemaLocation="http://www.dexpi.org/proteus/1.0 http://www.dexpi.org/proteus/1.0/DEXPI.xsd"></dexpi:PlantModel>', 'application/xml');
    
    // Get root element
    const rootElement = xmlDoc.documentElement;
    
    // Add document metadata
    addElementWithText(xmlDoc, rootElement, 'dexpi:Name', document.name || '');
    if (document.description) {
      addElementWithText(xmlDoc, rootElement, 'dexpi:Description', document.description);
    }
    if (document.documentNumber) {
      addElementWithText(xmlDoc, rootElement, 'dexpi:DocumentNumber', document.documentNumber);
    }
    if (document.revisionNumber) {
      addElementWithText(xmlDoc, rootElement, 'dexpi:RevisionNumber', document.revisionNumber);
    }
    if (document.plantName) {
      addElementWithText(xmlDoc, rootElement, 'dexpi:PlantName', document.plantName);
    }
    if (document.projectName) {
      addElementWithText(xmlDoc, rootElement, 'dexpi:ProjectName', document.projectName);
    }
    
    // Add creation info
    const creationInfoElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:CreationInfo');
    if (document.createdBy) {
      addElementWithText(xmlDoc, creationInfoElement, 'dexpi:Author', document.createdBy);
    }
    if (document.createdDate) {
      addElementWithText(xmlDoc, creationInfoElement, 'dexpi:CreationDate', document.createdDate.toISOString());
    }
    if (document.modifiedBy) {
      addElementWithText(xmlDoc, creationInfoElement, 'dexpi:LastModifiedBy', document.modifiedBy);
    }
    if (document.modifiedDate) {
      addElementWithText(xmlDoc, creationInfoElement, 'dexpi:LastModifiedDate', document.modifiedDate.toISOString());
    }
    rootElement.appendChild(creationInfoElement);
    
    // Add properties if any
    if (document.properties && document.properties.length > 0) {
      const propertiesElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:Properties');
      document.properties.forEach(property => {
        appendPropertyElement(xmlDoc, propertiesElement, property);
      });
      rootElement.appendChild(propertiesElement);
    }
    
    // Add equipment collection
    if (document.equipment && document.equipment.length > 0) {
      const equipmentCollectionElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:EquipmentCollection');
      document.equipment.forEach(equipment => {
        appendEquipmentElement(xmlDoc, equipmentCollectionElement, equipment);
      });
      rootElement.appendChild(equipmentCollectionElement);
    }
    
    // Add piping networks
    if (document.pipingNetworks && document.pipingNetworks.length > 0) {
      const pipingNetworkCollectionElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:PipingNetworkCollection');
      document.pipingNetworks.forEach(network => {
        appendPipingNetworkElement(xmlDoc, pipingNetworkCollectionElement, network);
      });
      rootElement.appendChild(pipingNetworkCollectionElement);
    }
    
    // Add instruments
    if (document.instruments && document.instruments.length > 0) {
      const instrumentCollectionElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:InstrumentCollection');
      document.instruments.forEach(instrument => {
        appendInstrumentElement(xmlDoc, instrumentCollectionElement, instrument);
      });
      rootElement.appendChild(instrumentCollectionElement);
    }
    
    // Add process connections
    if (document.processConnections && document.processConnections.length > 0) {
      const connectionCollectionElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:ProcessConnectionCollection');
      document.processConnections.forEach(connection => {
        appendProcessConnectionElement(xmlDoc, connectionCollectionElement, connection);
      });
      rootElement.appendChild(connectionCollectionElement);
    }
    
    // Serialize to string
    return new XMLSerializer().serializeToString(xmlDoc);
  } catch (error) {
    console.error('Error serializing DEXPI document to XML:', error);
    throw new Error(`Failed to serialize DEXPI document: ${error.message}`);
  }
}

/**
 * Parses DEXPI XML string into a DEXPI document
 * @param xmlString The XML string to parse
 * @returns Parsed DEXPI document
 */
export function parseFromDexpiXml(xmlString: string): DexpiDocument {
  try {
    const xmlDoc = new DOMParser().parseFromString(xmlString, 'application/xml');
    
    // Check for parsing errors
    const parseErrors = xmlDoc.getElementsByTagName('parsererror');
    if (parseErrors.length > 0) {
      throw new Error(`XML parsing error: ${parseErrors[0].textContent}`);
    }
    
    // Create empty document
    const document: DexpiDocument = {
      id: getElementTextContent(xmlDoc, 'dexpi:Id') || createDexpiId(),
      name: getElementTextContent(xmlDoc, 'dexpi:Name') || '',
      description: getElementTextContent(xmlDoc, 'dexpi:Description'),
      documentNumber: getElementTextContent(xmlDoc, 'dexpi:DocumentNumber'),
      revisionNumber: getElementTextContent(xmlDoc, 'dexpi:RevisionNumber'),
      plantName: getElementTextContent(xmlDoc, 'dexpi:PlantName'),
      projectName: getElementTextContent(xmlDoc, 'dexpi:ProjectName'),
      equipment: [],
      pipingNetworks: [],
      instruments: [],
      processConnections: []
    };
    
    // Parse creation info
    const creationInfoElement = xmlDoc.getElementsByTagNameNS(NAMESPACES.dexpi, 'CreationInfo')[0];
    if (creationInfoElement) {
      document.createdBy = getElementTextContent(creationInfoElement, 'dexpi:Author');
      const creationDateStr = getElementTextContent(creationInfoElement, 'dexpi:CreationDate');
      if (creationDateStr) {
        document.createdDate = new Date(creationDateStr);
      }
      document.modifiedBy = getElementTextContent(creationInfoElement, 'dexpi:LastModifiedBy');
      const modifiedDateStr = getElementTextContent(creationInfoElement, 'dexpi:LastModifiedDate');
      if (modifiedDateStr) {
        document.modifiedDate = new Date(modifiedDateStr);
      }
    }
    
    // Parse properties
    document.properties = parseProperties(xmlDoc.documentElement);
    
    // Parse equipment
    const equipmentCollectionElement = xmlDoc.getElementsByTagNameNS(NAMESPACES.dexpi, 'EquipmentCollection')[0];
    if (equipmentCollectionElement) {
      const equipmentElements = equipmentCollectionElement.getElementsByTagNameNS(NAMESPACES.dexpi, 'Equipment');
      for (let i = 0; i < equipmentElements.length; i++) {
        document.equipment.push(parseEquipment(equipmentElements[i]));
      }
    }
    
    // Parse piping networks
    const pipingNetworkCollectionElement = xmlDoc.getElementsByTagNameNS(NAMESPACES.dexpi, 'PipingNetworkCollection')[0];
    if (pipingNetworkCollectionElement) {
      const networkElements = pipingNetworkCollectionElement.getElementsByTagNameNS(NAMESPACES.dexpi, 'PipingNetwork');
      for (let i = 0; i < networkElements.length; i++) {
        document.pipingNetworks.push(parsePipingNetwork(networkElements[i]));
      }
    }
    
    // Parse instruments
    const instrumentCollectionElement = xmlDoc.getElementsByTagNameNS(NAMESPACES.dexpi, 'InstrumentCollection')[0];
    if (instrumentCollectionElement) {
      const instrumentElements = instrumentCollectionElement.getElementsByTagNameNS(NAMESPACES.dexpi, 'Instrument');
      for (let i = 0; i < instrumentElements.length; i++) {
        document.instruments.push(parseInstrument(instrumentElements[i]));
      }
    }
    
    // Parse process connections
    const connectionCollectionElement = xmlDoc.getElementsByTagNameNS(NAMESPACES.dexpi, 'ProcessConnectionCollection')[0];
    if (connectionCollectionElement) {
      const connectionElements = connectionCollectionElement.getElementsByTagNameNS(NAMESPACES.dexpi, 'ProcessConnection');
      for (let i = 0; i < connectionElements.length; i++) {
        document.processConnections.push(parseProcessConnection(connectionElements[i]));
      }
    }
    
    return document;
  } catch (error) {
    console.error('Error parsing DEXPI XML:', error);
    throw new Error(`Failed to parse DEXPI XML: ${error.message}`);
  }
}

/**
 * Converts a DEXPI document to SVG string
 * @param document The DEXPI document to convert
 * @returns SVG string representation of the document
 */
export function convertToSvg(document: DexpiDocument): string {
  try {
    // Create SVG document
    const svgDoc = new DOMParser().parseFromString(
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="1000" height="800" viewBox="0 0 1000 800">' +
      '<title>' + (document.name || 'P&ID Diagram') + '</title>' +
      '<desc>' + (document.description || 'Generated from DEXPI model') + '</desc>' +
      '<defs></defs>' +
      '<g id="main-layer"></g>' +
      '</svg>',
      'application/xml'
    );
    
    const mainLayer = svgDoc.getElementById('main-layer');
    
    // Add metadata as custom data attributes
    const svgElement = svgDoc.documentElement;
    svgElement.setAttribute('data-dexpi-id', document.id);
    if (document.documentNumber) {
      svgElement.setAttribute('data-document-number', document.documentNumber);
    }
    if (document.revisionNumber) {
      svgElement.setAttribute('data-revision', document.revisionNumber);
    }
    
    // Render piping networks (lines first as background)
    document.pipingNetworks.forEach(network => {
      const networkGroup = svgDoc.createElement('g');
      networkGroup.setAttribute('id', `network-${network.id}`);
      networkGroup.setAttribute('class', 'piping-network');
      
      // Render line segments
      network.lineSegments.forEach(segment => {
        const line = svgDoc.createElement('line');
        line.setAttribute('id', `segment-${segment.id}`);
        line.setAttribute('x1', segment.startPoint.x.toString());
        line.setAttribute('y1', segment.startPoint.y.toString());
        line.setAttribute('x2', segment.endPoint.x.toString());
        line.setAttribute('y2', segment.endPoint.y.toString());
        line.setAttribute('stroke', segment.style?.strokeColor || '#000000');
        line.setAttribute('stroke-width', (segment.style?.strokeWidth || 2).toString());
        
        // Add data attributes for DEXPI metadata
        line.setAttribute('data-dexpi-id', segment.id);
        if (segment.lineId) {
          line.setAttribute('data-line-id', segment.lineId);
        }
        
        networkGroup.appendChild(line);
      });
      
      // Render fittings
      network.fittings.forEach(fitting => {
        const fittingGroup = renderFittingToSvg(svgDoc, fitting);
        networkGroup.appendChild(fittingGroup);
      });
      
      mainLayer.appendChild(networkGroup);
    });
    
    // Render equipment
    document.equipment.forEach(equipment => {
      const equipmentGroup = renderEquipmentToSvg(svgDoc, equipment);
      mainLayer.appendChild(equipmentGroup);
    });
    
    // Render instruments
    document.instruments.forEach(instrument => {
      const instrumentGroup = renderInstrumentToSvg(svgDoc, instrument);
      mainLayer.appendChild(instrumentGroup);
    });
    
    // Render signal lines
    document.instruments.forEach(instrument => {
      if (instrument.signalLines) {
        instrument.signalLines.forEach(signalLine => {
          const line = svgDoc.createElement('line');
          line.setAttribute('id', `signal-${signalLine.id}`);
          line.setAttribute('x1', signalLine.startPoint.x.toString());
          line.setAttribute('y1', signalLine.startPoint.y.toString());
          line.setAttribute('x2', signalLine.endPoint.x.toString());
          line.setAttribute('y2', signalLine.endPoint.y.toString());
          line.setAttribute('stroke', signalLine.style?.strokeColor || '#0000FF');
          line.setAttribute('stroke-width', (signalLine.style?.strokeWidth || 1).toString());
          line.setAttribute('stroke-dasharray', '5,3');
          
          // Add data attributes for DEXPI metadata
          line.setAttribute('data-dexpi-id', signalLine.id);
          line.setAttribute('data-signal-type', signalLine.signalType);
          
          mainLayer.appendChild(line);
        });
      }
    });
    
    // Serialize to string
    return new XMLSerializer().serializeToString(svgDoc);
  } catch (error) {
    console.error('Error converting DEXPI document to SVG:', error);
    throw new Error(`Failed to convert DEXPI document to SVG: ${error.message}`);
  }
}

// ==================== Helper Functions ====================

/**
 * Creates an element with text content and appends it to the parent
 */
function addElementWithText(xmlDoc: Document, parent: Element, tagName: string, text: string): Element {
  const element = xmlDoc.createElementNS(NAMESPACES.dexpi, tagName);
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

/**
 * Gets text content of an element by tag name
 */
function getElementTextContent(parent: Element | Document, tagName: string): string | undefined {
  const elements = parent.getElementsByTagNameNS(NAMESPACES.dexpi, tagName.replace('dexpi:', ''));
  if (elements.length > 0) {
    return elements[0].textContent || undefined;
  }
  return undefined;
}

/**
 * Appends a property element to the parent
 */
function appendPropertyElement(xmlDoc: Document, parent: Element, property: DexpiProperty): void {
  const propertyElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:Property');
  
  addElementWithText(xmlDoc, propertyElement, 'dexpi:Name', property.name);
  
  // Handle different value types
  const valueElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:Value');
  if (typeof property.value === 'string') {
    valueElement.textContent = property.value;
  } else if (typeof property.value === 'number') {
    valueElement.textContent = property.value.toString();
  } else if (typeof property.value === 'boolean') {
    valueElement.textContent = property.value ? 'true' : 'false';
  }
  propertyElement.appendChild(valueElement);
  
  if (property.unit) {
    addElementWithText(xmlDoc, propertyElement, 'dexpi:Unit', property.unit);
  }
  
  if (property.source) {
    addElementWithText(xmlDoc, propertyElement, 'dexpi:Source', property.source);
  }
  
  parent.appendChild(propertyElement);
}

/**
 * Parses properties from an element
 */
function parseProperties(element: Element): DexpiProperty[] | undefined {
  const propertiesElement = element.getElementsByTagNameNS(NAMESPACES.dexpi, 'Properties')[0];
  if (!propertiesElement) {
    return undefined;
  }
  
  const properties: DexpiProperty[] = [];
  const propertyElements = propertiesElement.getElementsByTagNameNS(NAMESPACES.dexpi, 'Property');
  
  for (let i = 0; i < propertyElements.length; i++) {
    const propertyElement = propertyElements[i];
    const name = getElementTextContent(propertyElement, 'dexpi:Name');
    const valueStr = getElementTextContent(propertyElement, 'dexpi:Value');
    const unit = getElementTextContent(propertyElement, 'dexpi:Unit');
    const source = getElementTextContent(propertyElement, 'dexpi:Source');
    
    if (name && valueStr !== undefined) {
      // Try to parse value as number or boolean if possible
      let value: string | number | boolean = valueStr;
      if (valueStr.toLowerCase() === 'true') {
        value = true;
      } else if (valueStr.toLowerCase() === 'false') {
        value = false;
      } else if (!isNaN(Number(valueStr))) {
        value = Number(valueStr);
      }
      
      properties.push({
        name,
        value,
        unit,
        source
      });
    }
  }
  
  return properties.length > 0 ? properties : undefined;
}

/**
 * Appends position element to parent
 */
function appendPositionElement(xmlDoc: Document, parent: Element, position: Point2D): void {
  const positionElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:Position');
  const pointElement = xmlDoc.createElementNS(NAMESPACES.gml, 'gml:Point');
  const posElement = xmlDoc.createElementNS(NAMESPACES.gml, 'gml:pos');
  
  posElement.textContent = `${position.x} ${position.y}`;
  pointElement.appendChild(posElement);
  positionElement.appendChild(pointElement);
  parent.appendChild(positionElement);
}

/**
 * Parses position from an element
 */
function parsePosition(element: Element): Point2D | undefined {
  const positionElement = element.getElementsByTagNameNS(NAMESPACES.dexpi, 'Position')[0];
  if (!positionElement) {
    return undefined;
  }
  
  const posElement = positionElement.getElementsByTagNameNS(NAMESPACES.gml, 'pos')[0];
  if (!posElement || !posElement.textContent) {
    return undefined;
  }
  
  const coords = posElement.textContent.trim().split(/\s+/);
  if (coords.length >= 2) {
    return {
      x: parseFloat(coords[0]),
      y: parseFloat(coords[1])
    };
  }
  
  return undefined;
}

/**
 * Appends common element attributes
 */
function appendCommonAttributes(xmlDoc: Document, element: Element, dexpiElement: DexpiElement): void {
  addElementWithText(xmlDoc, element, 'dexpi:Id', dexpiElement.id);
  
  if (dexpiElement.name) {
    addElementWithText(xmlDoc, element, 'dexpi:Name', dexpiElement.name);
  }
  
  if (dexpiElement.description) {
    addElementWithText(xmlDoc, element, 'dexpi:Description', dexpiElement.description);
  }
  
  if (dexpiElement.tag) {
    addElementWithText(xmlDoc, element, 'dexpi:Tag', dexpiElement.tag);
  }
  
  if (dexpiElement.properties && dexpiElement.properties.length > 0) {
    const propertiesElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:Properties');
    dexpiElement.properties.forEach(property => {
      appendPropertyElement(xmlDoc, propertiesElement, property);
    });
    element.appendChild(propertiesElement);
  }
}

/**
 * Appends equipment element to parent
 */
function appendEquipmentElement(xmlDoc: Document, parent: Element, equipment: Equipment): void {
  const equipmentElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:Equipment');
  
  // Add common attributes
  appendCommonAttributes(xmlDoc, equipmentElement, equipment);
  
  // Add equipment-specific attributes
  addElementWithText(xmlDoc, equipmentElement, 'dexpi:EquipmentType', equipment.type);
  
  if (equipment.serviceDescription) {
    addElementWithText(xmlDoc, equipmentElement, 'dexpi:ServiceDescription', equipment.serviceDescription);
  }
  
  if (equipment.equipmentClass) {
    addElementWithText(xmlDoc, equipmentElement, 'dexpi:EquipmentClass', equipment.equipmentClass);
  }
  
  // Add position if available
  if (equipment.position) {
    appendPositionElement(xmlDoc, equipmentElement, equipment.position);
  }
  
  // Add rotation if available
  if (equipment.rotation !== undefined) {
    addElementWithText(xmlDoc, equipmentElement, 'dexpi:Rotation', equipment.rotation.toString());
  }
  
  // Add nozzles
  if (equipment.nozzles && equipment.nozzles.length > 0) {
    const nozzlesElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:Nozzles');
    equipment.nozzles.forEach(nozzle => {
      appendNozzleElement(xmlDoc, nozzlesElement, nozzle);
    });
    equipmentElement.appendChild(nozzlesElement);
  }
  
  parent.appendChild(equipmentElement);
}

/**
 * Appends nozzle element to parent
 */
function appendNozzleElement(xmlDoc: Document, parent: Element, nozzle: Nozzle): void {
  const nozzleElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:Nozzle');
  
  // Add common attributes
  appendCommonAttributes(xmlDoc, nozzleElement, nozzle);
  
  // Add nozzle-specific attributes
  addElementWithText(xmlDoc, nozzleElement, 'dexpi:NozzleType', nozzle.nozzleType);
  
  if (nozzle.nominalDiameter) {
    addElementWithText(xmlDoc, nozzleElement, 'dexpi:NominalDiameter', nozzle.nominalDiameter);
  }
  
  if (nozzle.nominalPressure) {
    addElementWithText(xmlDoc, nozzleElement, 'dexpi:NominalPressure', nozzle.nominalPressure);
  }
  
  // Add position
  appendPositionElement(xmlDoc, nozzleElement, nozzle.position);
  
  // Add orientation if available
  if (nozzle.orientation !== undefined) {
    addElementWithText(xmlDoc, nozzleElement, 'dexpi:Orientation', nozzle.orientation.toString());
  }
  
  parent.appendChild(nozzleElement);
}

/**
 * Parses equipment from an element
 */
function parseEquipment(element: Element): Equipment {
  const id = getElementTextContent(element, 'dexpi:Id') || createDexpiId();
  const name = getElementTextContent(element, 'dexpi:Name');
  const description = getElementTextContent(element, 'dexpi:Description');
  const tag = getElementTextContent(element, 'dexpi:Tag');
  const type = getElementTextContent(element, 'dexpi:EquipmentType') as any;
  const serviceDescription = getElementTextContent(element, 'dexpi:ServiceDescription');
  const equipmentClass = getElementTextContent(element, 'dexpi:EquipmentClass');
  const rotationStr = getElementTextContent(element, 'dexpi:Rotation');
  const rotation = rotationStr ? parseFloat(rotationStr) : undefined;
  const position = parsePosition(element);
  const properties = parseProperties(element);
  
  // Parse nozzles
  const nozzles: Nozzle[] = [];
  const nozzlesElement = element.getElementsByTagNameNS(NAMESPACES.dexpi, 'Nozzles')[0];
  if (nozzlesElement) {
    const nozzleElements = nozzlesElement.getElementsByTagNameNS(NAMESPACES.dexpi, 'Nozzle');
    for (let i = 0; i < nozzleElements.length; i++) {
      nozzles.push(parseNozzle(nozzleElements[i], id));
    }
  }
  
  return {
    id,
    name,
    description,
    tag,
    type,
    serviceDescription,
    equipmentClass,
    rotation,
    position,
    properties,
    nozzles
  };
}

/**
 * Parses nozzle from an element
 */
function parseNozzle(element: Element, equipmentId: string): Nozzle {
  const id = getElementTextContent(element, 'dexpi:Id') || createDexpiId();
  const name = getElementTextContent(element, 'dexpi:Name');
  const description = getElementTextContent(element, 'dexpi:Description');
  const tag = getElementTextContent(element, 'dexpi:Tag');
  const nozzleType = getElementTextContent(element, 'dexpi:NozzleType') as any;
  const nominalDiameter = getElementTextContent(element, 'dexpi:NominalDiameter');
  const nominalPressure = getElementTextContent(element, 'dexpi:NominalPressure');
  const orientationStr = getElementTextContent(element, 'dexpi:Orientation');
  const orientation = orientationStr ? parseFloat(orientationStr) : undefined;
  const position = parsePosition(element) || { x: 0, y: 0 };
  const properties = parseProperties(element);
  
  return {
    id,
    name,
    description,
    tag,
    equipmentId,
    nozzleType,
    nominalDiameter,
    nominalPressure,
    orientation,
    position,
    properties
  };
}

/**
 * Appends piping network element to parent
 */
function appendPipingNetworkElement(xmlDoc: Document, parent: Element, network: PipingNetwork): void {
  const networkElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:PipingNetwork');
  
  // Add common attributes
  appendCommonAttributes(xmlDoc, networkElement, network);
  
  // Add piping lines
  if (network.lines && network.lines.length > 0) {
    const linesElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:PipingLines');
    network.lines.forEach(line => {
      appendPipingLineElement(xmlDoc, linesElement, line);
    });
    networkElement.appendChild(linesElement);
  }
  
  // Add fittings
  if (network.fittings && network.fittings.length > 0) {
    const fittingsElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:PipingFittings');
    network.fittings.forEach(fitting => {
      appendPipingFittingElement(xmlDoc, fittingsElement, fitting);
    });
    networkElement.appendChild(fittingsElement);
  }
  
  // Add line segments
  if (network.lineSegments && network.lineSegments.length > 0) {
    const segmentsElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:LineSegments');
    network.lineSegments.forEach(segment => {
      appendLineSegmentElement(xmlDoc, segmentsElement, segment);
    });
    networkElement.appendChild(segmentsElement);
  }
  
  parent.appendChild(networkElement);
}

/**
 * Appends piping line element to parent
 */
function appendPipingLineElement(xmlDoc: Document, parent: Element, line: PipingLine): void {
  const lineElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:PipingLine');
  
  // Add common attributes
  appendCommonAttributes(xmlDoc, lineElement, line);
  
  // Add line-specific attributes
  if (line.lineNumber) {
    addElementWithText(xmlDoc, lineElement, 'dexpi:LineNumber', line.lineNumber);
  }
  
  if (line.service) {
    addElementWithText(xmlDoc, lineElement, 'dexpi:Service', line.service);
  }
  
  if (line.fluidCode) {
    addElementWithText(xmlDoc, lineElement, 'dexpi:FluidCode', line.fluidCode);
  }
  
  if (line.nominalDiameter) {
    addElementWithText(xmlDoc, lineElement, 'dexpi:NominalDiameter', line.nominalDiameter);
  }
  
  if (line.nominalPressure) {
    addElementWithText(xmlDoc, lineElement, 'dexpi:NominalPressure', line.nominalPressure);
  }
  
  if (line.material) {
    addElementWithText(xmlDoc, lineElement, 'dexpi:Material', line.material);
  }
  
  if (line.insulation) {
    addElementWithText(xmlDoc, lineElement, 'dexpi:Insulation', line.insulation);
  }
  
  // Add segment references
  if (line.segments && line.segments.length > 0) {
    const segmentsElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:SegmentReferences');
    line.segments.forEach(segmentId => {
      const refElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:SegmentReference');
      refElement.textContent = segmentId;
      segmentsElement.appendChild(refElement);
    });
    lineElement.appendChild(segmentsElement);
  }
  
  parent.appendChild(lineElement);
}

/**
 * Appends line segment element to parent
 */
function appendLineSegmentElement(xmlDoc: Document, parent: Element, segment: LineSegment): void {
  const segmentElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:LineSegment');
  
  // Add common attributes
  appendCommonAttributes(xmlDoc, segmentElement, segment);
  
  // Add segment-specific attributes
  addElementWithText(xmlDoc, segmentElement, 'dexpi:LineId', segment.lineId);
  
  // Add start point
  const startPointElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:StartPoint');
  const startGmlPoint = xmlDoc.createElementNS(NAMESPACES.gml, 'gml:Point');
  const startPosElement = xmlDoc.createElementNS(NAMESPACES.gml, 'gml:pos');
  startPosElement.textContent = `${segment.startPoint.x} ${segment.startPoint.y}`;
  startGmlPoint.appendChild(startPosElement);
  startPointElement.appendChild(startGmlPoint);
  segmentElement.appendChild(startPointElement);
  
  // Add end point
  const endPointElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:EndPoint');
  const endGmlPoint = xmlDoc.createElementNS(NAMESPACES.gml, 'gml:Point');
  const endPosElement = xmlDoc.createElementNS(NAMESPACES.gml, 'gml:pos');
  endPosElement.textContent = `${segment.endPoint.x} ${segment.endPoint.y}`;
  endGmlPoint.appendChild(endPosElement);
  endPointElement.appendChild(endGmlPoint);
  segmentElement.appendChild(endPointElement);
  
  // Add connections
  if (segment.startConnectedTo) {
    addElementWithText(xmlDoc, segmentElement, 'dexpi:StartConnectedTo', segment.startConnectedTo);
  }
  
  if (segment.endConnectedTo) {
    addElementWithText(xmlDoc, segmentElement, 'dexpi:EndConnectedTo', segment.endConnectedTo);
  }
  
  parent.appendChild(segmentElement);
}

/**
 * Appends piping fitting element to parent
 */
function appendPipingFittingElement(xmlDoc: Document, parent: Element, fitting: PipingFitting): void {
  const fittingElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:PipingFitting');
  
  // Add common attributes
  appendCommonAttributes(xmlDoc, fittingElement, fitting);
  
  // Add fitting-specific attributes
  addElementWithText(xmlDoc, fittingElement, 'dexpi:FittingType', fitting.fittingType);
  
  if (fitting.nominalDiameter) {
    addElementWithText(xmlDoc, fittingElement, 'dexpi:NominalDiameter', fitting.nominalDiameter);
  }
  
  if (fitting.nominalPressure) {
    addElementWithText(xmlDoc, fittingElement, 'dexpi:NominalPressure', fitting.nominalPressure);
  }
  
  if (fitting.material) {
    addElementWithText(xmlDoc, fittingElement, 'dexpi:Material', fitting.material);
  }
  
  // Add position if available
  if (fitting.position) {
    appendPositionElement(xmlDoc, fittingElement, fitting.position);
  }
  
  // Add rotation if available
  if (fitting.rotation !== undefined) {
    addElementWithText(xmlDoc, fittingElement, 'dexpi:Rotation', fitting.rotation.toString());
  }
  
  // Add connection points
  if (fitting.connectionPoints && fitting.connectionPoints.length > 0) {
    const connectionsElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:ConnectionPoints');
    fitting.connectionPoints.forEach(point => {
      const pointElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:ConnectionPoint');
      
      addElementWithText(xmlDoc, pointElement, 'dexpi:Id', point.id);
      
      if (point.name) {
        addElementWithText(xmlDoc, pointElement, 'dexpi:Name', point.name);
      }
      
      appendPositionElement(xmlDoc, pointElement, point.position);
      
      if (point.orientation !== undefined) {
        addElementWithText(xmlDoc, pointElement, 'dexpi:Orientation', point.orientation.toString());
      }
      
      if (point.connectedTo) {
        addElementWithText(xmlDoc, pointElement, 'dexpi:ConnectedTo', point.connectedTo);
      }
      
      connectionsElement.appendChild(pointElement);
    });
    fittingElement.appendChild(connectionsElement);
  }
  
  parent.appendChild(fittingElement);
}

/**
 * Parses piping network from an element
 */
function parsePipingNetwork(element: Element): PipingNetwork {
  const id = getElementTextContent(element, 'dexpi:Id') || createDexpiId();
  const name = getElementTextContent(element, 'dexpi:Name');
  const description = getElementTextContent(element, 'dexpi:Description');
  const tag = getElementTextContent(element, 'dexpi:Tag');
  const properties = parseProperties(element);
  
  const lines: PipingLine[] = [];
  const fittings: PipingFitting[] = [];
  const lineSegments: LineSegment[] = [];
  
  // Parse piping lines
  const linesElement = element.getElementsByTagNameNS(NAMESPACES.dexpi, 'PipingLines')[0];
  if (linesElement) {
    const lineElements = linesElement.getElementsByTagNameNS(NAMESPACES.dexpi, 'PipingLine');
    for (let i = 0; i < lineElements.length; i++) {
      lines.push(parsePipingLine(lineElements[i]));
    }
  }
  
  // Parse fittings
  const fittingsElement = element.getElementsByTagNameNS(NAMESPACES.dexpi, 'PipingFittings')[0];
  if (fittingsElement) {
    const fittingElements = fittingsElement.getElementsByTagNameNS(NAMESPACES.dexpi, 'PipingFitting');
    for (let i = 0; i < fittingElements.length; i++) {
      fittings.push(parsePipingFitting(fittingElements[i]));
    }
  }
  
  // Parse line segments
  const segmentsElement = element.getElementsByTagNameNS(NAMESPACES.dexpi, 'LineSegments')[0];
  if (segmentsElement) {
    const segmentElements = segmentsElement.getElementsByTagNameNS(NAMESPACES.dexpi, 'LineSegment');
    for (let i = 0; i < segmentElements.length; i++) {
      lineSegments.push(parseLineSegment(segmentElements[i]));
    }
  }
  
  return {
    id,
    name,
    description,
    tag,
    properties,
    lines,
    fittings,
    lineSegments
  };
}

/**
 * Parses piping line from an element
 */
function parsePipingLine(element: Element): PipingLine {
  const id = getElementTextContent(element, 'dexpi:Id') || createDexpiId();
  const name = getElementTextContent(element, 'dexpi:Name');
  const description = getElementTextContent(element, 'dexpi:Description');
  const tag = getElementTextContent(element, 'dexpi:Tag');
  const lineNumber = getElementTextContent(element, 'dexpi:LineNumber');
  const service = getElementTextContent(element, 'dexpi:Service');
  const fluidCode = getElementTextContent(element, 'dexpi:FluidCode');
  const nominalDiameter = getElementTextContent(element, 'dexpi:NominalDiameter');
  const nominalPressure = getElementTextContent(element, 'dexpi:NominalPressure');
  const material = getElementTextContent(element, 'dexpi:Material');
  const insulation = getElementTextContent(element, 'dexpi:Insulation');
  const properties = parseProperties(element);
  
  // Parse segment references
  const segments: string[] = [];
  const segmentsElement = element.getElementsByTagNameNS(NAMESPACES.dexpi, 'SegmentReferences')[0];
  if (segmentsElement) {
    const refElements = segmentsElement.getElementsByTagNameNS(NAMESPACES.dexpi, 'SegmentReference');
    for (let i = 0; i < refElements.length; i++) {
      if (refElements[i].textContent) {
        segments.push(refElements[i].textContent);
      }
    }
  }
  
  return {
    id,
    name,
    description,
    tag,
    lineNumber,
    service,
    fluidCode,
    nominalDiameter,
    nominalPressure,
    material,
    insulation,
    properties,
    segments
  };
}

/**
 * Parses line segment from an element
 */
function parseLineSegment(element: Element): LineSegment {
  const id = getElementTextContent(element, 'dexpi:Id') || createDexpiId();
  const name = getElementTextContent(element, 'dexpi:Name');
  const description = getElementTextContent(element, 'dexpi:Description');
  const tag = getElementTextContent(element, 'dexpi:Tag');
  const lineId = getElementTextContent(element, 'dexpi:LineId') || '';
  const startConnectedTo = getElementTextContent(element, 'dexpi:StartConnectedTo');
  const endConnectedTo = getElementTextContent(element, 'dexpi:EndConnectedTo');
  const properties = parseProperties(element);
  
  // Parse start point
  const startPointElement = element.getElementsByTagNameNS(NAMESPACES.dexpi, 'StartPoint')[0];
  const startPoint: Point2D = { x: 0, y: 0 };
  if (startPointElement) {
    const posElement = startPointElement.getElementsByTagNameNS(NAMESPACES.gml, 'pos')[0];
    if (posElement && posElement.textContent) {
      const coords = posElement.textContent.trim().split(/\s+/);
      if (coords.length >= 2) {
        startPoint.x = parseFloat(coords[0]);
        startPoint.y = parseFloat(coords[1]);
      }
    }
  }
  
  // Parse end point
  const endPointElement = element.getElementsByTagNameNS(NAMESPACES.dexpi, 'EndPoint')[0];
  const endPoint: Point2D = { x: 0, y: 0 };
  if (endPointElement) {
    const posElement = endPointElement.getElementsByTagNameNS(NAMESPACES.gml, 'pos')[0];
    if (posElement && posElement.textContent) {
      const coords = posElement.textContent.trim().split(/\s+/);
      if (coords.length >= 2) {
        endPoint.x = parseFloat(coords[0]);
        endPoint.y = parseFloat(coords[1]);
      }
    }
  }
  
  return {
    id,
    name,
    description,
    tag,
    lineId,
    startPoint,
    endPoint,
    startConnectedTo,
    endConnectedTo,
    properties
  };
}

/**
 * Parses piping fitting from an element
 */
function parsePipingFitting(element: Element): PipingFitting {
  const id = getElementTextContent(element, 'dexpi:Id') || createDexpiId();
  const name = getElementTextContent(element, 'dexpi:Name');
  const description = getElementTextContent(element, 'dexpi:Description');
  const tag = getElementTextContent(element, 'dexpi:Tag');
  const fittingType = getElementTextContent(element, 'dexpi:FittingType') as any;
  const nominalDiameter = getElementTextContent(element, 'dexpi:NominalDiameter');
  const nominalPressure = getElementTextContent(element, 'dexpi:NominalPressure');
  const material = getElementTextContent(element, 'dexpi:Material');
  const position = parsePosition(element);
  const rotationStr = getElementTextContent(element, 'dexpi:Rotation');
  const rotation = rotationStr ? parseFloat(rotationStr) : undefined;
  const properties = parseProperties(element);
  
  // Parse connection points
  const connectionPoints: any[] = [];
  const connectionsElement = element.getElementsByTagNameNS(NAMESPACES.dexpi, 'ConnectionPoints')[0];
  if (connectionsElement) {
    const pointElements = connectionsElement.getElementsByTagNameNS(NAMESPACES.dexpi, 'ConnectionPoint');
    for (let i = 0; i < pointElements.length; i++) {
      const pointElement = pointElements[i];
      
      const pointId = getElementTextContent(pointElement, 'dexpi:Id') || createDexpiId();
      const pointName = getElementTextContent(pointElement, 'dexpi:Name');
      const pointPosition = parsePosition(pointElement) || { x: 0, y: 0 };
      const orientationStr = getElementTextContent(pointElement, 'dexpi:Orientation');
      const orientation = orientationStr ? parseFloat(orientationStr) : undefined;
      const connectedTo = getElementTextContent(pointElement, 'dexpi:ConnectedTo');
      
      connectionPoints.push({
        id: pointId,
        name: pointName,
        fittingId: id,
        position: pointPosition,
        orientation,
        connectedTo
      });
    }
  }
  
  return {
    id,
    name,
    description,
    tag,
    fittingType,
    nominalDiameter,
    nominalPressure,
    material,
    position,
    rotation,
    properties,
    connectionPoints
  };
}

/**
 * Appends instrument element to parent
 */
function appendInstrumentElement(xmlDoc: Document, parent: Element, instrument: Instrument): void {
  const instrumentElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:Instrument');
  
  // Add common attributes
  appendCommonAttributes(xmlDoc, instrumentElement, instrument);
  
  // Add instrument-specific attributes
  addElementWithText(xmlDoc, instrumentElement, 'dexpi:InstrumentType', instrument.instrumentType);
  
  if (instrument.tagNumber) {
    addElementWithText(xmlDoc, instrumentElement, 'dexpi:TagNumber', instrument.tagNumber);
  }
  
  if (instrument.function) {
    addElementWithText(xmlDoc, instrumentElement, 'dexpi:Function', instrument.function);
  }
  
  if (instrument.loopNumber) {
    addElementWithText(xmlDoc, instrumentElement, 'dexpi:LoopNumber', instrument.loopNumber);
  }
  
  if (instrument.failureAction) {
    addElementWithText(xmlDoc, instrumentElement, 'dexpi:FailureAction', instrument.failureAction);
  }
  
  // Add position if available
  if (instrument.position) {
    appendPositionElement(xmlDoc, instrumentElement, instrument.position);
  }
  
  // Add rotation if available
  if (instrument.rotation !== undefined) {
    addElementWithText(xmlDoc, instrumentElement, 'dexpi:Rotation', instrument.rotation.toString());
  }
  
  // Add connection points
  if (instrument.connectionPoints && instrument.connectionPoints.length > 0) {
    const connectionsElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:ConnectionPoints');
    instrument.connectionPoints.forEach(point => {
      const pointElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:ConnectionPoint');
      
      addElementWithText(xmlDoc, pointElement, 'dexpi:Id', point.id);
      
      if (point.connectionType) {
        addElementWithText(xmlDoc, pointElement, 'dexpi:ConnectionType', point.connectionType);
      }
      
      appendPositionElement(xmlDoc, pointElement, point.position);
      
      if (point.connectedTo) {
        addElementWithText(xmlDoc, pointElement, 'dexpi:ConnectedTo', point.connectedTo);
      }
      
      connectionsElement.appendChild(pointElement);
    });
    instrumentElement.appendChild(connectionsElement);
  }
  
  // Add signal lines
  if (instrument.signalLines && instrument.signalLines.length > 0) {
    const signalLinesElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:SignalLines');
    instrument.signalLines.forEach(line => {
      appendSignalLineElement(xmlDoc, signalLinesElement, line);
    });
    instrumentElement.appendChild(signalLinesElement);
  }
  
  parent.appendChild(instrumentElement);
}

/**
 * Appends signal line element to parent
 */
function appendSignalLineElement(xmlDoc: Document, parent: Element, line: SignalLine): void {
  const lineElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:SignalLine');
  
  // Add common attributes
  appendCommonAttributes(xmlDoc, lineElement, line);
  
  // Add signal line-specific attributes
  addElementWithText(xmlDoc, lineElement, 'dexpi:SignalType', line.signalType);
  
  // Add start point
  const startPointElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:StartPoint');
  const startGmlPoint = xmlDoc.createElementNS(NAMESPACES.gml, 'gml:Point');
  const startPosElement = xmlDoc.createElementNS(NAMESPACES.gml, 'gml:pos');
  startPosElement.textContent = `${line.startPoint.x} ${line.startPoint.y}`;
  startGmlPoint.appendChild(startPosElement);
  startPointElement.appendChild(startGmlPoint);
  lineElement.appendChild(startPointElement);
  
  // Add end point
  const endPointElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:EndPoint');
  const endGmlPoint = xmlDoc.createElementNS(NAMESPACES.gml, 'gml:Point');
  const endPosElement = xmlDoc.createElementNS(NAMESPACES.gml, 'gml:pos');
  endPosElement.textContent = `${line.endPoint.x} ${line.endPoint.y}`;
  endGmlPoint.appendChild(endPosElement);
  endPointElement.appendChild(endGmlPoint);
  lineElement.appendChild(endPointElement);
  
  // Add connections
  addElementWithText(xmlDoc, lineElement, 'dexpi:StartConnectedTo', line.startConnectedTo);
  addElementWithText(xmlDoc, lineElement, 'dexpi:EndConnectedTo', line.endConnectedTo);
  
  parent.appendChild(lineElement);
}

/**
 * Parses instrument from an element
 */
function parseInstrument(element: Element): Instrument {
  const id = getElementTextContent(element, 'dexpi:Id') || createDexpiId();
  const name = getElementTextContent(element, 'dexpi:Name');
  const description = getElementTextContent(element, 'dexpi:Description');
  const tag = getElementTextContent(element, 'dexpi:Tag');
  const instrumentType = getElementTextContent(element, 'dexpi:InstrumentType') as any;
  const tagNumber = getElementTextContent(element, 'dexpi:TagNumber');
  const functionValue = getElementTextContent(element, 'dexpi:Function');
  const loopNumber = getElementTextContent(element, 'dexpi:LoopNumber');
  const failureAction = getElementTextContent(element, 'dexpi:FailureAction');
  const position = parsePosition(element);
  const rotationStr = getElementTextContent(element, 'dexpi:Rotation');
  const rotation = rotationStr ? parseFloat(rotationStr) : undefined;
  const properties = parseProperties(element);
  
  // Parse connection points
  const connectionPoints: any[] = [];
  const connectionsElement = element.getElementsByTagNameNS(NAMESPACES.dexpi, 'ConnectionPoints')[0];
  if (connectionsElement) {
    const pointElements = connectionsElement.getElementsByTagNameNS(NAMESPACES.dexpi, 'ConnectionPoint');
    for (let i = 0; i < pointElements.length; i++) {
      const pointElement = pointElements[i];
      
      const pointId = getElementTextContent(pointElement, 'dexpi:Id') || createDexpiId();
      const connectionType = getElementTextContent(pointElement, 'dexpi:ConnectionType') as any;
      const pointPosition = parsePosition(pointElement) || { x: 0, y: 0 };
      const connectedTo = getElementTextContent(pointElement, 'dexpi:ConnectedTo');
      
      connectionPoints.push({
        id: pointId,
        instrumentId: id,
        position: pointPosition,
        connectionType,
        connectedTo
      });
    }
  }
  
  // Parse signal lines
  const signalLines: SignalLine[] = [];
  const signalLinesElement = element.getElementsByTagNameNS(NAMESPACES.dexpi, 'SignalLines')[0];
  if (signalLinesElement) {
    const lineElements = signalLinesElement.getElementsByTagNameNS(NAMESPACES.dexpi, 'SignalLine');
    for (let i = 0; i < lineElements.length; i++) {
      signalLines.push(parseSignalLine(lineElements[i]));
    }
  }
  
  return {
    id,
    name,
    description,
    tag,
    instrumentType,
    tagNumber,
    function: functionValue,
    loopNumber,
    failureAction,
    position,
    rotation,
    properties,
    connectionPoints,
    signalLines
  };
}

/**
 * Parses signal line from an element
 */
function parseSignalLine(element: Element): SignalLine {
  const id = getElementTextContent(element, 'dexpi:Id') || createDexpiId();
  const name = getElementTextContent(element, 'dexpi:Name');
  const description = getElementTextContent(element, 'dexpi:Description');
  const tag = getElementTextContent(element, 'dexpi:Tag');
  const signalType = getElementTextContent(element, 'dexpi:SignalType') as any;
  const startConnectedTo = getElementTextContent(element, 'dexpi:StartConnectedTo') || '';
  const endConnectedTo = getElementTextContent(element, 'dexpi:EndConnectedTo') || '';
  const properties = parseProperties(element);
  
  // Parse start point
  const startPointElement = element.getElementsByTagNameNS(NAMESPACES.dexpi, 'StartPoint')[0];
  const startPoint: Point2D = { x: 0, y: 0 };
  if (startPointElement) {
    const posElement = startPointElement.getElementsByTagNameNS(NAMESPACES.gml, 'pos')[0];
    if (posElement && posElement.textContent) {
      const coords = posElement.textContent.trim().split(/\s+/);
      if (coords.length >= 2) {
        startPoint.x = parseFloat(coords[0]);
        startPoint.y = parseFloat(coords[1]);
      }
    }
  }
  
  // Parse end point
  const endPointElement = element.getElementsByTagNameNS(NAMESPACES.dexpi, 'EndPoint')[0];
  const endPoint: Point2D = { x: 0, y: 0 };
  if (endPointElement) {
    const posElement = endPointElement.getElementsByTagNameNS(NAMESPACES.gml, 'pos')[0];
    if (posElement && posElement.textContent) {
      const coords = posElement.textContent.trim().split(/\s+/);
      if (coords.length >= 2) {
        endPoint.x = parseFloat(coords[0]);
        endPoint.y = parseFloat(coords[1]);
      }
    }
  }
  
  return {
    id,
    name,
    description,
    tag,
    signalType,
    startPoint,
    endPoint,
    startConnectedTo,
    endConnectedTo,
    properties
  };
}

/**
 * Appends process connection element to parent
 */
function appendProcessConnectionElement(xmlDoc: Document, parent: Element, connection: ProcessConnection): void {
  const connectionElement = xmlDoc.createElementNS(NAMESPACES.dexpi, 'dexpi:ProcessConnection');
  
  // Add common attributes
  appendCommonAttributes(xmlDoc, connectionElement, connection);
  
  // Add connection-specific attributes
  addElementWithText(xmlDoc, connectionElement, 'dexpi:SourceId', connection.sourceId);
  addElementWithText(xmlDoc, connectionElement, 'dexpi:TargetId', connection.targetId);
  addElementWithText(xmlDoc, connectionElement, 'dexpi:ConnectionType', connection.connectionType);
  
  parent.appendChild(connectionElement);
}

/**
 * Parses process connection from an element
 */
function parseProcessConnection(element: Element): ProcessConnection {
  const id = getElementTextContent(element, 'dexpi:Id') || createDexpiId();
  const name = getElementTextContent(element, 'dexpi:Name');
  const description = getElementTextContent(element, 'dexpi:Description');
  const tag = getElementTextContent(element, 'dexpi:Tag');
  const sourceId = getElementTextContent(element, 'dexpi:SourceId') || '';
  const targetId = getElementTextContent(element, 'dexpi:TargetId') || '';
  const connectionType = getElementTextContent(element, 'dexpi:ConnectionType') as any;
  const properties = parseProperties(element);
  
  return {
    id,
    name,
    description,
    tag,
    sourceId,
    targetId,
    connectionType,
    properties
  };
}

// ==================== SVG Rendering Functions ====================

/**
 * Renders equipment to SVG
 */
function renderEquipmentToSvg(svgDoc: Document, equipment: Equipment): SVGElement {
  const group = svgDoc.createElement('g');
  group.setAttribute('id', `equipment-${equipment.id}`);
  group.setAttribute('class', `equipment ${equipment.type.toLowerCase()}`);
  group.setAttribute('data-dexpi-id', equipment.id);
  group.setAttribute('data-equipment-type', equipment.type);
  
  if (equipment.tag) {
    group.setAttribute('data-tag', equipment.tag);
  }
  
  const position = equipment.position || { x: 0, y: 0 };
  const rotation = equipment.rotation || 0;
  
  // Apply transformation
  group.setAttribute('transform', `translate(${position.x},${position.y}) rotate(${rotation})`);
  
  // Create basic shape based on equipment type
  switch (equipment.type) {
    case 'VESSEL':
    case 'TANK':
      const vessel = svgDoc.createElement('rect');
      vessel.setAttribute('x', '-30');
      vessel.setAttribute('y', '-50');
      vessel.setAttribute('width', '60');
      vessel.setAttribute('height', '100');
      vessel.setAttribute('rx', '5');
      vessel.setAttribute('stroke', equipment.style?.strokeColor || '#000000');
      vessel.setAttribute('stroke-width', (equipment.style?.strokeWidth || 2).toString());
      vessel.setAttribute('fill', equipment.style?.fillColor || '#FFFFFF');
      group.appendChild(vessel);
      break;
      
    case 'COLUMN':
      const column = svgDoc.createElement('rect');
      column.setAttribute('x', '-25');
      column.setAttribute('y', '-75');
      column.setAttribute('width', '50');
      column.setAttribute('height', '150');
      column.setAttribute('rx', '5');
      column.setAttribute('stroke', equipment.style?.strokeColor || '#000000');
      column.setAttribute('stroke-width', (equipment.style?.strokeWidth || 2).toString());
      column.setAttribute('fill', equipment.style?.fillColor || '#FFFFFF');
      group.appendChild(column);
      break;
      
    case 'PUMP':
      const pump = svgDoc.createElement('circle');
      pump.setAttribute('cx', '0');
      pump.setAttribute('cy', '0');
      pump.setAttribute('r', '25');
      pump.setAttribute('stroke', equipment.style?.strokeColor || '#000000');
      pump.setAttribute('stroke-width', (equipment.style?.strokeWidth || 2).toString());
      pump.setAttribute('fill', equipment.style?.fillColor || '#FFFFFF');
      group.appendChild(pump);
      
      // Add pump symbol
      const symbol = svgDoc.createElement('path');
      symbol.setAttribute('d', 'M-15,-15 L15,15 M-15,15 L15,-15');
      symbol.setAttribute('stroke', equipment.style?.strokeColor || '#000000');
      symbol.setAttribute('stroke-width', (equipment.style?.strokeWidth || 2).toString());
      symbol.setAttribute('fill', 'none');
      group.appendChild(symbol);
      break;
      
    case 'HEAT_EXCHANGER':
      const exchanger = svgDoc.createElement('rect');
      exchanger.setAttribute('x', '-40');
      exchanger.setAttribute('y', '-20');
      exchanger.setAttribute('width', '80');
      exchanger.setAttribute('height', '40');
      exchanger.setAttribute('stroke', equipment.style?.strokeColor || '#000000');
      exchanger.setAttribute('stroke-width', (equipment.style?.strokeWidth || 2).toString());
      exchanger.setAttribute('fill', equipment.style?.fillColor || '#FFFFFF');
      group.appendChild(exchanger);
      
      // Add internal lines
      const lines = svgDoc.createElement('path');
      lines.setAttribute('d', 'M-40,-10 L40,-10 M-40,0 L40,0 M-40,10 L40,10');
      lines.setAttribute('stroke', equipment.style?.strokeColor || '#000000');
      lines.setAttribute('stroke-width', '1');
      lines.setAttribute('fill', 'none');
      group.appendChild(lines);
      break;
      
    default:
      // Generic equipment representation
      const generic = svgDoc.createElement('rect');
      generic.setAttribute('x', '-30');
      generic.setAttribute('y', '-30');
      generic.setAttribute('width', '60');
      generic.setAttribute('height', '60');
      generic.setAttribute('stroke', equipment.style?.strokeColor || '#000000');
      generic.setAttribute('stroke-width', (equipment.style?.strokeWidth || 2).toString());
      generic.setAttribute('fill', equipment.style?.fillColor || '#FFFFFF');
      group.appendChild(generic);
  }
  
  // Add tag text
  if (equipment.tag) {
    const text = svgDoc.createElement('text');
    text.setAttribute('x', '0');
    text.setAttribute('y', '-60');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-family', 'Arial');
    text.setAttribute('font-size', '12');
    text.textContent = equipment.tag;
    group.appendChild(text);
  }
  
  // Add nozzles
  if (equipment.nozzles) {
    equipment.nozzles.forEach(nozzle => {
      const nozzleGroup = svgDoc.createElement('g');
      nozzleGroup.setAttribute('id', `nozzle-${nozzle.id}`);
      nozzleGroup.setAttribute('class', 'nozzle');
      nozzleGroup.setAttribute('data-dexpi-id', nozzle.id);
      
      // Position relative to equipment
      const nozzleX = nozzle.position.x - position.x;
      const nozzleY = nozzle.position.y - position.y;
      
      // Create nozzle marker
      const marker = svgDoc.createElement('circle');
      marker.setAttribute('cx', nozzleX.toString());
      marker.setAttribute('cy', nozzleY.toString());
      marker.setAttribute('r', '5');
      marker.setAttribute('stroke', '#000000');
      marker.setAttribute('stroke-width', '1');
      marker.setAttribute('fill', '#FFFFFF');
      
      nozzleGroup.appendChild(marker);
      group.appendChild(nozzleGroup);
    });
  }
  
  return group;
}

/**
 * Renders fitting to SVG
 */
function renderFittingToSvg(svgDoc: Document, fitting: PipingFitting): SVGElement {
  const group = svgDoc.createElement('g');
  group.setAttribute('id', `fitting-${fitting.id}`);
  group.setAttribute('class', `fitting ${fitting.fittingType.toLowerCase()}`);
  group.setAttribute('data-dexpi-id', fitting.id);
  group.setAttribute('data-fitting-type', fitting.fittingType);
  
  if (fitting.tag) {
    group.setAttribute('data-tag', fitting.tag);
  }
  
  const position = fitting.position || { x: 0, y: 0 };
  const rotation = fitting.rotation || 0;
  
  // Apply transformation
  group.setAttribute('transform', `translate(${position.x},${position.y}) rotate(${rotation})`);
  
  // Create shape based on fitting type
  switch (fitting.fittingType) {
    case 'VALVE':
      const valve = svgDoc.createElement('path');
      valve.setAttribute('d', 'M-15,0 L15,0 M0,-15 L0,15');
      valve.setAttribute('stroke', fitting.style?.strokeColor || '#000000');
      valve.setAttribute('stroke-width', (fitting.style?.strokeWidth || 2).toString());
      valve.setAttribute('fill', 'none');
      
      const valveBody = svgDoc.createElement('circle');
      valveBody.setAttribute('cx', '0');
      valveBody.setAttribute('cy', '0');
      valveBody.setAttribute('r', '10');
      valveBody.setAttribute('stroke', fitting.style?.strokeColor || '#000000');
      valveBody.setAttribute('stroke-width', (fitting.style?.strokeWidth || 2).toString());
      valveBody.setAttribute('fill', fitting.style?.fillColor || '#FFFFFF');
      
      group.appendChild(valveBody);
      group.appendChild(valve);
      break;
      
    case 'CHECK_VALVE':
      const checkValve = svgDoc.createElement('path');
      checkValve.setAttribute('d', 'M-15,0 L15,0 M0,-10 L10,0 L0,10 Z');
      checkValve.setAttribute('stroke', fitting.style?.strokeColor || '#000000');
      checkValve.setAttribute('stroke-width', (fitting.style?.strokeWidth || 2).toString());
      checkValve.setAttribute('fill', fitting.style?.fillColor || '#FFFFFF');
      group.appendChild(checkValve);
      break;
      
    case 'CONTROL_VALVE':
      const controlValve = svgDoc.createElement('path');
      controlValve.setAttribute('d', 'M-15,0 L15,0');
      controlValve.setAttribute('stroke', fitting.style?.strokeColor || '#000000');
      controlValve.setAttribute('stroke-width', (fitting.style?.strokeWidth || 2).toString());
      controlValve.setAttribute('fill', 'none');
      
      const controlValveBody = svgDoc.createElement('path');
      controlValveBody.setAttribute('d', 'M-10,-10 L10,10 M-10,10 L10,-10');
      controlValveBody.setAttribute('stroke', fitting.style?.strokeColor || '#000000');
      controlValveBody.setAttribute('stroke-width', (fitting.style?.strokeWidth || 2).toString());
      controlValveBody.setAttribute('fill', 'none');
      
      const controlValveTriangle = svgDoc.createElement('path');
      controlValveTriangle.setAttribute('d', 'M0,-20 L-7,-30 L7,-30 Z');
      controlValveTriangle.setAttribute('stroke', fitting.style?.strokeColor || '#000000');
      controlValveTriangle.setAttribute('stroke-width', '1');
      controlValveTriangle.setAttribute('fill', fitting.style?.fillColor || '#FFFFFF');
      
      group.appendChild(controlValve);
      group.appendChild(controlValveBody);
      group.appendChild(controlValveTriangle);
      break;
      
    default:
      // Generic fitting representation
      const generic = svgDoc.createElement('rect');
      generic.setAttribute('x', '-10');
      generic.setAttribute('y', '-10');
      generic.setAttribute('width', '20');
      generic.setAttribute('height', '20');
      generic.setAttribute('stroke', fitting.style?.strokeColor || '#000000');
      generic.setAttribute('stroke-width', (fitting.style?.strokeWidth || 2).toString());
      generic.setAttribute('fill', fitting.style?.fillColor || '#FFFFFF');
      group.appendChild(generic);
  }
  
  // Add connection points
  if (fitting.connectionPoints) {
    fitting.connectionPoints.forEach(point => {
      const pointX = point.position.x - position.x;
      const pointY = point.position.y - position.y;
      
      const marker = svgDoc.createElement('circle');
      marker.setAttribute('cx', pointX.toString());
      marker.setAttribute('cy', pointY.toString());
      marker.setAttribute('r', '3');
      marker.setAttribute('stroke', '#000000');
      marker.setAttribute('stroke-width', '1');
      marker.setAttribute('fill', '#00FF00');
      marker.setAttribute('data-connection-id', point.id);
      
      group.appendChild(marker);
    });
  }
  
  return group;
}

/**
 * Renders instrument to SVG
 */
function renderInstrumentToSvg(svgDoc: Document, instrument: Instrument): SVGElement {
  const group = svgDoc.createElement('g');
  group.setAttribute('id', `instrument-${instrument.id}`);
  group.setAttribute('class', `instrument ${instrument.instrumentType.toLowerCase()}`);
  group.setAttribute('data-dexpi-id', instrument.id);
  group.setAttribute('data-instrument-type', instrument.instrumentType);
  
  if (instrument.tagNumber) {
    group.setAttribute('data-tag-number', instrument.tagNumber);
  }
  
  const position = instrument.position || { x: 0, y: 0 };
  const rotation = instrument.rotation || 0;
  
  // Apply transformation
  group.setAttribute('transform', `translate(${position.x},${position.y}) rotate(${rotation})`);
  
  // Create instrument circle
  const circle = svgDoc.createElement('circle');
  circle.setAttribute('cx', '0');
  circle.setAttribute('cy', '0');
  circle.setAttribute('r', '15');
  circle.setAttribute('stroke', instrument.style?.strokeColor || '#000000');
  circle.setAttribute('stroke-width', (instrument.style?.strokeWidth || 2).toString());
  circle.setAttribute('fill', instrument.style?.fillColor || '#FFFFFF');
  group.appendChild(circle);
  
  // Add tag text
  if (instrument.tagNumber) {
    const text = svgDoc.createElement('text');
    text.setAttribute('x', '0');
    text.setAttribute('y', '5');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-family', 'Arial');
    text.setAttribute('font-size', '10');
    text.textContent = instrument.tagNumber;
    group.appendChild(text);
  }
  
  // Add connection points
  if (instrument.connectionPoints) {
    instrument.connectionPoints.forEach(point => {
      const pointX = point.position.x - position.x;
      const pointY = point.position.y - position.y;
      
      const marker = svgDoc.createElement('circle');
      marker.setAttribute('cx', pointX.toString());
      marker.setAttribute('cy', pointY.toString());
      marker.setAttribute('r', '3');
      marker.setAttribute('stroke', '#000000');
      marker.setAttribute('stroke-width', '1');
      marker.setAttribute('fill', '#0000FF');
      marker.setAttribute('data-connection-id', point.id);
      marker.setAttribute('data-connection-type', point.connectionType);
      
      group.appendChild(marker);
    });
  }
  
  return group;
}

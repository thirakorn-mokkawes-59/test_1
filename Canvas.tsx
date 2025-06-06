import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SVG, extend as SVGextend, Element as SVGElement } from '@svgdotjs/svg.js';
import '@svgdotjs/svg.draggable.js';
import '@svgdotjs/svg.panzoom.js';
import {
  DexpiDocument,
  Equipment,
  EquipmentType,
  PipingNetwork,
  PipingFitting,
  FittingType,
  Instrument,
  InstrumentType,
  LineSegment,
  Nozzle,
  Point2D,
  createDexpiId,
  createEmptyDocument
} from './dexpi-model';
import { serializeToDexpiXml, convertToSvg } from './xml-serializer';
import { saveAs } from 'file-saver';

// Define symbol path data for different equipment types
const SYMBOL_PATHS = {
  [EquipmentType.VESSEL]: {
    path: 'M -30 -50 H 30 V 50 H -30 Z',
    width: 60,
    height: 100,
    ports: [
      { x: 0, y: -50, name: 'top', type: 'INLET' },
      { x: 0, y: 50, name: 'bottom', type: 'OUTLET' },
      { x: -30, y: 0, name: 'left', type: 'UTILITY' },
      { x: 30, y: 0, name: 'right', type: 'UTILITY' }
    ]
  },
  [EquipmentType.PUMP]: {
    path: 'M 0 0 m -25, 0 a 25,25 0 1,0 50,0 a 25,25 0 1,0 -50,0 M -15 -15 L 15 15 M -15 15 L 15 -15',
    width: 50,
    height: 50,
    ports: [
      { x: -25, y: 0, name: 'suction', type: 'INLET' },
      { x: 25, y: 0, name: 'discharge', type: 'OUTLET' }
    ]
  },
  [EquipmentType.HEAT_EXCHANGER]: {
    path: 'M -40 -20 H 40 V 20 H -40 Z M -40 -10 H 40 M -40 0 H 40 M -40 10 H 40',
    width: 80,
    height: 40,
    ports: [
      { x: -40, y: -10, name: 'shell in', type: 'INLET' },
      { x: 40, y: -10, name: 'shell out', type: 'OUTLET' },
      { x: -40, y: 10, name: 'tube in', type: 'INLET' },
      { x: 40, y: 10, name: 'tube out', type: 'OUTLET' }
    ]
  },
  [EquipmentType.COLUMN]: {
    path: 'M -25 -75 H 25 V 75 H -25 Z',
    width: 50,
    height: 150,
    ports: [
      { x: 0, y: -75, name: 'top', type: 'OUTLET' },
      { x: 0, y: 75, name: 'bottom', type: 'OUTLET' },
      { x: -25, y: -25, name: 'feed upper', type: 'INLET' },
      { x: -25, y: 25, name: 'feed lower', type: 'INLET' },
      { x: 25, y: -50, name: 'side draw upper', type: 'OUTLET' },
      { x: 25, y: 0, name: 'side draw middle', type: 'OUTLET' },
      { x: 25, y: 50, name: 'side draw lower', type: 'OUTLET' }
    ]
  }
};

// Define symbol path data for fitting types
const FITTING_PATHS = {
  [FittingType.VALVE]: {
    path: 'M -15 0 H 15 M 0 -15 V 15',
    circle: true,
    width: 30,
    height: 30,
    ports: [
      { x: -15, y: 0, name: 'inlet', type: 'INLET' },
      { x: 15, y: 0, name: 'outlet', type: 'OUTLET' }
    ]
  },
  [FittingType.CHECK_VALVE]: {
    path: 'M -15 0 H 15 M 0 -10 L 10 0 L 0 10 Z',
    width: 30,
    height: 20,
    ports: [
      { x: -15, y: 0, name: 'inlet', type: 'INLET' },
      { x: 15, y: 0, name: 'outlet', type: 'OUTLET' }
    ]
  },
  [FittingType.CONTROL_VALVE]: {
    path: 'M -15 0 H 15 M -10 -10 L 10 10 M -10 10 L 10 -10 M 0 -20 L -7 -30 L 7 -30 Z',
    width: 30,
    height: 40,
    ports: [
      { x: -15, y: 0, name: 'inlet', type: 'INLET' },
      { x: 15, y: 0, name: 'outlet', type: 'OUTLET' }
    ]
  }
};

// Define symbol path data for instrument types
const INSTRUMENT_PATHS = {
  [InstrumentType.INDICATOR]: {
    path: 'M 0 0 m -15, 0 a 15,15 0 1,0 30,0 a 15,15 0 1,0 -30,0',
    width: 30,
    height: 30,
    ports: [
      { x: 0, y: 15, name: 'process', type: 'PROCESS' }
    ]
  },
  [InstrumentType.TRANSMITTER]: {
    path: 'M 0 0 m -15, 0 a 15,15 0 1,0 30,0 a 15,15 0 1,0 -30,0',
    width: 30,
    height: 30,
    ports: [
      { x: 0, y: 15, name: 'process', type: 'PROCESS' },
      { x: 15, y: 0, name: 'signal', type: 'SIGNAL_OUTPUT' }
    ]
  },
  [InstrumentType.CONTROLLER]: {
    path: 'M 0 0 m -15, 0 a 15,15 0 1,0 30,0 a 15,15 0 1,0 -30,0',
    width: 30,
    height: 30,
    ports: [
      { x: -15, y: 0, name: 'input', type: 'SIGNAL_INPUT' },
      { x: 15, y: 0, name: 'output', type: 'SIGNAL_OUTPUT' }
    ]
  }
};

// Define interface for the component props
interface CanvasProps {
  initialDocument?: DexpiDocument;
  onDocumentChange?: (document: DexpiDocument) => void;
  readOnly?: boolean;
  width?: number | string;
  height?: number | string;
}

// Define interface for connection being created
interface ConnectionInProgress {
  startElement: SVGElement;
  startPort: string;
  startPoint: Point2D;
  endPoint: Point2D;
  tempLine?: SVGElement;
}

// Define the Canvas component
const Canvas: React.FC<CanvasProps> = ({
  initialDocument,
  onDocumentChange,
  readOnly = false,
  width = '100%',
  height = '800px'
}) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<any>(null);
  const elementsRef = useRef<Map<string, SVGElement>>(new Map());
  const portsRef = useRef<Map<string, SVGElement>>(new Map());
  
  // State
  const [document, setDocument] = useState<DexpiDocument>(initialDocument || createEmptyDocument('New P&ID'));
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [activeToolType, setActiveToolType] = useState<'select' | 'equipment' | 'fitting' | 'instrument' | 'line'>('select');
  const [activeEquipmentType, setActiveEquipmentType] = useState<EquipmentType>(EquipmentType.VESSEL);
  const [activeFittingType, setActiveFittingType] = useState<FittingType>(FittingType.VALVE);
  const [activeInstrumentType, setActiveInstrumentType] = useState<InstrumentType>(InstrumentType.INDICATOR);
  const [connectionInProgress, setConnectionInProgress] = useState<ConnectionInProgress | null>(null);
  const [gridSize, setGridSize] = useState<number>(10);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  
  // Initialize the canvas
  useEffect(() => {
    if (containerRef.current && !canvasRef.current) {
      // Create SVG.js drawing
      const draw = SVG().addTo(containerRef.current).size('100%', '100%');
      
      // Enable panning and zooming
      draw.panZoom({
        zoomMin: 0.5,
        zoomMax: 5,
        zoomFactor: 0.1
      });
      
      // Add grid
      const grid = draw.group().attr('id', 'grid');
      updateGrid(grid, gridSize, showGrid);
      
      // Add main layer for elements
      const mainLayer = draw.group().attr('id', 'main-layer');
      
      // Add connection layer (below main layer for z-ordering)
      const connectionLayer = draw.group().attr('id', 'connection-layer');
      
      // Store the drawing in ref
      canvasRef.current = {
        draw,
        grid,
        mainLayer,
        connectionLayer
      };
      
      // Load initial document if provided
      if (initialDocument) {
        loadDocument(initialDocument);
      }
      
      // Add event listener for keyboard shortcuts
      window.addEventListener('keydown', handleKeyDown);
      
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        draw.remove();
        canvasRef.current = null;
      };
    }
  }, []);
  
  // Update grid when grid settings change
  useEffect(() => {
    if (canvasRef.current) {
      updateGrid(canvasRef.current.grid, gridSize, showGrid);
    }
  }, [gridSize, showGrid]);
  
  // Notify parent component when document changes
  useEffect(() => {
    if (onDocumentChange) {
      onDocumentChange(document);
    }
  }, [document, onDocumentChange]);
  
  // Update grid
  const updateGrid = (gridGroup: SVGElement, size: number, visible: boolean) => {
    gridGroup.clear();
    
    if (!visible) return;
    
    const width = containerRef.current?.clientWidth || 1000;
    const height = containerRef.current?.clientHeight || 800;
    
    // Create grid pattern
    const pattern = gridGroup.pattern(size, size, (add) => {
      add.line(0, 0, 0, size).stroke({ width: 0.5, color: '#ccc' });
      add.line(0, 0, size, 0).stroke({ width: 0.5, color: '#ccc' });
    });
    
    // Apply pattern to background rectangle
    gridGroup.rect(width, height).fill(pattern);
  };
  
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Delete' && selectedElement) {
      deleteSelectedElement();
    } else if (event.key === 'Escape' && connectionInProgress) {
      cancelConnection();
    } else if (event.ctrlKey || event.metaKey) {
      if (event.key === 's') {
        event.preventDefault();
        exportDexpiXml();
      } else if (event.key === 'e') {
        event.preventDefault();
        exportSvg();
      }
    }
  }, [selectedElement, connectionInProgress]);
  
  // Load document
  const loadDocument = (doc: DexpiDocument) => {
    if (!canvasRef.current) return;
    
    // Clear existing elements
    canvasRef.current.mainLayer.clear();
    canvasRef.current.connectionLayer.clear();
    elementsRef.current.clear();
    portsRef.current.clear();
    
    // Load equipment
    doc.equipment.forEach(equipment => {
      addEquipmentToCanvas(equipment);
    });
    
    // Load piping networks
    doc.pipingNetworks.forEach(network => {
      // Add fittings
      network.fittings.forEach(fitting => {
        addFittingToCanvas(fitting);
      });
      
      // Add line segments
      network.lineSegments.forEach(segment => {
        addLineSegmentToCanvas(segment);
      });
    });
    
    // Load instruments
    doc.instruments.forEach(instrument => {
      addInstrumentToCanvas(instrument);
    });
    
    setDocument(doc);
  };
  
  // Add equipment to canvas
  const addEquipmentToCanvas = (equipment: Equipment) => {
    if (!canvasRef.current) return;
    
    const symbolData = SYMBOL_PATHS[equipment.type] || SYMBOL_PATHS[EquipmentType.VESSEL];
    const position = equipment.position || { x: 100, y: 100 };
    
    // Create group for equipment
    const group = canvasRef.current.mainLayer.group().attr({
      'data-id': equipment.id,
      'data-type': 'equipment',
      'data-equipment-type': equipment.type
    });
    
    // Create equipment shape
    const shape = group.path(symbolData.path).fill('#fff').stroke({ color: '#000', width: 2 });
    
    // Add tag text if available
    if (equipment.tag) {
      group.text(equipment.tag).font({
        family: 'Arial',
        size: 12,
        anchor: 'middle'
      }).move(0, -symbolData.height / 2 - 15);
    }
    
    // Add ports/nozzles
    equipment.nozzles.forEach(nozzle => {
      const portCircle = group.circle(6)
        .fill('#fff')
        .stroke({ color: '#000', width: 1 })
        .center(nozzle.position.x - position.x, nozzle.position.y - position.y)
        .attr({
          'data-port-id': nozzle.id,
          'data-port-type': nozzle.nozzleType
        });
      
      // Store port reference
      portsRef.current.set(nozzle.id, portCircle);
      
      // Add port events
      if (!readOnly) {
        portCircle.on('mousedown', (event: MouseEvent) => {
          event.stopPropagation();
          startConnection(portCircle, nozzle.id, {
            x: position.x + (nozzle.position.x - position.x),
            y: position.y + (nozzle.position.y - position.y)
          });
        });
      }
    });
    
    // Position the group
    group.move(position.x, position.y);
    
    // Apply rotation if specified
    if (equipment.rotation) {
      group.rotate(equipment.rotation);
    }
    
    // Make draggable if not in read-only mode
    if (!readOnly) {
      group.draggable().on('dragend', (event: MouseEvent) => {
        const { handler, box } = event.detail;
        const newPosition = { x: box.x, y: box.y };
        
        // Update equipment position in the document
        updateEquipmentPosition(equipment.id, newPosition);
      });
      
      // Add selection handling
      group.on('click', (event: MouseEvent) => {
        event.stopPropagation();
        selectElement(equipment.id);
      });
    }
    
    // Store element reference
    elementsRef.current.set(equipment.id, group);
  };
  
  // Add fitting to canvas
  const addFittingToCanvas = (fitting: PipingFitting) => {
    if (!canvasRef.current) return;
    
    const symbolData = FITTING_PATHS[fitting.fittingType] || FITTING_PATHS[FittingType.VALVE];
    const position = fitting.position || { x: 100, y: 100 };
    
    // Create group for fitting
    const group = canvasRef.current.mainLayer.group().attr({
      'data-id': fitting.id,
      'data-type': 'fitting',
      'data-fitting-type': fitting.fittingType
    });
    
    // Create fitting shape
    const shape = group.path(symbolData.path).fill('#fff').stroke({ color: '#000', width: 2 });
    
    // Add circle if needed (for valves)
    if (symbolData.circle) {
      group.circle(20).fill('#fff').stroke({ color: '#000', width: 2 }).center(0, 0);
    }
    
    // Add connection points
    fitting.connectionPoints.forEach(point => {
      const portCircle = group.circle(6)
        .fill('#fff')
        .stroke({ color: '#000', width: 1 })
        .center(point.position.x - position.x, point.position.y - position.y)
        .attr({
          'data-port-id': point.id,
          'data-port-type': 'connection'
        });
      
      // Store port reference
      portsRef.current.set(point.id, portCircle);
      
      // Add port events
      if (!readOnly) {
        portCircle.on('mousedown', (event: MouseEvent) => {
          event.stopPropagation();
          startConnection(portCircle, point.id, {
            x: position.x + (point.position.x - position.x),
            y: position.y + (point.position.y - position.y)
          });
        });
      }
    });
    
    // Position the group
    group.move(position.x, position.y);
    
    // Apply rotation if specified
    if (fitting.rotation) {
      group.rotate(fitting.rotation);
    }
    
    // Make draggable if not in read-only mode
    if (!readOnly) {
      group.draggable().on('dragend', (event: MouseEvent) => {
        const { handler, box } = event.detail;
        const newPosition = { x: box.x, y: box.y };
        
        // Update fitting position in the document
        updateFittingPosition(fitting.id, newPosition);
      });
      
      // Add selection handling
      group.on('click', (event: MouseEvent) => {
        event.stopPropagation();
        selectElement(fitting.id);
      });
    }
    
    // Store element reference
    elementsRef.current.set(fitting.id, group);
  };
  
  // Add instrument to canvas
  const addInstrumentToCanvas = (instrument: Instrument) => {
    if (!canvasRef.current) return;
    
    const symbolData = INSTRUMENT_PATHS[instrument.instrumentType] || INSTRUMENT_PATHS[InstrumentType.INDICATOR];
    const position = instrument.position || { x: 100, y: 100 };
    
    // Create group for instrument
    const group = canvasRef.current.mainLayer.group().attr({
      'data-id': instrument.id,
      'data-type': 'instrument',
      'data-instrument-type': instrument.instrumentType
    });
    
    // Create instrument shape
    const shape = group.path(symbolData.path).fill('#fff').stroke({ color: '#000', width: 2 });
    
    // Add tag number if available
    if (instrument.tagNumber) {
      group.text(instrument.tagNumber).font({
        family: 'Arial',
        size: 10,
        anchor: 'middle'
      }).move(0, 0);
    }
    
    // Add connection points
    instrument.connectionPoints.forEach(point => {
      const portCircle = group.circle(6)
        .fill('#fff')
        .stroke({ color: '#000', width: 1 })
        .center(point.position.x - position.x, point.position.y - position.y)
        .attr({
          'data-port-id': point.id,
          'data-port-type': point.connectionType
        });
      
      // Store port reference
      portsRef.current.set(point.id, portCircle);
      
      // Add port events
      if (!readOnly) {
        portCircle.on('mousedown', (event: MouseEvent) => {
          event.stopPropagation();
          startConnection(portCircle, point.id, {
            x: position.x + (point.position.x - position.x),
            y: position.y + (point.position.y - position.y)
          });
        });
      }
    });
    
    // Position the group
    group.move(position.x, position.y);
    
    // Apply rotation if specified
    if (instrument.rotation) {
      group.rotate(instrument.rotation);
    }
    
    // Make draggable if not in read-only mode
    if (!readOnly) {
      group.draggable().on('dragend', (event: MouseEvent) => {
        const { handler, box } = event.detail;
        const newPosition = { x: box.x, y: box.y };
        
        // Update instrument position in the document
        updateInstrumentPosition(instrument.id, newPosition);
      });
      
      // Add selection handling
      group.on('click', (event: MouseEvent) => {
        event.stopPropagation();
        selectElement(instrument.id);
      });
    }
    
    // Store element reference
    elementsRef.current.set(instrument.id, group);
  };
  
  // Add line segment to canvas
  const addLineSegmentToCanvas = (segment: LineSegment) => {
    if (!canvasRef.current) return;
    
    // Create line
    const line = canvasRef.current.connectionLayer.line(
      segment.startPoint.x,
      segment.startPoint.y,
      segment.endPoint.x,
      segment.endPoint.y
    ).stroke({ color: '#000', width: 2 }).attr({
      'data-id': segment.id,
      'data-type': 'line-segment',
      'data-line-id': segment.lineId
    });
    
    // Add selection handling if not in read-only mode
    if (!readOnly) {
      line.on('click', (event: MouseEvent) => {
        event.stopPropagation();
        selectElement(segment.id);
      });
    }
    
    // Store element reference
    elementsRef.current.set(segment.id, line);
  };
  
  // Start creating a connection
  const startConnection = (portElement: SVGElement, portId: string, startPoint: Point2D) => {
    if (readOnly || !canvasRef.current) return;
    
    // Create temporary line for visual feedback
    const tempLine = canvasRef.current.connectionLayer.line(
      startPoint.x,
      startPoint.y,
      startPoint.x,
      startPoint.y
    ).stroke({ color: '#00F', width: 2, dasharray: '5,5' });
    
    // Set connection in progress
    setConnectionInProgress({
      startElement: portElement,
      startPort: portId,
      startPoint,
      endPoint: { ...startPoint },
      tempLine
    });
    
    // Add mouse move and up handlers to document
    document.addEventListener('mousemove', handleMouseMoveConnection);
    document.addEventListener('mouseup', handleMouseUpConnection);
  };
  
  // Handle mouse move during connection creation
  const handleMouseMoveConnection = (event: MouseEvent) => {
    if (!connectionInProgress || !canvasRef.current) return;
    
    // Get mouse position relative to SVG canvas
    const point = canvasRef.current.draw.point(event.clientX, event.clientY);
    
    // Update temporary line
    connectionInProgress.tempLine?.plot(
      connectionInProgress.startPoint.x,
      connectionInProgress.startPoint.y,
      point.x,
      point.y
    );
    
    // Update end point
    setConnectionInProgress({
      ...connectionInProgress,
      endPoint: { x: point.x, y: point.y }
    });
  };
  
  // Handle mouse up during connection creation
  const handleMouseUpConnection = (event: MouseEvent) => {
    if (!connectionInProgress || !canvasRef.current) {
      cleanupConnectionListeners();
      return;
    }
    
    // Check if we're over a port
    const targetElement = event.target as SVGElement;
    const portId = targetElement.getAttribute('data-port-id');
    
    if (portId && portId !== connectionInProgress.startPort) {
      // Get port element
      const portElement = portsRef.current.get(portId);
      
      if (portElement) {
        // Get port position
        const portGroup = portElement.parent();
        const portPosition = {
          x: parseFloat(portElement.attr('cx')) + parseFloat(portGroup.attr('x')),
          y: parseFloat(portElement.attr('cy')) + parseFloat(portGroup.attr('y'))
        };
        
        // Create the connection
        createConnection(
          connectionInProgress.startPort,
          portId,
          connectionInProgress.startPoint,
          portPosition
        );
      }
    }
    
    // Remove temporary line
    connectionInProgress.tempLine?.remove();
    
    // Reset connection in progress
    setConnectionInProgress(null);
    
    // Remove event listeners
    cleanupConnectionListeners();
  };
  
  // Clean up connection event listeners
  const cleanupConnectionListeners = () => {
    document.removeEventListener('mousemove', handleMouseMoveConnection);
    document.removeEventListener('mouseup', handleMouseUpConnection);
  };
  
  // Cancel connection creation
  const cancelConnection = () => {
    if (!connectionInProgress) return;
    
    // Remove temporary line
    connectionInProgress.tempLine?.remove();
    
    // Reset connection in progress
    setConnectionInProgress(null);
    
    // Remove event listeners
    cleanupConnectionListeners();
  };
  
  // Create a connection between two ports
  const createConnection = (startPortId: string, endPortId: string, startPoint: Point2D, endPoint: Point2D) => {
    // Create line segment ID
    const segmentId = createDexpiId();
    
    // Find or create default piping network
    let networkId = '';
    let network = document.pipingNetworks.find(n => n.name === 'Default Network');
    
    if (!network) {
      networkId = createDexpiId();
      network = {
        id: networkId,
        name: 'Default Network',
        lines: [],
        fittings: [],
        lineSegments: []
      };
      
      // Add network to document
      setDocument(prev => ({
        ...prev,
        pipingNetworks: [...prev.pipingNetworks, network!]
      }));
    } else {
      networkId = network.id;
    }
    
    // Find or create default piping line
    let lineId = '';
    let line = network.lines.find(l => l.name === 'Default Line');
    
    if (!line) {
      lineId = createDexpiId();
      line = {
        id: lineId,
        name: 'Default Line',
        segments: []
      };
      
      // Add line to network
      network.lines.push(line);
    } else {
      lineId = line.id;
    }
    
    // Add segment to line's segments
    line.segments.push(segmentId);
    
    // Create line segment
    const segment: LineSegment = {
      id: segmentId,
      lineId,
      startPoint,
      endPoint,
      startConnectedTo: startPortId,
      endConnectedTo: endPortId
    };
    
    // Add segment to network's lineSegments
    network.lineSegments.push(segment);
    
    // Update document
    setDocument(prev => {
      const updatedNetworks = prev.pipingNetworks.map(n => 
        n.id === networkId ? network! : n
      );
      
      return {
        ...prev,
        pipingNetworks: updatedNetworks
      };
    });
    
    // Add line segment to canvas
    addLineSegmentToCanvas(segment);
  };
  
  // Update equipment position in the document
  const updateEquipmentPosition = (equipmentId: string, newPosition: Point2D) => {
    setDocument(prev => {
      const updatedEquipment = prev.equipment.map(eq => {
        if (eq.id === equipmentId) {
          // Update equipment position
          const updatedEq = { ...eq, position: newPosition };
          
          // Update nozzle positions
          updatedEq.nozzles = eq.nozzles.map(nozzle => {
            // Calculate relative position
            const relX = nozzle.position.x - (eq.position?.x || 0);
            const relY = nozzle.position.y - (eq.position?.y || 0);
            
            // Apply new position
            return {
              ...nozzle,
              position: {
                x: newPosition.x + relX,
                y: newPosition.y + relY
              }
            };
          });
          
          return updatedEq;
        }
        return eq;
      });
      
      // Update connected line segments
      const updatedNetworks = prev.pipingNetworks.map(network => {
        const updatedSegments = network.lineSegments.map(segment => {
          let updated = { ...segment };
          
          // Check if this segment is connected to any of the equipment's nozzles
          const equipment = prev.equipment.find(eq => eq.id === equipmentId);
          if (equipment) {
            equipment.nozzles.forEach(nozzle => {
              if (segment.startConnectedTo === nozzle.id) {
                // Calculate new position for the start point
                const relX = segment.startPoint.x - (equipment.position?.x || 0);
                const relY = segment.startPoint.y - (equipment.position?.y || 0);
                
                updated.startPoint = {
                  x: newPosition.x + relX,
                  y: newPosition.y + relY
                };
                
                // Update the visual line
                const lineElement = elementsRef.current.get(segment.id);
                if (lineElement) {
                  lineElement.plot(
                    updated.startPoint.x,
                    updated.startPoint.y,
                    updated.endPoint.x,
                    updated.endPoint.y
                  );
                }
              }
              
              if (segment.endConnectedTo === nozzle.id) {
                // Calculate new position for the end point
                const relX = segment.endPoint.x - (equipment.position?.x || 0);
                const relY = segment.endPoint.y - (equipment.position?.y || 0);
                
                updated.endPoint = {
                  x: newPosition.x + relX,
                  y: newPosition.y + relY
                };
                
                // Update the visual line
                const lineElement = elementsRef.current.get(segment.id);
                if (lineElement) {
                  lineElement.plot(
                    updated.startPoint.x,
                    updated.startPoint.y,
                    updated.endPoint.x,
                    updated.endPoint.y
                  );
                }
              }
            });
          }
          
          return updated;
        });
        
        return {
          ...network,
          lineSegments: updatedSegments
        };
      });
      
      return {
        ...prev,
        equipment: updatedEquipment,
        pipingNetworks: updatedNetworks
      };
    });
  };
  
  // Update fitting position in the document
  const updateFittingPosition = (fittingId: string, newPosition: Point2D) => {
    setDocument(prev => {
      // Find which network contains this fitting
      let targetNetwork = null;
      let targetFitting = null;
      
      for (const network of prev.pipingNetworks) {
        const fitting = network.fittings.find(f => f.id === fittingId);
        if (fitting) {
          targetNetwork = network;
          targetFitting = fitting;
          break;
        }
      }
      
      if (!targetNetwork || !targetFitting) return prev;
      
      // Update networks
      const updatedNetworks = prev.pipingNetworks.map(network => {
        if (network.id !== targetNetwork!.id) return network;
        
        // Update fitting
        const updatedFittings = network.fittings.map(fitting => {
          if (fitting.id !== fittingId) return fitting;
          
          // Update fitting position
          const updatedFitting = { ...fitting, position: newPosition };
          
          // Update connection point positions
          updatedFitting.connectionPoints = fitting.connectionPoints.map(point => {
            // Calculate relative position
            const relX = point.position.x - (fitting.position?.x || 0);
            const relY = point.position.y - (fitting.position?.y || 0);
            
            // Apply new position
            return {
              ...point,
              position: {
                x: newPosition.x + relX,
                y: newPosition.y + relY
              }
            };
          });
          
          return updatedFitting;
        });
        
        // Update connected line segments
        const updatedSegments = network.lineSegments.map(segment => {
          let updated = { ...segment };
          
          // Check if this segment is connected to any of the fitting's connection points
          targetFitting!.connectionPoints.forEach(point => {
            if (segment.startConnectedTo === point.id) {
              // Calculate new position for the start point
              const relX = segment.startPoint.x - (targetFitting!.position?.x || 0);
              const relY = segment.startPoint.y - (targetFitting!.position?.y || 0);
              
              updated.startPoint = {
                x: newPosition.x + relX,
                y: newPosition.y + relY
              };
              
              // Update the visual line
              const lineElement = elementsRef.current.get(segment.id);
              if (lineElement) {
                lineElement.plot(
                  updated.startPoint.x,
                  updated.startPoint.y,
                  updated.endPoint.x,
                  updated.endPoint.y
                );
              }
            }
            
            if (segment.endConnectedTo === point.id) {
              // Calculate new position for the end point
              const relX = segment.endPoint.x - (targetFitting!.position?.x || 0);
              const relY = segment.endPoint.y - (targetFitting!.position?.y || 0);
              
              updated.endPoint = {
                x: newPosition.x + relX,
                y: newPosition.y + relY
              };
              
              // Update the visual line
              const lineElement = elementsRef.current.get(segment.id);
              if (lineElement) {
                lineElement.plot(
                  updated.startPoint.x,
                  updated.startPoint.y,
                  updated.endPoint.x,
                  updated.endPoint.y
                );
              }
            }
          });
          
          return updated;
        });
        
        return {
          ...network,
          fittings: updatedFittings,
          lineSegments: updatedSegments
        };
      });
      
      return {
        ...prev,
        pipingNetworks: updatedNetworks
      };
    });
  };
  
  // Update instrument position in the document
  const updateInstrumentPosition = (instrumentId: string, newPosition: Point2D) => {
    setDocument(prev => {
      const updatedInstruments = prev.instruments.map(inst => {
        if (inst.id !== instrumentId) return inst;
        
        // Update instrument position
        const updatedInst = { ...inst, position: newPosition };
        
        // Update connection point positions
        updatedInst.connectionPoints = inst.connectionPoints.map(point => {
          // Calculate relative position
          const relX = point.position.x - (inst.position?.x || 0);
          const relY = point.position.y - (inst.position?.y || 0);
          
          // Apply new position
          return {
            ...point,
            position: {
              x: newPosition.x + relX,
              y: newPosition.y + relY
            }
          };
        });
        
        // Update signal lines
        if (updatedInst.signalLines) {
          updatedInst.signalLines = inst.signalLines!.map(line => {
            let updated = { ...line };
            
            // Check if this line is connected to any of the instrument's connection points
            inst.connectionPoints.forEach(point => {
              if (line.startConnectedTo === point.id) {
                // Calculate new position for the start point
                const relX = line.startPoint.x - (inst.position?.x || 0);
                const relY = line.startPoint.y - (inst.position?.y || 0);
                
                updated.startPoint = {
                  x: newPosition.x + relX,
                  y: newPosition.y + relY
                };
              }
              
              if (line.endConnectedTo === point.id) {
                // Calculate new position for the end point
                const relX = line.endPoint.x - (inst.position?.x || 0);
                const relY = line.endPoint.y - (inst.position?.y || 0);
                
                updated.endPoint = {
                  x: newPosition.x + relX,
                  y: newPosition.y + relY
                };
              }
            });
            
            return updated;
          });
        }
        
        return updatedInst;
      });
      
      return {
        ...prev,
        instruments: updatedInstruments
      };
    });
  };
  
  // Select an element
  const selectElement = (elementId: string) => {
    // Deselect previously selected element
    if (selectedElement && elementsRef.current.has(selectedElement)) {
      const prevElement = elementsRef.current.get(selectedElement);
      prevElement?.removeClass('selected');
      
      if (prevElement?.attr('data-type') === 'line-segment') {
        prevElement?.stroke({ width: 2 });
      }
    }
    
    // Select new element
    if (elementId && elementsRef.current.has(elementId)) {
      const element = elementsRef.current.get(elementId);
      element?.addClass('selected');
      
      if (element?.attr('data-type') === 'line-segment') {
        element?.stroke({ width: 3 });
      }
      
      setSelectedElement(elementId);
    } else {
      setSelectedElement(null);
    }
  };
  
  // Delete selected element
  const deleteSelectedElement = () => {
    if (!selectedElement) return;
    
    const element = elementsRef.current.get(selectedElement);
    if (!element) return;
    
    const elementType = element.attr('data-type');
    
    // Remove element from the document based on its type
    if (elementType === 'equipment') {
      // Remove equipment and its connections
      setDocument(prev => {
        // Find equipment
        const equipment = prev.equipment.find(eq => eq.id === selectedElement);
        if (!equipment) return prev;
        
        // Find connected line segments
        const connectedSegmentIds = new Set<string>();
        prev.pipingNetworks.forEach(network => {
          network.lineSegments.forEach(segment => {
            equipment.nozzles.forEach(nozzle => {
              if (segment.startConnectedTo === nozzle.id || segment.endConnectedTo === nozzle.id) {
                connectedSegmentIds.add(segment.id);
              }
            });
          });
        });
        
        // Update piping networks to remove connected segments
        const updatedNetworks = prev.pipingNetworks.map(network => {
          return {
            ...network,
            lineSegments: network.lineSegments.filter(segment => !connectedSegmentIds.has(segment.id)),
            lines: network.lines.map(line => ({
              ...line,
              segments: line.segments.filter(id => !connectedSegmentIds.has(id))
            }))
          };
        });
        
        // Remove connected segments from canvas
        connectedSegmentIds.forEach(id => {
          elementsRef.current.get(id)?.remove();
          elementsRef.current.delete(id);
        });
        
        // Remove equipment from canvas
        element.remove();
        elementsRef.current.delete(selectedElement);
        
        // Remove equipment's nozzles from ports ref
        equipment.nozzles.forEach(nozzle => {
          portsRef.current.delete(nozzle.id);
        });
        
        return {
          ...prev,
          equipment: prev.equipment.filter(eq => eq.id !== selectedElement),
          pipingNetworks: updatedNetworks
        };
      });
    } else if (elementType === 'fitting') {
      // Remove fitting and its connections
      setDocument(prev => {
        // Find which network contains this fitting
        let targetNetwork = null;
        let targetFitting = null;
        
        for (const network of prev.pipingNetworks) {
          const fitting = network.fittings.find(f => f.id === selectedElement);
          if (fitting) {
            targetNetwork = network;
            targetFitting = fitting;
            break;
          }
        }
        
        if (!targetNetwork || !targetFitting) return prev;
        
        // Find connected line segments
        const connectedSegmentIds = new Set<string>();
        targetNetwork.lineSegments.forEach(segment => {
          targetFitting!.connectionPoints.forEach(point => {
            if (segment.startConnectedTo === point.id || segment.endConnectedTo === point.id) {
              connectedSegmentIds.add(segment.id);
            }
          });
        });
        
        // Update networks
        const updatedNetworks = prev.pipingNetworks.map(network => {
          if (network.id !== targetNetwork!.id) return network;
          
          return {
            ...network,
            fittings: network.fittings.filter(f => f.id !== selectedElement),
            lineSegments: network.lineSegments.filter(segment => !connectedSegmentIds.has(segment.id)),
            lines: network.lines.map(line => ({
              ...line,
              segments: line.segments.filter(id => !connectedSegmentIds.has(id))
            }))
          };
        });
        
        // Remove connected segments from canvas
        connectedSegmentIds.forEach(id => {
          elementsRef.current.get(id)?.remove();
          elementsRef.current.delete(id);
        });
        
        // Remove fitting from canvas
        element.remove();
        elementsRef.current.delete(selectedElement);
        
        // Remove fitting's connection points from ports ref
        targetFitting.connectionPoints.forEach(point => {
          portsRef.current.delete(point.id);
        });
        
        return {
          ...prev,
          pipingNetworks: updatedNetworks
        };
      });
    } else if (elementType === 'instrument') {
      // Remove instrument and its connections
      setDocument(prev => {
        // Find instrument
        const instrument = prev.instruments.find(inst => inst.id === selectedElement);
        if (!instrument) return prev;
        
        // Find connected line segments
        const connectedSegmentIds = new Set<string>();
        prev.pipingNetworks.forEach(network => {
          network.lineSegments.forEach(segment => {
            instrument.connectionPoints.forEach(point => {
              if (segment.startConnectedTo === point.id || segment.endConnectedTo === point.id) {
                connectedSegmentIds.add(segment.id);
              }
            });
          });
        });
        
        // Update piping networks to remove connected segments
        const updatedNetworks = prev.pipingNetworks.map(network => {
          return {
            ...network,
            lineSegments: network.lineSegments.filter(segment => !connectedSegmentIds.has(segment.id)),
            lines: network.lines.map(line => ({
              ...line,
              segments: line.segments.filter(id => !connectedSegmentIds.has(id))
            }))
          };
        });
        
        // Remove connected segments from canvas
        connectedSegmentIds.forEach(id => {
          elementsRef.current.get(id)?.remove();
          elementsRef.current.delete(id);
        });
        
        // Remove instrument from canvas
        element.remove();
        elementsRef.current.delete(selectedElement);
        
        // Remove instrument's connection points from ports ref
        instrument.connectionPoints.forEach(point => {
          portsRef.current.delete(point.id);
        });
        
        return {
          ...prev,
          instruments: prev.instruments.filter(inst => inst.id !== selectedElement),
          pipingNetworks: updatedNetworks
        };
      });
    } else if (elementType === 'line-segment') {
      // Remove line segment
      setDocument(prev => {
        // Find which network contains this segment
        let targetNetwork = null;
        let targetSegment = null;
        
        for (const network of prev.pipingNetworks) {
          const segment = network.lineSegments.find(s => s.id === selectedElement);
          if (segment) {
            targetNetwork = network;
            targetSegment = segment;
            break;
          }
        }
        
        if (!targetNetwork || !targetSegment) return prev;
        
        // Update networks
        const updatedNetworks = prev.pipingNetworks.map(network => {
          if (network.id !== targetNetwork!.id) return network;
          
          return {
            ...network,
            lineSegments: network.lineSegments.filter(s => s.id !== selectedElement),
            lines: network.lines.map(line => ({
              ...line,
              segments: line.segments.filter(id => id !== selectedElement)
            }))
          };
        });
        
        // Remove segment from canvas
        element.remove();
        elementsRef.current.delete(selectedElement);
        
        return {
          ...prev,
          pipingNetworks: updatedNetworks
        };
      });
    }
    
    // Clear selection
    setSelectedElement(null);
  };
  
  // Add equipment to the document
  const addEquipment = (type: EquipmentType, position: Point2D) => {
    if (readOnly) return;
    
    // Create equipment ID
    const equipmentId = createDexpiId();
    
    // Get symbol data
    const symbolData = SYMBOL_PATHS[type] || SYMBOL_PATHS[EquipmentType.VESSEL];
    
    // Create nozzles
    const nozzles: Nozzle[] = symbolData.ports.map(port => {
      const nozzleId = createDexpiId();
      return {
        id: nozzleId,
        equipmentId,
        nozzleType: port.type as any,
        name: port.name,
        position: {
          x: position.x + port.x,
          y: position.y + port.y
        }
      };
    });
    
    // Create equipment
    const equipment: Equipment = {
      id: equipmentId,
      type,
      position,
      nozzles
    };
    
    // Add equipment to document
    setDocument(prev => ({
      ...prev,
      equipment: [...prev.equipment, equipment]
    }));
    
    // Add equipment to canvas
    addEquipmentToCanvas(equipment);
    
    // Select the new equipment
    selectElement(equipmentId);
  };
  
  // Add fitting to the document
  const addFitting = (type: FittingType, position: Point2D) => {
    if (readOnly) return;
    
    // Create fitting ID
    const fittingId = createDexpiId();
    
    // Get symbol data
    const symbolData = FITTING_PATHS[type] || FITTING_PATHS[FittingType.VALVE];
    
    // Create connection points
    const connectionPoints = symbolData.ports.map(port => {
      const pointId = createDexpiId();
      return {
        id: pointId,
        fittingId,
        name: port.name,
        position: {
          x: position.x + port.x,
          y: position.y + port.y
        }
      };
    });
    
    // Create fitting
    const fitting: PipingFitting = {
      id: fittingId,
      fittingType: type,
      position,
      connectionPoints
    };
    
    // Find or create default piping network
    let networkId = '';
    let network = document.pipingNetworks.find(n => n.name === 'Default Network');
    
    if (!network) {
      networkId = createDexpiId();
      network = {
        id: networkId,
        name: 'Default Network',
        lines: [],
        fittings: [fitting],
        lineSegments: []
      };
      
      // Add network to document
      setDocument(prev => ({
        ...prev,
        pipingNetworks: [...prev.pipingNetworks, network!]
      }));
    } else {
      networkId = network.id;
      
      // Add fitting to network
      setDocument(prev => {
        const updatedNetworks = prev.pipingNetworks.map(n => {
          if (n.id === networkId) {
            return {
              ...n,
              fittings: [...n.fittings, fitting]
            };
          }
          return n;
        });
        
        return {
          ...prev,
          pipingNetworks: updatedNetworks
        };
      });
    }
    
    // Add fitting to canvas
    addFittingToCanvas(fitting);
    
    // Select the new fitting
    selectElement(fittingId);
  };
  
  // Add instrument to the document
  const addInstrument = (type: InstrumentType, position: Point2D) => {
    if (readOnly) return;
    
    // Create instrument ID
    const instrumentId = createDexpiId();
    
    // Get symbol data
    const symbolData = INSTRUMENT_PATHS[type] || INSTRUMENT_PATHS[InstrumentType.INDICATOR];
    
    // Create connection points
    const connectionPoints = symbolData.ports.map(port => {
      const pointId = createDexpiId();
      return {
        id: pointId,
        instrumentId,
        connectionType: port.type as any,
        position: {
          x: position.x + port.x,
          y: position.y + port.y
        }
      };
    });
    
    // Create instrument
    const instrument: Instrument = {
      id: instrumentId,
      instrumentType: type,
      position,
      connectionPoints,
      signalLines: []
    };
    
    // Add instrument to document
    setDocument(prev => ({
      ...prev,
      instruments: [...prev.instruments, instrument]
    }));
    
    // Add instrument to canvas
    addInstrumentToCanvas(instrument);
    
    // Select the new instrument
    selectElement(instrumentId);
  };
  
  // Handle canvas click
  const handleCanvasClick = (event: React.MouseEvent) => {
    // Deselect if clicking on canvas background
    if (event.target === containerRef.current || event.target === canvasRef.current?.draw.node) {
      selectElement('');
      
      // If in add mode, add element at click position
      if (activeToolType !== 'select' && canvasRef.current) {
        const point = canvasRef.current.draw.point(event.clientX, event.clientY);
        
        // Snap to grid if enabled
        const snapPosition = {
          x: showGrid ? Math.round(point.x / gridSize) * gridSize : point.x,
          y: showGrid ? Math.round(point.y / gridSize) * gridSize : point.y
        };
        
        if (activeToolType === 'equipment') {
          addEquipment(activeEquipmentType, snapPosition);
        } else if (activeToolType === 'fitting') {
          addFitting(activeFittingType, snapPosition);
        } else if (activeToolType === 'instrument') {
          addInstrument(activeInstrumentType, snapPosition);
        }
      }
    }
  };
  
  // Export document as DEXPI XML
  const exportDexpiXml = () => {
    try {
      const xmlString = serializeToDexpiXml(document);
      const blob = new Blob([xmlString], { type: 'application/xml' });
      saveAs(blob, `${document.name || 'pid'}.dexpi.xml`);
    } catch (error) {
      console.error('Error exporting DEXPI XML:', error);
      alert('Failed to export DEXPI XML. See console for details.');
    }
  };
  
  // Export document as SVG
  const exportSvg = () => {
    try {
      const svgString = convertToSvg(document);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      saveAs(blob, `${document.name || 'pid'}.svg`);
    } catch (error) {
      console.error('Error exporting SVG:', error);
      alert('Failed to export SVG. See console for details.');
    }
  };
  
  // Render toolbar
  const renderToolbar = () => {
    return (
      <div className="canvas-toolbar">
        <div className="tool-group">
          <button 
            className={`tool-button ${activeToolType === 'select' ? 'active' : ''}`}
            onClick={() => setActiveToolType('select')}
            title="Select Tool"
          >
            Select
          </button>
          
          <button 
            className={`tool-button ${activeToolType === 'equipment' ? 'active' : ''}`}
            onClick={() => setActiveToolType('equipment')}
            title="Add Equipment"
          >
            Equipment
          </button>
          
          <button 
            className={`tool-button ${activeToolType === 'fitting' ? 'active' : ''}`}
            onClick={() => setActiveToolType('fitting')}
            title="Add Fitting"
          >
            Fitting
          </button>
          
          <button 
            className={`tool-button ${activeToolType === 'instrument' ? 'active' : ''}`}
            onClick={() => setActiveToolType('instrument')}
            title="Add Instrument"
          >
            Instrument
          </button>
        </div>
        
        {activeToolType === 'equipment' && (
          <div className="tool-options">
            <select 
              value={activeEquipmentType} 
              onChange={(e) => setActiveEquipmentType(e.target.value as EquipmentType)}
            >
              {Object.values(EquipmentType).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        )}
        
        {activeToolType === 'fitting' && (
          <div className="tool-options">
            <select 
              value={activeFittingType} 
              onChange={(e) => setActiveFittingType(e.target.value as FittingType)}
            >
              {Object.values(FittingType).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        )}
        
        {activeToolType === 'instrument' && (
          <div className="tool-options">
            <select 
              value={activeInstrumentType} 
              onChange={(e) => setActiveInstrumentType(e.target.value as InstrumentType)}
            >
              {Object.values(InstrumentType).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        )}
        
        <div className="view-controls">
          <button 
            className={`tool-button ${showGrid ? 'active' : ''}`}
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Grid"
          >
            Grid
          </button>
          
          <input 
            type="range" 
            min="5" 
            max="50" 
            value={gridSize} 
            onChange={(e) => setGridSize(parseInt(e.target.value))}
            title="Grid Size"
          />
          
          <button 
            className="tool-button"
            onClick={() => canvasRef.current?.draw.zoom(1)}
            title="Reset Zoom"
          >
            Reset View
          </button>
        </div>
        
        <div className="export-controls">
          <button 
            className="tool-button"
            onClick={exportDexpiXml}
            title="Export as DEXPI XML"
          >
            Export DEXPI
          </button>
          
          <button 
            className="tool-button"
            onClick={exportSvg}
            title="Export as SVG"
          >
            Export SVG
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="canvas-container">
      {!readOnly && renderToolbar()}
      <div 
        ref={containerRef}
        className="svg-canvas"
        style={{ width, height }}
        onClick={handleCanvasClick}
      />
      <style jsx>{`
        .canvas-container {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        
        .svg-canvas {
          flex: 1;
          border: 1px solid #ccc;
          overflow: hidden;
          background-color: #f9f9f9;
        }
        
        .canvas-toolbar {
          display: flex;
          padding: 8px;
          background-color: #f0f0f0;
          border-bottom: 1px solid #ccc;
          gap: 16px;
        }
        
        .tool-group {
          display: flex;
          gap: 4px;
        }
        
        .tool-button {
          padding: 6px 12px;
          background-color: #fff;
          border: 1px solid #ccc;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .tool-button:hover {
          background-color: #f0f0f0;
        }
        
        .tool-button.active {
          background-color: #e0e0e0;
          border-color: #999;
        }
        
        .tool-options {
          display: flex;
          align-items: center;
        }
        
        .view-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }
        
        .export-controls {
          display: flex;
          gap: 8px;
        }
      `}</style>
    </div>
  );
};

export default Canvas;

import React, { useState, useRef, useCallback } from 'react';
import { DexpiDocument, createEmptyDocument } from './dexpi-model';
import { parseFromDexpiXml } from './xml-serializer';
import Canvas from './Canvas';
import './App.css';

const App: React.FC = () => {
  // State
  const [document, setDocument] = useState<DexpiDocument>(createEmptyDocument('New P&ID'));
  const [documentName, setDocumentName] = useState<string>('New P&ID');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'properties' | 'symbols' | 'layers'>('symbols');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle document changes from Canvas
  const handleDocumentChange = useCallback((updatedDoc: DexpiDocument) => {
    setDocument(updatedDoc);
  }, []);
  
  // Handle document name change
  const handleDocumentNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setDocumentName(newName);
    setDocument(prev => ({
      ...prev,
      name: newName
    }));
  }, []);
  
  // Handle file upload button click
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  
  // Handle file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    setError(null);
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const xmlString = event.target?.result as string;
        const parsedDocument = parseFromDexpiXml(xmlString);
        
        setDocument(parsedDocument);
        setDocumentName(parsedDocument.name || file.name.replace('.xml', ''));
        setIsLoading(false);
      } catch (err) {
        console.error('Error parsing DEXPI XML:', err);
        setError(`Failed to parse DEXPI XML: ${err instanceof Error ? err.message : String(err)}`);
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      setError('Failed to read file');
      setIsLoading(false);
    };
    
    reader.readAsText(file);
    
    // Reset file input
    e.target.value = '';
  }, []);
  
  // Create a new empty document
  const handleNewDocument = useCallback(() => {
    setDocument(createEmptyDocument('New P&ID'));
    setDocumentName('New P&ID');
  }, []);
  
  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);
  
  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo">
          <h1>P&ID DEXPI Editor</h1>
        </div>
        <div className="document-title">
          <input
            type="text"
            value={documentName}
            onChange={handleDocumentNameChange}
            placeholder="Document Name"
          />
        </div>
        <div className="header-actions">
          <button onClick={handleNewDocument} title="New Document">
            New
          </button>
          <button onClick={handleUploadClick} title="Import DEXPI XML">
            Import DEXPI
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xml"
            style={{ display: 'none' }}
          />
        </div>
      </header>
      
      {/* Main Content */}
      <div className="app-content">
        {/* Sidebar */}
        <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-toggle" onClick={toggleSidebar}>
            {isSidebarOpen ? '◀' : '▶'}
          </div>
          
          <div className="sidebar-content">
            <div className="sidebar-tabs">
              <button
                className={activeTab === 'symbols' ? 'active' : ''}
                onClick={() => setActiveTab('symbols')}
              >
                Symbols
              </button>
              <button
                className={activeTab === 'properties' ? 'active' : ''}
                onClick={() => setActiveTab('properties')}
              >
                Properties
              </button>
              <button
                className={activeTab === 'layers' ? 'active' : ''}
                onClick={() => setActiveTab('layers')}
              >
                Layers
              </button>
            </div>
            
            <div className="sidebar-panel">
              {activeTab === 'symbols' && (
                <div className="symbols-panel">
                  <h3>Equipment</h3>
                  <div className="symbol-grid">
                    <div className="symbol-item">Vessel</div>
                    <div className="symbol-item">Pump</div>
                    <div className="symbol-item">Heat Exchanger</div>
                    <div className="symbol-item">Column</div>
                  </div>
                  
                  <h3>Fittings</h3>
                  <div className="symbol-grid">
                    <div className="symbol-item">Valve</div>
                    <div className="symbol-item">Check Valve</div>
                    <div className="symbol-item">Control Valve</div>
                  </div>
                  
                  <h3>Instruments</h3>
                  <div className="symbol-grid">
                    <div className="symbol-item">Indicator</div>
                    <div className="symbol-item">Transmitter</div>
                    <div className="symbol-item">Controller</div>
                  </div>
                </div>
              )}
              
              {activeTab === 'properties' && (
                <div className="properties-panel">
                  <h3>Document Properties</h3>
                  <div className="property-group">
                    <label>Name:</label>
                    <input
                      type="text"
                      value={document.name || ''}
                      onChange={(e) => setDocument(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div className="property-group">
                    <label>Description:</label>
                    <textarea
                      value={document.description || ''}
                      onChange={(e) => setDocument(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  
                  <div className="property-group">
                    <label>Document Number:</label>
                    <input
                      type="text"
                      value={document.documentNumber || ''}
                      onChange={(e) => setDocument(prev => ({ ...prev, documentNumber: e.target.value }))}
                    />
                  </div>
                  
                  <div className="property-group">
                    <label>Revision:</label>
                    <input
                      type="text"
                      value={document.revisionNumber || ''}
                      onChange={(e) => setDocument(prev => ({ ...prev, revisionNumber: e.target.value }))}
                    />
                  </div>
                  
                  <div className="property-group">
                    <label>Plant Name:</label>
                    <input
                      type="text"
                      value={document.plantName || ''}
                      onChange={(e) => setDocument(prev => ({ ...prev, plantName: e.target.value }))}
                    />
                  </div>
                  
                  <div className="property-group">
                    <label>Project Name:</label>
                    <input
                      type="text"
                      value={document.projectName || ''}
                      onChange={(e) => setDocument(prev => ({ ...prev, projectName: e.target.value }))}
                    />
                  </div>
                </div>
              )}
              
              {activeTab === 'layers' && (
                <div className="layers-panel">
                  <h3>Layers</h3>
                  <div className="layer-item">
                    <input type="checkbox" id="layer-equipment" checked />
                    <label htmlFor="layer-equipment">Equipment</label>
                  </div>
                  <div className="layer-item">
                    <input type="checkbox" id="layer-piping" checked />
                    <label htmlFor="layer-piping">Piping</label>
                  </div>
                  <div className="layer-item">
                    <input type="checkbox" id="layer-instruments" checked />
                    <label htmlFor="layer-instruments">Instruments</label>
                  </div>
                  <div className="layer-item">
                    <input type="checkbox" id="layer-connections" checked />
                    <label htmlFor="layer-connections">Connections</label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Canvas */}
        <div className="canvas-wrapper">
          {isLoading ? (
            <div className="loading-overlay">
              <div className="spinner"></div>
              <p>Loading DEXPI document...</p>
            </div>
          ) : error ? (
            <div className="error-message">
              <h3>Error</h3>
              <p>{error}</p>
              <button onClick={() => setError(null)}>Dismiss</button>
            </div>
          ) : (
            <Canvas
              initialDocument={document}
              onDocumentChange={handleDocumentChange}
              width="100%"
              height="100%"
            />
          )}
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-item">
          <span className="status-label">Elements:</span>
          <span className="status-value">
            {document.equipment.length + 
             document.pipingNetworks.reduce((sum, network) => sum + network.fittings.length + network.lineSegments.length, 0) +
             document.instruments.length}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Equipment:</span>
          <span className="status-value">{document.equipment.length}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Connections:</span>
          <span className="status-value">
            {document.pipingNetworks.reduce((sum, network) => sum + network.lineSegments.length, 0)}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">DEXPI Version:</span>
          <span className="status-value">1.0</span>
        </div>
      </div>
      
      <style jsx>{`
        .app-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
        }
        
        .app-header {
          display: flex;
          align-items: center;
          padding: 0 16px;
          height: 60px;
          background-color: #2c3e50;
          color: white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .app-logo h1 {
          margin: 0;
          font-size: 20px;
        }
        
        .document-title {
          margin-left: 24px;
          flex: 1;
        }
        
        .document-title input {
          padding: 8px 12px;
          border-radius: 4px;
          border: none;
          font-size: 16px;
          width: 300px;
        }
        
        .header-actions {
          display: flex;
          gap: 8px;
        }
        
        .header-actions button {
          padding: 8px 16px;
          background-color: #3498db;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }
        
        .header-actions button:hover {
          background-color: #2980b9;
        }
        
        .app-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        
        .sidebar {
          position: relative;
          width: 300px;
          background-color: #f5f5f5;
          transition: width 0.3s ease;
          overflow: hidden;
          border-right: 1px solid #ddd;
        }
        
        .sidebar.closed {
          width: 24px;
        }
        
        .sidebar-toggle {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 24px;
          height: 24px;
          background-color: #ddd;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          border-radius: 4px;
          z-index: 10;
        }
        
        .sidebar-content {
          padding: 16px;
          height: 100%;
          overflow-y: auto;
        }
        
        .sidebar-tabs {
          display: flex;
          margin-bottom: 16px;
          border-bottom: 1px solid #ddd;
        }
        
        .sidebar-tabs button {
          padding: 8px 16px;
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 500;
          color: #666;
        }
        
        .sidebar-tabs button.active {
          border-bottom: 2px solid #3498db;
          color: #3498db;
        }
        
        .sidebar-panel {
          padding-top: 8px;
        }
        
        .symbols-panel h3 {
          margin-top: 16px;
          margin-bottom: 8px;
          font-size: 16px;
          color: #333;
        }
        
        .symbol-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        
        .symbol-item {
          padding: 8px;
          background-color: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          text-align: center;
          cursor: pointer;
        }
        
        .symbol-item:hover {
          background-color: #f0f0f0;
        }
        
        .properties-panel h3 {
          margin-top: 16px;
          margin-bottom: 8px;
          font-size: 16px;
          color: #333;
        }
        
        .property-group {
          margin-bottom: 12px;
        }
        
        .property-group label {
          display: block;
          margin-bottom: 4px;
          color: #666;
        }
        
        .property-group input,
        .property-group textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .property-group textarea {
          height: 80px;
          resize: vertical;
        }
        
        .layers-panel h3 {
          margin-top: 16px;
          margin-bottom: 8px;
          font-size: 16px;
          color: #333;
        }
        
        .layer-item {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .layer-item input {
          margin-right: 8px;
        }
        
        .canvas-wrapper {
          flex: 1;
          position: relative;
          overflow: hidden;
        }
        
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(255, 255, 255, 0.8);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 100;
        }
        
        .spinner {
          border: 4px solid rgba(0, 0, 0, 0.1);
          border-left-color: #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .error-message {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: white;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          text-align: center;
          max-width: 400px;
        }
        
        .error-message h3 {
          color: #e74c3c;
          margin-top: 0;
        }
        
        .error-message button {
          padding: 8px 16px;
          background-color: #3498db;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 16px;
        }
        
        .status-bar {
          display: flex;
          padding: 8px 16px;
          background-color: #f5f5f5;
          border-top: 1px solid #ddd;
          font-size: 12px;
          color: #666;
        }
        
        .status-item {
          margin-right: 24px;
        }
        
        .status-label {
          font-weight: 500;
          margin-right: 4px;
        }
      `}</style>
    </div>
  );
};

export default App;

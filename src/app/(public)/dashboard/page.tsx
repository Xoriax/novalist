"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface User {
  email: string;
  role: string;
  id: string;
  employee?: {
    id?: string;
    name?: string;
    linked?: boolean;
  };
}

interface ExcelData {
  headers: string[];
  data: Record<string, unknown>[];
  filename: string | null;
  uploadedBy: string | null;
  uploadedAt: string | null;
  rowCount: number;
  columnCount: number;
}

interface AdminUsersContentProps {
  onBack: () => void;
}

interface AdminEmailsContentProps {
  onBack: () => void;
}

interface UserWithEmployee {
  id: string;
  email: string;
  role: string;
  employee?: {
    id?: string;
    name?: string;
    linked?: boolean;
  };
}

interface AvailableEmployee {
  id: string;
  name: string;
  fullKey: string;
}

interface RowDetail {
  [key: string]: unknown;
}

interface RowDetailsModalProps {
  row: RowDetail | null;
  headers: string[];
  isOpen: boolean;
  onClose: () => void;
}

interface TicketWithLogs {
  _id: string;
  workOrderNumber: string;
  customerReferenceNumber: string;
  rawData: Record<string, unknown>;
  logs: TicketLog[];
  importedFrom: string;
  importedAt: string;
  importedBy: string;
  rowIndex: number;
  headers: string[];
}

interface TicketLog {
  id: number;
  action: string;
  description: string;
  date: string;
  type: 'creation' | 'opening' | 'action' | 'assignment';
  icon: string;
}

interface DashboardContentProps {
  user: User | null;
}

interface EmployeeContentProps {
  employeeKey: string;
}

function RowDetailsModal({ row, headers, isOpen, onClose }: RowDetailsModalProps) {
  const [ticketLogs, setTicketLogs] = useState<TicketLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Fonction pour corriger les problèmes d'encodage
  const fixEncoding = (text: string): string => {
    if (typeof text !== 'string') return String(text);
    
    return text
      .replace(/Ã©/g, 'é')
      .replace(/Ã¨/g, 'è')
      .replace(/Ã /g, 'à')
      .replace(/Ã¢/g, 'â')
      .replace(/Ã´/g, 'ô')
      .replace(/Ã»/g, 'û')
      .replace(/Ã®/g, 'î')
      .replace(/Ã§/g, 'ç')
      .replace(/Ã±/g, 'ñ')
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"')
      .replace(/â€¦/g, '...')
      .replace(/â€"/g, '–')
      .replace(/â€"/g, '—')
      .replace(/�/g, '');
  };

  // Récupérer les logs du ticket depuis la base de données
  useEffect(() => {
    if (!isOpen || !row) return;

    // Fonction de fallback pour générer les logs
    const createFallbackLogs = (): TicketLog[] => {
      const logs: TicketLog[] = [];
      let logId = 1;

      // Trouver les colonnes nécessaires
      const openDateCol = headers.find(h => h.toLowerCase().includes('open date'));
      const openTimeCol = headers.find(h => h.toLowerCase().includes('open time'));
      const lastCodeCol = headers.find(h => h.toLowerCase().includes('last code') && !h.toLowerCase().includes('desc') && !h.toLowerCase().includes('date'));
      const lastCodeDescCol = headers.find(h => h.toLowerCase().includes('last code desc'));
      const lastCodeDateTimeCol = headers.find(h => h.toLowerCase().includes('last code date time'));
      const workOrderStatusIdCol = headers.find(h => h.toLowerCase().includes('work order status id'));
      const workOrderStatusDescCol = headers.find(h => h.toLowerCase().includes('work order status desc'));
      const employeeIdCol = headers.find(h => h.toLowerCase().includes('employee id'));
      const employeeNameCol = headers.find(h => h.toLowerCase().includes('employee name'));
      const assignDateTimeCol = headers.find(h => h.toLowerCase().includes('assign date time'));

      // 1. Log de création du ticket (Open Date)
      if (openDateCol && row[openDateCol]) {
        logs.push({
          id: logId++,
          action: 'Création du ticket',
          description: 'Ticket créé dans le système',
          date: fixEncoding(String(row[openDateCol])),
          type: 'creation',
          icon: '📝'
        });
      }

      // 2. Log d'ouverture du ticket (Open Time)
      if (openTimeCol && row[openTimeCol]) {
        logs.push({
          id: logId++,
          action: 'Ouverture du ticket',
          description: 'Ticket ouvert pour traitement',
          date: fixEncoding(String(row[openTimeCol])),
          type: 'opening',
          icon: '🔓'
        });
      }

      // 3. Log de dernière action (Last Code, Last Code Desc, Last Code Date Time)
      if (lastCodeDateTimeCol && row[lastCodeDateTimeCol]) {
        const lastCode = lastCodeCol && row[lastCodeCol] ? fixEncoding(String(row[lastCodeCol])) : '';
        const lastCodeDesc = lastCodeDescCol && row[lastCodeDescCol] ? fixEncoding(String(row[lastCodeDescCol])) : '';
        
        logs.push({
          id: logId++,
          action: 'Dernière action',
          description: `Code: ${lastCode}${lastCodeDesc ? ` - ${lastCodeDesc}` : ''}`,
          date: fixEncoding(String(row[lastCodeDateTimeCol])),
          type: 'action',
          icon: '⚡'
        });
      }

      // 4. Log de statut (Work Order Status)
      if (workOrderStatusIdCol && row[workOrderStatusIdCol]) {
        const statusId = fixEncoding(String(row[workOrderStatusIdCol]));
        const statusDesc = workOrderStatusDescCol && row[workOrderStatusDescCol] ? fixEncoding(String(row[workOrderStatusDescCol])) : '';
        
        logs.push({
          id: logId++,
          action: 'Changement de statut',
          description: `Statut: ${statusId}${statusDesc ? ` - ${statusDesc}` : ''}`,
          date: new Date().toLocaleDateString('fr-FR'),
          type: 'action',
          icon: '📊'
        });
      }

      // 5. Log d'assignation (Employee)
      if (employeeIdCol && row[employeeIdCol]) {
        const employeeId = fixEncoding(String(row[employeeIdCol]));
        const employeeName = employeeNameCol && row[employeeNameCol] ? fixEncoding(String(row[employeeNameCol])) : '';
        const assignDate = assignDateTimeCol && row[assignDateTimeCol] ? fixEncoding(String(row[assignDateTimeCol])) : new Date().toLocaleDateString('fr-FR');
        
        logs.push({
          id: logId++,
          action: 'Assignation',
          description: `Assigné à: ${employeeId}${employeeName ? ` (${employeeName})` : ''}`,
          date: assignDate,
          type: 'assignment',
          icon: '👤'
        });
      }

      // Trier les logs par date (plus récent en premier)
      logs.sort((a, b) => {
        try {
          const dateA = new Date(a.date.split(' ')[0].split('/').reverse().join('-'));
          const dateB = new Date(b.date.split(' ')[0].split('/').reverse().join('-'));
          return dateB.getTime() - dateA.getTime();
        } catch {
          return 0;
        }
      });

      return logs;
    };

    const fetchTicketLogs = async () => {
      setLoadingLogs(true);
      try {
        // Trouver les identifiants du ticket
        const workOrderColumns = headers.filter(h => 
          h.toLowerCase().includes('work order number') || 
          h.toLowerCase().includes('workordernumber')
        );
        const customerRefColumns = headers.filter(h => 
          h.toLowerCase().includes('customer reference') || 
          h.toLowerCase().includes('customerreference')
        );

        const workOrderNumber = workOrderColumns.length > 0 ? String(row[workOrderColumns[0]] || '') : '';
        const customerReference = customerRefColumns.length > 0 ? String(row[customerRefColumns[0]] || '') : '';

        if (workOrderNumber || customerReference) {
          const params = new URLSearchParams();
          params.append('singleTicket', 'true');
          if (workOrderNumber) {
            console.log('Recherche avec workOrderNumber:', workOrderNumber);
            params.append('workOrderNumber', workOrderNumber);
          }
          if (customerReference) {
            console.log('Recherche avec customerReference:', customerReference);
            params.append('customerReference', customerReference);
          }
          
          console.log('URL finale:', `/api/tickets?${params.toString()}`);
          const response = await fetch(`/api/tickets?${params.toString()}`);

          if (response.ok) {
            const { ticket }: { ticket: TicketWithLogs } = await response.json();
            setTicketLogs(ticket.logs || []);
          } else {
            // Fallback: générer les logs à partir des données Excel si pas trouvé en DB
            setTicketLogs(createFallbackLogs());
          }
        } else {
          // Pas d'identifiants, générer les logs à partir des données Excel
          setTicketLogs(createFallbackLogs());
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des logs:', error);
        // Fallback en cas d'erreur
        setTicketLogs(createFallbackLogs());
      } finally {
        setLoadingLogs(false);
      }
    };

    fetchTicketLogs();
  }, [isOpen, row, headers]);

  if (!isOpen || !row) return null;

  // Fonction pour générer les logs du ticket
  const generateTicketLogs = (): TicketLog[] => {
    const logs: TicketLog[] = [];
    let logId = 1;

    // Trouver les colonnes nécessaires
    const openDateCol = headers.find(h => h.toLowerCase().includes('open date'));
    const openTimeCol = headers.find(h => h.toLowerCase().includes('open time'));
    const lastCodeCol = headers.find(h => h.toLowerCase().includes('last code') && !h.toLowerCase().includes('desc') && !h.toLowerCase().includes('date'));
    const lastCodeDescCol = headers.find(h => h.toLowerCase().includes('last code desc'));
    const lastCodeDateTimeCol = headers.find(h => h.toLowerCase().includes('last code date time'));
    const workOrderStatusIdCol = headers.find(h => h.toLowerCase().includes('work order status id'));
    const workOrderStatusDescCol = headers.find(h => h.toLowerCase().includes('work order status desc'));
    const employeeIdCol = headers.find(h => h.toLowerCase().includes('employee id'));
    const employeeNameCol = headers.find(h => h.toLowerCase().includes('employee name'));
    const assignDateTimeCol = headers.find(h => h.toLowerCase().includes('assign date time'));

    // 1. Log de création du ticket (Open Date)
    if (openDateCol && row[openDateCol]) {
      logs.push({
        id: logId++,
        action: 'Création du ticket',
        description: 'Ticket créé dans le système',
        date: fixEncoding(String(row[openDateCol])),
        type: 'creation',
        icon: '📝'
      });
    }

    // 2. Log d'ouverture du ticket (Open Time)
    if (openTimeCol && row[openTimeCol]) {
      logs.push({
        id: logId++,
        action: 'Ouverture du ticket',
        description: 'Ticket ouvert pour traitement',
        date: fixEncoding(String(row[openTimeCol])),
        type: 'opening',
        icon: '🔓'
      });
    }

    // 3. Log de dernière action (Last Code, Last Code Desc, Last Code Date Time)
    if (lastCodeDateTimeCol && row[lastCodeDateTimeCol]) {
      const lastCode = lastCodeCol && row[lastCodeCol] ? fixEncoding(String(row[lastCodeCol])) : '';
      const lastCodeDesc = lastCodeDescCol && row[lastCodeDescCol] ? fixEncoding(String(row[lastCodeDescCol])) : '';
      
      logs.push({
        id: logId++,
        action: 'Dernière action',
        description: `${lastCode}${lastCodeDesc ? ` - ${lastCodeDesc}` : ''}`,
        date: fixEncoding(String(row[lastCodeDateTimeCol])),
        type: 'action',
        icon: '⚡'
      });
    }

    // 4. Log d'assignation (si assigné à quelqu'un)
    if (employeeIdCol && employeeNameCol && row[employeeIdCol] && row[employeeNameCol] && assignDateTimeCol && row[assignDateTimeCol]) {
      const employeeId = fixEncoding(String(row[employeeIdCol]));
      const employeeName = fixEncoding(String(row[employeeNameCol]));
      const workOrderStatusId = workOrderStatusIdCol && row[workOrderStatusIdCol] ? fixEncoding(String(row[workOrderStatusIdCol])) : '';
      const workOrderStatusDesc = workOrderStatusDescCol && row[workOrderStatusDescCol] ? fixEncoding(String(row[workOrderStatusDescCol])) : '';
      
      logs.push({
        id: logId++,
        action: 'Assignation',
        description: `Assigné à ${employeeId} - ${employeeName}${workOrderStatusDesc ? ` (${workOrderStatusDesc})` : ''}`,
        date: fixEncoding(String(row[assignDateTimeCol])),
        type: 'assignment',
        icon: '👤'
      });
    }

    // Trier les logs par date (plus récent en premier)
    return logs.filter(log => log.date && log.date !== '-').sort((a, b) => {
      const dateA = new Date(a.date.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$2/$1/$3'));
      const dateB = new Date(b.date.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$2/$1/$3'));
      return dateB.getTime() - dateA.getTime();
    });
  };



  // Trouver les champs clés
  const workOrderNumber = headers.find(h => 
    h.toLowerCase().includes('work order number') || h.toLowerCase().includes('workordernumber')
  );
  const customerRef = headers.find(h => 
    h.toLowerCase().includes('customer reference') || h.toLowerCase().includes('customerreference')
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content row-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Détails de la ligne</h2>
          <div className="modal-subtitle">
            {(() => {
              const workOrderValue = workOrderNumber && row[workOrderNumber] ? String(row[workOrderNumber]) : null;
              return workOrderValue ? (
                <span className="detail-badge work-order">
                  Work Order: {fixEncoding(workOrderValue)}
                </span>
              ) : null;
            })()}
            {(() => {
              const customerRefValue = customerRef && row[customerRef] ? String(row[customerRef]) : null;
              return customerRefValue ? (
                <span className="detail-badge customer-ref">
                  Ref Client: {fixEncoding(customerRefValue)}
                </span>
              ) : null;
            })()}
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body-two-columns">
          {/* Colonne détails à gauche */}
          <div className="details-column">
            <div className="column-header">
              <h3 className="details-title">Détails</h3>
            </div>
            <div className="scrollable-content">
              <div className="details-grid">
                {headers.map((header, index) => {
                  const value = row[header];
                  const displayValue = value ? fixEncoding(String(value)) : '-';
                  
                  return (
                    <div key={index} className="detail-item">
                      <div className="detail-label">{fixEncoding(header)}</div>
                      <div className="detail-value">{displayValue}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Colonne logs à droite */}
          <div className="logs-column">
            <div className="column-header">
              <h3 className="logs-title">Logs</h3>
            </div>
            <div className="scrollable-content">
              <div className="logs-timeline">
                {ticketLogs.length > 0 ? (
                  ticketLogs.map((log) => (
                    <div key={log.id} className={`log-item log-${log.type}`}>
                      <div className="log-icon">{log.icon}</div>
                      <div className="log-content">
                        <div className="log-action">{log.action}</div>
                        <div className="log-description">{log.description}</div>
                        <div className="log-date">{log.date}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-logs">
                    <div className="no-logs-icon">📋</div>
                    <p>Aucun historique disponible</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardContent({ user }: DashboardContentProps) {
  const [excelData, setExcelData] = useState<ExcelData>({
    headers: [],
    data: [],
    filename: null,
    uploadedBy: null,
    uploadedAt: null,
    rowCount: 0,
    columnCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [selectedRow, setSelectedRow] = useState<RowDetail | null>(null);
  const [showRowDetails, setShowRowDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filteredData, setFilteredData] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    fetchExcelData();
  }, []);

  // Effet pour filtrer les données quand le terme de recherche change
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(excelData.data);
      return;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    
    // Trouver les colonnes Work Order Number et Customer Reference Number
    const workOrderColumns = excelData.headers.filter(header => 
      header.toLowerCase().includes('work order number') || 
      header.toLowerCase().includes('workordernumber') ||
      header.toLowerCase().includes('work order') ||
      header.toLowerCase().includes('workorder')
    );
    
    const customerRefColumns = excelData.headers.filter(header => 
      header.toLowerCase().includes('customer reference') || 
      header.toLowerCase().includes('customerreference') ||
      header.toLowerCase().includes('customer ref') ||
      header.toLowerCase().includes('ref client') ||
      header.toLowerCase().includes('référence client')
    );

    const filtered = excelData.data.filter(row => {
      // Rechercher dans les colonnes Work Order
      const workOrderMatch = workOrderColumns.some(col => {
        const value = row[col];
        return value && String(value).toLowerCase().includes(searchLower);
      });

      // Rechercher dans les colonnes Customer Reference
      const customerRefMatch = customerRefColumns.some(col => {
        const value = row[col];
        return value && String(value).toLowerCase().includes(searchLower);
      });

      return workOrderMatch || customerRefMatch;
    });

    setFilteredData(filtered);
  }, [searchTerm, excelData.data, excelData.headers]);

  // Fonction pour corriger les problèmes d'encodage
  const fixEncoding = (text: string): string => {
    if (typeof text !== 'string') return String(text);
    
    return text
      .replace(/Ã©/g, 'é')
      .replace(/Ã¨/g, 'è')
      .replace(/Ã /g, 'à')
      .replace(/Ã¢/g, 'â')
      .replace(/Ã´/g, 'ô')
      .replace(/Ã»/g, 'û')
      .replace(/Ã®/g, 'î')
      .replace(/Ã§/g, 'ç')
      .replace(/Ã±/g, 'ñ')
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"')
      .replace(/â€¦/g, '...')
      .replace(/â€"/g, '–')
      .replace(/â€"/g, '—')
      .replace(/�/g, ''); // Supprimer les caractères de remplacement
  };

  const fetchExcelData = async () => {
    try {
      const response = await fetch("/api/excel");
      if (response.ok) {
        const data = await response.json();
        setExcelData(data);
        setFilteredData(data.data || []);
        // Initialiser toutes les colonnes comme visibles par défaut
        if (data.headers && data.headers.length > 0) {
          setVisibleColumns(data.headers);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données Excel:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/excel", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Fichier importé avec succès: ${result.rowCount} lignes, ${result.columnCount} colonnes`);
        setSearchTerm("");
        await fetchExcelData(); // Recharger les données
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.error}`);
      }
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
      alert("Erreur lors de l'upload du fichier");
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = "";
    }
  };

  const clearData = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer toutes les données ?")) {
      return;
    }

    try {
      const response = await fetch("/api/excel", {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Données supprimées avec succès");
        setSearchTerm("");
        await fetchExcelData();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.error}`);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert("Erreur lors de la suppression");
    }
  };

  const toggleColumn = (columnName: string) => {
    setVisibleColumns(prev => {
      if (prev.includes(columnName)) {
        return prev.filter(col => col !== columnName);
      } else {
        return [...prev, columnName];
      }
    });
  };

  const toggleAllColumns = () => {
    if (visibleColumns.length === excelData.headers.length) {
      setVisibleColumns([]);
    } else {
      setVisibleColumns(excelData.headers);
    }
  };

  const handleRowClick = (row: RowDetail) => {
    setSelectedRow(row);
    setShowRowDetails(true);
  };

  const closeRowDetails = () => {
    setShowRowDetails(false);
    setSelectedRow(null);
  };

  if (loading) {
    return (
      <div className="content-section">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-section">
      <div className="section-header">
        <h2 className="section-title">Tableau de bord</h2>
        <p className="section-subtitle">Données Excel importées</p>
      </div>

      {/* Actions admin */}
      {user?.role === "admin" && (
        <div className="excel-actions">
          <div className="action-group">
            <label className="upload-btn">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ display: "none" }}
              />
              <span className="upload-icon">📁</span>
              <span>{uploading ? "Import en cours..." : "Importer Excel"}</span>
            </label>
            
            {excelData.filename && (
              <>
                <button 
                  onClick={() => setShowColumnSelector(!showColumnSelector)} 
                  className="column-btn"
                >
                  <span className="column-icon">🔧</span>
                  <span>Colonnes</span>
                </button>
                
                <button onClick={clearData} className="clear-btn">
                  <span className="clear-icon">🗑️</span>
                  <span>Effacer les données</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sélecteur de colonnes (admin uniquement) */}
      {user?.role === "admin" && showColumnSelector && excelData.headers.length > 0 && (
        <div className="column-selector">
          <div className="selector-header">
            <h4>Sélectionner les colonnes à afficher</h4>
            <button onClick={toggleAllColumns} className="toggle-all-btn">
              {visibleColumns.length === excelData.headers.length ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          </div>
          <div className="columns-grid">
            {excelData.headers.map((header) => (
              <label key={header} className="column-checkbox">
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(header)}
                  onChange={() => toggleColumn(header)}
                />
                <span className="checkbox-label">{fixEncoding(header)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Barre de recherche */}
      {excelData.headers.length > 0 && (
        <div className="search-section">
          <div className="search-container">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Rechercher par Work Order Number ou Customer Reference Number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm("")}
                  className="clear-search-btn"
                  title="Effacer la recherche"
                >
                  ✕
                </button>
              )}
            </div>
            {searchTerm && (
              <div className="search-results-info">
                <span className="results-count">
                  {filteredData.length} résultat{filteredData.length !== 1 ? 's' : ''} trouvé{filteredData.length !== 1 ? 's' : ''}
                  {filteredData.length !== excelData.data.length && ` sur ${excelData.data.length} ticket${excelData.data.length !== 1 ? 's' : ''}`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tableau des données */}
      {excelData.headers.length > 0 ? (
        <div className="excel-table-container">
          <div className="excel-table-wrapper">
            <table className="excel-table">
              <thead>
                <tr>
                  {visibleColumns.map((header, index) => (
                    <th key={index}>{fixEncoding(header)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="clickable-row" onClick={() => handleRowClick(row)}>
                    {visibleColumns.map((header, colIndex) => (
                      <td key={colIndex}>
                        {fixEncoding(String(row[header] || ""))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h4>Aucune donnée</h4>
          <p>
            {user?.role === "admin" 
              ? "Importez un fichier Excel pour commencer" 
              : "Aucun fichier Excel n'a été importé pour le moment"
            }
          </p>
        </div>
      )}

      {/* Modal des détails de ligne */}
      <RowDetailsModal 
        row={selectedRow}
        headers={excelData.headers}
        isOpen={showRowDetails}
        onClose={closeRowDetails}
      />
    </div>
  );
}

function ClosedContent() {
  const [closedTickets, setClosedTickets] = useState<TicketWithLogs[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [selectedRow, setSelectedRow] = useState<RowDetail | null>(null);
  const [showRowDetails, setShowRowDetails] = useState(false);

  useEffect(() => {
    fetchClosedTickets();
  }, []);

  const fetchClosedTickets = async () => {
    try {
      // Récupérer tous les tickets fermés (limit=10000 pour avoir tous les tickets)
      const response = await fetch("/api/tickets?status=closed&limit=10000");
      if (response.ok) {
        const data = await response.json();
        setClosedTickets(data.tickets || []);
        if (data.tickets && data.tickets.length > 0 && data.tickets[0].headers) {
          setVisibleColumns(data.tickets[0].headers);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des tickets fermés:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (row: RowDetail) => {
    setSelectedRow(row);
    setShowRowDetails(true);
  };

  const closeRowDetails = () => {
    setShowRowDetails(false);
    setSelectedRow(null);
  };

  if (loading) {
    return (
      <div className="content-section">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Chargement des tickets fermés...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-section">
      <div className="section-header">
        <h2 className="section-title">Tickets Fermés</h2>
        <p className="section-subtitle">Tickets absents du dernier import • {closedTickets.length} ticket(s)</p>
      </div>

      {closedTickets.length > 0 ? (
        <div className="excel-table-container">
          <div className="excel-table-wrapper">
            <table className="excel-table">
              <thead>
                <tr>
                  {visibleColumns.map((header, index) => (
                    <th key={index} className="excel-header">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {closedTickets.map((ticket, rowIndex) => (
                  <tr key={rowIndex} className="clickable-row" onClick={() => handleRowClick(ticket.rawData)}>
                    {visibleColumns.map((header, colIndex) => (
                      <td key={colIndex} className="excel-cell">
                        {String(ticket.rawData[header] || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="no-data">
          <div className="no-data-icon">🔒</div>
          <h3>Aucun ticket fermé</h3>
          <p>Tous les tickets sont présents dans le dernier import.</p>
        </div>
      )}

      {/* Modal des détails de ligne */}
      <RowDetailsModal 
        row={selectedRow}
        headers={visibleColumns}
        isOpen={showRowDetails}
        onClose={closeRowDetails}
      />
    </div>
  );
}

function UnassignedContent() {
  const [excelData, setExcelData] = useState<ExcelData>({
    headers: [],
    data: [],
    filename: null,
    uploadedBy: null,
    uploadedAt: null,
    rowCount: 0,
    columnCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [selectedRow, setSelectedRow] = useState<RowDetail | null>(null);
  const [showRowDetails, setShowRowDetails] = useState(false);

  useEffect(() => {
    fetchExcelData();
  }, []);

  const fetchExcelData = async () => {
    try {
      const response = await fetch("/api/excel");
      if (response.ok) {
        const data = await response.json();
        setExcelData(data);
        if (data.headers && data.headers.length > 0) {
          setVisibleColumns(data.headers);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données Excel:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les données non attribuées
  const getUnassignedData = () => {
    if (!excelData.data || excelData.data.length === 0) return [];
    
    const employeeIdIndex = excelData.headers.findIndex(header => 
      header.toLowerCase().includes('employee id') || header.toLowerCase().includes('employeeid')
    );
    const employeeNameIndex = excelData.headers.findIndex(header => 
      header.toLowerCase().includes('employee name') || header.toLowerCase().includes('employeename')
    );
    const workOrderStatusIdIndex = excelData.headers.findIndex(header => 
      header.toLowerCase().includes('work order status id') || header.toLowerCase().includes('workorderstatusid')
    );
    const workOrderStatusDescIndex = excelData.headers.findIndex(header => 
      header.toLowerCase().includes('work order status desc') || header.toLowerCase().includes('workorderstatusdesc')
    );
    
    if (employeeIdIndex === -1 || employeeNameIndex === -1) return [];
    
    const employeeIdHeader = excelData.headers[employeeIdIndex];
    const employeeNameHeader = excelData.headers[employeeNameIndex];
    const workOrderStatusIdHeader = workOrderStatusIdIndex !== -1 ? excelData.headers[workOrderStatusIdIndex] : null;
    const workOrderStatusDescHeader = workOrderStatusDescIndex !== -1 ? excelData.headers[workOrderStatusDescIndex] : null;
    
    return excelData.data.filter(row => {
      const employeeId = String(row[employeeIdHeader] || '').trim();
      const employeeName = String(row[employeeNameHeader] || '').trim();
      const workOrderStatusId = workOrderStatusIdHeader ? String(row[workOrderStatusIdHeader] || '').trim().toLowerCase() : '';
      const workOrderStatusDesc = workOrderStatusDescHeader ? String(row[workOrderStatusDescHeader] || '').trim().toLowerCase() : '';
      
      // Vérifier que Employee ID et Employee Name sont vides
      const hasNoEmployee = !employeeId || !employeeName;
      
      // Vérifier que Work Order Status est TBP
      const isTBP = workOrderStatusId === 'tbp' || workOrderStatusDesc.includes('to be planned') || workOrderStatusDesc === 'tbp';
      
      return hasNoEmployee && isTBP;
    });
  };

  const unassignedData = getUnassignedData();

  const handleRowClick = (row: RowDetail) => {
    setSelectedRow(row);
    setShowRowDetails(true);
  };

  const closeRowDetails = () => {
    setShowRowDetails(false);
    setSelectedRow(null);
  };

  if (loading) {
    return (
      <div className="content-section">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-section">
      <div className="section-header">
        <h2 className="section-title">Tâches Non Attribuées</h2>
        <p className="section-subtitle">Tâches sans employé assigné • Status: TBP (To be planned) • {unassignedData.length} ligne(s)</p>
      </div>

      {/* Tableau des données non attribuées */}
      {unassignedData.length > 0 ? (
        <div className="excel-table-container">
          <div className="excel-table-wrapper">
            <table className="excel-table">
              <thead>
                <tr>
                  {visibleColumns.map((header, index) => (
                    <th key={index} className="excel-header">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unassignedData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="clickable-row" onClick={() => handleRowClick(row)}>
                    {visibleColumns.map((header, colIndex) => (
                      <td key={colIndex} className="excel-cell">
                        {String(row[header] || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="no-data">
          <div className="no-data-icon">📋</div>
          <h3>Aucune tâche non attribuée</h3>
          <p>Toutes les tâches avec le statut "TBP" ont été attribuées à des employés.</p>
        </div>
      )}

      {/* Modal des détails de ligne */}
      <RowDetailsModal 
        row={selectedRow}
        headers={excelData.headers}
        isOpen={showRowDetails}
        onClose={closeRowDetails}
      />
    </div>
  );
}

function EmployeeContent({ employeeKey }: EmployeeContentProps) {
  const [excelData, setExcelData] = useState<ExcelData>({
    headers: [],
    data: [],
    filename: null,
    uploadedBy: null,
    uploadedAt: null,
    rowCount: 0,
    columnCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [selectedRow, setSelectedRow] = useState<RowDetail | null>(null);
  const [showRowDetails, setShowRowDetails] = useState(false);

  useEffect(() => {
    fetchExcelData();
  }, []);

  const fetchExcelData = async () => {
    try {
      const response = await fetch("/api/excel");
      if (response.ok) {
        const data = await response.json();
        setExcelData(data);
        if (data.headers && data.headers.length > 0) {
          setVisibleColumns(data.headers);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données Excel:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les données pour cet employé spécifique
  const getEmployeeData = () => {
    if (!excelData.data || excelData.data.length === 0) return [];
    
    const [employeeId, employeeName] = employeeKey.split('-');
    
    const employeeIdIndex = excelData.headers.findIndex(header => 
      header.toLowerCase().includes('employee id') || header.toLowerCase().includes('employeeid')
    );
    const employeeNameIndex = excelData.headers.findIndex(header => 
      header.toLowerCase().includes('employee name') || header.toLowerCase().includes('employeename')
    );
    
    if (employeeIdIndex === -1 || employeeNameIndex === -1) return [];
    
    const employeeIdHeader = excelData.headers[employeeIdIndex];
    const employeeNameHeader = excelData.headers[employeeNameIndex];
    
    return excelData.data.filter(row => {
      const rowId = String(row[employeeIdHeader] || '').trim();
      const rowName = String(row[employeeNameHeader] || '').trim();
      return rowId === employeeId && rowName === employeeName;
    });
  };

  const employeeData = getEmployeeData();
  const [employeeId, employeeName] = employeeKey.split('-');

  const handleRowClick = (row: RowDetail) => {
    setSelectedRow(row);
    setShowRowDetails(true);
  };

  const closeRowDetails = () => {
    setShowRowDetails(false);
    setSelectedRow(null);
  };

  if (loading) {
    return (
      <div className="content-section">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-section">
      <div className="section-header">
        <h2 className="section-title">Employé: {employeeName}</h2>
        <p className="section-subtitle">ID: {employeeId} • {employeeData.length} ligne(s)</p>
      </div>

      {/* Tableau des données de l'employé */}
      {employeeData.length > 0 ? (
        <div className="excel-table-container">
          <div className="excel-table-wrapper">
            <table className="excel-table">
              <thead>
                <tr>
                  {visibleColumns.map((header, index) => (
                    <th key={index}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employeeData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="clickable-row" onClick={() => handleRowClick(row)}>
                    {visibleColumns.map((header, colIndex) => (
                      <td key={colIndex}>
                        {String(row[header] || "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <h4>Aucune donnée</h4>
          <p>Aucune donnée trouvée pour cet employé</p>
        </div>
      )}

      {/* Modal des détails de ligne */}
      <RowDetailsModal 
        row={selectedRow}
        headers={excelData.headers}
        isOpen={showRowDetails}
        onClose={closeRowDetails}
      />
    </div>
  );
}

function AdminUsersContent({ onBack }: AdminUsersContentProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userEmail: string, newRole: string) => {
    try {
      const response = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, role: newRole }),
      });
      if (response.ok) {
        fetchUsers(); // Recharger les utilisateurs
      } else {
        const errorData = await response.json();
        console.error("Erreur API:", errorData.error);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du rôle:", error);
    }
  };

  const deleteUser = async (userEmail: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${userEmail} ?`)) {
      return;
    }

    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });
      if (response.ok) {
        fetchUsers(); // Recharger les utilisateurs
      } else {
        const errorData = await response.json();
        alert(`Erreur: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de l'utilisateur:", error);
      alert("Erreur lors de la suppression de l'utilisateur");
    }
  };

  return (
    <div className="admin-panel">
      <div className="panel-header">
        <button onClick={onBack} className="back-button">
          <span className="back-icon">←</span>
          <span>Retour</span>
        </button>
        <div className="panel-title">
          <h3>Gestion des utilisateurs</h3>
          <p>Administrer les comptes et rôles</p>
        </div>
      </div>
      
      <div className="panel-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Chargement des utilisateurs...</p>
          </div>
        ) : (
          <div className="data-grid">
            {users.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <h4>Aucun utilisateur</h4>
                <p>Aucun utilisateur n&apos;a été trouvé dans le système.</p>
              </div>
            ) : (
              <div className="items-list">
                {users.map((user) => (
                  <div key={user.id} className="data-item user-card">
                    <div className="item-main">
                      <div className="user-avatar-mini">
                        {user.email[0]?.toUpperCase()}
                      </div>
                      <div className="item-info">
                        <div className="item-primary">{user.email}</div>
                        <div className={`item-badge ${user.role}`}>
                          {user.role === "admin" ? "Administrateur" : "Utilisateur"}
                        </div>
                      </div>
                    </div>
                    <div className="item-actions">
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.email, e.target.value)}
                        className="role-selector"
                      >
                        <option value="user">Utilisateur</option>
                        <option value="admin">Administrateur</option>
                      </select>
                      <button
                        onClick={() => deleteUser(user.email)}
                        className="action-btn delete"
                        title="Supprimer cet utilisateur"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminEmailsContent({ onBack }: AdminEmailsContentProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    try {
      const response = await fetch("/api/admin/allowed-emails");
      if (response.ok) {
        const data = await response.json();
        // L'API retourne directement un tableau d'objets avec email
        const emailStrings = data.map((item: { email: string }) => item.email);
        setEmails(emailStrings);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des emails:", error);
    } finally {
      setLoading(false);
    }
  };

  const addEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      const response = await fetch("/api/admin/allowed-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      if (response.ok) {
        setNewEmail("");
        fetchEmails(); // Recharger les emails
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'email:", error);
    }
  };

  const removeEmail = async (email: string) => {
    try {
      const response = await fetch(`/api/admin/allowed-emails?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchEmails(); // Recharger les emails
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de l'email:", error);
    }
  };

  return (
    <div className="admin-panel">
      <div className="panel-header">
        <button onClick={onBack} className="back-button">
          <span className="back-icon">←</span>
          <span>Retour</span>
        </button>
        <div className="panel-title">
          <h3>E-mails autorisés</h3>
          <p>Configuration des accès et autorisations</p>
        </div>
      </div>
      
      <div className="panel-content">
        <form onSubmit={addEmail} className="add-form">
          <div className="form-group">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="exemple@domaine.com"
              className="form-input"
              required
            />
            <button type="submit" className="form-submit">
              <span className="submit-icon">+</span>
              <span>Ajouter</span>
            </button>
          </div>
        </form>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Chargement des emails...</p>
          </div>
        ) : (
          <div className="data-grid">
            {emails.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📧</div>
                <h4>Aucun email autorisé</h4>
                <p>Aucun email n&apos;est actuellement autorisé à s&apos;inscrire.</p>
              </div>
            ) : (
              <div className="items-list">
                {emails.map((email) => (
                  <div key={email} className="data-item email-card">
                    <div className="item-main">
                      <div className="email-icon">📧</div>
                      <div className="item-info">
                        <div className="item-primary">{email}</div>
                        <div className="item-secondary">Email autorisé</div>
                      </div>
                    </div>
                    <div className="item-actions">
                      <button
                        onClick={() => removeEmail(email)}
                        className="action-btn remove"
                      >
                        <span className="action-icon">🗑️</span>
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface AdminEmployeeLinksContentProps {
  onBack: () => void;
}

function AdminEmployeeLinksContent({ onBack }: AdminEmployeeLinksContentProps) {
  const [users, setUsers] = useState<UserWithEmployee[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<AvailableEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    fetchEmployeeLinks();
  }, []);

  const fetchEmployeeLinks = async () => {
    try {
      const response = await fetch("/api/admin/employee-link");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setAvailableEmployees(data.availableEmployees || []);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des liaisons:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkEmployee = async () => {
    if (!selectedUser) {
      alert("Veuillez sélectionner un utilisateur");
      return;
    }

    setIsLinking(true);
    
    try {
      let employeeId = "";
      let employeeName = "";
      
      if (selectedEmployee) {
        const [id, name] = selectedEmployee.split('-');
        employeeId = id;
        employeeName = name;
      }

      const response = await fetch("/api/admin/employee-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: selectedUser,
          employeeId: employeeId,
          employeeName: employeeName
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        setSelectedUser("");
        setSelectedEmployee("");
        await fetchEmployeeLinks();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.error}`);
      }
    } catch (error) {
      console.error("Erreur lors de la liaison:", error);
      alert("Erreur lors de la liaison");
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkEmployee = async (userEmail: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la liaison pour ${userEmail} ?`)) {
      return;
    }

    try {
      const response = await fetch("/api/admin/employee-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: userEmail
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        await fetchEmployeeLinks();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.error}`);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de la liaison:", error);
      alert("Erreur lors de la suppression de la liaison");
    }
  };

  return (
    <div className="admin-panel">
      <div className="panel-header">
        <button onClick={onBack} className="back-button">
          <span className="back-icon">←</span>
          <span>Retour</span>
        </button>
        <div className="panel-title">
          <h3>Liaisons Employés</h3>
          <p>Lier les comptes utilisateurs aux employés Excel</p>
        </div>
      </div>
      
      <div className="panel-content">
        {/* Formulaire de liaison */}
        <div className="link-form">
          <h4>Créer une nouvelle liaison</h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: 'var(--spacing-md)' }}>
            Seuls les utilisateurs et employés non liés sont disponibles dans les listes.
          </p>
          <div className="form-row">
            <div className="form-group">
              <label>Utilisateur:</label>
              <select 
                value={selectedUser} 
                onChange={(e) => setSelectedUser(e.target.value)}
                className="form-select"
              >
                <option value="">Sélectionner un utilisateur</option>
                {users.filter(user => user.role !== "admin" && !user.employee?.linked).length === 0 ? (
                  <option value="" disabled>Aucun utilisateur disponible</option>
                ) : (
                  users.filter(user => user.role !== "admin" && !user.employee?.linked).map((user) => (
                    <option key={user.id} value={user.email}>
                      {user.email}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="form-group">
              <label>Employé:</label>
              <select 
                value={selectedEmployee} 
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="form-select"
              >
                <option value="">Aucun (supprimer la liaison)</option>
                {availableEmployees.filter(emp => {
                  // Filtrer les employés déjà liés à d'autres utilisateurs
                  const isLinked = users.some(user => 
                    user.employee?.linked && 
                    user.employee?.id === emp.id && 
                    user.employee?.name === emp.name
                  );
                  return !isLinked;
                }).length === 0 ? (
                  <option value="" disabled>Aucun employé disponible</option>
                ) : (
                  availableEmployees.filter(emp => {
                    // Filtrer les employés déjà liés à d'autres utilisateurs
                    const isLinked = users.some(user => 
                      user.employee?.linked && 
                      user.employee?.id === emp.id && 
                      user.employee?.name === emp.name
                    );
                    return !isLinked;
                  }).map((emp) => (
                    <option key={emp.fullKey} value={emp.fullKey}>
                      {emp.id} - {emp.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <button 
              onClick={handleLinkEmployee}
              disabled={isLinking || !selectedUser}
              className="link-btn"
            >
              {isLinking ? "Liaison..." : "Lier"}
            </button>
          </div>
        </div>

        {/* Section de modification des liaisons existantes */}
        {users.filter(user => user.employee?.linked).length > 0 && (
          <div className="link-form">
            <h4>Modifier une liaison existante</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: 'var(--spacing-md)' }}>
              Changez l&apos;employé lié à un utilisateur ou supprimez la liaison.
            </p>
            <div className="form-row">
              <div className="form-group">
                <label>Utilisateur lié:</label>
                <select 
                  value={selectedUser} 
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="form-select"
                >
                  <option value="">Sélectionner un utilisateur à modifier</option>
                  {users.filter(user => user.employee?.linked).map((user) => (
                    <option key={user.id} value={user.email}>
                      {user.email} (actuellement: {user.employee?.id} - {user.employee?.name})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Nouvel employé:</label>
                <select 
                  value={selectedEmployee} 
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="form-select"
                >
                  <option value="">Supprimer la liaison</option>
                  {availableEmployees.filter(emp => {
                    // Pour la modification, on inclut l'employé actuellement lié à cet utilisateur
                    const currentUserEmployee = users.find(u => u.email === selectedUser)?.employee;
                    const isCurrentEmployee = currentUserEmployee?.id === emp.id && currentUserEmployee?.name === emp.name;
                    
                    // Filtrer les employés déjà liés à d'autres utilisateurs (sauf l'employé actuel)
                    const isLinkedToOther = users.some(user => 
                      user.email !== selectedUser &&
                      user.employee?.linked && 
                      user.employee?.id === emp.id && 
                      user.employee?.name === emp.name
                    );
                    
                    return isCurrentEmployee || !isLinkedToOther;
                  }).map((emp) => (
                    <option key={emp.fullKey} value={emp.fullKey}>
                      {emp.id} - {emp.name}
                    </option>
                  ))}
                </select>
              </div>
              <button 
                onClick={handleLinkEmployee}
                disabled={isLinking || !selectedUser}
                className="link-btn"
                style={{ backgroundColor: '#f59e0b' }}
              >
                {isLinking ? "Modification..." : "Modifier"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Chargement des liaisons...</p>
          </div>
        ) : (
          <div className="data-grid">
            <h4>Liaisons existantes</h4>
            {users.filter(user => user.employee?.linked).length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔗</div>
                <h4>Aucune liaison</h4>
                <p>Aucun utilisateur n&apos;est actuellement lié à un employé.</p>
              </div>
            ) : (
              <div className="items-list">
                {users.filter(user => user.employee?.linked).map((user) => (
                  <div key={user.id} className="data-item link-card">
                    <div className="item-main">
                      <div className="link-icon">🔗</div>
                      <div className="item-info">
                        <div className="item-primary">{user.email}</div>
                        <div className="item-secondary">
                          Lié à: {user.employee?.id} - {user.employee?.name}
                        </div>
                      </div>
                    </div>
                    <div className="item-actions">
                      <button
                        onClick={() => handleUnlinkEmployee(user.email)}
                        className="action-btn remove"
                      >
                        <span className="action-icon">🗑️</span>
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [adminSubTab, setAdminSubTab] = useState("overview");
  const [operatorsExpanded, setOperatorsExpanded] = useState(true);
  const [excelData, setExcelData] = useState<ExcelData>({
    headers: [],
    data: [],
    filename: null,
    uploadedBy: null,
    uploadedAt: null,
    rowCount: 0,
    columnCount: 0
  });

  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const userData = await response.json();
        console.log("User data received:", userData);
        setUser(userData);
      } else {
        router.push("/signin");
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur:", error);
      router.push("/signin");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUser();
    fetchExcelData(); // Tous les utilisateurs chargent les données Excel
  }, [fetchUser]);

  const fetchExcelData = async () => {
    try {
      const response = await fetch("/api/excel");
      if (response.ok) {
        const data = await response.json();
        setExcelData(data);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données Excel:", error);
    }
  };

  // Extraire les employés uniques des données Excel
  const getUniqueEmployees = () => {
    if (!excelData.data || excelData.data.length === 0) return [];
    
    const employeeIdIndex = excelData.headers.findIndex(header => 
      header.toLowerCase().includes('employee id') || header.toLowerCase().includes('employeeid')
    );
    const employeeNameIndex = excelData.headers.findIndex(header => 
      header.toLowerCase().includes('employee name') || header.toLowerCase().includes('employeename')
    );
    
    if (employeeIdIndex === -1 || employeeNameIndex === -1) return [];
    
    const employeeIdHeader = excelData.headers[employeeIdIndex];
    const employeeNameHeader = excelData.headers[employeeNameIndex];
    
    const uniqueEmployees = new Set<string>();
    const employees: Array<{id: string, name: string, fullKey: string}> = [];
    
    excelData.data.forEach(row => {
      const id = String(row[employeeIdHeader] || '').trim();
      const name = String(row[employeeNameHeader] || '').trim();
      
      if (id && name) {
        const fullKey = `${id}-${name}`;
        if (!uniqueEmployees.has(fullKey)) {
          uniqueEmployees.add(fullKey);
          employees.push({ id, name, fullKey });
        }
      }
    });
    
    return employees.sort((a, b) => a.name.localeCompare(b.name));
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        router.push("/signin");
      } else {
        alert("Erreur lors de la déconnexion");
      }
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      alert("Erreur lors de la déconnexion");
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Chargement...</p>
      </div>
    );
  }

  // Tous les utilisateurs voient tous les onglets employés
  const employees = getUniqueEmployees();
  
  // Trouver l'employé lié à l'utilisateur
  const userLinkedEmployee = user?.employee?.linked && user?.employee?.id && user?.employee?.name 
    ? employees.find(emp => emp.id === user?.employee?.id && emp.name === user?.employee?.name)
    : null;

  const tabs = [
    { id: "dashboard", label: "Tableau de bord", icon: "📊" },
    { id: "closed", label: "Fermé", icon: "🔒" },
    { id: "unassigned", label: "Non attribué", icon: "❓" }
  ];
  
  // Onglet employé lié (affiché séparément)
  const linkedEmployeeTab = userLinkedEmployee ? [{
    id: `employee-${userLinkedEmployee.fullKey}`,
    label: `Mon profil: ${userLinkedEmployee.name}`,
    icon: "👨‍💼"
  }] : [];
  
  // Tous les autres employés (sans celui lié à l'utilisateur)
  const otherEmployeeTabs = employees
    .filter(emp => !userLinkedEmployee || emp.fullKey !== userLinkedEmployee.fullKey)
    .map(emp => ({
      id: `employee-${emp.fullKey}`,
      label: `${emp.id}-${emp.name}`,
      icon: "👤"
    }));
  
  const adminTabs = user?.role === "admin" ? [{ id: "admin", label: "Panel Admin", icon: "🔧" }] : [];

  const renderContent = () => {
    // Gérer les onglets d'employés
    if (activeTab.startsWith("employee-")) {
      const employeeKey = activeTab.replace("employee-", "");
      return <EmployeeContent employeeKey={employeeKey} />;
    }
    
    switch (activeTab) {
      case "dashboard":
        return <DashboardContent user={user} />;
      case "closed":
        return <ClosedContent />;
      case "unassigned":
        return <UnassignedContent />;
      case "admin":
        return (
          <div className="content-section">
            <div className="section-header">
              <h2 className="section-title">Panel Admin</h2>
              <p className="section-subtitle">Gestion et administration de la plateforme</p>
            </div>
            
            <div className="admin-content">
              {adminSubTab === "overview" && (
                <div className="admin-overview">
                  <div className="admin-cards-grid">
                    <button 
                      className="admin-card"
                      onClick={() => setAdminSubTab("users")}
                    >
                      <div className="admin-card-icon users">👥</div>
                      <div className="admin-card-content">
                        <h3>Gestion Utilisateurs</h3>
                        <p>Gérer les comptes et les rôles des utilisateurs</p>
                        <div className="admin-card-arrow">→</div>
                      </div>
                    </button>
                    <button 
                      className="admin-card"
                      onClick={() => setAdminSubTab("emails")}
                    >
                      <div className="admin-card-icon emails">📧</div>
                      <div className="admin-card-content">
                        <h3>E-mails Autorisés</h3>
                        <p>Configuration des accès et autorisations</p>
                        <div className="admin-card-arrow">→</div>
                      </div>
                    </button>
                    <button 
                      className="admin-card"
                      onClick={() => setAdminSubTab("employee-links")}
                    >
                      <div className="admin-card-icon employee-links">🔗</div>
                      <div className="admin-card-content">
                        <h3>Liaisons Employés</h3>
                        <p>Lier les comptes utilisateurs aux employés Excel</p>
                        <div className="admin-card-arrow">→</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
              
              {adminSubTab === "users" && (
                <AdminUsersContent onBack={() => setAdminSubTab("overview")} />
              )}
              
              {adminSubTab === "emails" && (
                <AdminEmailsContent onBack={() => setAdminSubTab("overview")} />
              )}

              {adminSubTab === "employee-links" && (
                <AdminEmployeeLinksContent onBack={() => setAdminSubTab("overview")} />
              )}
            </div>
          </div>
        );
      default:
        return (
          <div className="content-section">
            <div className="error-content">
              <h2>Contenu non trouvé</h2>
              <p>La section demandée n&apos;existe pas.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="modern-dashboard">
      {/* Background animé */}
      <div className="dashboard-bg">
        <div className="dashboard-gradient"></div>
        <div className="dashboard-particles">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${15 + Math.random() * 10}s`
            }}></div>
          ))}
        </div>
      </div>

      {/* Container principal */}
      <div className="dashboard-container">
        {/* Navigation sidebar */}
        <aside className="dashboard-nav">
          {/* Header avec logo et info utilisateur */}
          <div className="nav-header">
            <div className="dashboard-logo">
              <div className="logo-ring">
                <span className="logo-text">N</span>
              </div>
              <h1 className="dashboard-title">Novalist</h1>
            </div>
            <div className="user-profile">
              <div className="user-avatar">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="user-details">
                <div className="user-name">{user?.email}</div>
                <div className={`user-badge ${user?.role}`}>
                  {user?.role === "admin" ? "Administrateur" : "Utilisateur"}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation menu */}
          <nav className="nav-menu">
            {/* Onglets principaux */}
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-item ${activeTab === tab.id ? "active" : ""}`}
              >
                <span className="nav-icon">{tab.icon}</span>
                <span className="nav-text">{tab.label}</span>
                <div className="nav-indicator"></div>
              </button>
            ))}
            
            {/* Onglet employé lié (affiché séparément) */}
            {linkedEmployeeTab.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-item linked-employee ${activeTab === tab.id ? "active" : ""}`}
              >
                <span className="nav-icon">{tab.icon}</span>
                <span className="nav-text">{tab.label}</span>
                <div className="nav-indicator"></div>
              </button>
            ))}
            
            {/* Onglet Opérateurs pliable */}
            {otherEmployeeTabs.length > 0 && (
              <>
                <button
                  onClick={() => setOperatorsExpanded(!operatorsExpanded)}
                  className={`nav-item parent-item ${operatorsExpanded ? 'expanded' : ''}`}
                >
                  <span className="nav-icon">👥</span>
                  <span className="nav-text">Opérateurs</span>
                  <span className={`nav-chevron ${operatorsExpanded ? 'expanded' : ''}`}>▼</span>
                </button>
                
                {/* Sous-onglets employés */}
                <div className={`nav-submenu ${operatorsExpanded ? 'expanded' : 'collapsed'}`}>
                  {otherEmployeeTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`nav-item sub-item ${activeTab === tab.id ? "active" : ""}`}
                    >
                      <span className="nav-icon">{tab.icon}</span>
                      <span className="nav-text">{tab.label}</span>
                      <div className="nav-indicator"></div>
                    </button>
                  ))}
                </div>
              </>
            )}
            
            {/* Onglets admin à la fin */}
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-item ${activeTab === tab.id ? "active" : ""}`}
              >
                <span className="nav-icon">{tab.icon}</span>
                <span className="nav-text">{tab.label}</span>
                <div className="nav-indicator"></div>
              </button>
            ))}
          </nav>

          {/* Footer avec logout */}
          <div className="nav-footer">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="logout-btn"
            >
              <span className="logout-icon">🚪</span>
              <span className="logout-text">
                {loggingOut ? "Déconnexion..." : "Se déconnecter"}
              </span>
            </button>
          </div>
        </aside>

        {/* Contenu principal */}
        <main className="dashboard-content">
          <div className="content-wrapper">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
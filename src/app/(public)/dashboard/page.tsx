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
  canSelfAssign?: boolean;  // Si l'utilisateur peut récupérer le ticket
  onSelfAssign?: () => void;  // Callback après récupération réussie
  user?: User | null;  // Informations de l'utilisateur
  onNotification?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;  // Afficher une notification
  canTransfer?: boolean;  // Si l'admin peut transférer le ticket
  allEmployees?: AvailableEmployee[];  // Liste de tous les employés pour le transfert
  onTransfer?: () => void;  // Callback après transfert réussi
  canTakeForSelf?: boolean;  // Si l'opérateur peut récupérer le ticket pour lui-même
  onTakeForSelf?: () => void;  // Callback après récupération réussie
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
  excelData?: ExcelData;
  loading?: boolean;
}

interface EmployeeContentProps {
  employeeKey: string;
  user?: User | null;
  allEmployees?: AvailableEmployee[];
  onDataRefresh?: () => void;
}

function RowDetailsModal({ row, headers, isOpen, onClose, canSelfAssign, onSelfAssign, user, onNotification, canTransfer, allEmployees, onTransfer, canTakeForSelf, onTakeForSelf }: RowDetailsModalProps) {
  const [ticketLogs, setTicketLogs] = useState<TicketLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedEmployeeForTransfer, setSelectedEmployeeForTransfer] = useState<string>("");
  const [transferring, setTransferring] = useState(false);
  const [lastCodeInfo, setLastCodeInfo] = useState<{ lastCodeDateTime: string; hoursElapsed: number; canTransfer: boolean } | null>(null);
  const [showTakeForSelfModal, setShowTakeForSelfModal] = useState(false);
  const [takingForSelf, setTakingForSelf] = useState(false);
  const [takeLastCodeInfo, setTakeLastCodeInfo] = useState<{ lastCodeDateTime: string; hoursElapsed: number; canTake: boolean } | null>(null);

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

  // Fonction pour récupérer le ticket
  const handleSelfAssign = async () => {
    if (!row || recovering) return;

    setRecovering(true);
    try {
      // Trouver le ticketId
      const workOrderValue = workOrderNumber && row[workOrderNumber] ? String(row[workOrderNumber]) : '';
      
      if (!workOrderValue) {
        if (onNotification) {
          onNotification('error', 'Erreur', 'Impossible de trouver le numéro de ticket');
        }
        setRecovering(false);
        return;
      }

      // Récupérer le ticket depuis l'API pour obtenir son ID
      const params = new URLSearchParams();
      params.append('singleTicket', 'true');
      params.append('workOrderNumber', workOrderValue);
      
      const ticketResponse = await fetch(`/api/tickets?${params.toString()}`);
      if (!ticketResponse.ok) {
        throw new Error('Ticket non trouvé');
      }

      const { ticket } = await ticketResponse.json();

      // Appeler l'API de récupération
      const response = await fetch('/api/tickets/self-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket._id })
      });

      if (response.ok) {
        if (onNotification) {
          onNotification('success', 'Ticket récupéré', `Le ticket ${workOrderValue} vous a été assigné avec succès`);
        }
        onClose();
        if (onSelfAssign) {
          onSelfAssign();
        }
      } else {
        const error = await response.json();
        if (onNotification) {
          onNotification('error', 'Erreur de récupération', error.error || 'Impossible de récupérer le ticket');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération:', error);
      if (onNotification) {
        onNotification('error', 'Erreur', 'Une erreur est survenue lors de la récupération du ticket');
      }
    } finally {
      setRecovering(false);
    }
  };

  const handleOpenTransferModal = () => {
    // Calculer les informations sur le délai de 24h
    if (row) {
      const lastCodeDateTimeCol = headers.find(h => h.toLowerCase().includes('last code date time'));
      const employeeIdCol = headers.find(h => h.toLowerCase().includes('employee id'));
      const employeeNameCol = headers.find(h => h.toLowerCase().includes('employee name'));
      
      const currentEmployeeId = employeeIdCol ? String(row[employeeIdCol] || '').trim() : '';
      const currentEmployeeName = employeeNameCol ? String(row[employeeNameCol] || '').trim() : '';
      const isAssigned = currentEmployeeId !== '' && currentEmployeeName !== '';
      
      if (isAssigned && lastCodeDateTimeCol && row[lastCodeDateTimeCol]) {
        const lastCodeDateTimeStr = String(row[lastCodeDateTimeCol]);
        try {
          const [datePart, timePart] = lastCodeDateTimeStr.split(' ');
          const [day, month, year] = datePart.split('/').map(Number);
          const [hours, minutes, seconds] = timePart.split(':').map(Number);
          
          const lastCodeDateTime = new Date(year, month - 1, day, hours, minutes, seconds);
          const now = new Date();
          const diffInHours = (now.getTime() - lastCodeDateTime.getTime()) / (1000 * 60 * 60);
          
          setLastCodeInfo({
            lastCodeDateTime: lastCodeDateTimeStr,
            hoursElapsed: parseFloat(diffInHours.toFixed(1)),
            canTransfer: diffInHours >= 24
          });
        } catch (error) {
          console.error('Erreur parsing date:', error);
          setLastCodeInfo(null);
        }
      } else {
        setLastCodeInfo(null);
      }
    }
    setShowTransferModal(true);
  };

  const handleOpenTakeForSelfModal = () => {
    // Calculer les informations sur le délai de 24h pour la récupération
    if (row) {
      const lastCodeDateTimeCol = headers.find(h => h.toLowerCase().includes('last code date time'));
      const employeeIdCol = headers.find(h => h.toLowerCase().includes('employee id'));
      const employeeNameCol = headers.find(h => h.toLowerCase().includes('employee name'));
      
      const currentEmployeeId = employeeIdCol ? String(row[employeeIdCol] || '').trim() : '';
      const currentEmployeeName = employeeNameCol ? String(row[employeeNameCol] || '').trim() : '';
      const isAssigned = currentEmployeeId !== '' && currentEmployeeName !== '';
      
      if (isAssigned && lastCodeDateTimeCol && row[lastCodeDateTimeCol]) {
        const lastCodeDateTimeStr = String(row[lastCodeDateTimeCol]);
        try {
          const [datePart, timePart] = lastCodeDateTimeStr.split(' ');
          const [day, month, year] = datePart.split('/').map(Number);
          const [hours, minutes, seconds] = timePart.split(':').map(Number);
          
          const lastCodeDateTime = new Date(year, month - 1, day, hours, minutes, seconds);
          const now = new Date();
          const diffInHours = (now.getTime() - lastCodeDateTime.getTime()) / (1000 * 60 * 60);
          
          setTakeLastCodeInfo({
            lastCodeDateTime: lastCodeDateTimeStr,
            hoursElapsed: parseFloat(diffInHours.toFixed(1)),
            canTake: diffInHours >= 24
          });
        } catch (error) {
          console.error('Erreur parsing date:', error);
          setTakeLastCodeInfo(null);
        }
      } else {
        setTakeLastCodeInfo(null);
      }
    }
    setShowTakeForSelfModal(true);
  };

  const handleTransferTicket = async () => {
    if (!selectedEmployeeForTransfer || !row) return;

    setTransferring(true);
    try {
      // Récupérer les informations du ticket
      const workOrderNumber = headers.find(h => h.toLowerCase().includes('work order number'));
      const customerRef = headers.find(h => h.toLowerCase().includes('customer reference'));
      const workOrderValue = workOrderNumber && row[workOrderNumber] ? String(row[workOrderNumber]) : null;
      const customerRefValue = customerRef && row[customerRef] ? String(row[customerRef]) : null;

      if (!workOrderValue && !customerRefValue) {
        if (onNotification) {
          onNotification('error', 'Erreur', 'Impossible d\'identifier le ticket');
        }
        return;
      }

      // Récupérer le ticket pour avoir son ID
      const params = new URLSearchParams();
      if (workOrderValue) params.append('workOrderNumber', workOrderValue);
      if (customerRefValue) params.append('customerReference', customerRefValue);
      params.append('singleTicket', 'true');
      
      const ticketResponse = await fetch(`/api/tickets?${params.toString()}`);
      if (!ticketResponse.ok) {
        throw new Error('Ticket non trouvé');
      }

      const { ticket } = await ticketResponse.json();

      // Extraire l'ID et le nom de l'employé sélectionné
      const selectedEmployee = allEmployees?.find(emp => emp.fullKey === selectedEmployeeForTransfer);
      if (!selectedEmployee) {
        if (onNotification) {
          onNotification('error', 'Erreur', 'Employé sélectionné invalide');
        }
        return;
      }

      // Appeler l'API de transfert
      const response = await fetch('/api/tickets/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ticketId: ticket._id,
          employeeId: selectedEmployee.id,
          employeeName: selectedEmployee.name
        })
      });

      if (response.ok) {
        const result = await response.json();
        const message = result.isTransfer 
          ? `Le ticket a été transféré avec succès vers ${selectedEmployee.name}`
          : `Le ticket a été assigné avec succès à ${selectedEmployee.name}`;
          
        if (onNotification) {
          onNotification('success', result.isTransfer ? 'Transfert réussi ✅' : 'Assignation réussie ✅', message);
        }
        setShowTransferModal(false);
        setSelectedEmployeeForTransfer("");
        onClose();
        if (onTransfer) {
          onTransfer();
        }
      } else {
        const error = await response.json();
        
        // Message personnalisé selon le type d'erreur
        let errorTitle = 'Erreur ❌';
        let errorMessage = error.error || 'Impossible de transférer le ticket';
        
        // Si c'est une erreur de délai de 24h, afficher un message spécifique
        if (error.hoursRemaining) {
          errorTitle = '⏰ Délai de 24h non écoulé';
          errorMessage = `Dernière action il y a ${error.hoursElapsed}h. Vous devez attendre encore ${error.hoursRemaining}h avant de pouvoir transférer ce ticket.`;
        }
        
        if (onNotification) {
          onNotification('error', errorTitle, errorMessage);
        }
      }
    } catch (error) {
      console.error('Erreur lors du transfert:', error);
      if (onNotification) {
        onNotification('error', 'Erreur', 'Une erreur est survenue lors du transfert du ticket');
      }
    } finally {
      setTransferring(false);
    }
  };

  const handleTakeForSelf = async () => {
    if (!row || !user?.employee?.linked) return;

    setTakingForSelf(true);
    try {
      // Récupérer les informations du ticket
      const workOrderNumber = headers.find(h => h.toLowerCase().includes('work order number'));
      const customerRef = headers.find(h => h.toLowerCase().includes('customer reference'));
      const workOrderValue = workOrderNumber && row[workOrderNumber] ? String(row[workOrderNumber]) : null;
      const customerRefValue = customerRef && row[customerRef] ? String(row[customerRef]) : null;

      if (!workOrderValue && !customerRefValue) {
        if (onNotification) {
          onNotification('error', 'Erreur', 'Impossible d\'identifier le ticket');
        }
        return;
      }

      // Récupérer le ticket pour avoir son ID
      const params = new URLSearchParams();
      if (workOrderValue) params.append('workOrderNumber', workOrderValue);
      if (customerRefValue) params.append('customerReference', customerRefValue);
      params.append('singleTicket', 'true');
      
      const ticketResponse = await fetch(`/api/tickets?${params.toString()}`);
      if (!ticketResponse.ok) {
        throw new Error('Ticket non trouvé');
      }

      const { ticket } = await ticketResponse.json();

      // Appeler l'API de transfert avec les infos de l'utilisateur connecté
      const response = await fetch('/api/tickets/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: ticket._id,
          employeeId: user.employee.id,
          employeeName: user.employee.name
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (onNotification) {
          onNotification('success', 'Récupération réussie ✅', `Le ticket a été transféré avec succès vers votre file d'attente`);
        }
        setShowTakeForSelfModal(false);
        onClose();
        if (onTakeForSelf) {
          onTakeForSelf();
        }
      } else {
        const error = await response.json();
        
        // Message personnalisé selon le type d'erreur
        let errorTitle = 'Erreur ❌';
        let errorMessage = error.error || 'Impossible de récupérer le ticket';
        
        // Si c'est une erreur de délai de 24h, afficher un message spécifique
        if (error.hoursRemaining) {
          errorTitle = '⏰ Délai de 24h non écoulé';
          errorMessage = `Dernière action il y a ${error.hoursElapsed}h. Vous devez attendre encore ${error.hoursRemaining}h avant de pouvoir récupérer ce ticket.`;
        }
        
        if (onNotification) {
          onNotification('error', errorTitle, errorMessage);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération:', error);
      if (onNotification) {
        onNotification('error', 'Erreur', 'Une erreur est survenue lors de la récupération du ticket');
      }
    } finally {
      setTakingForSelf(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content row-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Détails de la ligne</h2>
          <div className="modal-subtitle">
            {canSelfAssign && user && user.employee?.linked && (
              <button 
                onClick={handleSelfAssign}
                disabled={recovering}
                className="self-assign-btn"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: recovering ? 'not-allowed' : 'pointer',
                  opacity: recovering ? 0.6 : 1,
                  transition: 'all 0.3s ease',
                  marginRight: '12px',
                  fontSize: '14px'
                }}
              >
                {recovering ? '⏳ Récupération...' : '🎯 Récupérer ce ticket'}
              </button>
            )}
            {canTransfer && user?.role === 'admin' && allEmployees && allEmployees.length > 0 && (
              <button 
                onClick={handleOpenTransferModal}
                disabled={transferring}
                className="transfer-btn"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: transferring ? 'not-allowed' : 'pointer',
                  opacity: transferring ? 0.6 : 1,
                  transition: 'all 0.3s ease',
                  marginRight: '12px',
                  fontSize: '14px'
                }}
              >
                {transferring ? '⏳ Transfert...' : '🔀 Transférer ce ticket'}
              </button>
            )}
            {canTakeForSelf && user?.role === 'user' && user?.employee?.linked && (
              <button 
                onClick={handleOpenTakeForSelfModal}
                disabled={takingForSelf}
                className="take-for-self-btn"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: takingForSelf ? 'not-allowed' : 'pointer',
                  opacity: takingForSelf ? 0.6 : 1,
                  transition: 'all 0.3s ease',
                  marginRight: '12px',
                  fontSize: '14px'
                }}
              >
                {takingForSelf ? '⏳ Récupération...' : '📥 Récupérer pour moi'}
              </button>
            )}
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

      {/* Modal de transfert */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)} style={{ zIndex: 10000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ 
            maxWidth: '550px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '2px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div className="modal-header" style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white',
              padding: '24px',
              borderRadius: '12px 12px 0 0',
              marginBottom: '0'
            }}>
              <h2 className="modal-title" style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '20px' }}>
                <span style={{ fontSize: '28px' }}>🔀</span>
                Transférer le ticket
              </h2>
              <button className="modal-close" onClick={() => setShowTransferModal(false)} style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              {/* Information sur le délai de 24h */}
              {lastCodeInfo && (
                <div style={{
                  background: lastCodeInfo.canTransfer ? '#f0fdf4' : '#fef2f2',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: `2px solid ${lastCodeInfo.canTransfer ? '#86efac' : '#fca5a5'}`
                }}>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '20px' }}>
                      {lastCodeInfo.canTransfer ? '✅' : '⏰'}
                    </span>
                    <strong style={{ 
                      color: lastCodeInfo.canTransfer ? '#166534' : '#991b1b',
                      fontSize: '15px'
                    }}>
                      {lastCodeInfo.canTransfer ? 'Transfert autorisé' : 'Délai de 24h non écoulé'}
                    </strong>
                  </div>
                  <p style={{ 
                    margin: 0, 
                    color: lastCodeInfo.canTransfer ? '#166534' : '#991b1b',
                    fontSize: '13px',
                    lineHeight: '1.5'
                  }}>
                    Dernière action : {lastCodeInfo.lastCodeDateTime}<br />
                    Temps écoulé : <strong>{lastCodeInfo.hoursElapsed}h</strong> / 24h requises
                    {!lastCodeInfo.canTransfer && (
                      <>
                        <br />
                        <strong>Temps restant : {(24 - lastCodeInfo.hoursElapsed).toFixed(1)}h</strong>
                      </>
                    )}
                  </p>
                </div>
              )}
              
              <div style={{
                background: '#f1f5f9',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #e2e8f0'
              }}>
                <p style={{ 
                  margin: 0, 
                  color: '#475569',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '18px' }}>ℹ️</span>
                  Sélectionnez l&apos;opérateur vers qui vous souhaitez transférer ce ticket
                </p>
              </div>
              
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#334155',
                fontWeight: '600',
                fontSize: '14px'
              }}>
                Nouvel opérateur
              </label>
              <select
                value={selectedEmployeeForTransfer}
                onChange={(e) => setSelectedEmployeeForTransfer(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: '2px solid #cbd5e1',
                  fontSize: '15px',
                  marginBottom: '24px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: '#1e293b',
                  fontWeight: '500'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              >
                <option value="" style={{ color: '#94a3b8' }}>-- Choisir un opérateur --</option>
                {allEmployees?.map((emp) => (
                  <option key={emp.fullKey} value={emp.fullKey}>
                    👤 {emp.name} (ID: {emp.id})
                  </option>
                ))}
              </select>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowTransferModal(false)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: '2px solid #e2e8f0',
                    background: 'white',
                    color: '#64748b',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  ❌ Annuler
                </button>
                <button
                  onClick={handleTransferTicket}
                  disabled={!selectedEmployeeForTransfer || transferring || (lastCodeInfo && !lastCodeInfo.canTransfer)}
                  style={{
                    padding: '12px 28px',
                    borderRadius: '8px',
                    border: 'none',
                    background: selectedEmployeeForTransfer && !transferring && (!lastCodeInfo || lastCodeInfo.canTransfer)
                      ? 'linear-gradient(135deg, #10b981, #059669)' 
                      : '#cbd5e1',
                    color: 'white',
                    fontWeight: '600',
                    cursor: selectedEmployeeForTransfer && !transferring && (!lastCodeInfo || lastCodeInfo.canTransfer) ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    boxShadow: selectedEmployeeForTransfer && !transferring && (!lastCodeInfo || lastCodeInfo.canTransfer)
                      ? '0 4px 12px rgba(16, 185, 129, 0.4)' 
                      : 'none',
                    transform: 'translateY(0)'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedEmployeeForTransfer && !transferring && (!lastCodeInfo || lastCodeInfo.canTransfer)) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = selectedEmployeeForTransfer && !transferring && (!lastCodeInfo || lastCodeInfo.canTransfer)
                      ? '0 4px 12px rgba(16, 185, 129, 0.4)' 
                      : 'none';
                  }}
                >
                  {transferring ? '⏳ Transfert en cours...' : '✅ Confirmer le transfert'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de récupération de ticket (opérateur) */}
      {showTakeForSelfModal && (
        <div className="modal-overlay" onClick={() => setShowTakeForSelfModal(false)}>
          <div className="modal-content transfer-modal" onClick={(e) => e.stopPropagation()} style={{
            maxWidth: '500px',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <div className="modal-header" style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              padding: '24px',
              borderRadius: '16px 16px 0 0'
            }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>📥 Récupérer ce ticket</h2>
              <button 
                onClick={() => setShowTakeForSelfModal(false)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '24px' }}>
              {/* Information sur le délai de 24h */}
              {takeLastCodeInfo && (
                <div style={{
                  background: takeLastCodeInfo.canTake ? '#f0fdf4' : '#fef2f2',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: `2px solid ${takeLastCodeInfo.canTake ? '#86efac' : '#fca5a5'}`
                }}>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '20px' }}>
                      {takeLastCodeInfo.canTake ? '✅' : '⏰'}
                    </span>
                    <strong style={{ 
                      color: takeLastCodeInfo.canTake ? '#166534' : '#991b1b',
                      fontSize: '15px'
                    }}>
                      {takeLastCodeInfo.canTake ? 'Récupération autorisée' : 'Délai de 24h non écoulé'}
                    </strong>
                  </div>
                  <p style={{ 
                    margin: 0, 
                    color: takeLastCodeInfo.canTake ? '#166534' : '#991b1b',
                    fontSize: '13px',
                    lineHeight: '1.5'
                  }}>
                    Dernière action : {takeLastCodeInfo.lastCodeDateTime}<br />
                    Temps écoulé : <strong>{takeLastCodeInfo.hoursElapsed}h</strong> / 24h requises
                    {!takeLastCodeInfo.canTake && (
                      <>
                        <br />
                        <strong>Temps restant : {(24 - takeLastCodeInfo.hoursElapsed).toFixed(1)}h</strong>
                      </>
                    )}
                  </p>
                </div>
              )}
              
              <div style={{
                background: '#fef3c7',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #fbbf24'
              }}>
                <p style={{ 
                  margin: 0, 
                  color: '#78350f',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '18px' }}>⚠️</span>
                  Ce ticket sera transféré de l&apos;opérateur actuel vers votre file d&apos;attente
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowTakeForSelfModal(false)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: '2px solid #e2e8f0',
                    background: 'white',
                    color: '#64748b',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  ❌ Annuler
                </button>
                <button
                  onClick={handleTakeForSelf}
                  disabled={takingForSelf || (takeLastCodeInfo && !takeLastCodeInfo.canTake)}
                  style={{
                    padding: '12px 28px',
                    borderRadius: '8px',
                    border: 'none',
                    background: !takingForSelf && (!takeLastCodeInfo || takeLastCodeInfo.canTake)
                      ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                      : '#cbd5e1',
                    color: 'white',
                    fontWeight: '600',
                    cursor: !takingForSelf && (!takeLastCodeInfo || takeLastCodeInfo.canTake) ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    boxShadow: !takingForSelf && (!takeLastCodeInfo || takeLastCodeInfo.canTake)
                      ? '0 4px 12px rgba(245, 158, 11, 0.4)' 
                      : 'none',
                    transform: 'translateY(0)'
                  }}
                  onMouseEnter={(e) => {
                    if (!takingForSelf && (!takeLastCodeInfo || takeLastCodeInfo.canTake)) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = !takingForSelf && (!takeLastCodeInfo || takeLastCodeInfo.canTake)
                      ? '0 4px 12px rgba(245, 158, 11, 0.4)' 
                      : 'none';
                  }}
                >
                  {takingForSelf ? '⏳ Récupération en cours...' : '✅ Confirmer la récupération'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface Notification {
  id: number;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface DragStartHandler {
  (ticket: { ticketId: string; workOrderNumber: string; status: string } | null): void;
}

function DashboardContent({ user, onDataRefresh, onDragStart, isAdmin, excelData: parentExcelData, loading: parentLoading }: DashboardContentProps & { 
  onDataRefresh?: () => void;
  onDragStart?: DragStartHandler;
  isAdmin?: boolean;
}) {
  const [excelData, setExcelData] = useState<ExcelData>(parentExcelData || {
    headers: [],
    data: [],
    filename: null,
    uploadedBy: null,
    uploadedAt: null,
    rowCount: 0,
    columnCount: 0
  });
  const [loading, setLoading] = useState(parentLoading ?? true);
  const [uploading, setUploading] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [selectedRow, setSelectedRow] = useState<RowDetail | null>(null);
  const [showRowDetails, setShowRowDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filteredData, setFilteredData] = useState<Record<string, unknown>[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Synchroniser les données du parent
  useEffect(() => {
    if (parentExcelData) {
      console.log('[DashboardContent] Synchronisation des données du parent:', {
        rowCount: parentExcelData.data?.length,
        headers: parentExcelData.headers?.length
      });
      setExcelData(parentExcelData);
      setFilteredData(parentExcelData.data || []);
      // Initialiser les colonnes visibles
      if (parentExcelData.headers && parentExcelData.headers.length > 0) {
        setVisibleColumns(parentExcelData.headers);
      }
      setLoading(false);
    }
  }, [parentExcelData]);

  // Mettre à jour le selectedRow si le modal est ouvert et que les données ont changé
  useEffect(() => {
    console.log('[DashboardContent] Check update selectedRow:', {
      hasSelectedRow: !!selectedRow?.row,
      showRowDetails,
      dataLength: excelData.data.length
    });
    
    if (selectedRow?.row && showRowDetails && excelData.data.length > 0) {
      // Trouver le header du Work Order Number pour identifier le ticket
      const workOrderHeader = excelData.headers.find(h => 
        h.toLowerCase().includes('work order number') || h.toLowerCase().includes('workordernumber')
      );
      
      console.log('[DashboardContent] workOrderHeader:', workOrderHeader);
      
      if (workOrderHeader && selectedRow.row[workOrderHeader]) {
        const currentWorkOrder = selectedRow.row[workOrderHeader];
        console.log('[DashboardContent] Recherche du ticket:', currentWorkOrder);
        
        // Chercher le ticket mis à jour dans les nouvelles données
        const updatedRow = excelData.data.find(row => 
          row[workOrderHeader] === currentWorkOrder
        );
        
        if (updatedRow) {
          console.log('[DashboardContent] Ticket trouvé, mise à jour:', {
            oldEmployeeId: selectedRow.row['Employee ID'],
            newEmployeeId: updatedRow['Employee ID'],
            oldStatus: selectedRow.row['Work Order Status ID'],
            newStatus: updatedRow['Work Order Status ID']
          });
          
          // Mettre à jour selectedRow avec les nouvelles données
          setSelectedRow({
            row: updatedRow,
            headers: excelData.headers
          });
        } else {
          console.log('[DashboardContent] Ticket non trouvé dans les nouvelles données');
        }
      }
    }
  }, [excelData, showRowDetails]);

  useEffect(() => {
    if (!parentExcelData) {
      fetchExcelData();
    }
  }, [parentExcelData]);

  // Effet pour filtrer les données quand le terme de recherche change
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(excelData.data || []);
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

  const showNotification = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, title, message }]);
    
    // Auto-remove après 5 secondes
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
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
        showNotification(
          'success',
          'Import réussi',
          `${result.rowCount} lignes et ${result.columnCount} colonnes importées`
        );
        setSearchTerm("");
        await fetchExcelData();
        // Rafraîchir les données du parent pour mettre à jour la sidebar
        if (onDataRefresh) {
          onDataRefresh();
        }
      } else {
        const error = await response.json();
        showNotification('error', 'Erreur d\'import', error.error || 'Une erreur est survenue');
      }
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
      showNotification('error', 'Erreur d\'upload', 'Impossible de télécharger le fichier');
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const clearData = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    
    try {
      const response = await fetch("/api/excel", {
        method: "DELETE",
      });

      if (response.ok) {
        showNotification('success', 'Suppression réussie', 'Toutes les données ont été supprimées');
        setSearchTerm("");
        await fetchExcelData();
        if (onDataRefresh) {
          onDataRefresh();
        }
      } else {
        const error = await response.json();
        showNotification('error', 'Erreur de suppression', error.error || 'Impossible de supprimer les données');
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      showNotification('error', 'Erreur de suppression', 'Une erreur est survenue');
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
                {filteredData.map((row, rowIndex) => {
                  const statusIdCol = excelData.headers.find(h => h.toLowerCase().includes('work order status id'));
                  const status = statusIdCol ? String(row[statusIdCol] || '') : '';
                  const isTBP = status === 'TBP';
                  const canDrag = isAdmin && isTBP;
                  
                  // Trouver les colonnes pour l'ID du ticket
                  const workOrderCol = excelData.headers.find(h => 
                    h.toLowerCase().includes('work order number') || h.toLowerCase().includes('workordernumber')
                  );
                  const customerRefCol = excelData.headers.find(h => 
                    h.toLowerCase().includes('customer reference number') || h.toLowerCase().includes('customerreferencenumber')
                  );
                  
                  const workOrderNumber = workOrderCol ? String(row[workOrderCol] || '') : '';
                  const customerRef = customerRefCol ? String(row[customerRefCol] || '') : '';
                  
                  return (
                    <tr 
                      key={rowIndex} 
                      className={`clickable-row ${canDrag ? 'draggable-row' : ''}`}
                      draggable={canDrag}
                      onDragStart={(e) => {
                        if (canDrag && onDragStart) {
                          e.dataTransfer.effectAllowed = 'move';
                          e.currentTarget.classList.add('dragging');
                          // Récupérer l'ID du ticket depuis la DB
                          fetch(`/api/tickets?workOrderNumber=${encodeURIComponent(workOrderNumber)}&singleTicket=true`)
                            .then(res => res.json())
                            .then(data => {
                              if (data.ticket) {
                                onDragStart({ 
                                  ticketId: data.ticket._id, 
                                  workOrderNumber,
                                  status 
                                });
                              }
                            });
                        }
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.classList.remove('dragging');
                        if (onDragStart) {
                          onDragStart(null);
                        }
                      }}
                      onClick={() => handleRowClick(row)}
                    >
                      {visibleColumns.map((header, colIndex) => (
                        <td key={colIndex}>
                          {fixEncoding(String(row[header] || ""))}
                          {header === statusIdCol && isTBP && isAdmin && (
                            <span className="tbp-indicator">DRAG</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
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

      {/* Modale de confirmation de suppression */}
      {showDeleteConfirm && (
        <div className="confirmation-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirmation-modal-icon">⚠️</div>
            <h3 className="confirmation-modal-title">Supprimer les données ?</h3>
            <p className="confirmation-modal-message">
              Cette action est irréversible. Toutes les données Excel importées seront définitivement supprimées.
            </p>
            <div className="confirmation-modal-actions">
              <button 
                className="confirmation-btn confirmation-btn-cancel"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Annuler
              </button>
              <button 
                className="confirmation-btn confirmation-btn-confirm"
                onClick={confirmDelete}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Toast */}
      {notifications.map(notification => (
        <div key={notification.id} className={`notification-toast ${notification.type}`}>
          <div className="notification-icon">
            {notification.type === 'success' && '✓'}
            {notification.type === 'error' && '✕'}
            {notification.type === 'info' && 'ℹ'}
          </div>
          <div className="notification-content">
            <div className="notification-title">{notification.title}</div>
            <div className="notification-message">{notification.message}</div>
          </div>
          <button 
            className="notification-close"
            onClick={() => removeNotification(notification.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function ClosedContent() {
  const [closedTickets, setClosedTickets] = useState<TicketWithLogs[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [selectedRow, setSelectedRow] = useState<RowDetail | null>(null);
  const [showRowDetails, setShowRowDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchClosedTickets();
  }, []);

  // Mettre à jour le selectedRow si le modal est ouvert et que les données ont changé
  useEffect(() => {
    if (selectedRow?.row && selectedRow?.headers && showRowDetails && closedTickets.length > 0) {
      const workOrderHeader = selectedRow.headers.find(h => 
        h.toLowerCase().includes('work order number') || h.toLowerCase().includes('workordernumber')
      );
      
      if (workOrderHeader && selectedRow.row[workOrderHeader]) {
        const updatedTicket = closedTickets.find(ticket => 
          ticket.rawData && ticket.rawData[workOrderHeader] === selectedRow.row[workOrderHeader]
        );
        
        if (updatedTicket && updatedTicket.rawData) {
          setSelectedRow({
            row: updatedTicket.rawData,
            headers: updatedTicket.headers || selectedRow.headers
          });
        }
      }
    }
  }, [closedTickets, showRowDetails]);

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

  // Filtrer les tickets selon la recherche
  const filteredTickets = closedTickets.filter(ticket => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return visibleColumns.some(header => {
      const value = String(ticket.rawData[header] || '').toLowerCase();
      return value.includes(query);
    });
  });

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

      {/* Barre de recherche */}
      {closedTickets.length > 0 && (
        <div className="search-section">
          <div className="search-container">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Rechercher par Work Order Number ou Customer Reference Number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="clear-search-btn"
                  title="Effacer la recherche"
                >
                  ✕
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="search-results-info">
                <span className="results-count">
                  {filteredTickets.length} résultat{filteredTickets.length !== 1 ? 's' : ''} trouvé{filteredTickets.length !== 1 ? 's' : ''}
                  {filteredTickets.length !== closedTickets.length && ` sur ${closedTickets.length} ticket${closedTickets.length !== 1 ? 's' : ''}`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {filteredTickets.length > 0 ? (
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
                {filteredTickets.map((ticket, rowIndex) => (
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
      ) : searchQuery.trim() ? (
        <div className="no-data">
          <h3>Aucun résultat</h3>
          <p>Aucun ticket ne correspond à votre recherche "{searchQuery}"</p>
        </div>
      ) : (
        <div className="no-data">
          <h3>Aucun ticket fermé</h3>
          <p>Excellent ! Tous les tickets sont actifs et présents dans le dernier import.</p>
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

function UnassignedContent({ onDragStart, isAdmin, refreshTrigger, user }: { 
  onDragStart?: DragStartHandler;
  isAdmin?: boolean;
  refreshTrigger?: number;
  user?: User | null;
}) {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, title, message }]);
    
    // Auto-remove après 5 secondes
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    fetchExcelData();
  }, []);

  // Rafraîchir quand un ticket est assigné depuis cet onglet
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      console.log('[UnassignedContent] Refresh déclenché');
      fetchExcelData();
    }
  }, [refreshTrigger]);

  // Système de polling intelligent pour détecter les mises à jour
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const response = await fetch("/api/excel/last-update");
        if (response.ok) {
          const data = await response.json();
          const newTimestamp = data.timestamp;
          
          // Si c'est la première fois, initialiser le timestamp
          if (lastUpdateTimestamp === null) {
            setLastUpdateTimestamp(newTimestamp);
            return;
          }
          
          // Si le timestamp a changé, rafraîchir les données
          if (newTimestamp && newTimestamp > lastUpdateTimestamp) {
            console.log('[UnassignedContent - Polling] Mise à jour détectée, rechargement...');
            await fetchExcelData();
            setLastUpdateTimestamp(newTimestamp);
          }
        }
      } catch (error) {
        console.error('[UnassignedContent - Polling] Erreur:', error);
      }
    };

    // Vérifier immédiatement au montage
    checkForUpdates();

    // Vérifier toutes les 5 secondes
    const intervalId = setInterval(checkForUpdates, 5000);

    // Nettoyer l'intervalle au démontage
    return () => clearInterval(intervalId);
  }, [lastUpdateTimestamp]);

  // Optimisation: Vérifier les mises à jour quand l'onglet redevient visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[UnassignedContent - Polling] Onglet visible, vérification...');
        fetch("/api/excel/last-update")
          .then(res => res.json())
          .then(data => {
            const newTimestamp = data.timestamp;
            if (lastUpdateTimestamp && newTimestamp && newTimestamp > lastUpdateTimestamp) {
              console.log('[UnassignedContent - Polling] Mise à jour détectée après retour');
              fetchExcelData();
              setLastUpdateTimestamp(newTimestamp);
            }
          })
          .catch(err => console.error('[UnassignedContent - Polling] Erreur:', err));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [lastUpdateTimestamp]);

  // Mettre à jour le selectedRow si le modal est ouvert et que les données ont changé
  useEffect(() => {
    if (selectedRow?.row && showRowDetails && excelData.data.length > 0) {
      const workOrderHeader = excelData.headers.find(h => 
        h.toLowerCase().includes('work order number') || h.toLowerCase().includes('workordernumber')
      );
      
      if (workOrderHeader && selectedRow.row[workOrderHeader]) {
        const updatedRow = excelData.data.find(row => 
          row[workOrderHeader] === selectedRow.row[workOrderHeader]
        );
        
        if (updatedRow) {
          setSelectedRow({
            row: updatedRow,
            headers: excelData.headers
          });
        }
      }
    }
  }, [excelData.data, showRowDetails, selectedRow]);

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

  // Filtrer les données selon la recherche
  const filteredUnassignedData = unassignedData.filter(row => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return visibleColumns.some(header => {
      const value = String(row[header] || '').toLowerCase();
      return value.includes(query);
    });
  });

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

      {/* Barre de recherche */}
      {unassignedData.length > 0 && (
        <div className="search-section">
          <div className="search-container">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Rechercher par Work Order Number ou Customer Reference Number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="clear-search-btn"
                  title="Effacer la recherche"
                >
                  ✕
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="search-results-info">
                <span className="results-count">
                  {filteredUnassignedData.length} résultat{filteredUnassignedData.length !== 1 ? 's' : ''} trouvé{filteredUnassignedData.length !== 1 ? 's' : ''}
                  {filteredUnassignedData.length !== unassignedData.length && ` sur ${unassignedData.length} ticket${unassignedData.length !== 1 ? 's' : ''}`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tableau des données non attribuées */}
      {filteredUnassignedData.length > 0 ? (
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
                {filteredUnassignedData.map((row, rowIndex) => {
                  const workOrderCol = excelData.headers.find(h => 
                    h.toLowerCase().includes('work order number') || h.toLowerCase().includes('workordernumber')
                  );
                  const customerRefCol = excelData.headers.find(h => 
                    h.toLowerCase().includes('customer reference number') || h.toLowerCase().includes('customerreferencenumber')
                  );
                  const statusIdCol = excelData.headers.find(h => 
                    h.toLowerCase().includes('work order status id')
                  );
                  
                  const workOrderNumber = workOrderCol ? String(row[workOrderCol] || '') : '';
                  const status = statusIdCol ? String(row[statusIdCol] || '') : 'TBP';
                  const canDrag = isAdmin;
                  
                  return (
                    <tr 
                      key={rowIndex} 
                      className={`clickable-row ${canDrag ? 'draggable-row' : ''}`}
                      draggable={canDrag}
                      onDragStart={(e) => {
                        if (canDrag && onDragStart) {
                          e.dataTransfer.effectAllowed = 'move';
                          e.currentTarget.classList.add('dragging');
                          fetch(`/api/tickets?workOrderNumber=${encodeURIComponent(workOrderNumber)}&singleTicket=true`)
                            .then(res => res.json())
                            .then(data => {
                              if (data.ticket) {
                                onDragStart({ 
                                  ticketId: data.ticket._id, 
                                  workOrderNumber,
                                  status 
                                });
                              }
                            });
                        }
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.classList.remove('dragging');
                        if (onDragStart) {
                          onDragStart(null);
                        }
                      }}
                      onClick={() => handleRowClick(row)}
                    >
                      {visibleColumns.map((header, colIndex) => (
                        <td key={colIndex} className="excel-cell">
                          {String(row[header] || '')}
                          {header === statusIdCol && isAdmin && (
                            <span className="tbp-indicator">DRAG</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : searchQuery.trim() ? (
        <div className="no-data">
          <h3>Aucun résultat</h3>
          <p>Aucun ticket ne correspond à votre recherche "{searchQuery}"</p>
        </div>
      ) : (
        <div className="no-data">
          <h3>Aucune tâche non attribuée</h3>
          <p>Parfait ! Toutes les tâches avec le statut "TBP" ont été assignées à des employés.</p>
        </div>
      )}

      {/* Modal des détails de ligne */}
      <RowDetailsModal 
        row={selectedRow}
        headers={excelData.headers}
        isOpen={showRowDetails}
        onClose={closeRowDetails}
        canSelfAssign={!isAdmin && user?.employee?.linked}
        onSelfAssign={fetchExcelData}
        user={user}
        onNotification={showNotification}
      />

      {/* Notifications toast */}
      {notifications.map(notification => (
        <div key={notification.id} className={`notification-toast ${notification.type}`}>
          <div className="notification-content">
            <span className="notification-icon">
              {notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <div className="notification-text">
              <div className="notification-title">{notification.title}</div>
              <div className="notification-message">{notification.message}</div>
            </div>
          </div>
          <button 
            className="notification-close" 
            onClick={() => removeNotification(notification.id)}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function EmployeeContent({ employeeKey, user, allEmployees, onDataRefresh }: EmployeeContentProps) {
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
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, title, message }]);
    
    // Auto-remove après 5 secondes
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    fetchExcelData();
  }, []);

  // Mettre à jour le selectedRow si le modal est ouvert et que les données ont changé
  useEffect(() => {
    if (selectedRow?.row && showRowDetails && excelData.data.length > 0) {
      const workOrderHeader = excelData.headers.find(h => 
        h.toLowerCase().includes('work order number') || h.toLowerCase().includes('workordernumber')
      );
      
      if (workOrderHeader && selectedRow.row[workOrderHeader]) {
        const updatedRow = excelData.data.find(row => 
          row[workOrderHeader] === selectedRow.row[workOrderHeader]
        );
        
        if (updatedRow) {
          setSelectedRow({
            row: updatedRow,
            headers: excelData.headers
          });
        }
      }
    }
  }, [excelData.data, showRowDetails, selectedRow]);

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
        canTransfer={user?.role === 'admin'}
        allEmployees={allEmployees}
        onTransfer={() => {
          fetchExcelData();
          if (onDataRefresh) {
            onDataRefresh();
          }
        }}
        canTakeForSelf={user?.role === 'user' && user?.employee?.linked}
        onTakeForSelf={() => {
          fetchExcelData();
          if (onDataRefresh) {
            onDataRefresh();
          }
        }}
        user={user}
        onNotification={showNotification}
      />

      {/* Notifications toast */}
      {notifications.map(notification => (
        <div key={notification.id} className={`notification-toast ${notification.type}`}>
          <div className="notification-content">
            <span className="notification-icon">
              {notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <div className="notification-text">
              <div className="notification-title">{notification.title}</div>
              <div className="notification-message">{notification.message}</div>
            </div>
          </div>
          <button 
            className="notification-close" 
            onClick={() => removeNotification(notification.id)}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      ))}
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
  const [draggedTicket, setDraggedTicket] = useState<{ ticketId: string; workOrderNumber: string; status: string } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unassignedRefreshTrigger, setUnassignedRefreshTrigger] = useState(0);
  const [excelData, setExcelData] = useState<ExcelData>({
    headers: [],
    data: [],
    filename: null,
    uploadedBy: null,
    uploadedAt: null,
    rowCount: 0,
    columnCount: 0
  });
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number | null>(null);

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
  }, [fetchUser]);

  useEffect(() => {
    fetchExcelData(); // Charger les données Excel au montage
  }, []);

  // Système de polling intelligent pour détecter les mises à jour
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const response = await fetch("/api/excel/last-update");
        if (response.ok) {
          const data = await response.json();
          const newTimestamp = data.timestamp;
          
          // Si c'est la première fois, initialiser le timestamp
          if (lastUpdateTimestamp === null) {
            setLastUpdateTimestamp(newTimestamp);
            return;
          }
          
          // Si le timestamp a changé, rafraîchir les données
          if (newTimestamp && newTimestamp > lastUpdateTimestamp) {
            console.log('[Polling] Mise à jour détectée, rechargement des données...');
            await fetchExcelData();
            setLastUpdateTimestamp(newTimestamp);
            
            // Déclencher aussi le refresh de l'onglet Non Attribué si c'est l'onglet actif
            if (activeTab === 'unassigned') {
              setUnassignedRefreshTrigger(prev => prev + 1);
            }
          }
        }
      } catch (error) {
        console.error('[Polling] Erreur lors de la vérification des mises à jour:', error);
      }
    };

    // Vérifier immédiatement au montage
    checkForUpdates();

    // Vérifier toutes les 5 secondes
    const intervalId = setInterval(checkForUpdates, 5000);

    // Nettoyer l'intervalle au démontage
    return () => clearInterval(intervalId);
  }, [lastUpdateTimestamp, activeTab]);

  // Optimisation: Arrêter le polling quand l'onglet n'est pas visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Quand l'onglet redevient visible, vérifier immédiatement les mises à jour
        console.log('[Polling] Onglet visible, vérification des mises à jour...');
        fetch("/api/excel/last-update")
          .then(res => res.json())
          .then(data => {
            const newTimestamp = data.timestamp;
            if (lastUpdateTimestamp && newTimestamp && newTimestamp > lastUpdateTimestamp) {
              console.log('[Polling] Mise à jour détectée après retour sur l\'onglet');
              fetchExcelData();
              setLastUpdateTimestamp(newTimestamp);
              if (activeTab === 'unassigned') {
                setUnassignedRefreshTrigger(prev => prev + 1);
              }
            }
          })
          .catch(err => console.error('[Polling] Erreur:', err));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [lastUpdateTimestamp, activeTab]);

  const fetchExcelData = async () => {
    try {
      console.log('[Dashboard] Fetch Excel Data...');
      const response = await fetch("/api/excel");
      if (response.ok) {
        const data = await response.json();
        console.log('[Dashboard] Données reçues:', {
          rowCount: data.data?.length,
          headers: data.headers?.length
        });
        setExcelData(data);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données Excel:", error);
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, title, message }]);
    
    // Auto-remove après 5 secondes
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
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

  const handleTicketDrop = async (employeeId: string, employeeName: string) => {
    if (!draggedTicket || !user || user.role !== 'admin') return;
    
    console.log('[handleTicketDrop] Début assignation:', {
      ticketId: draggedTicket.ticketId,
      workOrderNumber: draggedTicket.workOrderNumber,
      status: draggedTicket.status,
      employeeId,
      employeeName
    });
    
    if (draggedTicket.status !== 'TBP') {
      showNotification('error', 'Action impossible', 'Seuls les tickets en statut TBP peuvent être assignés');
      setDraggedTicket(null);
      return;
    }

    try {
      const response = await fetch('/api/tickets/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: draggedTicket.ticketId,
          employeeId,
          employeeName
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[Dashboard] Assignation réussie:', result);
        
        showNotification(
          'success',
          'Assignation réussie',
          `Le ticket ${draggedTicket.workOrderNumber} a été assigné à ${employeeName}`
        );
        
        console.log('[Dashboard] Rechargement des données...');
        // Recharger les données (les composants enfants recevront automatiquement les nouvelles données)
        await fetchExcelData();
        
        // Déclencher le refresh de l'onglet Non attribué
        setUnassignedRefreshTrigger(prev => prev + 1);
        
        console.log('[Dashboard] Données rechargées');
      } else {
        const error = await response.json();
        console.error('[Dashboard] Erreur assignation:', {
          status: response.status,
          error: error
        });
        showNotification('error', 'Erreur d\'assignation', error.error || 'Une erreur est survenue');
      }
    } catch (error) {
      console.error('Erreur lors de l\'assignation:', error);
      showNotification('error', 'Erreur d\'assignation', 'Impossible d\'assigner le ticket');
    } finally {
      setDraggedTicket(null);
    }
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
    console.log('[Dashboard] renderContent appelé avec:', {
      activeTab,
      hasExcelData: !!excelData.data?.length,
      dataLength: excelData.data?.length,
      headersLength: excelData.headers?.length
    });
    
    // Gérer les onglets d'employés
    if (activeTab.startsWith("employee-")) {
      const employeeKey = activeTab.replace("employee-", "");
      return <EmployeeContent 
        employeeKey={employeeKey} 
        user={user} 
        allEmployees={employees}
        onDataRefresh={fetchExcelData}
      />;
    }
    
    switch (activeTab) {
      case "dashboard":
        console.log('[Dashboard] Rendering DashboardContent avec excelData:', {
          rowCount: excelData.data?.length,
          headers: excelData.headers?.length
        });
        return <DashboardContent user={user} excelData={excelData} loading={loading} onDataRefresh={fetchExcelData} onDragStart={setDraggedTicket} isAdmin={user?.role === 'admin'} />;
      case "closed":
        return <ClosedContent />;
      case "unassigned":
        return <UnassignedContent onDragStart={setDraggedTicket} isAdmin={user?.role === 'admin'} refreshTrigger={unassignedRefreshTrigger} user={user} />;
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
                  {otherEmployeeTabs.map((tab) => {
                    const employeeKey = tab.id.replace('employee-', '');
                    const [employeeId, ...nameParts] = employeeKey.split('-');
                    const employeeName = nameParts.join('-');
                    
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        onDragOver={(e) => {
                          if (draggedTicket && user?.role === 'admin') {
                            e.preventDefault();
                            e.currentTarget.classList.add('drag-over');
                          }
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('drag-over');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('drag-over');
                          if (draggedTicket && user?.role === 'admin') {
                            handleTicketDrop(employeeId, employeeName);
                          }
                        }}
                        className={`nav-item sub-item ${activeTab === tab.id ? "active" : ""}`}
                      >
                        <span className="nav-icon">{tab.icon}</span>
                        <span className="nav-text">{tab.label}</span>
                        <div className="nav-indicator"></div>
                      </button>
                    );
                  })}
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

      {/* Notifications toast */}
      {notifications.map(notification => (
        <div key={notification.id} className={`notification-toast ${notification.type}`}>
          <div className="notification-content">
            <span className="notification-icon">
              {notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <div className="notification-text">
              <div className="notification-title">{notification.title}</div>
              <div className="notification-message">{notification.message}</div>
            </div>
          </div>
          <button 
            className="notification-close" 
            onClick={() => removeNotification(notification.id)}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
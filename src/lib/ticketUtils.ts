import type { TicketLog } from "@/models/Ticket";

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

// Fonction pour extraire les identifiants du ticket
export const extractTicketIdentifiers = (row: Record<string, unknown>, headers: string[]) => {
  const workOrderColumns = headers.filter(h => 
    h.toLowerCase().includes('work order number') || 
    h.toLowerCase().includes('workordernumber') ||
    h.toLowerCase().includes('work order') ||
    h.toLowerCase().includes('workorder')
  );
  
  const customerRefColumns = headers.filter(h => 
    h.toLowerCase().includes('customer reference') || 
    h.toLowerCase().includes('customerreference') ||
    h.toLowerCase().includes('customer ref') ||
    h.toLowerCase().includes('ref client') ||
    h.toLowerCase().includes('référence client')
  );

  const workOrderNumber = workOrderColumns.length > 0 ? String(row[workOrderColumns[0]] || '') : '';
  const customerReferenceNumber = customerRefColumns.length > 0 ? String(row[customerRefColumns[0]] || '') : '';

  return { workOrderNumber, customerReferenceNumber };
};

// Fonction pour générer les logs automatiquement depuis les données Excel
export const generateTicketLogs = (row: Record<string, unknown>, headers: string[]): TicketLog[] => {
  const logs: TicketLog[] = [];
  let logId = 1;

  // Fonction utilitaire pour valider et formater une date
  const formatDate = (dateStr: string): string => {
    const cleaned = String(dateStr).trim();
    if (!cleaned || cleaned === '' || cleaned.toLowerCase() === 'null' || cleaned === 'undefined') {
      return '';
    }
    return cleaned;
  };

  // 1. Log de création du ticket (Open Date)
  const openDateCol = headers.find(h => h.toLowerCase() === 'open date');
  if (openDateCol && row[openDateCol]) {
    const openDate = formatDate(String(row[openDateCol]));
    if (openDate) {
      logs.push({
        id: logId++,
        action: 'Création du ticket',
        description: 'Ticket créé dans le système',
        date: openDate,
        type: 'creation',
        icon: '🎫'
      });
    }
  }

  // 2. Log d'ouverture du ticket (Open Time - si différent de Open Date)
  const openTimeCol = headers.find(h => h.toLowerCase() === 'open time');
  if (openTimeCol && row[openTimeCol]) {
    const openTime = formatDate(String(row[openTimeCol]));
    if (openTime && openTime !== (row[openDateCol || ''] || '')) {
      logs.push({
        id: logId++,
        action: 'Ouverture du ticket',
        description: 'Ticket ouvert pour traitement',
        date: openTime,
        type: 'opening',
        icon: '🔓'
      });
    }
  }

  // 3. Log de dernière action (Last Code)
  const lastCodeCol = headers.find(h => h.toLowerCase() === 'last code');
  const lastCodeDescCol = headers.find(h => h.toLowerCase() === 'last code desc');
  const lastCodeDateTimeCol = headers.find(h => h.toLowerCase() === 'last code date time');
  
  if (lastCodeDateTimeCol && row[lastCodeDateTimeCol]) {
    const lastCodeDateTime = formatDate(String(row[lastCodeDateTimeCol]));
    if (lastCodeDateTime) {
      const lastCode = lastCodeCol && row[lastCodeCol] ? fixEncoding(String(row[lastCodeCol])) : '';
      const lastCodeDesc = lastCodeDescCol && row[lastCodeDescCol] ? fixEncoding(String(row[lastCodeDescCol])) : '';
      
      let description = 'Action effectuée';
      if (lastCode && lastCodeDesc) {
        description = `${lastCode} - ${lastCodeDesc}`;
      } else if (lastCode) {
        description = `Code action: ${lastCode}`;
      } else if (lastCodeDesc) {
        description = lastCodeDesc;
      }
      
      logs.push({
        id: logId++,
        action: 'Dernière action',
        description: description,
        date: lastCodeDateTime,
        type: 'action',
        icon: '⚡'
      });
    }
  }

  // 4. Log de changement de statut
  const workOrderStatusIdCol = headers.find(h => h.toLowerCase() === 'work order status id');
  const workOrderStatusDescCol = headers.find(h => h.toLowerCase() === 'work order status desc');
  
  if (workOrderStatusIdCol && row[workOrderStatusIdCol]) {
    const statusId = fixEncoding(String(row[workOrderStatusIdCol]));
    const statusDesc = workOrderStatusDescCol && row[workOrderStatusDescCol] 
      ? fixEncoding(String(row[workOrderStatusDescCol])) 
      : '';
    
    // Utiliser la date d'assignation ou la date actuelle
    const assignDateTimeCol = headers.find(h => h.toLowerCase() === 'assign date time');
    const statusDate = assignDateTimeCol && row[assignDateTimeCol] 
      ? formatDate(String(row[assignDateTimeCol]))
      : new Date().toLocaleDateString('fr-FR');
    
    if (statusDate) {
      logs.push({
        id: logId++,
        action: 'Changement de statut',
        description: statusDesc ? `${statusId} - ${statusDesc}` : `Statut: ${statusId}`,
        date: statusDate,
        type: 'action',
        icon: '📊'
      });
    }
  }

  // 5. Log d'assignation (Employee)
  const employeeIdCol = headers.find(h => h.toLowerCase() === 'employee id');
  const employeeNameCol = headers.find(h => h.toLowerCase() === 'employee name');
  const assignDateTimeCol = headers.find(h => h.toLowerCase() === 'assign date time');
  
  if (employeeIdCol && row[employeeIdCol] && assignDateTimeCol && row[assignDateTimeCol]) {
    const employeeId = fixEncoding(String(row[employeeIdCol]));
    const employeeName = employeeNameCol && row[employeeNameCol] 
      ? fixEncoding(String(row[employeeNameCol])) 
      : '';
    const assignDate = formatDate(String(row[assignDateTimeCol]));
    
    if (employeeId && assignDate) {
      logs.push({
        id: logId++,
        action: 'Assignation',
        description: employeeName 
          ? `Assigné à: ${employeeName} (${employeeId})`
          : `Assigné à: ${employeeId}`,
        date: assignDate,
        type: 'assignment',
        icon: '👤'
      });
    }
  }

  // 6. Log d'ETA des pièces (si disponible)
  const partETACol = headers.find(h => h.toLowerCase() === 'part eta date time');
  const partAvailableCol = headers.find(h => h.toLowerCase() === 'part available');
  
  if (partETACol && row[partETACol] && partAvailableCol && row[partAvailableCol]) {
    const etaDate = formatDate(String(row[partETACol]));
    const partAvailable = String(row[partAvailableCol]).toLowerCase();
    
    if (etaDate && partAvailable === 'yes') {
      logs.push({
        id: logId++,
        action: 'Pièces disponibles',
        description: 'Pièces nécessaires disponibles pour intervention',
        date: etaDate,
        type: 'action',
        icon: '🔧'
      });
    }
  }

  // Filtrer les logs vides et trier par date (plus récent en premier)
  const validLogs = logs.filter(log => log.date && log.date.trim() !== '');
  
  validLogs.sort((a, b) => {
    try {
      // Gestion des formats de date DD/MM/YYYY HH:MM:SS ou DD/MM/YYYY
      const parseDate = (dateStr: string) => {
        const [datePart] = dateStr.split(' ');
        const [day, month, year] = datePart.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      };
      
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return dateB.getTime() - dateA.getTime();
    } catch {
      return 0;
    }
  });

  return validLogs;
};
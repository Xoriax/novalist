"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface User {
  email: string;
  role: string;
  id: string;
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

interface DashboardContentProps {
  user: User | null;
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

  useEffect(() => {
    fetchExcelData();
  }, []);

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
                {excelData.data.map((row, rowIndex) => (
                  <tr key={rowIndex}>
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

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [adminSubTab, setAdminSubTab] = useState("overview");
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const userData = await response.json();
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

  const tabs = [
    { id: "dashboard", label: "Tableau de bord", icon: "📊" },
    ...(user?.role === "admin" ? [{ id: "admin", label: "Panel Admin", icon: "🔧" }] : [])
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardContent user={user} />;
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
                  </div>
                </div>
              )}
              
              {adminSubTab === "users" && (
                <AdminUsersContent onBack={() => setAdminSubTab("overview")} />
              )}
              
              {adminSubTab === "emails" && (
                <AdminEmailsContent onBack={() => setAdminSubTab("overview")} />
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
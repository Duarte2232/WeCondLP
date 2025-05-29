import React, { useState, useEffect } from 'react';
import { FiX, FiUpload, FiFile } from 'react-icons/fi';
import '../../components/WorkForm/WorkForm.css';

// Categories from the Maintenance component
const categorias = [
  { 
    id: 'infiltracao', 
    nome: 'Infiltração', 
    tipos_de_manutencao: [
      'Infiltração em coberturas e terraços',
      'Infiltração em paredes e fachadas',
      'Infiltração em garagens e caves',
      'Diagnóstico e identificação de causas',
      'Soluções de impermeabilização'
    ]
  },
  { 
    id: 'fissuras', 
    nome: 'Fissuras e rachaduras', 
    tipos_de_manutencao: [
      'Fissuras estruturais',
      'Rachaduras em paredes interiores e exteriores',
      'Rachaduras em fachadas e varandas',
      'Monitorização e avaliação periódica',
      'Técnicas de reparação e reforço estrutural'
    ]
  },
  { 
    id: 'canalizacao', 
    nome: 'Canalização', 
    tipos_de_manutencao: [
      'Deteção e reparação de fugas de água',
      'Substituição e manutenção de tubagens',
      'Limpeza e desobstrução de esgotos',
      'Sistemas de pressurização e bombagem',
      'Manutenção de reservatórios e depósitos de água'
    ]
  },
  { 
    id: 'jardinagem', 
    nome: 'Jardinagem', 
    tipos_de_manutencao: [
      'Manutenção e conservação de jardins comuns',
      'Poda e remoção de árvores e arbustos',
      'Instalação e manutenção de sistemas de rega',
      'Controlo de pragas e doenças',
      'Requalificação de espaços verdes'
    ]
  },
  { 
    id: 'fiscalizacao', 
    nome: 'Fiscalização', 
    tipos_de_manutencao: [
      'Inspeção periódica de infraestruturas',
      'Fiscalização do cumprimento de normas e regulamentos',
      'Relatórios técnicos e auditorias',
      'Avaliação da qualidade dos serviços prestados',
      'Gestão de obras e intervenções externas'
    ]
  },
  { 
    id: 'fachada', 
    nome: 'Reabilitação de Fachada', 
    tipos_de_manutencao: [
      'Recuperação e restauro de fachadas',
      'Tratamento de fissuras e infiltrações',
      'Impermeabilização de superfícies externas',
      'Pintura e renovação estética',
      'Limpeza de fachadas e remoção de grafitis'
    ]
  },
  { 
    id: 'eletricidade', 
    nome: 'Eletricidade', 
    tipos_de_manutencao: [
      'Manutenção de instalações elétricas do condomínio',
      'Substituição de quadros elétricos e cablagens',
      'Iluminação de áreas comuns (escadas, garagem, elevadores)',
      'Sistemas de emergência e iluminação de segurança',
      'Inspeção e conformidade com normas elétricas'
    ]
  },
  { 
    id: 'construcao', 
    nome: 'Construção', 
    tipos_de_manutencao: [
      'Pequenas obras e remodelações em áreas comuns',
      'Reparação de estruturas e fundações',
      'Substituição de revestimentos e pavimentos',
      'Ampliação e melhoria de infraestruturas',
      'Gestão de licenças e autorizações'
    ]
  },
  { 
    id: 'pintura', 
    nome: 'Pintura', 
    tipos_de_manutencao: [
      'Pintura de fachadas e zonas comuns',
      'Pintura de garagens e parques de estacionamento',
      'Marcação de lugares e sinalização em pavimentos',
      'Preparação e tratamento de superfícies antes da pintura',
      'Utilização de tintas específicas para exterior e interior'
    ]
  },
];

function MaintenanceForm({ 
  onSubmit,
  onCancel,
  isSubmitting,
  editMode,
  initialData,
  handleFileUpload: handleFileUploadProp,
  handleRemoveFile: handleRemoveFileProp
}) {
  const [newMaintenance, setNewMaintenance] = useState({
    ...initialData,
    date: initialData?.date || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    category: initialData?.category || '',
    subcategoria: initialData?.subcategoria || '',
    priority: initialData?.priority || '',
    status: initialData?.status || 'disponivel',
    files: initialData?.files || [],
    location: initialData?.location || {
      morada: '',
      codigoPostal: '',
      cidade: '',
      andar: ''
    },
    orcamentos: initialData?.orcamentos || {
      minimo: '',
      maximo: ''
    },
    prazoOrcamentos: initialData?.prazoOrcamentos || ''
  });
  const [availableSubcategories, setAvailableSubcategories] = useState([]);

  const handleLocalFileUpload = async (e) => {
    const newFiles = await handleFileUploadProp(e);
    if (newFiles && newFiles.length > 0) {
      setNewMaintenance(prev => ({
        ...prev,
        files: [...prev.files, ...newFiles]
      }));
    }
  };

  const handleLocalRemoveFile = (fileToRemove) => {
    handleRemoveFileProp(fileToRemove);
    setNewMaintenance(prev => ({
      ...prev,
      files: prev.files.filter(file => file.url !== fileToRemove.url)
    }));
  };

  // Atualizar subcategorias disponíveis quando a categoria muda
  useEffect(() => {
    if (newMaintenance.category) {
      const selectedCategory = categorias.find(cat => cat.nome === newMaintenance.category);
      if (selectedCategory) {
        setAvailableSubcategories(selectedCategory.tipos_de_manutencao);
      } else {
        setAvailableSubcategories([]);
      }
    } else {
      setAvailableSubcategories([]);
    }
  }, [newMaintenance.category]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Garantir que todos os campos estão preenchidos
    if (!newMaintenance.title) {
      alert('Por favor, preencha o título da manutenção.');
      return;
    }
    
    if (!newMaintenance.category) {
      alert('Por favor, selecione uma categoria.');
      return;
    }
    
    if (!newMaintenance.date) {
      newMaintenance.date = new Date().toISOString().split('T')[0];
    }
    
    // Garantir que temos frequência definida
    if (!newMaintenance.frequency) {
      newMaintenance.frequency = 'Única'; // Valor padrão
    }
    
    // Enviar o formulário
    onSubmit(newMaintenance);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{editMode ? 'Editar' : 'Nova'} Manutenção</h2>
          <button className="close-btn" onClick={onCancel}>
            <FiX />
          </button>
        </div>
        <form className="new-work-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Título da Manutenção</label>
              <input
                type="text"
                required
                value={newMaintenance.title}
                onChange={(e) => setNewMaintenance({...newMaintenance, title: e.target.value})}
                placeholder="Ex: Manutenção Preventiva do Elevador"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Descrição</label>
              <textarea
                required
                value={newMaintenance.description}
                onChange={(e) => setNewMaintenance({...newMaintenance, description: e.target.value})}
                placeholder="Descreva os detalhes da manutenção..."
              />
            </div>
          </div>
          
          <div className="form-row two-columns">
            <div className="form-group">
              <label>Categoria</label>
              <select
                required
                value={newMaintenance.category}
                onChange={(e) => setNewMaintenance({...newMaintenance, category: e.target.value, subcategoria: ''})}
              >
                <option value="">Selecione uma categoria</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                ))}
              </select>
            </div>
            {newMaintenance.category && availableSubcategories.length > 0 && (
              <div className="form-group">
                <label>Tipo de Manutenção</label>
                <select
                  value={newMaintenance.subcategoria || ''}
                  onChange={(e) => setNewMaintenance({...newMaintenance, subcategoria: e.target.value})}
                >
                  <option value="">Selecione um tipo de manutenção</option>
                  {availableSubcategories.map((tipoMaintenance, index) => (
                    <option key={index} value={tipoMaintenance}>{tipoMaintenance}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Prioridade</label>
              <select
                required
                value={newMaintenance.priority}
                onChange={(e) => setNewMaintenance({...newMaintenance, priority: e.target.value})}
              >
                <option value="">Selecione a prioridade</option>
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
              </select>
            </div>
          </div>
          
          <div className="form-row two-columns">
            <div className="form-group">
              <label>Data de Começo</label>
              <input
                type="date"
                required
                value={newMaintenance.date}
                onChange={(e) => setNewMaintenance({...newMaintenance, date: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Frequência</label>
              <select
                value={newMaintenance.frequency || ''}
                onChange={(e) => setNewMaintenance({...newMaintenance, frequency: e.target.value})}
              >
                <option value="">Selecione a frequência</option>
                <option value="Única">Única</option>
                <option value="Diária">Diária</option>
                <option value="Semanal">Semanal</option>
                <option value="Quinzenal">Quinzenal</option>
                <option value="Mensal">Mensal</option>
                <option value="Trimestral">Trimestral</option>
                <option value="Semestral">Semestral</option>
                <option value="Anual">Anual</option>
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Morada</label>
              <input
                type="text"
                required
                value={newMaintenance.location.morada}
                onChange={(e) => setNewMaintenance({
                  ...newMaintenance,
                  location: {
                    ...newMaintenance.location,
                    morada: e.target.value
                  }
                })}
                placeholder="Rua, Número"
              />
            </div>
          </div>
          
          <div className="form-row two-columns">
            <div className="form-group">
              <label>Código Postal</label>
              <input
                type="text"
                required
                value={newMaintenance.location.codigoPostal}
                onChange={(e) => setNewMaintenance({
                  ...newMaintenance,
                  location: {
                    ...newMaintenance.location,
                    codigoPostal: e.target.value
                  }
                })}
                placeholder="0000-000"
              />
            </div>

            <div className="form-group">
              <label>Cidade</label>
              <input
                type="text"
                required
                value={newMaintenance.location.cidade}
                onChange={(e) => setNewMaintenance({
                  ...newMaintenance,
                  location: {
                    ...newMaintenance.location,
                    cidade: e.target.value
                  }
                })}
                placeholder="Ex: Lisboa"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Andar (opcional)</label>
              <input
                type="text"
                value={newMaintenance.location.andar || ''}
                onChange={(e) => setNewMaintenance({
                  ...newMaintenance,
                  location: {
                    ...newMaintenance.location,
                    andar: e.target.value
                  }
                })}
                placeholder="Ex: 3º Esquerdo"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Orçamento Estimado (€)</label>
              <div className="orcamento-range">
                <div className="form-group">
                  <label>Mínimo</label>
                  <input
                    type="number"
                    value={newMaintenance.orcamentos?.minimo || ''}
                    onChange={(e) => setNewMaintenance({
                      ...newMaintenance,
                      orcamentos: {
                        ...newMaintenance.orcamentos,
                        minimo: e.target.value
                      }
                    })}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label>Máximo</label>
                  <input
                    type="number"
                    value={newMaintenance.orcamentos?.maximo || ''}
                    onChange={(e) => setNewMaintenance({
                      ...newMaintenance,
                      orcamentos: {
                        ...newMaintenance.orcamentos,
                        maximo: e.target.value
                      }
                    })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Prazo para Orçamentos</label>
              <input
                type="date"
                value={newMaintenance.prazoOrcamentos || ''}
                onChange={(e) => setNewMaintenance({
                  ...newMaintenance,
                  prazoOrcamentos: e.target.value
                })}
                placeholder="dd/mm/aaaa"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Arquivos</label>
              <div 
                className="file-input-container"
                onClick={() => document.getElementById('file-input').click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.add('dragging');
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove('dragging');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove('dragging');
                  handleLocalFileUpload(e);
                }}
                style={{
                  border: '2px dashed #e5e7eb',
                  borderRadius: '8px',
                  padding: '2rem',
                  textAlign: 'center',
                  position: 'relative',
                  cursor: 'pointer',
                  backgroundColor: '#f9fafb',
                  transition: 'all 0.2s ease'
                }}
              >
                <input
                  type="file"
                  id="file-input"
                  multiple
                  className="file-input"
                  onChange={handleLocalFileUpload}
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                  style={{ 
                    opacity: 0, 
                    position: 'absolute', 
                    top: 0,
                    left: 0,
                    width: '100%', 
                    height: '100%', 
                    cursor: 'pointer',
                    zIndex: 2
                  }}
                />
                <div 
                  className="file-input-text"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#6b7280',
                    pointerEvents: 'none'
                  }}
                >
                  <FiUpload style={{ fontSize: '2rem', marginBottom: '0.5rem' }} />
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>
                    Arraste arquivos ou clique para fazer upload
                  </p>
                  <span style={{ fontSize: '0.875rem' }}>
                    Suporta imagens, vídeos e documentos (máx. 10MB)
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {newMaintenance.files && newMaintenance.files.length > 0 && (
            <div className="form-row">
              <div className="form-group">
                <label>Arquivos Selecionados</label>
                <div className="selected-files">
                  {newMaintenance.files.map((file, index) => (
                    <div key={index} className="selected-file">
                      {file.type === 'image' ? (
                        <img src={file.url} alt={file.name} />
                      ) : file.type === 'video' ? (
                        <div className="file-preview">
                          <video src={file.url} controls />
                        </div>
                      ) : (
                        <div className="file-icon">
                          <FiFile />
                        </div>
                      )}
                      <div className="file-info">
                        <span className="file-name">{file.name}</span>
                        <button 
                          type="button" 
                          className="remove-file-btn"
                          onClick={() => handleLocalRemoveFile(file)}
                        >
                          <FiX />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={onCancel}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="save-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : editMode ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MaintenanceForm; 
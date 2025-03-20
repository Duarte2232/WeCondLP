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
  { 
    id: 'elevadores', 
    nome: 'Elevadores', 
    tipos_de_manutencao: [
      'Manutenção preventiva regular',
      'Substituição de peças desgastadas',
      'Modernização de sistemas de segurança',
      'Reparação de avarias',
      'Inspeção técnica periódica'
    ]
  },
  { 
    id: 'avac', 
    nome: 'Sistemas AVAC', 
    tipos_de_manutencao: [
      'Limpeza de filtros e condutas',
      'Verificação de sistemas de refrigeração',
      'Manutenção de caldeiras e bombas de calor',
      'Substituição de componentes',
      'Otimização de eficiência energética'
    ]
  },
  { 
    id: 'seguranca', 
    nome: 'Sistemas de Segurança', 
    tipos_de_manutencao: [
      'Manutenção de sistemas de alarme',
      'Verificação de equipamentos contra incêndios',
      'Testes de funcionamento de sensores',
      'Atualização de software de segurança',
      'Substituição de baterias e componentes'
    ]
  },
  { 
    id: 'limpeza', 
    nome: 'Limpeza', 
    tipos_de_manutencao: [
      'Limpeza profunda de áreas comuns',
      'Lavagem de pavimentos e escadas',
      'Limpeza de vidros e fachadas',
      'Remoção de grafitis',
      'Tratamento e polimento de pavimentos'
    ]
  },
  { 
    id: 'hidraulica', 
    nome: 'Hidráulica', 
    tipos_de_manutencao: [
      'Verificação de fugas em canalizações',
      'Manutenção de bombas de água',
      'Limpeza de ralos e caleiras',
      'Desentupimento de esgotos',
      'Purga de ar em radiadores'
    ]
  },
  { 
    id: 'equipamentos', 
    nome: 'Equipamentos', 
    tipos_de_manutencao: [
      'Manutenção de sistemas de ginásio',
      'Verificação de equipamentos de lazer',
      'Reparação de mobiliário de áreas comuns',
      'Manutenção de piscinas e spas',
      'Calibração de equipamentos técnicos'
    ]
  }
];

function MaintenanceForm({ 
  newMaintenance, 
  setNewMaintenance, 
  handleFileUpload, 
  handleRemoveFile, 
  isSubmitting,
  onSubmit,
  onCancel,
  editMode
}) {
  const [availableSubcategories, setAvailableSubcategories] = useState([]);

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

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{editMode ? 'Editar' : 'Nova'} Manutenção</h2>
          <button className="close-btn" onClick={onCancel}>
            <FiX />
          </button>
        </div>
        <form className="new-work-form" onSubmit={onSubmit}>
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
              <label>Data Programada</label>
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
                  location: {...newMaintenance.location, morada: e.target.value}
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
                  location: {...newMaintenance.location, codigoPostal: e.target.value}
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
                  location: {...newMaintenance.location, cidade: e.target.value}
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
                  location: {...newMaintenance.location, andar: e.target.value}
                })}
                placeholder="Ex: 3º Esquerdo"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Arquivos</label>
              <div className="file-input-container">
                <input
                  type="file"
                  multiple
                  className="file-input"
                  onChange={handleFileUpload}
                />
                <div className="file-input-text">
                  <FiUpload />
                  <p>Arraste arquivos ou clique para fazer upload</p>
                  <span>Suporta imagens, vídeos e documentos (máx. 10MB)</span>
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
                          onClick={() => handleRemoveFile(file)}
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
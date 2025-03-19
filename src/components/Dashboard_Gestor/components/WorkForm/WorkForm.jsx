import React, { useState, useEffect } from 'react';
import './WorkForm.css';
import { FiX, FiUpload, FiFile } from 'react-icons/fi';

// Lista de categorias e subcategorias para o formulário
const categoriasForm = [
  { 
    id: 'Infiltração', 
    subcategorias: [
      'Infiltração em coberturas e terraços',
      'Infiltração em paredes e fachadas',
      'Infiltração em garagens e caves',
      'Diagnóstico e identificação de causas',
      'Soluções de impermeabilização'
    ]
  },
  { 
    id: 'Fissuras e rachaduras', 
    subcategorias: [
      'Fissuras estruturais',
      'Rachaduras em paredes interiores e exteriores',
      'Rachaduras em fachadas e varandas',
      'Monitorização e avaliação periódica',
      'Técnicas de reparação e reforço estrutural'
    ]
  },
  { 
    id: 'Canalização', 
    subcategorias: [
      'Deteção e reparação de fugas de água',
      'Substituição e manutenção de tubagens',
      'Limpeza e desobstrução de esgotos',
      'Sistemas de pressurização e bombagem',
      'Manutenção de reservatórios e depósitos de água'
    ]
  },
  { 
    id: 'Manutenção', 
    subcategorias: [
      'Manutenção geral do edifício',
      'Manutenção preventiva e corretiva',
      'Reparações em áreas comuns',
      'Limpeza de algerozes e caleiras',
      'Serviços de emergência'
    ]
  },
  { 
    id: 'Jardinagem', 
    subcategorias: [
      'Manutenção e conservação de jardins comuns',
      'Poda e remoção de árvores e arbustos',
      'Instalação e manutenção de sistemas de rega',
      'Controlo de pragas e doenças',
      'Requalificação de espaços verdes'
    ]
  },
  { 
    id: 'Fiscalização', 
    subcategorias: [
      'Inspeção periódica de infraestruturas',
      'Fiscalização do cumprimento de normas e regulamentos',
      'Relatórios técnicos e auditorias',
      'Avaliação da qualidade dos serviços prestados',
      'Gestão de obras e intervenções externas'
    ]
  },
  { 
    id: 'Reabilitação de Fachada', 
    subcategorias: [
      'Recuperação e restauro de fachadas',
      'Tratamento de fissuras e infiltrações',
      'Impermeabilização de superfícies externas',
      'Pintura e renovação estética',
      'Limpeza de fachadas e remoção de grafitis'
    ]
  },
  { 
    id: 'Eletricidade', 
    subcategorias: [
      'Manutenção de instalações elétricas do condomínio',
      'Substituição de quadros elétricos e cablagens',
      'Iluminação de áreas comuns (escadas, garagem, elevadores)',
      'Sistemas de emergência e iluminação de segurança',
      'Inspeção e conformidade com normas elétricas'
    ]
  },
  { 
    id: 'Construção', 
    subcategorias: [
      'Pequenas obras e remodelações em áreas comuns',
      'Reparação de estruturas e fundações',
      'Substituição de revestimentos e pavimentos',
      'Ampliação e melhoria de infraestruturas',
      'Gestão de licenças e autorizações'
    ]
  },
  { 
    id: 'Pintura', 
    subcategorias: [
      'Pintura de fachadas e zonas comuns',
      'Pintura de garagens e parques de estacionamento',
      'Marcação de lugares e sinalização em pavimentos',
      'Preparação e tratamento de superfícies antes da pintura',
      'Utilização de tintas específicas para exterior e interior'
    ]
  }
];

function WorkForm({ 
  newWork, 
  setNewWork, 
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
    if (newWork.category) {
      const selectedCategory = categoriasForm.find(cat => cat.id === newWork.category);
      if (selectedCategory) {
        setAvailableSubcategories(selectedCategory.subcategorias);
      } else {
        setAvailableSubcategories([]);
      }
    } else {
      setAvailableSubcategories([]);
    }
  }, [newWork.category]);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{editMode ? 'Editar' : 'Novo'} {newWork.isMaintenance ? 'Manutenção' : 'Obra'}</h2>
          <button className="close-btn" onClick={onCancel}>
            <FiX />
          </button>
        </div>
        <form className="new-work-form" onSubmit={onSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Tipo</label>
              <div className="type-toggle">
                <label className={`type-option ${!newWork.isMaintenance ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="type"
                    checked={!newWork.isMaintenance}
                    onChange={() => setNewWork({...newWork, isMaintenance: false})}
                  />
                  Obra
                </label>
                <label className={`type-option ${newWork.isMaintenance ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="type"
                    checked={newWork.isMaintenance}
                    onChange={() => setNewWork({...newWork, isMaintenance: true})}
                  />
                  Manutenção
                </label>
              </div>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Título {newWork.isMaintenance ? 'da Manutenção' : 'da Obra'}</label>
              <input
                type="text"
                required
                value={newWork.title}
                onChange={(e) => setNewWork({...newWork, title: e.target.value})}
                placeholder={newWork.isMaintenance ? "Ex: Manutenção Preventiva do Elevador" : "Ex: Reparo no Sistema Elétrico"}
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Descrição</label>
              <textarea
                required
                value={newWork.description}
                onChange={(e) => setNewWork({...newWork, description: e.target.value})}
                placeholder={newWork.isMaintenance ? "Descreva os detalhes da manutenção..." : "Descreva os detalhes da obra..."}
              />
            </div>
          </div>
          
          <div className="form-row two-columns">
            <div className="form-group">
              <label>Categoria</label>
              <select
                required
                value={newWork.category}
                onChange={(e) => setNewWork({...newWork, category: e.target.value, subcategoria: ''})}
              >
                <option value="">Selecione uma categoria</option>
                {newWork.isMaintenance ? (
                  <>
                    <option value="Elevadores">Elevadores</option>
                    <option value="Sistemas AVAC">Sistemas AVAC</option>
                    <option value="Sistemas de Segurança">Sistemas de Segurança</option>
                    <option value="Limpeza">Limpeza</option>
                    <option value="Jardinagem">Jardinagem</option>
                    <option value="Eletricidade">Eletricidade</option>
                    <option value="Hidráulica">Hidráulica</option>
                    <option value="Equipamentos">Equipamentos</option>
                  </>
                ) : (
                  <>
                    <option value="Infiltração">Infiltração</option>
                    <option value="Fissuras e rachaduras">Fissuras e rachaduras</option>
                    <option value="Canalização">Canalização</option>
                    <option value="Manutenção">Manutenção</option>
                    <option value="Jardinagem">Jardinagem</option>
                    <option value="Fiscalização">Fiscalização</option>
                    <option value="Reabilitação de Fachada">Reabilitação de Fachada</option>
                    <option value="Eletricidade">Eletricidade</option>
                    <option value="Construção">Construção</option>
                    <option value="Pintura">Pintura</option>
                  </>
                )}
              </select>
            </div>
            {!newWork.isMaintenance && newWork.category && availableSubcategories.length > 0 && (
              <div className="form-group">
                <label>Subcategoria</label>
                <select
                  value={newWork.subcategoria || ''}
                  onChange={(e) => setNewWork({...newWork, subcategoria: e.target.value})}
                >
                  <option value="">Selecione uma subcategoria</option>
                  {availableSubcategories.map((subcategoria, index) => (
                    <option key={index} value={subcategoria}>{subcategoria}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Prioridade</label>
              <select
                required
                value={newWork.priority}
                onChange={(e) => setNewWork({...newWork, priority: e.target.value})}
              >
                <option value="">Selecione a prioridade</option>
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>{newWork.isMaintenance ? 'Data Programada' : 'Data'}</label>
              <input
                type="date"
                required
                value={newWork.date}
                onChange={(e) => setNewWork({...newWork, date: e.target.value})}
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Morada</label>
              <input
                type="text"
                required
                value={newWork.location.morada}
                onChange={(e) => setNewWork({
                  ...newWork, 
                  location: {...newWork.location, morada: e.target.value}
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
                value={newWork.location.codigoPostal}
                onChange={(e) => setNewWork({
                  ...newWork, 
                  location: {...newWork.location, codigoPostal: e.target.value}
                })}
                placeholder="0000-000"
              />
            </div>
            <div className="form-group">
              <label>Cidade</label>
              <input
                type="text"
                required
                value={newWork.location.cidade}
                onChange={(e) => setNewWork({
                  ...newWork, 
                  location: {...newWork.location, cidade: e.target.value}
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
                value={newWork.location.andar || ''}
                onChange={(e) => setNewWork({
                  ...newWork, 
                  location: {...newWork.location, andar: e.target.value}
                })}
                placeholder="Ex: 3º Esquerdo"
              />
            </div>
          </div>
          
          {!newWork.isMaintenance && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Orçamento Estimado (€)</label>
                  <div className="orcamento-range">
                    <div className="form-group">
                      <label>Mínimo</label>
                      <input
                        type="number"
                        value={newWork.orcamentos.minimo}
                        onChange={(e) => setNewWork({
                          ...newWork, 
                          orcamentos: {...newWork.orcamentos, minimo: e.target.value}
                        })}
                        placeholder="0"
                      />
                    </div>
                    <div className="form-group">
                      <label>Máximo</label>
                      <input
                        type="number"
                        value={newWork.orcamentos.maximo}
                        onChange={(e) => setNewWork({
                          ...newWork, 
                          orcamentos: {...newWork.orcamentos, maximo: e.target.value}
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
                    value={newWork.prazoOrcamentos}
                    onChange={(e) => setNewWork({...newWork, prazoOrcamentos: e.target.value})}
                  />
                </div>
              </div>
            </>
          )}
          
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
          
          {newWork.files && newWork.files.length > 0 && (
            <div className="form-row">
              <div className="form-group">
                <label>Arquivos Selecionados</label>
                <div className="selected-files">
                  {newWork.files.map((file, index) => (
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

export default WorkForm; 
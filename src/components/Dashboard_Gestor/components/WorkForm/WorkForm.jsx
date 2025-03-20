import React, { useState, useEffect } from 'react';
import './WorkForm.css';
import { FiX, FiUpload, FiFile } from 'react-icons/fi';

// Lista de categorias e subcategorias para o formulário
const categoriasForm = [
  { 
    "id": "Infiltração",
    "tipos_de_obras": [
      "Impermeabilização de coberturas e terraços",
      "Revestimento de paredes exteriores para proteção contra infiltrações",
      "Instalação de novos sistemas de drenagem",
      "Substituição de materiais afetados pela humidade",
      "Reparação de fissuras causadoras de infiltrações"
    ]
  },
  { 
    "id": "Fissuras e rachaduras", 
    "tipos_de_obras": [
      "Reforço estrutural de elementos danificados",
      "Reparação de fissuras em paredes interiores e exteriores",
      "Substituição de revestimentos afetados por rachaduras",
      "Correção de deformações em varandas e fachadas",
      "Aplicação de novos materiais de revestimento mais resistentes"
    ]
  },
  { 
    "id": "Canalização", 
    "tipos_de_obras": [
      "Instalação de novas tubagens de água e esgoto",
      "Construção de sistemas de drenagem pluvial",
      "Reabilitação completa da rede de abastecimento de água",
      "Modernização dos sistemas de pressurização",
      "Substituição de condutas antigas por materiais mais eficientes"
    ]
  },
  { 
    "id": "Jardinagem", 
    "tipos_de_obras": [
      "Criação de novos espaços verdes",
      "Construção de jardins verticais",
      "Instalação de sistemas de rega automatizados",
      "Requalificação de parques e áreas de lazer",
      "Construção de caminhos e zonas pedonais em jardins"
    ]
  },
  { 
    "id": "Fiscalização", 
    "tipos_de_obras": [
      "Inspeção técnica e estrutural do edifício",
      "Vistoria para identificação de riscos na construção",
      "Elaboração de laudos técnicos para reabilitação de edifícios",
      "Avaliação da conformidade com normas de construção",
      "Acompanhamento técnico de obras no condomínio"
    ]
  },
  { 
    "id": "Reabilitação de Fachada", 
    "tipos_de_obras": [
      "Revestimento e pintura de fachadas",
      "Substituição de materiais de revestimento exterior",
      "Tratamento de fissuras e infiltrações na fachada",
      "Aplicação de isolamento térmico em fachadas",
      "Renovação estética e modernização de fachadas antigas"
    ]
  },
  { 
    "id": "Eletricidade", 
    "tipos_de_obras": [
      "Instalação de novos quadros elétricos",
      "Reestruturação completa da rede elétrica do edifício",
      "Substituição de cablagem antiga por novas tecnologias",
      "Implementação de sistemas de iluminação inteligente",
      "Instalação de postos de carregamento para veículos elétricos"
    ]
  },
  { 
    "id": "Construção", 
    "tipos_de_obras": [
      "Ampliação de espaços comuns no edifício",
      "Construção de novas infraestruturas no condomínio",
      "Reabilitação de garagens e estacionamentos",
      "Instalação de novos acessos e melhoria da acessibilidade",
      "Substituição de pavimentos e revestimentos internos e externos"
    ]
  },
  { 
    "id": "Pintura", 
    "tipos_de_obras": [
      "Pintura integral das fachadas do edifício",
      "Pintura de corredores e escadas",
      "Pintura de garagens e parques de estacionamento",
      "Marcação de lugares e sinalização em pavimentos",
      "Aplicação de tintas específicas para proteção contra intempéries"
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
        setAvailableSubcategories(selectedCategory.tipos_de_obras);
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
          <h2>{editMode ? 'Editar' : 'Nova'} Obra</h2>
          <button className="close-btn" onClick={onCancel}>
            <FiX />
          </button>
        </div>
        <form className="new-work-form" onSubmit={onSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Título da Obra</label>
              <input
                type="text"
                required
                value={newWork.title}
                onChange={(e) => setNewWork({...newWork, title: e.target.value})}
                placeholder="Ex: Reparo no Sistema Elétrico"
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
                placeholder="Descreva os detalhes da obra..."
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
                <option value="Infiltração">Infiltração</option>
                <option value="Fissuras e rachaduras">Fissuras e rachaduras</option>
                <option value="Canalização">Canalização</option>
                <option value="Jardinagem">Jardinagem</option>
                <option value="Fiscalização">Fiscalização</option>
                <option value="Reabilitação de Fachada">Reabilitação de Fachada</option>
                <option value="Eletricidade">Eletricidade</option>
                <option value="Construção">Construção</option>
                <option value="Pintura">Pintura</option>
              </select>
            </div>
            {newWork.category && availableSubcategories.length > 0 && (
              <div className="form-group">
                <label>Tipo de Obra</label>
                <select
                  value={newWork.subcategoria || ''}
                  onChange={(e) => setNewWork({...newWork, subcategoria: e.target.value})}
                >
                  <option value="">Selecione um tipo de obra</option>
                  {availableSubcategories.map((tipoObra, index) => (
                    <option key={index} value={tipoObra}>{tipoObra}</option>
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
              <label>Data</label>
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
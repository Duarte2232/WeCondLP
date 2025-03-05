import React from 'react';
import './WorkForm.css';
import { FiX, FiUpload, FiFile } from 'react-icons/fi';

function WorkForm({ 
  showNewWorkForm, 
  setShowNewWorkForm, 
  newWork, 
  setNewWork, 
  handleSubmit, 
  handleFileUpload, 
  handleRemoveFile, 
  editingWork, 
  setEditingWork,
  isSubmitting
}) {
  if (!showNewWorkForm) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{editingWork ? 'Editar Obra' : 'Nova Obra'}</h2>
          <button className="close-btn" onClick={() => {
            setShowNewWorkForm(false);
            setEditingWork(null);
          }}>
            <FiX />
          </button>
        </div>
        <form className="new-work-form" onSubmit={handleSubmit}>
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
                onChange={(e) => setNewWork({...newWork, category: e.target.value})}
              >
                <option value="">Selecione uma categoria</option>
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
              </select>
            </div>
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
              onClick={() => {
                setShowNewWorkForm(false);
                setEditingWork(null);
              }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : editingWork ? 'Atualizar Obra' : 'Criar Obra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default WorkForm; 
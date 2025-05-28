import React, { useState } from 'react';
import { FiX, FiStar, FiAlertCircle } from 'react-icons/fi';
import './RatingModal.css';

const RatingModal = ({ onClose, onSubmit, technician }) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleStarClick = (value) => {
    setRating(value);
    if (validationError) setValidationError('');
  };

  const handleStarHover = (value) => {
    setHoveredRating(value);
  };

  const handleStarLeave = () => {
    setHoveredRating(0);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setValidationError('Por favor, selecione uma classificação de 1 a 5 estrelas.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Enviando a avaliação para o componente pai
      await onSubmit({
        rating,
        comment
      });
      
      // Caso o envio seja bem-sucedido, o modal será fechado pelo componente pai
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      setValidationError('Ocorreu um erro ao enviar a avaliação. Por favor, tente novamente.');
      setIsSubmitting(false);
    }
  };

  // Função para exibir texto de classificação baseado no número de estrelas
  const getRatingText = (stars) => {
    if (!stars) return '';
    const texts = ['Muito insatisfeito', 'Insatisfeito', 'Neutro', 'Satisfeito', 'Muito satisfeito'];
    return texts[stars - 1];
  };

  return (
    <div className="rating-modal-overlay">
      <div className="rating-modal-content">
        <div className="rating-modal-header">
          <h2>Avaliar Técnico</h2>
          <button className="close-button" onClick={onClose} disabled={isSubmitting}>
            <FiX />
          </button>
        </div>
        
        <div className="rating-modal-body">
          <p className="rating-modal-description">
            Como avalia o serviço prestado por <strong>{technician?.name || technician?.empresaNome || 'este técnico'}</strong>?
            <br />
            <small>A sua avaliação ajuda outros utilizadores a encontrar os melhores profissionais.</small>
          </p>
          
          <div className="rating-stars-container">
            {[1, 2, 3, 4, 5].map((star) => (
              <FiStar
                key={star}
                className={`rating-star ${(hoveredRating || rating) >= star ? 'filled' : ''}`}
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => handleStarHover(star)}
                onMouseLeave={handleStarLeave}
              />
            ))}
            <span className="rating-text">{getRatingText(hoveredRating || rating)}</span>
          </div>
          
          {validationError && (
            <div className="rating-error">
              <FiAlertCircle /> {validationError}
            </div>
          )}
          
          <div className="rating-comment-container">
            <label htmlFor="rating-comment">Comentário (opcional)</label>
            <textarea
              id="rating-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Compartilhe sua experiência com o serviço prestado..."
              rows={4}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="rating-actions">
            <button 
              className="cancel-button" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button 
              className={`submit-button ${isSubmitting ? 'submitting' : ''}`} 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'A enviar...' : 'Enviar Avaliação'}
            </button>
          </div>
          
          <div className="rating-note">
            <p>
              <small>
                Ao concluir a avaliação, o serviço será marcado como concluído.
              </small>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RatingModal; 
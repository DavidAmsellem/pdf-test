import React from 'react';
import Modal from 'react-modal';
import '../../styles/sign/YouSignWizard.css';

const YouSignWizard = ({ isOpen, onClose, onSubmit, title, loading }) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="modal-content"
      overlayClassName="modal-overlay"
      ariaHideApp={false}
    >
      <div className="wizard-container">
        <div className="wizard-header">
          <h2>Firmar documento</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <div className="wizard-body">
          <h3>{title}</h3>
          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label htmlFor="signerEmail">Email del firmante</label>
              <input
                type="email"
                id="signerEmail"
                name="signerEmail"
                required
                placeholder="Introduce el email"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="signerName">Nombre del firmante</label>
              <input
                type="text"
                id="signerName"
                name="signerName"
                required
                placeholder="Introduce el nombre"
              />
            </div>
            
            <div className="form-actions">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar para firma'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default YouSignWizard;
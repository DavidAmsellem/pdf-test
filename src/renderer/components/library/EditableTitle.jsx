import React, { useState, useRef, useEffect } from 'react';
import '../../styles/library/EditableTitle.css';

const EditableTitle = ({ title, onSave, className = '' }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(title);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    const handleSubmit = async () => {
        if (value.trim() !== title) {
            await onSave(value.trim());
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        } else if (e.key === 'Escape') {
            setValue(title);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={handleSubmit}
                onKeyDown={handleKeyDown}
                className={`editable-title-input ${className}`}
                maxLength={50}
            />
        );
    }

    return (
        <h3 
            className={`editable-title ${className}`}
            onClick={() => setIsEditing(true)}
            title="Haz clic para editar"
        >
            {title}
            <span className="edit-icon">
                <i className="fas fa-pencil-alt"></i>
            </span>
        </h3>
    );
};

export default EditableTitle;
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/client';

const SignatureStatus = ({ pdfId }) => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    // Suscripción a cambios en tiempo real
    const subscription = supabase
      .channel('yousign_events')
      .on('postgres_changes', 
        {
          event: 'INSERT',
          schema: 'public',
          table: 'yousign_events',
          filter: `pdf_id=eq.${pdfId}`
        },
        (payload) => setStatus(payload.new)
      )
      .subscribe();

    // Cargar estado inicial
    const loadInitialStatus = async () => {
      const { data } = await supabase
        .from('yousign_events')
        .select('*')
        .eq('pdf_id', pdfId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) setStatus(data);
    };

    loadInitialStatus();

    return () => subscription.unsubscribe();
  }, [pdfId]);

  if (!status) return null;

  return (
    <div className="signature-status">
      <div className={`status-badge ${status.status}`}>
        {status.status}
      </div>
      {status.signer_email && (
        <div className="signer-info">
          Firmante: {status.signer_email}
        </div>
      )}
    </div>
  );
};

export default SignatureStatus;